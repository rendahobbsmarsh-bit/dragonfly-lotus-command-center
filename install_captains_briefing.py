from pathlib import Path
import re

root = Path(".")
html_path = root / "index.html"
css_path = root / "styles.css"
js_path = root / "app.js"

html = html_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")
js = js_path.read_text(encoding="utf-8")

briefing_html = """
<section class="card wide captains-briefing" id="captainsBriefing">
  <div class="captains-briefing-top">
    <div>
      <small>DAILY COMMAND OVERVIEW</small>
      <h2 id="captainGreeting">Captain Ren's Briefing</h2>
      <p id="captainDate"></p>
    </div>
    <span id="captainMode">HOME MODE</span>
  </div>

  <div class="captain-mission">
    <small>TODAY'S MISSION</small>
    <strong id="captainMission">Set today's mission below.</strong>
  </div>

  <div class="captain-grid">
    <article><small>FLIGHT PLAN</small><strong id="captainFlight">No flight entered</strong><span id="captainTimes">Times not set</span></article>
    <article><small>WATER</small><strong id="captainWater">0 / 128 oz</strong></article>
    <article><small>PROTEIN</small><strong id="captainProtein">0 / 170 g</strong></article>
    <article><small>EXERCISE</small><strong id="captainExercise">Not complete</strong></article>
    <article><small>NEXT COUNTDOWN</small><strong id="captainCountdown">No active countdown</strong><span id="captainCountdownDays">Add a date below</span></article>
    <article><small>DRAGONFLY BLISS</small><strong id="captainBliss">0 of 6 complete</strong></article>
  </div>
</section>
"""

briefing_css = """
/* Captain's Briefing */
.captains-briefing{grid-column:1/-1;border-color:rgba(226,183,104,.3)}
.captains-briefing-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.captains-briefing-top p{margin:6px 0 0;color:#a9c2c4}
#captainMode{padding:9px 14px;border:1px solid rgba(89,199,190,.42);border-radius:999px;background:rgba(89,199,190,.11);color:#8ce1da;font-size:.72rem;font-weight:800;letter-spacing:.08em;white-space:nowrap}
.captain-mission{margin-top:18px;padding:17px;border:1px solid rgba(226,183,104,.25);border-radius:16px;background:rgba(226,183,104,.065)}
.captain-mission small,.captain-grid small{display:block;color:#d7b66f;font-size:.68rem;font-weight:800;letter-spacing:.1em}
.captain-mission strong{display:block;margin-top:7px;color:#f6f2e8;font-size:1.2rem}
.captain-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:16px}
.captain-grid article{padding:16px;border:1px solid rgba(255,255,255,.085);border-radius:16px;background:rgba(255,255,255,.03)}
.captain-grid strong{display:block;margin-top:6px;color:#f6f2e8}
.captain-grid span{display:block;margin-top:5px;color:#9eb4b6;font-size:.8rem}
@media(max-width:900px){.captain-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.captains-briefing-top{flex-direction:column}.captain-grid{grid-template-columns:1fr}}
"""

briefing_js = r"""
// Captain's Briefing
function readCaptainStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function setCaptainText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function captainTime(value) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function updateCaptainsBriefing() {
  const state = readCaptainStorage("dragonfly-lotus-v1", {});
  const health = readCaptainStorage("dragonflyLotusHealthDashboard", {});
  const flight = readCaptainStorage("dragonflyLotusFlightOperations", {});
  const countdowns = readCaptainStorage("dragonflyLotusCountdowns", []);
  const bliss = readCaptainStorage("dragonflyLotusBliss", {});

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  setCaptainText("captainGreeting", `${greeting}, Captain Ren`);
  setCaptainText("captainDate", now.toLocaleDateString([], { weekday:"long", month:"long", day:"numeric", year:"numeric" }));

  const mode = String(state.mode || "home").toUpperCase();
  setCaptainText("captainMode", `${mode} MODE`);
  setCaptainText("captainMission", (state.mission || "").trim() || "Set today's mission below.");

  const flightNumber = (flight.opsFlightNumber || "").trim();
  const route = (flight.opsRoute || "").trim();
  setCaptainText("captainFlight", [flightNumber, route].filter(Boolean).join(" • ") || "No flight entered");

  const times = [];
  if (state.leaveTime) times.push(`Leave ${captainTime(state.leaveTime)}`);
  if (state.reportTime) times.push(`Report ${captainTime(state.reportTime)}`);
  setCaptainText("captainTimes", times.join(" • ") || "Times not set");

  const water = Number(health.waterValue ?? state.water ?? 0) || 0;
  const protein = Number(health.proteinValue ?? state.protein ?? 0) || 0;
  const exercise = Boolean(health.exerciseComplete ?? state.exercise);
  setCaptainText("captainWater", `${water} / 128 oz`);
  setCaptainText("captainProtein", `${protein} / 170 g`);
  setCaptainText("captainExercise", exercise ? "Complete" : "Not complete");

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const active = Array.isArray(countdowns) ? countdowns.map(item => {
    const date = new Date(`${item.date}T00:00:00`);
    return { ...item, days: Math.round((date - today) / 86400000) };
  }).filter(item => Number.isFinite(item.days) && item.days >= 0).sort((a,b) => a.days-b.days) : [];

  if (active[0]) {
    setCaptainText("captainCountdown", active[0].name || active[0].event || "Upcoming event");
    setCaptainText("captainCountdownDays", active[0].days === 0 ? "Today" : `${active[0].days} day${active[0].days === 1 ? "" : "s"} remaining`);
  } else {
    setCaptainText("captainCountdown", "No active countdown");
    setCaptainText("captainCountdownDays", "Add a date below");
  }

  const done = ["blissHomeDone","blissGardenDone","blissPhotographyDone","blissMealPrepDone","blissLaundryDone","blissWorkoutDone"]
    .filter(id => Boolean(bliss[id])).length;
  setCaptainText("captainBliss", `${done} of 6 complete`);
}

function initializeCaptainsBriefing() {
  updateCaptainsBriefing();
  document.addEventListener("input", () => setTimeout(updateCaptainsBriefing, 0));
  document.addEventListener("change", () => setTimeout(updateCaptainsBriefing, 0));
  setInterval(updateCaptainsBriefing, 60000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCaptainsBriefing, { once:true });
} else {
  initializeCaptainsBriefing();
}
"""

if 'id="captainsBriefing"' not in html:
    m = re.search(r"<main[^>]*>", html)
    if not m:
        raise SystemExit("Could not find the <main> tag.")
    html = html[:m.end()] + "\n" + briefing_html + html[m.end():]

if "/* Captain's Briefing */" not in css:
    css += "\n" + briefing_css

if "function updateCaptainsBriefing()" not in js:
    js += "\n" + briefing_js

html = re.sub(
    r'<script\s+src="app\.js(?:\?[^"]*)?"></script>',
    '<script src="app.js?v=20260721-captain-safe"></script>',
    html
)

html_path.write_text(html, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
js_path.write_text(js, encoding="utf-8")

print("Captain's Briefing installed.")
