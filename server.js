const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const SCORES_FILE = path.join(DATA_DIR, "scores.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCORES_FILE)) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify([]), "utf-8");
  }
}

function readScores() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(SCORES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading scores:", err);
    return [];
  }
}

function writeScores(scores) {
  ensureDataDir();
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), "utf-8");
}

app.get("/api/scores", (req, res) => {
  const scores = readScores()
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(scores);
});

app.post("/api/scores", (req, res) => {
  const { name, score, mode } = req.body || {};

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required" });
  }
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return res.status(400).json({ error: "Score must be a number" });
  }

  const entry = {
    name: name.trim().slice(0, 16),
    score: Math.round(score),
    mode: typeof mode === "string" ? mode : "classic",
    createdAt: new Date().toISOString(),
  };

  const scores = readScores();
  scores.push(entry);
  writeScores(scores);

  res.status(201).json(entry);
});

app.listen(PORT, () => {
  console.log(`Diogenes barrel game running at http://localhost:${PORT}`);
});

