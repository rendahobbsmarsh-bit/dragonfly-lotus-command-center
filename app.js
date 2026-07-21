const KEY="dragonfly-lotus-v1";
const defaults={
 mode:"home",mission:"",reportTime:"",leaveTime:"",pairing:"2 days",
 current:"",next:"",later:"",water:0,protein:0,exercise:false,
 workout:"",weight:"",photo:"",
 tasks:["Stretch","Take one photo","Read 20 minutes","10 minutes of sunshine"]
   .map(text=>({id:crypto.randomUUID(),text,done:false})),
 bills:[]
};
let state={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));

function clock(){
 const now=new Date();
 $("#time").textContent=now.toLocaleTimeString([],{
   hour:"numeric",minute:"2-digit"
 });
 $("#date").textContent=now.toLocaleDateString([],{
   weekday:"long",month:"long",day:"numeric",year:"numeric"
 });
 countdown(now);
}

function countdown(now=new Date()){
 if(!state.leaveTime){
   $("#countdown").textContent="Set leave-home time"; return;
 }
 const [h,m]=state.leaveTime.split(":").map(Number);
 const target=new Date(now);
 target.setHours(h,m,0,0);
 if(target<now) target.setDate(target.getDate()+1);
 const mins=Math.floor((target-now)/60000);
 $("#countdown").textContent=`${Math.floor(mins/60)}h ${mins%60}m`;
}

function bind(id,key,event="input"){
 const el=$(id);
 el.value=state[key]??"";
 el.addEventListener(event,e=>{
   state[key]=e.target.value; save();
   if(key==="leaveTime") countdown();
 });
}

const modeData={
 home:["HOME","Dragonfly Bliss",[
   "Laundry / linen / lawn rotation",
   "Home project or garden focus",
   "Meal prep and food bag reset"
 ]],
 flight:["FLIGHT","Ready for Departure",[
   "Crew badge, passport, chargers and camera",
   "Food bag and water ready",
   "Confirm report time, airport, van and hotel"
 ]],
 turbulence:["EASE","Turbulence Protocol",[
   "Choose one essential mission",
   "Hydrate, eat and take medication",
   "Everything else may move to later"
 ]]
};

function setMode(mode){
 state.mode=mode; save();
 $$(".mode").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
 const [badge,title,notes]=modeData[mode];
 $("#modeBadge").textContent=badge;
 $("#modeTitle").textContent=title;
 $("#modeNotes").innerHTML=notes.map(n=>`<div>${n}</div>`).join("");
}

function renderTasks(){
 $("#tasks").innerHTML="";
 state.tasks.forEach(task=>{
   const li=document.createElement("li");
   li.className=task.done?"done":"";
   li.innerHTML=`<input type="checkbox" ${task.done?"checked":""}>
     <span></span><button type="button">✕</button>`;
   li.querySelector("span").textContent=task.text;
   li.querySelector("input").onchange=e=>{
     task.done=e.target.checked; save(); renderTasks();
   };
   li.querySelector("button").onclick=()=>{
     state.tasks=state.tasks.filter(t=>t.id!==task.id);
     save(); renderTasks();
   };
   $("#tasks").append(li);
 });
}

function renderHealth(){
 $("#water").textContent=state.water;
 $("#protein").textContent=state.protein;
 $("#waterBar").value=state.water;
 $("#proteinBar").value=state.protein;
 $("#exercise").checked=state.exercise;
}

function renderBills(){
 $("#bills").innerHTML="";
 [...state.bills].sort((a,b)=>a.date.localeCompare(b.date)).forEach(bill=>{
   const li=document.createElement("li");
   li.className=bill.paid?"done":"";
   const amount=bill.amount?` • $${Number(bill.amount).toFixed(2)}`:"";
   li.innerHTML=`<input type="checkbox" ${bill.paid?"checked":""}>
     <span></span><button type="button">✕</button>`;
   li.querySelector("span").textContent=
     `${bill.name} — ${bill.date}${amount}`;
   li.querySelector("input").onchange=e=>{
     bill.paid=e.target.checked; save(); renderBills();
   };
   li.querySelector("button").onclick=()=>{
     state.bills=state.bills.filter(b=>b.id!==bill.id);
     save(); renderBills();
   };
   $("#bills").append(li);
 });
}

bind("#mission","mission");
bind("#reportTime","reportTime","change");
bind("#leaveTime","leaveTime","change");
bind("#pairing","pairing","change");
bind("#current","current");
bind("#next","next");
bind("#later","later");
bind("#workout","workout");
bind("#weight","weight");
bind("#photo","photo");

$$(".mode").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

$("#taskForm").onsubmit=e=>{
 e.preventDefault();
 const input=$("#taskInput");
 if(!input.value.trim()) return;
 state.tasks.push({
   id:crypto.randomUUID(),text:input.value.trim(),done:false
 });
 input.value=""; save(); renderTasks();
};

$$("[data-water]").forEach(b=>b.onclick=()=>{
 state.water=Math.max(0,state.water+Number(b.dataset.water));
 save(); renderHealth();
});

$$("[data-protein]").forEach(b=>b.onclick=()=>{
 state.protein=Math.max(0,state.protein+Number(b.dataset.protein));
 save(); renderHealth();
});

$("#exercise").onchange=e=>{
 state.exercise=e.target.checked; save();
};

$("#billForm").onsubmit=e=>{
 e.preventDefault();
 const name=$("#billName"), amount=$("#billAmount"), date=$("#billDate");
 state.bills.push({
   id:crypto.randomUUID(),name:name.value.trim(),
   amount:amount.value,date:date.value,paid:false
 });
 e.target.reset(); save(); renderBills();
};


bind("#appointmentPurpose","appointmentPurpose");
bind("#appointmentQuestions","appointmentQuestions");
bind("#appointmentNotes","appointmentNotes");
bind("#followUpDate","followUpDate","change");
bind("#appointmentNextStep","appointmentNextStep");

setMode(state.mode);
renderTasks();
renderHealth();
renderBills();
clock();
setInterval(clock,1000);


// Flight Operations autosave
const FLIGHT_OPERATIONS_KEY = "dragonflyLotusFlightOperations";

const flightOperationIds = [
  "opsFlightNumber",
  "opsRoute",
  "opsAircraft",
  "opsPosition",
  "opsLayover",
  "opsVanTime",
  "opsHotel",
  "opsCrewNotes"
];

function initializeFlightOperations() {
  let saved = {};

  try {
    saved = JSON.parse(
      localStorage.getItem(FLIGHT_OPERATIONS_KEY) || "{}"
    );
  } catch (error) {
    console.warn("Flight Operations could not be loaded.", error);
  }

  flightOperationIds.forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;

    field.value = saved[id] || "";

    const save = () => {
      const current = {};

      flightOperationIds.forEach(fieldId => {
        const currentField = document.getElementById(fieldId);
        current[fieldId] = currentField ? currentField.value : "";
      });

      localStorage.setItem(
        FLIGHT_OPERATIONS_KEY,
        JSON.stringify(current)
      );
    };

    field.addEventListener("input", save);
    field.addEventListener("change", save);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeFlightOperations, { once: true });
} else {
  initializeFlightOperations();
}


// Health Dashboard autosave
const HEALTH_STORAGE_KEY = "dragonflyLotusHealthDashboard";

const healthIds = [
  "waterValue",
  "proteinValue",
  "weightValue",
  "sleepValue",
  "exerciseComplete",
  "healthNotes"
];

function updateHealthProgress() {
  const waterField = document.getElementById("waterValue");
  const proteinField = document.getElementById("proteinValue");
  const exerciseField = document.getElementById("exerciseComplete");

  const water = Math.max(0, Number(waterField?.value || 0));
  const protein = Math.max(0, Number(proteinField?.value || 0));

  const waterDisplay = document.getElementById("waterDisplay");
  const proteinDisplay = document.getElementById("proteinDisplay");
  const waterProgress = document.getElementById("waterProgress");
  const proteinProgress = document.getElementById("proteinProgress");
  const status = document.getElementById("healthStatus");

  if (waterDisplay) waterDisplay.textContent = water;
  if (proteinDisplay) proteinDisplay.textContent = protein;

  if (waterProgress) {
    waterProgress.style.width = `${Math.min(100, (water / 128) * 100)}%`;
  }

  if (proteinProgress) {
    proteinProgress.style.width = `${Math.min(100, (protein / 170) * 100)}%`;
  }

  if (status) {
    if (water >= 128 && protein >= 170 && exerciseField?.checked) {
      status.textContent = "GOALS COMPLETE";
    } else if (water > 0 || protein > 0 || exerciseField?.checked) {
      status.textContent = "IN PROGRESS";
    } else {
      status.textContent = "DAILY PROGRESS";
    }
  }
}

function saveHealthDashboard() {
  const saved = {};

  healthIds.forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;

    saved[id] =
      field.type === "checkbox"
        ? field.checked
        : field.value;
  });

  localStorage.setItem(
    HEALTH_STORAGE_KEY,
    JSON.stringify(saved)
  );

  updateHealthProgress();
}

function initializeHealthDashboard() {
  let saved = {};

  try {
    saved = JSON.parse(
      localStorage.getItem(HEALTH_STORAGE_KEY) || "{}"
    );
  } catch (error) {
    console.warn("Health Dashboard could not be loaded.", error);
  }

  healthIds.forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;

    if (field.type === "checkbox") {
      field.checked = Boolean(saved[id]);
    } else {
      field.value = saved[id] || "";
    }

    field.addEventListener("input", saveHealthDashboard);
    field.addEventListener("change", saveHealthDashboard);
  });

  updateHealthProgress();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeHealthDashboard, { once: true });
} else {
  initializeHealthDashboard();
}


// Countdown Center
const COUNTDOWN_STORAGE_KEY = "dragonflyLotusCountdowns";

function loadCountdowns() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(COUNTDOWN_STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Countdowns could not be loaded.", error);
    return [];
  }
}

let countdownItems = loadCountdowns();

function saveCountdowns() {
  localStorage.setItem(
    COUNTDOWN_STORAGE_KEY,
    JSON.stringify(countdownItems)
  );
}

function localDateFromInput(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
}

function calculateDaysRemaining(dateValue) {
  const target = localDateFromInput(dateValue);
  const today = startOfToday();
  return Math.round((target - today) / 86400000);
}

function formatCountdownDate(dateValue) {
  return localDateFromInput(dateValue).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function countdownLabel(days) {
  if (days === 0) {
    return {
      number: "TODAY",
      label: "ARRIVED"
    };
  }

  if (days === 1) {
    return {
      number: "1",
      label: "DAY"
    };
  }

  if (days > 1) {
    return {
      number: String(days),
      label: "DAYS"
    };
  }

  const elapsed = Math.abs(days);

  return {
    number: String(elapsed),
    label: elapsed === 1 ? "DAY AGO" : "DAYS AGO"
  };
}

function renderCountdowns() {
  const list = document.getElementById("countdownList");
  const empty = document.getElementById("countdownEmpty");
  const status = document.getElementById("countdownStatus");

  if (!list || !empty || !status) return;

  list.innerHTML = "";

  countdownItems.sort((a, b) => {
    return a.date.localeCompare(b.date);
  });

  const activeCount = countdownItems.filter(item => {
    return calculateDaysRemaining(item.date) >= 0;
  }).length;

  status.textContent =
    `${activeCount} ACTIVE`;

  empty.hidden = countdownItems.length > 0;

  countdownItems.forEach(item => {
    const days = calculateDaysRemaining(item.date);
    const display = countdownLabel(days);

    const card = document.createElement("article");
    card.className = "countdown-item";

    if (days === 0) {
      card.classList.add("is-today");
    }

    if (days < 0) {
      card.classList.add("is-past");
    }

    const main = document.createElement("div");
    main.className = "countdown-item-main";

    const name = document.createElement("h3");
    name.className = "countdown-item-name";
    name.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = "countdown-item-meta";

    const date = document.createElement("span");
    date.textContent = formatCountdownDate(item.date);

    const category = document.createElement("span");
    category.className = "countdown-category";
    category.textContent = item.category;

    meta.append(date, category);
    main.append(name, meta);

    const daysBlock = document.createElement("div");
    daysBlock.className = "countdown-days";

    const number = document.createElement("strong");
    number.textContent = display.number;

    const label = document.createElement("span");
    label.textContent = display.label;

    daysBlock.append(number, label);

    const deleteButton = document.createElement("button");
    deleteButton.className = "countdown-delete";
    deleteButton.type = "button";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${item.name}`
    );
    deleteButton.textContent = "✕";

    deleteButton.addEventListener("click", () => {
      countdownItems = countdownItems.filter(
        countdown => countdown.id !== item.id
      );

      saveCountdowns();
      renderCountdowns();
    });

    card.append(main, daysBlock, deleteButton);
    list.append(card);
  });
}

function initializeCountdownCenter() {
  const form = document.getElementById("countdownForm");
  const nameField = document.getElementById("countdownName");
  const dateField = document.getElementById("countdownDate");
  const categoryField = document.getElementById("countdownCategory");

  if (!form || !nameField || !dateField || !categoryField) {
    return;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = nameField.value.trim();
    const date = dateField.value;
    const category = categoryField.value;

    if (!name || !date) return;

    countdownItems.push({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      name,
      date,
      category
    });

    saveCountdowns();
    renderCountdowns();

    form.reset();
    categoryField.value = "Personal";
    nameField.focus();
  });

  renderCountdowns();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeCountdownCenter,
    { once: true }
  );
} else {
  initializeCountdownCenter();
}


// Dragonfly Bliss autosave
const BLISS_STORAGE_KEY = "dragonflyLotusBliss";

const blissFieldIds = [
  "blissHome",
  "blissHomeDone",
  "blissGarden",
  "blissGardenDone",
  "blissPhotography",
  "blissPhotographyDone",
  "blissMealPrep",
  "blissMealPrepDone",
  "blissLaundry",
  "blissLaundryDone",
  "blissWorkout",
  "blissWorkoutDone",
  "blissNotes"
];

const blissCompletionIds = [
  "blissHomeDone",
  "blissGardenDone",
  "blissPhotographyDone",
  "blissMealPrepDone",
  "blissLaundryDone",
  "blissWorkoutDone"
];

function loadDragonflyBliss() {
  try {
    return JSON.parse(
      localStorage.getItem(BLISS_STORAGE_KEY) || "{}"
    );
  } catch (error) {
    console.warn("Dragonfly Bliss could not be loaded.", error);
    return {};
  }
}

function updateDragonflyBlissStatus() {
  const status = document.getElementById("blissStatus");

  const completed = blissCompletionIds.filter(id => {
    return document.getElementById(id)?.checked;
  }).length;

  if (status) {
    status.textContent = `${completed} OF 6 COMPLETE`;
  }

  blissCompletionIds.forEach(id => {
    const checkbox = document.getElementById(id);
    const card = checkbox?.closest(".bliss-item");

    if (card) {
      card.classList.toggle(
        "is-complete",
        Boolean(checkbox.checked)
      );
    }
  });
}

function saveDragonflyBliss() {
  const saved = {};

  blissFieldIds.forEach(id => {
    const field = document.getElementById(id);

    if (!field) return;

    saved[id] =
      field.type === "checkbox"
        ? field.checked
        : field.value;
  });

  localStorage.setItem(
    BLISS_STORAGE_KEY,
    JSON.stringify(saved)
  );

  updateDragonflyBlissStatus();
}

function initializeDragonflyBliss() {
  const saved = loadDragonflyBliss();

  blissFieldIds.forEach(id => {
    const field = document.getElementById(id);

    if (!field) return;

    if (field.type === "checkbox") {
      field.checked = Boolean(saved[id]);
    } else {
      field.value = saved[id] || "";
    }

    field.addEventListener("input", saveDragonflyBliss);
    field.addEventListener("change", saveDragonflyBliss);
  });

  updateDragonflyBlissStatus();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeDragonflyBliss,
    { once: true }
  );
} else {
  initializeDragonflyBliss();
}


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
