const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
canvas.width = 900;
canvas.height = 500;

const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const moodEl = document.getElementById("mood");
const leaderboardEl = document.getElementById("leaderboard");
const quoteEl = document.getElementById("quote");

const btnStart = document.getElementById("btn-start");
const btnToggleHelp = document.getElementById("btn-toggle-help");
const helpCard = document.getElementById("help-card");

const modal = document.getElementById("game-over-modal");
const finalScoreEl = document.getElementById("final-score");
const scoreForm = document.getElementById("score-form");
const playerNameInput = document.getElementById("player-name");
const btnPlayAgain = document.getElementById("btn-play-again");

const GAME_DURATION = 60_000;
const keys = new Set();

const QUOTES = [
  "“I threw away my cup when I saw a child drinking from his hands.”",
  "“It is the privilege of the gods to want nothing, and of godlike men to want little.”",
  "“Of what use is a philosopher who doesn't hurt anybody's feelings?”",
  "“I am looking for an honest man.”",
  "Asked how to avoid being enslaved: “By not wanting to enslave others.”",
  "When Alexander offered him anything: “Stand out of my sunlight.”",
];

function randomQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  quoteEl.textContent = q;
}

randomQuote();

const world = {
  status: "idle",
  elapsed: 0,
  score: 0,
  combo: 0,
  dashTimer: 0,
  npcs: [],
  projectiles: [],
};

const diogenes = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 22,
  vx: 0,
  vy: 0,
  facingX: 1,
  facingY: 0,
  rollPhase: 0,
};

function spawnNpc() {
  const margin = 40;
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) {
    x = Math.random() * (canvas.width - 2 * margin) + margin;
    y = margin;
  } else if (edge === 1) {
    x = canvas.width - margin;
    y = Math.random() * (canvas.height - 2 * margin) + margin;
  } else if (edge === 2) {
    x = Math.random() * (canvas.width - 2 * margin) + margin;
    y = canvas.height - margin;
  } else {
    x = margin;
    y = Math.random() * (canvas.height - 2 * margin) + margin;
  }

  const angle = Math.random() * Math.PI * 2;
  const speed = 0.05 + Math.random() * 0.08;

  return {
    x,
    y,
    r: 16,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    stunned: 0,
  };
}

for (let i = 0; i < 10; i++) {
  world.npcs.push(spawnNpc());
}

function throwPebble() {
  const now = performance.now();
  if (world.lastThrow && now - world.lastThrow < 300) return;
  world.lastThrow = now;

  const dirLen = Math.hypot(diogenes.facingX, diogenes.facingY) || 1;
  const dx = diogenes.facingX / dirLen;
  const dy = diogenes.facingY / dirLen;

  world.projectiles.push({
    x: diogenes.x + dx * (diogenes.radius + 6),
    y: diogenes.y + dy * (diogenes.radius + 6),
    vx: dx * 0.7,
    vy: dy * 0.7,
    r: 4,
    life: 1400,
  });
}

function moodFromScore(score) {
  if (score < 150) return "Serene";
  if (score < 350) return "Rowdy";
  if (score < 650) return "Unhinged";
  return "Apocalyptic Cynic";
}

function updateUi() {
  scoreEl.textContent = world.score.toString();
  const remaining = Math.max(0, GAME_DURATION - world.elapsed);
  timeEl.textContent = Math.ceil(remaining / 1000).toString();
  moodEl.textContent = moodFromScore(world.score);
}

function handleInput(dt) {
  const accel = world.dashTimer > 0 ? 0.09 : 0.045;
  const maxSpeed = world.dashTimer > 0 ? 0.85 : 0.55;

  let moveX = 0;
  let moveY = 0;

  if (keys.has("KeyW") || keys.has("ArrowUp")) moveY -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) moveY += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) moveX -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY) || 1;
    moveX /= len;
    moveY /= len;

    diogenes.vx += moveX * accel * dt * 60;
    diogenes.vy += moveY * accel * dt * 60;

    diogenes.facingX = moveX;
    diogenes.facingY = moveY;
  } else {
    diogenes.vx *= 1 - 2.4 * dt;
    diogenes.vy *= 1 - 2.4 * dt;
  }

  const speed = Math.hypot(diogenes.vx, diogenes.vy);
  if (speed > maxSpeed) {
    const s = maxSpeed / speed;
    diogenes.vx *= s;
    diogenes.vy *= s;
  }

  diogenes.x += diogenes.vx * dt * 60;
  diogenes.y += diogenes.vy * dt * 60;

  const margin = 35;
  diogenes.x = Math.max(margin, Math.min(canvas.width - margin, diogenes.x));
  diogenes.y = Math.max(margin, Math.min(canvas.height - margin, diogenes.y));

  diogenes.rollPhase += speed * dt * 10;
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function updateNpcs(dt) {
  const dashActive = world.dashTimer > 0;
  const baseKnock = dashActive ? 26 : 12;

  world.npcs.forEach((npc) => {
    if (npc.stunned > 0) {
      npc.stunned -= dt;
    } else {
      npc.x += npc.vx * dt * 60;
      npc.y += npc.vy * dt * 60;
    }

    const margin = 25;
    if (npc.x < margin || npc.x > canvas.width - margin) {
      npc.vx *= -1;
      npc.x = Math.max(margin, Math.min(canvas.width - margin, npc.x));
    }
    if (npc.y < margin || npc.y > canvas.height - margin) {
      npc.vy *= -1;
      npc.y = Math.max(margin, Math.min(canvas.height - margin, npc.y));
    }

    const rSum = diogenes.radius + npc.r;
    if (dist2(diogenes.x, diogenes.y, npc.x, npc.y) < rSum * rSum) {
      const impact = Math.hypot(diogenes.vx, diogenes.vy);
      if (impact > 0.25) {
        const dx = npc.x - diogenes.x;
        const dy = npc.y - diogenes.y;
        const len = Math.hypot(dx, dy) || 1;
        npc.vx = (dx / len) * 0.5;
        npc.vy = (dy / len) * 0.5;
        npc.stunned = 350;
        world.score += Math.round(baseKnock + world.combo * 3);
        world.combo = Math.min(world.combo + 1, 15);
      } else {
        world.score = Math.max(0, world.score - 10);
        world.combo = 0;
      }
    }
  });
}

function updateProjectiles(dt) {
  world.projectiles.forEach((p) => {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt * 60;
  });

  world.projectiles = world.projectiles.filter(
    (p) =>
      p.life > 0 &&
      p.x > -20 &&
      p.x < canvas.width + 20 &&
      p.y > -20 &&
      p.y < canvas.height + 20
  );

  world.projectiles.forEach((p) => {
    world.npcs.forEach((npc) => {
      if (npc.stunned > 0) return;
      const rSum = p.r + npc.r;
      if (dist2(p.x, p.y, npc.x, npc.y) < rSum * rSum) {
        npc.stunned = 500;
        const dx = npc.x - p.x;
        const dy = npc.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        npc.vx = (dx / len) * 0.6;
        npc.vy = (dy / len) * 0.6;
        world.score += 18 + world.combo * 4;
        world.combo = Math.min(world.combo + 1, 15);
        p.life = -1;
      }
    });
  });
}

let lastFrameTime = performance.now();

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#26264e");
  gradient.addColorStop(1, "#0b0b19");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  const grid = 60;
  for (let x = grid / 2; x < canvas.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = grid / 2; y < canvas.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiogenes() {
  const angle = Math.atan2(diogenes.facingY, diogenes.facingX);

  ctx.save();
  ctx.translate(diogenes.x, diogenes.y);
  ctx.rotate(angle);

  const barrelGradient = ctx.createRadialGradient(
    -6,
    -6,
    3,
    0,
    0,
    diogenes.radius + 3
  );
  barrelGradient.addColorStop(0, "#f7dd9b");
  barrelGradient.addColorStop(0.35, "#c88b41");
  barrelGradient.addColorStop(1, "#5f3416");

  ctx.beginPath();
  ctx.arc(0, 0, diogenes.radius, 0, Math.PI * 2);
  ctx.fillStyle = barrelGradient;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.arc(0, 0, diogenes.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const spokeAngle = (i / 4) * Math.PI * 2 + diogenes.rollPhase;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(spokeAngle) * (diogenes.radius - 4),
      Math.sin(spokeAngle) * (diogenes.radius - 4)
    );
    ctx.lineTo(
      Math.cos(spokeAngle) * (diogenes.radius + 2),
      Math.sin(spokeAngle) * (diogenes.radius + 2)
    );
    ctx.stroke();
  }

  const headOffset = diogenes.radius * 0.7;
  ctx.translate(headOffset, 0);
  ctx.rotate(-angle);

  ctx.beginPath();
  ctx.arc(0, -diogenes.radius * 0.3, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#f7e1b4";
  ctx.fill();

  ctx.fillStyle = "#111011";
  ctx.beginPath();
  ctx.arc(3, -diogenes.radius * 0.35, 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111011";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, -diogenes.radius * 0.12);
  ctx.quadraticCurveTo(0, -diogenes.radius * 0.06, 3, -diogenes.radius * 0.12);
  ctx.stroke();

  ctx.restore();
}

function drawNpcs() {
  world.npcs.forEach((npc) => {
    ctx.save();
    ctx.translate(npc.x, npc.y);

    const baseColor = npc.stunned > 0 ? "#9ed5ff" : "#f1dcc1";
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(0, 0, npc.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(0, -npc.r * 0.35, npc.r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function drawProjectiles() {
  ctx.save();
  ctx.fillStyle = "#f5e2be";
  world.projectiles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function draw() {
  drawBackground();
  drawNpcs();
  drawProjectiles();
  drawDiogenes();
}

function resetGameState() {
  world.status = "running";
  world.elapsed = 0;
  world.score = 0;
  world.combo = 0;
  world.dashTimer = 0;
  world.projectiles = [];
  world.npcs = [];
  for (let i = 0; i < 12; i++) {
    world.npcs.push(spawnNpc());
  }

  diogenes.x = canvas.width / 2;
  diogenes.y = canvas.height / 2;
  diogenes.vx = 0;
  diogenes.vy = 0;
  diogenes.rollPhase = 0;
  diogenes.facingX = 1;
  diogenes.facingY = 0;

  updateUi();
}

function endGame() {
  if (world.status !== "running") return;
  world.status = "ended";
  finalScoreEl.textContent = world.score.toString();
  modal.classList.remove("hidden");
  playerNameInput.focus();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (world.status === "running") {
    world.elapsed += dt * 1000;
    if (world.dashTimer > 0) world.dashTimer -= dt * 1000;

    handleInput(dt);
    updateNpcs(dt);
    updateProjectiles(dt);
    updateUi();

    if (world.elapsed >= GAME_DURATION) {
      endGame();
    }
  }

  draw();
  requestAnimationFrame(loop);
}

function handleKeyDown(e) {
  keys.add(e.code);
  if (e.code === "Space") {
    e.preventDefault();
    if (world.status === "running") {
      throwPebble();
    }
  }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    if (world.status === "running" && world.dashTimer <= 0) {
      world.dashTimer = 350;
    }
  }
}

function handleKeyUp(e) {
  keys.delete(e.code);
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

btnStart.addEventListener("click", () => {
  if (world.status === "running") return;
  modal.classList.add("hidden");
  resetGameState();
});

btnToggleHelp.addEventListener("click", () => {
  helpCard.classList.toggle("hidden");
});

btnPlayAgain.addEventListener("click", () => {
  modal.classList.add("hidden");
  resetGameState();
});

scoreForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = playerNameInput.value.trim();
  if (!name) return;
  try {
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score: world.score, mode: "topdown-2d" }),
    });
  } catch (err) {
    console.error("Error submitting score", err);
  } finally {
    playerNameInput.value = "";
    modal.classList.add("hidden");
    loadLeaderboard();
  }
});

async function loadLeaderboard() {
  leaderboardEl.innerHTML = "";
  try {
    const res = await fetch("/api/scores");
    const scores = await res.json();
    if (!Array.isArray(scores) || scores.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No scores yet. Be the first cynic.";
      leaderboardEl.appendChild(li);
      return;
    }

    scores.forEach((entry, index) => {
      const li = document.createElement("li");

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = String(index + 1).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = entry.name;

      left.appendChild(rank);
      left.appendChild(name);

      const right = document.createElement("div");
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "leaderboard-score";
      scoreSpan.textContent = entry.score;

      const modeSpan = document.createElement("span");
      modeSpan.className = "leaderboard-mode";
      modeSpan.textContent = entry.mode || "topdown-2d";

      right.appendChild(scoreSpan);
      right.appendChild(modeSpan);

      li.appendChild(left);
      li.appendChild(right);

      leaderboardEl.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading leaderboard", err);
    const li = document.createElement("li");
    li.textContent = "Could not load scores.";
    leaderboardEl.appendChild(li);
  }
}

loadLeaderboard();

requestAnimationFrame((t) => {
  lastFrameTime = t;
  loop(t);
});

