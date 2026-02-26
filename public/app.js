const AGENTS = {
  main:   { name:"\u{1F99E} Main",    role:"\uAD00\uC81C", model:"gpt-5.3-codex" },
  agent1: { name:"\u2660\uFE0F Ace",     role:"PM",   model:"gpt-5.3-codex" },
  agent2: { name:"\u26A1\uFE0F Zed",    role:"Frontend", model:"gpt-5-mini" },
  agent3: { name:"\u{1F916} Jarvis",  role:"Backend",  model:"gpt-5-mini" },
  agent4: { name:"\u{1F53A} Volt",    role:"QA",       model:"kimi/k2.5" },
  agent5: { name:"\u{1F31F} Nova",    role:"Support",  model:"zai/glm-5" }
};

function fmt(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (n >= 1000) return (n/1000).toFixed(1)+"K";
  return String(n);
}

function fmtCost(n) { return "$" + n.toFixed(4); }

function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString("ko-KR", { hour12:false });
  const d = now.toLocaleDateString("ko-KR");
  document.getElementById("clock").textContent = d + " " + t;
}
setInterval(updateClock, 1000);
updateClock();

async function fetchJSON(url) {
  try { const r = await fetch(url); return await r.json(); } catch { return null; }
}

async function refreshHealth() {
  const data = await fetchJSON("/api/health");
  const dot = document.getElementById("gwStatus");
  const label = document.getElementById("gwLabel");
  if (data && data.ok) {
    dot.className = "status-dot ok";
    label.textContent = "Gateway OK";
  } else {
    dot.className = "status-dot err";
    label.textContent = "\uC5F0\uACB0 \uC2E4\uD328";
  }
}

async function refreshAgents() {
  const data = await fetchJSON("/api/health");
  if (!data || !data.agents) return;
  for (const ag of data.agents) {
    const id = ag.agentId;
    const statusEl = document.getElementById("status-" + id);
    const barEl = document.getElementById("bar-" + id);
    const tokenEl = document.getElementById("tokens-" + id);
    const roomEl = document.getElementById("room-" + id);
    if (!statusEl) continue;

    const sess = ag.sessions;
    let totalTk = 0, isActive = false;
    if (sess && sess.recent && sess.recent.length > 0) {
      const r = sess.recent[0];
      totalTk = r.totalTokens || (r.inputTokens||0)+(r.outputTokens||0);
      isActive = r.age < 300000;
    }

    tokenEl.textContent = fmt(totalTk);
    if (isActive) {
      statusEl.textContent = "\uC791\uC5C5\uC911";
      statusEl.className = "agent-status working";
      barEl.style.width = "80%";
      roomEl.classList.add("active");
    } else if (totalTk > 0) {
      statusEl.textContent = "\uC644\uB8CC";
      statusEl.className = "agent-status";
      barEl.style.width = "100%";
      roomEl.classList.remove("active");
    } else {
      statusEl.textContent = "\uB300\uAE30";
      statusEl.className = "agent-status";
      barEl.style.width = "5%";
      roomEl.classList.remove("active");
    }
  }
}

async function refreshUsage() {
  const data = await fetchJSON("/api/usage");
  if (!data || data.error) return;

  const t = data.totals || {};
  document.getElementById("totalTokens").textContent = fmt(t.totalTokens || 0);
  document.getElementById("totalCost").textContent = fmtCost(t.totalCost || 0);
  document.getElementById("inputCost").textContent = fmtCost(t.inputCost || 0);
  document.getElementById("outputCost").textContent = fmtCost(t.outputCost || 0);

  const chart = document.getElementById("costChart");
  chart.innerHTML = "";
  const daily = data.daily || [];
  const maxCost = Math.max(...daily.map(d => d.totalCost), 0.001);
  for (const d of daily) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = Math.max(2, (d.totalCost / maxCost) * 38) + "px";
    bar.title = d.date + ": " + fmtCost(d.totalCost);
    chart.appendChild(bar);
  }
}

async function refreshChannels() {
  const data = await fetchJSON("/api/agents");
  const list = document.getElementById("channelList");
  if (!data || !data.channelAccounts) return;
  list.innerHTML = "";

  const tgAccounts = data.channelAccounts.telegram || [];
  for (const acc of tgAccounts) {
    const div = document.createElement("div");
    div.className = "channel-item";
    const status = acc.running ? "ch-ok" : "ch-err";
    const statusText = acc.running ? "ON" : "OFF";
    const icon = "\u2708\uFE0F";
    div.innerHTML = "<span class=\"ch-icon\">" + icon + "</span>" +
      "<span class=\"ch-name\">" + (acc.name || acc.accountId) + "</span>" +
      "<span class=\"ch-status " + status + "\">" + statusText + "</span>";
    list.appendChild(div);
  }

  const dcAccounts = data.channelAccounts.discord || [];
  for (const acc of dcAccounts) {
    const div = document.createElement("div");
    div.className = "channel-item";
    const status = acc.running ? "ch-ok" : "ch-err";
    const statusText = acc.running ? "ON" : "OFF";
    const botName = (acc.bot && acc.bot.username) || acc.accountId;
    div.innerHTML = "<span class=\"ch-icon\">\u{1F4AC}</span>" +
      "<span class=\"ch-name\">" + botName + "</span>" +
      "<span class=\"ch-status " + status + "\">" + statusText + "</span>";
    list.appendChild(div);
  }
}

async function refreshLogs() {
  const data = await fetchJSON("/api/logs");
  const body = document.getElementById("logBody");
  const countEl = document.getElementById("logCount");
  if (!data || !Array.isArray(data) || data.length === 0) {
    body.innerHTML = "<div class=\"log-row\"><span class=\"col-msg\" style=\"grid-column:1/-1;color:var(--text2);\">\uB85C\uADF8 \uB370\uC774\uD130 \uC5C6\uC74C \u2014 \uC5D0\uC774\uC804\uD2B8\uC5D0 \uBA54\uC2DC\uC9C0\uB97C \uBCF4\uB0B4\uBA74 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4</span></div>";
    countEl.textContent = "0\uAC74";
    return;
  }
  countEl.textContent = data.length + "\uAC74";
  body.innerHTML = "";
  for (const log of data.slice(0, 30)) {
    const row = document.createElement("div");
    row.className = "log-row";
    const time = log.ts ? new Date(log.ts).toLocaleTimeString("ko-KR",{hour12:false}) : (log.time || "--");
    const agent = log.agentId || log.agent || "--";
    const event = log.event || log.type || log.level || "--";
    const msg = log.message || log.msg || log.text || JSON.stringify(log).slice(0,80);
    row.innerHTML = "<span class=\"log-col col-time\">" + time + "</span>" +
      "<span class=\"log-col col-agent\">" + agent + "</span>" +
      "<span class=\"log-col col-event\">" + event + "</span>" +
      "<span class=\"log-col col-msg\">" + msg + "</span>";
    body.appendChild(row);
  }
}

async function refreshAll() {
  await Promise.all([
    refreshHealth(),
    refreshAgents(),
    refreshUsage(),
    refreshChannels(),
    refreshLogs()
  ]);
}

refreshAll();
setInterval(refreshAll, 10000);
