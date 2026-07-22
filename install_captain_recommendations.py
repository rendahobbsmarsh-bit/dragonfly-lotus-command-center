from pathlib import Path
import re

root = Path(".")
html_path = root / "index.html"
css_path = root / "styles.css"
js_path = root / "app.js"

for path in (html_path, css_path, js_path):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path.name}")

html = html_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")
js = js_path.read_text(encoding="utf-8")

recommendations_html = """
<section class="card wide captain-recommendations" id="captainRecommendations">
  <div class="recommendations-heading">
    <div>
      <small>QUIET GUIDANCE</small>
      <h2>Captain's Recommendations</h2>
      <p>What deserves your attention next, based on today's dashboard.</p>
    </div>
    <span class="recommendations-status" id="recommendationsStatus">SYSTEMS REVIEW</span>
  </div>

  <div class="recommendations-list" id="recommendationsList" aria-live="polite">
    <article class="recommendation-item">
      <span class="recommendation-icon">✦</span>
      <div>
        <strong>Reviewing today's flight deck</strong>
        <p>Your guidance will appear here.</p>
      </div>
    </article>
  </div>
</section>
"""

recommendations_css = """
/* Captain's Recommendations */
.captain-recommendations{
  grid-column:1/-1;
  border-color:rgba(89,199,190,.24);
  background:
    radial-gradient(circle at top left,rgba(89,199,190,.08),transparent 36%),
    rgba(255,255,255,.025);
}
.recommendations-heading{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:18px;
}
.recommendations-heading p{
  margin:7px 0 0;
  color:#a9c2c4;
}
.recommendations-status{
  padding:9px 14px;
  border:1px solid rgba(226,183,104,.36);
  border-radius:999px;
  background:rgba(226,183,104,.08);
  color:#e2b768;
  font-size:.72rem;
  font-weight:800;
  letter-spacing:.08em;
  white-space:nowrap;
}
.recommendations-list{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:13px;
  margin-top:18px;
}
.recommendation-item{
  display:flex;
  gap:13px;
  align-items:flex-start;
  padding:16px;
  border:1px solid rgba(255,255,255,.085);
  border-radius:16px;
  background:rgba(255,255,255,.03);
}
.recommendation-icon{
  display:grid;
  width:40px;
  height:40px;
  place-items:center;
  flex:0 0 auto;
  border-radius:13px;
  background:rgba(89,199,190,.09);
  font-size:1.15rem;
}
.recommendation-item strong{
  display:block;
  color:#f6f2e8;
}
.recommendation-item p{
  margin:5px 0 0;
  color:#9eb4b6;
  font-size:.84rem;
  line-height:1.45;
}
.recommendation-item.priority{
  border-color:rgba(226,183,104,.32);
  background:rgba(226,183,104,.055);
}
.recommendation-item.success{
  border-color:rgba(89,199,190,.32);
  background:rgba(89,199,190,.055);
}
@media(max-width:720px){
  .recommendations-heading{flex-direction:column}
  .recommendations-list{grid-template-columns:1fr}
}
"""

recommendations_js = r"""
// Captain's Recommendations
function recommendationsReadStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function recommendationsNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function recommendationsDaysUntil(dateValue) {
  if (!dateValue) return null;

  const parts = String(dateValue).split("-").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
    return null;
  }

  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((target - today) / 86400000);
}

function recommendationCard(icon, title, detail, tone = "") {
  return `
    <article class="recommendation-item ${tone}">
      <span class="recommendation-icon">${icon}</span>
      <div>
        <strong>${title}</strong>
        <p>${detail}</p>
      </div>
    </article>
  `;
}

function updateCaptainRecommendations() {
  const list = document.getElementById("recommendationsList");
  const status = document.getElementById("recommendationsStatus");
  if (!list) return;

  const state = recommendationsReadStorage("dragonfly-lotus-v1", {});
  const health = recommendationsReadStorage("dragonflyLotusHealthDashboard", {});
  const flight = recommendationsReadStorage("dragonflyLotusFlightOperations", {});
  const countdowns = recommendationsReadStorage("dragonflyLotusCountdowns", []);
  const bliss = recommendationsReadStorage("dragonflyLotusBliss", {});

  const recommendations = [];
  const mode = String(state.mode || "home").toLowerCase();

  const water = Math.max(
    0,
    recommendationsNumber(
      health.waterValue,
      health.water,
      state.water
    )
  );

  const protein = Math.max(
    0,
    recommendationsNumber(
      health.proteinValue,
      health.protein,
      state.protein
    )
  );

  const exercise = Boolean(
    health.exerciseComplete ??
    health.exercise ??
    state.exercise
  );

  if (water < 64) {
    recommendations.push({
      icon: "💧",
      title: "Bring water forward",
      detail: `You are at ${water} of 128 oz. Your next simple move is one full bottle or two airplane waters.`,
      tone: "priority"
    });
  } else if (water < 128) {
    recommendations.push({
      icon: "💧",
      title: "Water goal is within reach",
      detail: `${128 - water} oz remain. Keep a bottle visible and finish the next serving before changing tasks.`
    });
  }

  if (protein < 85) {
    recommendations.push({
      icon: "🥤",
      title: "Anchor the next meal with protein",
      detail: `You are at ${protein} of 170 g. Choose one dependable protein source before adding extras.`,
      tone: "priority"
    });
  } else if (protein < 170) {
    recommendations.push({
      icon: "🥤",
      title: "Protect your protein momentum",
      detail: `${170 - protein} g remain. Plan one protein-forward meal or Devotion serving.`
    });
  }

  if (!exercise) {
    recommendations.push({
      icon: "💪",
      title: mode === "turbulence" ? "Choose gentle movement" : "Put movement on the flight path",
      detail: mode === "turbulence"
        ? "A short stretch, mobility session or recovery walk is enough today."
        : "A focused workout, walk or mobility session will complete this instrument."
    });
  }

  const activeCountdowns = Array.isArray(countdowns)
    ? countdowns
        .map(item => ({
          ...item,
          days: recommendationsDaysUntil(item.date)
        }))
        .filter(item => item.days !== null && item.days >= 0)
        .sort((a, b) => a.days - b.days)
    : [];

  const nextCountdown = activeCountdowns[0];
  if (nextCountdown && nextCountdown.days <= 14) {
    const name = nextCountdown.name || nextCountdown.event || "Your next event";
    recommendations.push({
      icon: "📅",
      title: nextCountdown.days === 0 ? `${name} is today` : `${name} is approaching`,
      detail: nextCountdown.days === 0
        ? "Review the final details and protect enough transition time."
        : `${nextCountdown.days} day${nextCountdown.days === 1 ? "" : "s"} remain. Choose one preparation step for today.`,
      tone: nextCountdown.days <= 3 ? "priority" : ""
    });
  }

  const blissAreas = [
    ["blissHomeDone", "Home"],
    ["blissGardenDone", "Garden"],
    ["blissPhotographyDone", "Photography"],
    ["blissMealPrepDone", "Meal prep"],
    ["blissLaundryDone", "Laundry"],
    ["blissWorkoutDone", "Workout"]
  ];

  const incompleteBliss = blissAreas.filter(([id]) => !Boolean(bliss[id]));
  const completedBliss = blissAreas.length - incompleteBliss.length;

  if (mode === "home" && incompleteBliss.length > 0) {
    const focus = incompleteBliss[0][1];
    recommendations.push({
      icon: "🌿",
      title: `A gentle ${focus.toLowerCase()} win fits Home Mode`,
      detail: `${completedBliss} of 6 Dragonfly Bliss areas are complete. One small ${focus.toLowerCase()} action is enough.`
    });
  }

  const hasFlight =
    Boolean((flight.opsFlightNumber || "").trim()) ||
    Boolean((flight.opsRoute || "").trim());

  if (mode === "flight" && !hasFlight) {
    recommendations.push({
      icon: "✈️",
      title: "Complete the flight picture",
      detail: "Add the flight number or route so the briefing can carry your operational details.",
      tone: "priority"
    });
  }

  if (!(state.mission || "").trim()) {
    recommendations.push({
      icon: "🎯",
      title: "Name one mission",
      detail: "Choose the single outcome that would make today feel intentionally flown."
    });
  }

  const visible = recommendations.slice(0, 4);

  if (visible.length === 0) {
    visible.push({
      icon: "✓",
      title: "All primary systems are steady",
      detail: "Your core goals are in good shape. Protect your pace and enjoy the day you built.",
      tone: "success"
    });
  }

  list.innerHTML = visible
    .map(item => recommendationCard(item.icon, item.title, item.detail, item.tone))
    .join("");

  if (status) {
    const priorityCount = visible.filter(item => item.tone === "priority").length;
    status.textContent = priorityCount
      ? `${priorityCount} PRIORITY ${priorityCount === 1 ? "ITEM" : "ITEMS"}`
      : "STEADY GUIDANCE";
  }
}

function initializeCaptainRecommendations() {
  updateCaptainRecommendations();

  document.addEventListener("input", () => {
    setTimeout(updateCaptainRecommendations, 0);
  });

  document.addEventListener("change", () => {
    setTimeout(updateCaptainRecommendations, 0);
  });

  window.addEventListener("storage", updateCaptainRecommendations);
  setInterval(updateCaptainRecommendations, 60000);
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeCaptainRecommendations,
    { once: true }
  );
} else {
  initializeCaptainRecommendations();
}
"""

if 'id="captainRecommendations"' not in html:
    captain_end = re.search(
        r'<section[^>]+id="captainsBriefing"[\s\S]*?</section>',
        html
    )

    if captain_end:
        insert_at = captain_end.end()
        html = html[:insert_at] + "\n" + recommendations_html + html[insert_at:]
    else:
        main_match = re.search(r"<main[^>]*>", html)
        if not main_match:
            raise SystemExit("Could not find Captain's Briefing or the <main> tag.")
        insert_at = main_match.end()
        html = html[:insert_at] + "\n" + recommendations_html + html[insert_at:]

if "/* Captain's Recommendations */" not in css:
    css += "\n" + recommendations_css

if "function updateCaptainRecommendations()" not in js:
    js += "\n" + recommendations_js

html = re.sub(
    r'<script\s+src="app\.js(?:\?[^"]*)?"></script>',
    '<script src="app.js?v=20260721-captain-recommendations"></script>',
    html
)

html_path.write_text(html, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
js_path.write_text(js, encoding="utf-8")

print("Captain's Recommendations installed successfully.")
