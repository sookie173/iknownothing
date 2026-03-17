// Diogenes RPG: Life in the Pithos
// Choice-driven narrative ending with his death (~323 BC). No adult content.

const narrativeEl = document.getElementById("narrative");
const choicesEl = document.getElementById("choices");
const btnStart = document.getElementById("btn-start");
const btnToggleHelp = document.getElementById("btn-toggle-help");
const helpCard = document.getElementById("help-card");
const modal = document.getElementById("game-over-modal");
const endingTextEl = document.getElementById("ending-text");
const scoreForm = document.getElementById("score-form");
const playerNameInput = document.getElementById("player-name");
const btnPlayAgain = document.getElementById("btn-play-again");
const leaderboardEl = document.getElementById("leaderboard");
const quoteEl = document.getElementById("quote");

const statDay = document.getElementById("stat-day");
const statHealth = document.getElementById("stat-health");
const statConviction = document.getElementById("stat-conviction");
const statNotoriety = document.getElementById("stat-notoriety");
const possessionsEl = document.getElementById("possessions");
const sceneImageEl = document.getElementById("scene-image");
const possessionDescEl = document.getElementById("possession-desc");

const SCENE_IMAGES = {
  start: "images/pithos.png",
  morning: "images/agora.png",
  beg: "images/agora.png",
  wander: "images/agora.png",
  sunbathe: "images/agora.png",
  lamp: "images/lamp.png",
  plato: "images/agora.png",
  alexander: "images/agora.png",
  child_hands: "images/agora.png",
  octopus: "images/agora.png",
  after_activity: "images/pithos.png",
  death: "images/death.png",
  death_hold_breath: "images/death.png",
  death_ox_foot: "images/death.png",
  death_sun: "images/death.png",
};

const POSSESSION_DESCRIPTIONS = {
  cloak: "Your only blanket. You sleep in it. The rest is luxury.",
  bowl: "A wooden bowl. A child drinks from his hands. Why do you need this?",
  lamp: "You carry it in daylight. You are looking for an honest man.",
};

const QUOTES = [
  "“I threw away my cup when I saw a child drinking from his hands.”",
  "“It is the privilege of the gods to want nothing.”",
  "“I am looking for an honest man.”",
  "“Stand out of my sunlight.”",
  "“Of what use is a philosopher who doesn't hurt anybody's feelings?”",
];

function randomQuote() {
  if (quoteEl) quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

const DEATH_DAY = 55;
const MIN_HEALTH_DEATH = 0;

let state = {
  day: 1,
  health: 100,
  conviction: 0,
  notoriety: 0,
  hasBowl: true,
  hasLamp: false,
  metAlexander: false,
  metPlato: false,
  ateOctopus: false,
  threwBowl: false,
  inEnding: false,
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function setSceneImage(sceneId) {
  if (!sceneImageEl) return;
  const src = SCENE_IMAGES[sceneId];
  if (src) {
    sceneImageEl.src = src;
    sceneImageEl.alt = sceneId.replace(/_/g, " ");
    sceneImageEl.classList.remove("hidden");
  } else {
    sceneImageEl.src = "";
    sceneImageEl.classList.add("hidden");
  }
}

function showPossessionDesc(id) {
  if (!possessionDescEl) return;
  const text = POSSESSION_DESCRIPTIONS[id];
  if (text) {
    possessionDescEl.textContent = text;
    possessionDescEl.classList.remove("hidden");
  } else {
    possessionDescEl.classList.add("hidden");
  }
}

function updateStatsUI() {
  statDay.textContent = state.day;
  statHealth.textContent = Math.max(0, state.health);
  statConviction.textContent = state.conviction;
  statNotoriety.textContent = state.notoriety;

  const items = [{ id: "cloak", label: "Cloak (blanket)" }];
  if (state.hasBowl) items.push({ id: "bowl", label: "Wooden bowl" });
  if (state.hasLamp) items.push({ id: "lamp", label: "Lamp" });

  if (!possessionsEl) return;
  possessionsEl.innerHTML = items
    .map((it) => `<li><button type="button" class="possession-btn" data-possession="${it.id}">${it.label}</button></li>`)
    .join("");

  possessionsEl.querySelectorAll(".possession-btn").forEach((btn) => {
    btn.addEventListener("click", () => showPossessionDesc(btn.dataset.possession));
  });
}

function showNarrative(html) {
  if (!narrativeEl) return;
  const p = document.createElement("p");
  p.className = "narrative-text";
  p.textContent = html;
  narrativeEl.innerHTML = "";
  narrativeEl.appendChild(p);
}

function showChoices(choices) {
  choicesEl.innerHTML = "";
  choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn ghost-btn";
    btn.textContent = c.text;
    btn.addEventListener("click", () => {
      if (c.effect) c.effect();
      updateStatsUI();
      goToScene(c.next);
    });
    choicesEl.appendChild(btn);
  });
}

const SCENES = {
  start: {
    text: "You wake in your pithos—a large ceramic jar—in a corner of the Athenian agora. Your cloak is tangled around you. The sun is already high. Another day of testing whether any of this is necessary.",
    choices: [
      { text: "Rise and face the day.", next: "morning" },
    ],
  },

  morning: {
    text: (s) => {
      if (s.day >= DEATH_DAY - 2) return "Your body is failing. The agora still bustles. You know the end is near.";
      return `Day ${s.day}. You step out of the jar. Where will you go?`;
    },
    choices: (s) => {
      const opts = [
        { text: "Beg in the marketplace.", next: "beg" },
        { text: "Wander and harass the pretentious.", next: "wander" },
        { text: "Lie in the sun by the portico.", next: "sunbathe" },
      ];
      if (s.hasLamp) opts.push({ text: "Carry your lamp in daylight.", next: "lamp" });
      // One-time options: only if not already done
      if (s.day >= 5 && !s.metPlato) opts.push({ text: "Seek out the philosophers.", next: "plato" });
      if (s.day >= 8 && !s.metAlexander) opts.push({ text: "Go where the crowd is thickest.", next: "alexander" });
      if (s.day >= 12 && !s.ateOctopus) opts.push({ text: "Find something raw to eat.", next: "octopus" });
      if (s.hasBowl && s.day >= 4) opts.push({ text: "Watch the children at the fountain.", next: "child_hands" });
      // Death as a voluntary option from day 10
      if (s.day >= 10) opts.push({ text: "I am ready to die. Take me to the end.", next: "death" });
      return opts;
    },
  },

  beg: {
    text: "You beg in the marketplace. Some give you figs and lentils; others look away. You eat what you get—enough to keep going.",
    choices: [
      {
        text: "Continue.",
        effect: () => {
          state.health = clamp(state.health + 8, 0, 100);
          state.day += 1;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  wander: {
    text: "You wander the agora and needle the well-dressed and the self-important. They flinch. You ask them why they need so much. Most have no answer.",
    choices: [
      {
        text: "Continue.",
        effect: () => {
          state.notoriety += 5;
          state.conviction += 2;
          state.day += 1;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  sunbathe: {
    text: "You lie in the sun on the temple steps. The warmth is enough. You need nothing else. Someone will come and ask you what you want. They always do.",
    choices: [
      {
        text: "Rest.",
        effect: () => {
          state.health = clamp(state.health + 5, 0, 100);
          state.conviction += 1;
          state.day += 1;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  lamp: {
    text: "You carry your lamp through the marketplace in broad daylight. People stare. You tell them you are looking for an honest man. They laugh or walk away. You keep looking.",
    choices: [
      {
        text: "Continue.",
        effect: () => {
          state.notoriety += 8;
          state.conviction += 3;
          state.day += 1;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  plato: {
    text: "You find Plato and his students. Plato has just defined man as a featherless biped. You leave and return with a plucked chicken. You drop it in front of him: “Behold—Plato’s man.” The school is in uproar. You walk away.",
    choices: [
      {
        text: "Leave.",
        effect: () => {
          state.metPlato = true;
          state.notoriety += 15;
          state.conviction += 10;
          state.day += 1;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  alexander: {
    text: "The crowd parts. Alexander the Great stands before you and says he has heard of you. He asks what he can give you. The sun is on your face. You say: “Stand out of my sunlight.” Silence. Then Alexander says that if he were not Alexander, he would wish to be Diogenes. You do not move.",
    choices: [
      {
        text: "Let him go.",
        effect: () => {
          state.metAlexander = true;
          state.notoriety += 20;
          state.conviction += 12;
          state.day += 1;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  child_hands: {
    text: "You watch a child drink from his cupped hands at the fountain. No bowl. No vessel. You look at your wooden bowl. You throw it away. If a child needs nothing, neither do you.",
    choices: [
      {
        text: "Walk on.",
        effect: () => {
          state.threwBowl = true;
          state.hasBowl = false;
          state.conviction += 8;
          state.day += 1;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  octopus: {
    text: "You find an octopus and eat it raw. Your stomach turns. You are sick for days. Someone asks if it was worth it. You say: it was worth dying to show that civilization is not necessary. You recover, barely.",
    choices: [
      {
        text: "Survive.",
        effect: () => {
          state.ateOctopus = true;
          state.health = clamp(state.health - 35, 0, 100);
          state.conviction += 6;
          state.day += 2;
          if (state.day >= DEATH_DAY || state.health <= MIN_HEALTH_DEATH) state.nextDeath = true;
        },
        next: "after_activity",
      },
    ],
  },

  after_activity: {
    text: (s) => {
      if (s.nextDeath || s.day >= DEATH_DAY || s.health <= MIN_HEALTH_DEATH)
        return "Your strength is gone. The agora fades. You know how this ends.";
      return "Another evening. You return to your jar and your cloak. Tomorrow you will test the world again.";
    },
    choices: (s) => {
      if (s.nextDeath || s.day >= DEATH_DAY || s.health <= MIN_HEALTH_DEATH) {
        return [{ text: "…", next: "death" }];
      }
      return [{ text: "Sleep.", next: "morning" }];
    },
  },

  death: {
    text: "The year is 323 BC. Your body has had enough. In the agora they still talk about the man in the jar who asked for nothing. You have one last choice: how to end it.",
    choices: [
      { text: "Hold your breath. If life is a choice, so is death.", next: "death_hold_breath" },
      { text: "Eat the raw ox foot they left. No compromise.", next: "death_ox_foot" },
      { text: "Lie in the sun one last time. Refuse to perform.", next: "death_sun" },
    ],
  },

  death_hold_breath: {
    ending: true,
    endingText: "You decide to hold your breath until it is over. You prove, in the end, that you could choose. They find you in your jar. The Dog of Athens is gone. Your conviction outlived you.",
    choices: [],
  },

  death_ox_foot: {
    ending: true,
    endingText: "You eat the raw ox foot. You knew it might kill you. You eat it anyway—civilization is not necessary. You die as you lived: refusing to pretend. They say you died of your own recklessness. You would say you died of consistency.",
    choices: [],
  },

  death_sun: {
    ending: true,
    endingText: "You lie in the sun and do nothing. No gesture. No last performance. When they ask what you want, you say nothing. You close your eyes. The light is enough. You go out like a lamp that no one needed to light.",
    choices: [],
  },
};

function resolveChoices(scene) {
  if (!scene.choices) return [];
  return typeof scene.choices === "function" ? scene.choices(state) : scene.choices;
}

function goToScene(id) {
  const scene = SCENES[id];
  if (!scene) return;

  if (possessionDescEl) possessionDescEl.classList.add("hidden");
  setSceneImage(id);

  if (scene.ending) {
    state.inEnding = true;
    endingTextEl.textContent = scene.endingText || "";
    modal.classList.remove("hidden");
    choicesEl.innerHTML = "";
    narrativeEl.innerHTML = "";
    return;
  }

  const text = typeof scene.text === "function" ? scene.text(state) : scene.text;
  if (text) showNarrative(text);

  const choices = resolveChoices(scene);
  if (choices.length) showChoices(choices);
}

function startGame() {
  state = {
    day: 1,
    health: 100,
    conviction: 0,
    notoriety: 0,
    hasBowl: true,
    hasLamp: false,
    metAlexander: false,
    metPlato: false,
    ateOctopus: false,
    threwBowl: false,
    inEnding: false,
    nextDeath: false,
  };
  state.hasLamp = true;
  updateStatsUI();
  btnStart.classList.add("hidden");
  document.querySelector(".rpg-footer")?.classList.add("hidden");
  goToScene("start");
}

function showStart() {
  setSceneImage("start");
  if (narrativeEl) narrativeEl.innerHTML = "<p class=\"narrative-text\">You are Diogenes of Sinope. You live in a jar. You are about to live again.</p>";
  if (choicesEl) choicesEl.innerHTML = "";
  if (btnStart) btnStart.classList.remove("hidden");
  document.querySelector(".rpg-footer")?.classList.remove("hidden");
  if (possessionDescEl) possessionDescEl.classList.add("hidden");
}

btnStart.addEventListener("click", startGame);

btnToggleHelp.addEventListener("click", () => {
  if (helpCard) helpCard.classList.toggle("hidden");
});

btnPlayAgain.addEventListener("click", () => {
  modal.classList.add("hidden");
  showStart();
});

scoreForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = playerNameInput.value.trim();
  if (!name) return;
  const score = state.conviction + state.notoriety + state.day * 2;
  try {
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score, mode: "rpg" }),
    });
  } catch (err) {
    console.error(err);
  } finally {
    playerNameInput.value = "";
    modal.classList.add("hidden");
    loadLeaderboard();
  }
});

async function loadLeaderboard() {
  if (!leaderboardEl) return;
  leaderboardEl.innerHTML = "";
  try {
    const res = await fetch("/api/scores");
    const scores = await res.json();
    if (!Array.isArray(scores) || scores.length === 0) {
      leaderboardEl.innerHTML = "<li>No scores yet.</li>";
      return;
    }
    scores.slice(0, 10).forEach((entry, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${entry.name} — ${entry.score}`;
      leaderboardEl.appendChild(li);
    });
  } catch (err) {
    leaderboardEl.innerHTML = "<li>Could not load scores.</li>";
  }
}

function init() {
  if (!narrativeEl || !choicesEl || !btnStart) return;
  randomQuote();
  updateStatsUI();
  loadLeaderboard();
  setSceneImage("start");
  narrativeEl.innerHTML = "<p class=\"narrative-text\">You are Diogenes of Sinope. You live in a jar. You are about to live again.</p>";
  choicesEl.innerHTML = "";
  btnStart.classList.remove("hidden");
  const footer = document.querySelector(".rpg-footer");
  if (footer) footer.classList.remove("hidden");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
