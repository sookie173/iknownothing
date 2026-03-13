const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

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
const GROUND_Y = canvas.height - 70;

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
  startTime: 0,
  elapsed: 0,
  score: 0,
  combo: 0,
  moodPhase: 0,
  barkCooldown: 0,
  sunbatheTimer: 0,
  jostleCooldown: 0,
  npcs: [],
};

const diogenes = {
  x: canvas.width / 2,
  y: GROUND_Y,
  radius: 30,
  vx: 0,
  facing: 1,
  rollPhase: 0,
};

function spawnNpc() {
  const side = Math.random() < 0.5 ? "left" : "right";
  const speed = 1.1 + Math.random() * 0.7;
  return {
    x: side === "left" ? -60 : canvas.width + 60,
    y: GROUND_Y + 4 + (Math.random() * 10 - 5),
    w: 36,
    h: 52,
    type: Math.random() < 0.4 ? "citizen" : Math.random() < 0.7 ? "soldier" : "philosopher",
    vx: (side === "left" ? 1 : -1) * speed,
    scared: false,
    bumpTimer: 0,
  };
}

for (let i = 0; i < 5; i++) {
  world.npcs.push(spawnNpc());
}

function moodFromScore(score) {
  if (score < 100) return "Serene";
  if (score < 250) return "Mischievous";
  if (score < 450) return "Defiant";
  return "Transcendent";
}

function updateUi() {
  scoreEl.textContent = world.score.toString();
  const remaining = Math.max(0, GAME_DURATION - world.elapsed);
  timeEl.textContent = Math.ceil(remaining / 1000).toString();
  moodEl.textContent = moodFromScore(world.score);
}

function handleInput(dt) {
  const baseSpeed = 0.36;
  const slowFactor = world.sunbatheTimer > 0 ? 0.45 : 1;
  diogenes.vx = 0;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) {
    diogenes.vx -= baseSpeed * slowFactor;
    diogenes.facing = -1;
  }
  if (keys.has("ArrowRight") || keys.has("KeyD")) {
    diogenes.vx += baseSpeed * slowFactor;
    diogenes.facing = 1;
  }

  diogenes.x += diogenes.vx * dt;
  diogenes.x = Math.max(50, Math.min(canvas.width - 50, diogenes.x));

  diogenes.rollPhase += (Math.abs(diogenes.vx) * dt) / 18;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function updateNpcs(dt) {
  if (world.npcs.length < 8 && Math.random() < 0.02) {
    world.npcs.push(spawnNpc());
  }

  const barkActive = world.barkCooldown > 0 && world.barkCooldown > 300;
  const barkRadius = 150;

  const barrelRect = {
    x: diogenes.x - diogenes.radius,
    y: diogenes.y - diogenes.radius,
    w: diogenes.radius * 2,
    h: diogenes.radius * 2,
  };

  world.npcs.forEach((npc) => {
    npc.x += npc.vx * dt * (world.sunbatheTimer > 0 ? 0.25 : 1);

    if (npc.bumpTimer > 0) {
      npc.bumpTimer -= dt;
    }

    if (barkActive && !npc.scared) {
      const dx = npc.x - diogenes.x;
      const dy = npc.y - diogenes.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < barkRadius) {
        npc.scared = true;
        npc.vx *= 1.9;
        world.score += 8 + world.combo * 2;
        world.combo = Math.min(world.combo + 1, 10);
      }
    }

    const npcRect = {
      x: npc.x - npc.w / 2,
      y: npc.y - npc.h,
      w: npc.w,
      h: npc.h,
    };

    const isJostling = world.jostleCooldown > 0 && world.jostleCooldown > 250;
    if (rectsOverlap(barrelRect.x, barrelRect.y, barrelRect.w, barrelRect.h, npcRect.x, npcRect.y, npcRect.w, npcRect.h)) {
      if (isJostling && npc.bumpTimer <= 0) {
        npc.bumpTimer = 350;
        world.score += 12 + world.combo * 3;
        world.combo = Math.min(world.combo + 1, 10);
        const away = npc.x < diogenes.x ? -1 : 1;
        npc.vx = away * Math.abs(npc.vx) * 1.7;
      } else if (!npc.scared) {
        world.score = Math.max(0, world.score - 25);
        world.combo = 0;
      }
    }
  });

  world.npcs = world.npcs.filter(
    (npc) => npc.x > -120 && npc.x < canvas.width + 120
  );
}

let lastFrameTime = performance.now();

function loop(now) {
  const dt = now - lastFrameTime;
  lastFrameTime = now;

  if (world.status === "running") {
    const timeFactor = world.sunbatheTimer > 0 ? 0.55 : 1;
    world.elapsed += dt * timeFactor;
    world.moodPhase += dt * 0.0018;
    if (world.barkCooldown > 0) world.barkCooldown -= dt;
    if (world.sunbatheTimer > 0) world.sunbatheTimer -= dt;
    if (world.jostleCooldown > 0) world.jostleCooldown -= dt;

    handleInput(dt);
    updateNpcs(dt);
    updateUi();

    if (world.elapsed >= GAME_DURATION) {
      endGame();
    }
  }

  draw();
  requestAnimationFrame(loop);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#282f61");
  gradient.addColorStop(0.55, "#151528");
  gradient.addColorStop(1, "#06030e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 40; x < canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x - 120, canvas.height - 40);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#181424";
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = -40; x < canvas.width + 40; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + 40, GROUND_Y + 12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiogenes() {
  const tilt = Math.sin(diogenes.rollPhase) * 0.18;
  ctx.save();
  ctx.translate(diogenes.x, diogenes.y);
  ctx.rotate(tilt);

  const barrelGradient = ctx.createRadialGradient(
    -10,
    -10,
    5,
    0,
    0,
    diogenes.radius + 8
  );
  barrelGradient.addColorStop(0, "#f7dd9b");
  barrelGradient.addColorStop(0.35, "#c88b41");
  barrelGradient.addColorStop(1, "#5f3416");

  ctx.beginPath();
  ctx.arc(0, 0, diogenes.radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = barrelGradient;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.arc(0, 0, diogenes.radius + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + diogenes.rollPhase * 1.3;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(angle) * (diogenes.radius + 2),
      Math.sin(angle) * (diogenes.radius + 2)
    );
    ctx.lineTo(
      Math.cos(angle) * (diogenes.radius + 10),
      Math.sin(angle) * (diogenes.radius + 10)
    );
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  const headX = diogenes.x + diogenes.facing * 14;
  const headY = diogenes.y - diogenes.radius - 10;
  ctx.translate(headX, headY);

  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#f7e1b4";
  ctx.fill();

  ctx.fillStyle = "#362012";
  ctx.beginPath();
  ctx.arc(0, 2, 15, Math.PI * 0.1, Math.PI * 0.9);
  ctx.fill();

  ctx.fillStyle = "#f7e1b4";
  ctx.beginPath();
  ctx.arc(0, 0, 13, Math.PI * 0.16, Math.PI * 0.84);
  ctx.fill();

  const eyeOffsetX = diogenes.facing > 0 ? 4 : -4;
  ctx.fillStyle = "#111011";
  ctx.beginPath();
  ctx.arc(eyeOffsetX, -3, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f7e1b4";
  ctx.beginPath();
  ctx.arc(0, 4, 7, 0, Math.PI);
  ctx.fill();

  ctx.strokeStyle = "#111011";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 7);
  ctx.quadraticCurveTo(0, 9, 4, 7);
  ctx.stroke();

  const beardLen = 11;
  const wiggle = Math.sin(performance.now() * 0.004) * 2;
  ctx.strokeStyle = "rgba(220, 215, 199, 0.9)";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, 6);
    ctx.lineTo(i * 5 + wiggle, 6 + beardLen);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNpcs() {
  world.npcs.forEach((npc) => {
    ctx.save();
    ctx.translate(npc.x, npc.y);

    ctx.fillStyle = npc.scared
      ? "rgba(152, 214, 255, 0.9)"
      : npc.type === "soldier"
      ? "rgba(239, 114, 104, 0.9)"
      : npc.type === "philosopher"
      ? "rgba(162, 247, 165, 0.9)"
      : "rgba(234, 222, 199, 0.9)";

    const wobble = Math.sin(performance.now() * 0.004 + npc.x * 0.01) * 2;
    const bodyH = npc.h + (npc.bumpTimer > 0 ? -6 : 0);
    ctx.beginPath();
    ctx.roundRect(-npc.w / 2, -bodyH, npc.w, bodyH, 8);
    ctx.fill();

    if (npc.scared) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-npc.w / 3, -bodyH - 12 + wobble);
      ctx.lineTo(0, -bodyH - 16 - wobble);
      ctx.lineTo(npc.w / 3, -bodyH - 12 + wobble);
      ctx.stroke();
    } else if (npc.type === "soldier") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(-npc.w / 2, -bodyH - 10, npc.w, 7);
    } else if (npc.type === "philosopher") {
      ctx.fillStyle = "rgba(4, 6, 2, 0.6)";
      ctx.beginPath();
      ctx.ellipse(0, -bodyH - 8, npc.w / 2, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}

function drawBarkWave() {
  if (world.barkCooldown <= 0 || world.barkCooldown < 300) return;
  const progress = 1 - world.barkCooldown / 900;
  const radius = 40 + progress * 140;
  ctx.save();
  ctx.translate(diogenes.x, diogenes.y - diogenes.radius - 18);
  const grad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius);
  grad.addColorStop(0, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSunbatheGlow() {
  if (world.sunbatheTimer <= 0) return;
  const t = world.sunbatheTimer / 3500;
  ctx.save();
  ctx.globalAlpha = 0.15 + t * 0.25;
  const grad = ctx.createRadialGradient(
    diogenes.x,
    diogenes.y - 120,
    10,
    diogenes.x,
    diogenes.y - 120,
    220
  );
  grad.addColorStop(0, "rgba(255, 219, 120, 1)");
  grad.addColorStop(0.6, "rgba(255, 219, 120, 0.1)");
  grad.addColorStop(1, "rgba(255, 219, 120, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawMoodHalo() {
  if (world.status !== "running") return;
  const phase = world.moodPhase;
  const amp = Math.min(world.score / 300, 1.2);
  ctx.save();
  ctx.globalAlpha = 0.12 + amp * 0.18;
  const r = 90 + Math.sin(phase) * 10 * (1 + amp);
  const grad = ctx.createRadialGradient(
    diogenes.x,
    diogenes.y,
    10,
    diogenes.x,
    diogenes.y,
    r
  );
  grad.addColorStop(0, "rgba(255, 228, 138, 1)");
  grad.addColorStop(0.5, "rgba(255, 228, 138, 0.24)");
  grad.addColorStop(1, "rgba(255, 228, 138, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(diogenes.x, diogenes.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  drawBackground();
  drawMoodHalo();
  drawSunbatheGlow();
  drawNpcs();
  drawDiogenes();
  drawBarkWave();
}

function resetGameState() {
  world.status = "running";
  world.startTime = performance.now();
  world.elapsed = 0;
  world.score = 0;
  world.combo = 0;
  world.moodPhase = 0;
  world.barkCooldown = 0;
  world.sunbatheTimer = 0;
  world.jostleCooldown = 0;

  diogenes.x = canvas.width / 2;
  diogenes.y = GROUND_Y;
  diogenes.vx = 0;
  diogenes.rollPhase = 0;

  world.npcs = [];
  for (let i = 0; i < 6; i++) {
    world.npcs.push(spawnNpc());
  }

  updateUi();
}

function endGame() {
  if (world.status !== "running") return;
  world.status = "ended";
  finalScoreEl.textContent = world.score.toString();
  modal.classList.remove("hidden");
  playerNameInput.focus();
}

function handleKeyDown(e) {
  keys.add(e.code);

  if (e.code === "Space") {
    e.preventDefault();
    if (world.status === "running" && world.barkCooldown <= 0) {
      world.barkCooldown = 900;
    }
  }

  if (e.code === "KeyS") {
    if (world.status === "running" && world.sunbatheTimer <= 0) {
      world.sunbatheTimer = 3500;
    }
  }

  if (e.code === "KeyW") {
    if (world.status === "running" && world.jostleCooldown <= 0) {
      world.jostleCooldown = 600;
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
      body: JSON.stringify({ name, score: world.score, mode: "barrel" }),
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
      modeSpan.textContent = entry.mode || "barrel";

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

