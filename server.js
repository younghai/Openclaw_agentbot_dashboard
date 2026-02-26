const express = require("express");
const { WebSocket } = require("ws");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3456;
const GW_WS = "ws://127.0.0.1:18789";
const NVM = "export NVM_DIR=~/.nvm; source ~/.nvm/nvm.sh 2>/dev/null; nvm use 22.22.0 >/dev/null 2>&1;";
const OPENCLAW_ENV = "set -a; [ -f ~/.openclaw/.secrets ] && . ~/.openclaw/.secrets; [ -f ~/.openclaw/.env ] && . ~/.openclaw/.env; set +a;";

app.use(express.static(path.join(__dirname, "public")));

function parseJsonFromOutput(output) {
  const text = typeof output === "string" ? output.trim() : "";
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    let idx = text.lastIndexOf("{");
    while (idx !== -1) {
      try {
        return JSON.parse(text.slice(idx));
      } catch {
        idx = text.lastIndexOf("{", idx - 1);
      }
    }
    return null;
  }
}

function ocCmd(cmd) {
  const fullCmd = `bash -c '${NVM} ${OPENCLAW_ENV} ${cmd}'`;
  try {
    const out = execSync(fullCmd, {
      timeout: 15000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });

    const parsed = parseJsonFromOutput(out);
    if (parsed) return parsed;

    return { error: "No valid JSON output from command" };
  } catch (e) {
    const stderr = String(e.stderr || "");
    const stdout = String(e.stdout || "");
    const combined = `${stdout}\n${stderr}`.trim();

    const parsed = parseJsonFromOutput(combined);
    if (parsed) return parsed;

    return {
      error: e.message,
      output: combined.slice(0, 1200),
    };
  }
}

app.get("/api/health", (_req, res) => {
  res.json(ocCmd("openclaw gateway call health --json"));
});

app.get("/api/status", (_req, res) => {
  res.json(ocCmd("openclaw gateway call status --json"));
});

app.get("/api/agents", (_req, res) => {
  res.json(ocCmd("openclaw channels status --json"));
});

app.get("/api/usage", (_req, res) => {
  const usage = ocCmd("openclaw gateway usage-cost --json");
  if (usage && usage.totals) {
    res.json(usage);
    return;
  }

  res.json({
    totals: { totalTokens: 0, totalCost: 0, inputCost: 0, outputCost: 0 },
    daily: []
  });
});

app.get("/api/sessions", (_req, res) => {
  try {
    const agents = ["main", "agent1", "agent2", "agent3", "agent4", "agent5"];
    const sessions = {};
    for (const a of agents) {
      try {
        const p = `/home/vts/.openclaw/agents/${a}/sessions/sessions.json`;
        const d = fs.readFileSync(p, "utf8");
        sessions[a] = JSON.parse(d);
      } catch {
        sessions[a] = { sessions: [] };
      }
    }
    res.json(sessions);
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get("/api/logs", (_req, res) => {
  try {
    const out = execSync(`bash -c '${NVM} ${OPENCLAW_ENV} openclaw logs --json --limit 50 --local-time 2>&1'`, {
      timeout: 15000,
      encoding: "utf8",
    });
    const lines = out.trim().split("\n").filter(l => l.startsWith("{")).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    res.json(lines);
  } catch (e) {
    res.json([]);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenClaw Dashboard: http://0.0.0.0:${PORT}`);
});
