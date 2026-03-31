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
      <p>Participant ID: <b>${escapeHtml(participant.participantId)}</b></p>
      <p>Judge Count: <b>${escapeHtml(participant.judgeCount)}</b></p>
    </div>

    <div class="card">
      <h3>Results</h3>
      <table>
        <tbody>
          <tr><th>Evidenced Relevant</th><td>${escapeHtml(participant.evidencedRelevant)}</td></tr>
          <tr><th>Hit Impact</th><td>${escapeHtml(participant.hitImpact)}</td></tr>
          <tr><th>Eighty Ten</th><td>${escapeHtml(participant.eightyTen)}</td></tr>
          <tr><th>Hackathon</th><td>${escapeHtml(participant.hackaThon)}</td></tr>
          <tr><th>Make Real</th><td>${escapeHtml(participant.makeReal)}</td></tr>
          <tr><th>Knowing Doing</th><td>${escapeHtml(participant.knowingDoing)}</td></tr>
          <tr><th>Memories</th><td>${escapeHtml(participant.memOries)}</td></tr>
        </tbody>
      </table>
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