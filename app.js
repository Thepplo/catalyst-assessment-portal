const WORKER_BASE = "https://orange-silence-c9d4.theo-4e3.workers.dev/";

function qs() {
  return new URLSearchParams(location.search);
}

function setQueryParams(params) {
  const url = new URL(location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  history.replaceState({}, "", url.toString());
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderScore(score) {
  if (!score) return "—";

  return `
    <div>
      <strong>${score.total}</strong>
      <span class="muted">(${score.parts.join(", ")})</span>
    </div>
  `;
}

function renderBar(score) {
  if (!score) return "—";

  const percentage = Math.round((score.total / 5) * 100);
  return `
    <div class="bar">
      <div class="fill" style="width: ${percentage}%;"></div>
    </div>
  `;
}

async function fetchResults({ participantId, code }) {
  const url = new URL(WORKER_BASE);
  url.searchParams.set("participantId", participantId);
  url.searchParams.set("code", code);

  const resp = await fetch(url.toString(), { method: "GET" });
  const text = await resp.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${resp.status}): ${text.slice(0, 200)}`);
  }

  if (!resp.ok) {
    throw new Error(data.error || `API error (${resp.status})`);
  }

  return data;
}

function renderParticipant(participant) {
  return `
    <div class="card">
      <h2>Your Results</h2>
      <div class="participant-info">
        <p>Participant ID: <b>${escapeHtml(participant.participantId)}</b></p>
        <p>Judge Count: <b>${escapeHtml(participant.judgeCount)}</b></p>
      </div>
      <div class="results-grid">
        <div class="font-semibold">Evidenced & Relevant</div>
        <div>${renderBar(participant.evidencedRelevant)}</div>
        <div>${renderScore(participant.evidencedRelevant)}</div>

        <div class="font-semibold">Hit With Impact</div>
        <div>${renderBar(participant.hitImpact)}</div>
        <div>${renderScore(participant.hitImpact)}</div>

        <div class="font-semibold">80/10/10</div>
        <div>${renderBar(participant.eightyTen)}</div>
        <div>${renderScore(participant.eightyTen)}</div>

        <div class="font-semibold">Hackathon</div>
        <div>${renderBar(participant.hackaThon)}</div>
        <div>${renderScore(participant.hackaThon)}</div>

        <div class="font-semibold">Make It Real</div>
        <div>${renderBar(participant.makeReal)}</div>
        <div>${renderScore(participant.makeReal)}</div>

        <div class="font-semibold">From Knowing To Doing</div>
        <div>${renderBar(participant.knowingDoing)}</div>
        <div>${renderScore(participant.knowingDoing)}</div>

        <div class="font-semibold">Memories</div>
        <div>${renderBar(participant.memOries)}</div>
        <div>${renderScore(participant.memOries)}</div>
      </div>
    </div>
    <div class="card">
      <h3>What you did well</h3>
      <p>${escapeHtml(participant.didWell || "—")}</p>
    </div>

    <div class="card">
      <h3>Gaps</h3>
      <p>${escapeHtml(participant.gaps || "—")}</p>
    </div>
  `;
}

async function run() {
  const app = document.getElementById("app");
  const params = qs();

  const participantId = params.get("participantId");
  const loginCard = document.getElementById("login-card");
  const loginPage = document.getElementById("login-page");
  const loadBtn = document.getElementById("loadBtn");

  if (!loadBtn.dataset.bound) {
    loadBtn.dataset.bound = "1";
    loadBtn.addEventListener("click", async () => {
      const p = document.getElementById("participantIdInput").value.trim();
      const c = document.getElementById("codeInput").value.trim();

      if (!p) return alert("participantId is required");
      if (!c) return alert("access code is required");

      try {
        const data = await fetchResults({ participantId: p, code: c });
        setQueryParams({ participantId: p });
        loginPage.style.display = "none";
        loginCard.style.display = "none";
        app.innerHTML = renderParticipant(data.participant);
      } catch (err) {
        app.textContent = `Error: ${err.message}`;
      }
    });
  }

  if (!participantId) {
    loginPage.style.display = "flex";
    loginCard.style.display = "flex";
    return;
  }

  document.getElementById("participantIdInput").value = participantId;
  loginPage.style.display = "flex";
  loginCard.style.display = "flex";
}

run().catch(err => {
  document.getElementById("app").textContent = `Error: ${err.message}`;
});