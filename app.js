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
  if (!score) {
    return `
      <div class="cell score-total">—</div>
      <div class="cell score-parts">—</div>
    `;
  }

  return `
    <div class="cell score-total">${escapeHtml(score.total)}/5</div>
    <div class="cell score-parts">(${escapeHtml(score.parts.join(", "))})</div>
  `;
}

function parseComments(value) {
  if (!value) return [];

  return String(value)
    .split(/\n|;|,/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function renderCommentBlocks(value) {
  const items = parseComments(value);

  if (!items.length) {
    return `<div class="comment-empty">—</div>`;
  }

  return `
    <div class="comment-blocks">
      ${items.map(item => `
        <div class="comment-card">
          ${escapeHtml(item)}
        </div>
      `).join("")}
    </div>
  `;
}

function renderMetricRow(label, score, info, striped = false) {
  return `
    <div class="metric-row${striped ? " striped" : ""}">
      ${renderLabel(label, info)}
      <div class="cell cell-bar">${renderBar(score)}</div>
      ${renderScore(score)}
    </div>
  `;
}
function renderBar(score) {
  if (!score || score.total == null) {
    return `<div class="bar"><div class="fill" style="width: 0%;"></div></div>`;
  }

  const percentage = Math.max(0, Math.min(100, (score.total / 5) * 100));
  return `
    <div class="bar">
      <div class="fill" style="width: ${percentage}%;"></div>
    </div>
  `;
}

function renderLabel(label, info) {
  return `
    <div class="cell cell-label label-with-info">
      <span>${escapeHtml(label)}</span>
      <span class="info-trigger" tabindex="0" aria-label="More info">
        ⓘ
        <span class="info-tooltip no-print">${escapeHtml(info)}</span>
      </span>
    </div>
  `;
}
function bindPdfButton() {
  const btn = document.getElementById("downloadPdfBtn");
  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", async () => {
    const report = document.getElementById("report");
    if (!report) return;

    const participantId =
      document.querySelector("[data-participant-id]")?.getAttribute("data-participant-id") ||
      "participant-report";

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${participantId}-assessment-results.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Remove anything outside the report that may carry unsupported images
          clonedDoc.body.style.background = "#ffffff";

          // Strip background images in the clone
          clonedDoc.querySelectorAll("*").forEach((el) => {
            const style = clonedDoc.defaultView.getComputedStyle(el);
            if (style.backgroundImage && style.backgroundImage !== "none") {
              el.style.backgroundImage = "none";
            }
          });

          // Hide tooltips / interactive UI in the clone
          clonedDoc.querySelectorAll(".no-print, .info-tooltip, .info-trigger").forEach((el) => {
            el.remove();
          });

          // Force clean PDF colors
          clonedDoc.querySelectorAll(".card, #report, body").forEach((el) => {
            el.style.background = "#ffffff";
            el.style.color = "#000000";
            el.style.boxShadow = "none";
          });
        }
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      },
      pagebreak: {
        mode: ["css", "legacy"]
      }
    };

    await html2pdf().set(opt).from(report).save();
  });
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
  <div id="report" data-participant-id="${escapeHtml(participant.participantId)}">
    <div class="card pdf-card">
      <h2>Your Results</h2>
      <div class="participant-info">
        <p>Participant ID: <b>${escapeHtml(participant.participantId)}</b></p>
        <p>Judge Count: <b>${escapeHtml(participant.judgeCount)}</b></p>
      </div>

      <div class="results-grid table-like">
        <div class="header-cell">Category</div>
        <div class="header-cell">Score Bar</div>
        <div class="header-cell">Total</div>
        <div class="header-cell">Individual Scores</div>

        ${renderMetricRow(
          "Evidenced & Relevant",
          participant.evidencedRelevant,
          "How well the participant supported their ideas with evidence and made them relevant to the audience.",
          false
        )}
        ${renderMetricRow(
          "Hit With Impact",
          participant.hitImpact,
          "How effectively the participant delivered their message and influenced the audience.",
          true
        )}
        ${renderMetricRow(
          "80/10/10",
          participant.eightyTen,
          "The participant's ability to balance different aspects of their presentation.",
          false
        )}
        ${renderMetricRow(
          "Hackathon",
          participant.hackaThon,
          "The participant's performance during the hackathon challenge.",
          true
        )}
        ${renderMetricRow(
          "Make It Real",
          participant.makeReal,
          "The participant's ability to turn ideas into actionable plans.",
          false
        )}
        ${renderMetricRow(
          "From Knowing To Doing",
          participant.knowingDoing,
          "The participant's ability to apply their knowledge in practical situations.",
          true
        )}
        ${renderMetricRow(
          "Memories",
          participant.memOries,
          "The participant's ability to create lasting impressions.",
          false
        )}
      </div>
    </div>

    <div class="card pdf-card">
      <h2>What you did well</h2>
      ${renderCommentBlocks(participant.didWell)}
    </div>

    <div class="card pdf-card">
      <h2>Gaps</h2>
      ${renderCommentBlocks(participant.gaps)}
    </div>

    <div class="no-print">
      <button id="downloadPdfBtn">Download PDF</button>
    </div>
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
        bindPdfButton();
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