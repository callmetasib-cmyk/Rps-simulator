const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const rockCountEl = document.getElementById('rock-count');
const paperCountEl = document.getElementById('paper-count');
const scissorsCountEl = document.getElementById('scissors-count');
const rockInput = document.getElementById('rock-input');
const paperInput = document.getElementById('paper-input');
const scissorsInput = document.getElementById('scissors-input');
const startButton = document.getElementById('start-btn');
const pauseButton = document.getElementById('pause-btn');
const updateButton = document.getElementById('update-btn');
const resetButton = document.getElementById('reset-btn');
const speedButton = document.getElementById('speed-btn');

const entityRadius = 14;
const baseSpeed = 1.0;
let speedMultiplier = 1;
const emojiMap = {
  rock: '🪨',
  paper: '📃',
  scissors: '✂️'
};
const colors = {
  rock: '#263238',
  paper: '#FFB300',
  scissors: '#FF7043'
};

const winMap = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper'
};

let entities = [];
const winnerOverlay = document.getElementById('winner-overlay');
const winnerText = document.getElementById('winner-text');
const winnerEmoji = document.getElementById('winner-emoji');
const closePopupButton = document.getElementById('close-popup-btn');
let initialCounts = { rock: 10, paper: 10, scissors: 10 };
let running = false;
let finished = false;

function setCanvasSize() {
  const cssWidth = canvas.clientWidth;
  const cssHeight = parseInt(getComputedStyle(canvas).height, 10);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function randomVelocity() {
  const angle = Math.random() * Math.PI * 2;
  return {
    vx: Math.cos(angle),
    vy: Math.sin(angle)
  };
}

function normalizeVelocity(entity) {
  const magnitude = Math.hypot(entity.vx, entity.vy) || 1;
  entity.vx /= magnitude;
  entity.vy /= magnitude;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInitialCounts() {
  const rock = clamp(parseInt(rockInput.value, 10) || 0, 0, 120);
  const paper = clamp(parseInt(paperInput.value, 10) || 0, 0, 120);
  const scissors = clamp(parseInt(scissorsInput.value, 10) || 0, 0, 120);

  rockInput.value = rock;
  paperInput.value = paper;
  scissorsInput.value = scissors;

  if (rock + paper + scissors < 2) {
    alert('Please choose at least two entities in total before starting.');
    return null;
  }

  return { rock, paper, scissors };
}

function updateCounts() {
  const counts = getInitialCounts();
  if (!counts) return;

  initialCounts = counts;
  running = false;
  finished = false;
  setCanvasSize();
  createEntities(initialCounts);
  updateStats();
  startButton.textContent = 'Start';
  pauseButton.disabled = true;
  pauseButton.classList.add('disabled');
  drawSimulation();
}

function createEntities(counts) {
  entities = [];
  const types = ['rock', 'paper', 'scissors'];
  const width = canvas.clientWidth;
  const height = parseInt(getComputedStyle(canvas).height, 10);

  types.forEach((type) => {
    for (let i = 0; i < counts[type]; i += 1) {
      let x, y;
      let attempts = 0;

      do {
        x = entityRadius + Math.random() * (width - entityRadius * 2);
        y = entityRadius + Math.random() * (height - entityRadius * 2);
        attempts += 1;
      } while (
        entities.some((other) => {
          const dx = other.x - x;
          const dy = other.y - y;
          return Math.hypot(dx, dy) < entityRadius * 3;
        }) && attempts < 200
      );

      const entity = {
        type,
        x,
        y,
        ...randomVelocity()
      };
      normalizeVelocity(entity);
      entities.push(entity);
    }
  });
}

function updateStats() {
  const totals = { rock: 0, paper: 0, scissors: 0 };
  entities.forEach((entity) => {
    totals[entity.type] += 1;
  });

  rockCountEl.textContent = totals.rock;
  paperCountEl.textContent = totals.paper;
  scissorsCountEl.textContent = totals.scissors;
}

function getCollisionWinner(typeA, typeB) {
  if (typeA === typeB) return null;
  if (winMap[typeA] === typeB) return typeA;
  return typeB;
}

function bounceEntity(entity, width, height) {
  if (entity.x <= entityRadius) {
    entity.x = entityRadius;
    entity.vx = Math.abs(entity.vx);
  }
  if (entity.x >= width - entityRadius) {
    entity.x = width - entityRadius;
    entity.vx = -Math.abs(entity.vx);
  }
  if (entity.y <= entityRadius) {
    entity.y = entityRadius;
    entity.vy = Math.abs(entity.vy);
  }
  if (entity.y >= height - entityRadius) {
    entity.y = height - entityRadius;
    entity.vy = -Math.abs(entity.vy);
  }
  normalizeVelocity(entity);
}

function resolveEntityCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 0.01;
  const overlap = entityRadius * 2 - distance;

  if (overlap <= 0) return;

  const nx = dx / distance;
  const ny = dy / distance;

  const winnerType = getCollisionWinner(a.type, b.type);
  if (winnerType) {
    if (winnerType === a.type) {
      b.type = a.type;
    } else {
      a.type = b.type;
    }
  }

  const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  const impulse = relativeVelocity > 0 ? relativeVelocity : 0;

  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;

  normalizeVelocity(a);
  normalizeVelocity(b);

  const separation = overlap / 2;
  a.x -= nx * separation;
  a.y -= ny * separation;
  b.x += nx * separation;
  b.y += ny * separation;
}

function updateSimulation() {
  const width = canvas.clientWidth;
  const height = parseInt(getComputedStyle(canvas).height, 10);

  entities.forEach((entity) => {
    entity.x += entity.vx * baseSpeed * speedMultiplier;
    entity.y += entity.vy * baseSpeed * speedMultiplier;
    bounceEntity(entity, width, height);
  });

  for (let i = 0; i < entities.length; i += 1) {
    for (let j = i + 1; j < entities.length; j += 1) {
      const a = entities[i];
      const b = entities[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.hypot(dx, dy) < entityRadius * 2) {
        resolveEntityCollision(a, b);
      }
    }
  }

  updateStats();
  checkFinished();
}

function drawSimulation() {
  const width = canvas.clientWidth;
  const height = parseInt(getComputedStyle(canvas).height, 10);

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${entityRadius * 1.8}px serif`;

  entities.forEach((entity) => {
    ctx.fillStyle = colors[entity.type];
    ctx.fillText(emojiMap[entity.type], entity.x, entity.y);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeText(emojiMap[entity.type], entity.x, entity.y);
  });
}

function animationFrame() {
  if (!running) return;

  updateSimulation();
  drawSimulation();

  if (running) {
    requestAnimationFrame(animationFrame);
  }
}

function showWinnerPopup(winner) {
  winnerText.textContent = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!`;
  winnerEmoji.textContent = emojiMap[winner];
  winnerOverlay.classList.add('visible');
  winnerOverlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    hideWinnerPopup();
  }, 4500);
}

function setSpeedMultiplier(value) {
  speedMultiplier = value;
  if (value > 1) {
    speedButton.classList.add('active');
  } else {
    speedButton.classList.remove('active');
  }
}

function hideWinnerPopup() {
  winnerOverlay.classList.remove('visible');
  winnerOverlay.setAttribute('aria-hidden', 'true');
}

closePopupButton.addEventListener('click', hideWinnerPopup);

[startButton, updateButton, resetButton].forEach((button) => {
  button.addEventListener('click', () => {
    hideWinnerPopup();
  });
});

speedButton.addEventListener('pointerdown', () => setSpeedMultiplier(2));
window.addEventListener('pointerup', () => setSpeedMultiplier(1));
speedButton.addEventListener('pointerleave', () => setSpeedMultiplier(1));

function startSimulation() {
  if (finished) return;
  if (running) return;

  running = true;
  startButton.textContent = 'Running';
  pauseButton.disabled = false;
  pauseButton.classList.remove('disabled');
  requestAnimationFrame(animationFrame);
}

function pauseSimulation() {
  running = false;
  startButton.textContent = 'Start';
  pauseButton.disabled = true;
  pauseButton.classList.add('disabled');
}

function resetSimulation() {
  running = false;
  finished = false;
  setCanvasSize();
  createEntities(initialCounts);
  updateStats();
  startButton.textContent = 'Start';
  pauseButton.disabled = true;
  pauseButton.classList.add('disabled');
  drawSimulation();
}

function checkFinished() {
  if (finished) return;
  const totals = { rock: 0, paper: 0, scissors: 0 };
  entities.forEach((entity) => {
    totals[entity.type] += 1;
  });

  const alive = Object.entries(totals).filter(([, count]) => count > 0);
  if (alive.length === 1) {
    finished = true;
    running = false;
    startButton.textContent = 'Start';
    pauseButton.disabled = true;
    pauseButton.classList.add('disabled');
    const winner = alive[0][0];
    showWinnerPopup(winner);
  }
}

window.addEventListener('resize', () => {
  if (!running) {
    setCanvasSize();
    drawSimulation();
  }
});

startButton.addEventListener('click', () => {
  if (running) return;
  startSimulation();
});

pauseButton.addEventListener('click', pauseSimulation);
updateButton.addEventListener('click', updateCounts);
resetButton.addEventListener('click', resetSimulation);

setCanvasSize();
createEntities(initialCounts);
updateStats();
drawSimulation();
