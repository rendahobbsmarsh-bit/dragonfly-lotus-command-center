const STORAGE_KEYS = Object.freeze({
  core: "dragonfly-lotus-v1",
  health: "dragonflyLotusHealthDashboard",
  flight: "dragonflyLotusFlightOperations",
  countdowns: "dragonflyLotusCountdowns",
  bliss: "dragonflyLotusBliss",
  learning: "dragonflyLotusLearningHistory",
  missions: "dragonflyLotusMissions"
});

const KEY = STORAGE_KEYS.core;
const HEALTH_STORAGE_KEY = STORAGE_KEYS.health;
const FLIGHT_OPERATIONS_KEY = STORAGE_KEYS.flight;
const COUNTDOWN_STORAGE_KEY = STORAGE_KEYS.countdowns;
const BLISS_STORAGE_KEY = STORAGE_KEYS.bliss;
const LEARNING_STORAGE_KEY = STORAGE_KEYS.learning;
const MISSIONS_STORAGE_KEY = STORAGE_KEYS.missions;
function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch (error) {
    console.warn(`Could not read ${key}.`, error);
    return fallback;
  }
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

const defaults = {
  mode: "home",
  mission: "",
  reportTime: "",
  leaveTime: "",
  pairing: "2 days",
  current: "",
  next: "",
  later: "",
  water: 0,
  protein: 0,
  exercise: false,
  workout: "",
  weight: "",
  photo: "",
  appointmentPurpose: "",
  appointmentQuestions: "",
  appointmentNotes: "",
  followUpDate: "",
  appointmentNextStep: "",
  tasks: ["Stretch", "Take one photo", "Read 20 minutes", "10 minutes of sunshine"]
    .map(text => ({ id: makeId(), text, done: false })),
  bills: []
};

let state = {
  ...defaults,
  ...readStorage(KEY, {})
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function getSavedHealth() {
  const saved = readStorage(HEALTH_STORAGE_KEY, {});
  return {
    waterValue: numberOrZero(saved.waterValue ?? saved.water ?? state.water),
    proteinValue: numberOrZero(saved.proteinValue ?? saved.protein ?? state.protein),
    weightValue: saved.weightValue ?? state.weight ?? "",
    sleepValue: saved.sleepValue ?? "",
    exerciseComplete: Boolean(
      saved.exerciseComplete ?? saved.exercise ?? state.exercise
    ),
    healthNotes: saved.healthNotes ?? ""
  };
}

function getHealthData() {
  const saved = getSavedHealth();
  const live = (id, fallback) => {
    const field = document.getElementById(id);
    if (!field) return fallback;
    return field.type === "checkbox" ? field.checked : field.value;
  };

  return {
    waterValue: numberOrZero(live("waterValue", saved.waterValue)),
    proteinValue: numberOrZero(live("proteinValue", saved.proteinValue)),
    weightValue: live("weightValue", saved.weightValue) ?? "",
    sleepValue: live("sleepValue", saved.sleepValue) ?? "",
    exerciseComplete: Boolean(
      live("exerciseComplete", saved.exerciseComplete)
    ),
    healthNotes: live("healthNotes", saved.healthNotes) ?? ""
  };
}

function saveUnifiedHealth(health = getHealthData()) {
  const normalized = {
    waterValue: numberOrZero(health.waterValue),
    proteinValue: numberOrZero(health.proteinValue),
    weightValue: health.weightValue ?? "",
    sleepValue: health.sleepValue ?? "",
    exerciseComplete: Boolean(health.exerciseComplete),
    healthNotes: health.healthNotes ?? ""
  };

  localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(normalized));

  state.water = normalized.waterValue;
  state.protein = normalized.proteinValue;
  state.weight = normalized.weightValue;
  state.exercise = normalized.exerciseComplete;
  save();

  return normalized;
}

function refreshSharedViews() {
  if (typeof renderHealth === "function") renderHealth();
  if (typeof updateHealthProgress === "function") updateHealthProgress(false);
  if (typeof updateCaptainsBriefing === "function") updateCaptainsBriefing();
  if (typeof updateCaptainRecommendations === "function") {
    updateCaptainRecommendations();
  }
  if (typeof updateMorningIntelligence === "function") {
    updateMorningIntelligence();
  }
}

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

function bind(id, key, event = "input") {
  const el = $(id);
  if (!el) return;

  el.value = state[key] ?? "";
  el.addEventListener(event, e => {
    state[key] = e.target.value;
    save();

    if (key === "leaveTime") countdown();

    if (key === "weight") {
      const health = getHealthData();
      health.weightValue = e.target.value;
      saveUnifiedHealth(health);
      populateHealthFields(health);
    }

    if (typeof updateCaptainsBriefing === "function") {
      updateCaptainsBriefing();
    }
    if (typeof updateCaptainRecommendations === "function") {
      updateCaptainRecommendations();
    }
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

function renderHealth() {
  const health = getHealthData();

  const water = document.getElementById("water");
  const protein = document.getElementById("protein");
  const waterBar = document.getElementById("waterBar");
  const proteinBar = document.getElementById("proteinBar");
  const exercise = document.getElementById("exercise");

  if (water) water.textContent = health.waterValue;
  if (protein) protein.textContent = health.proteinValue;
  if (waterBar) waterBar.value = health.waterValue;
  if (proteinBar) proteinBar.value = health.proteinValue;
  if (exercise) exercise.checked = health.exerciseComplete;
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
   id:makeId(),text:input.value.trim(),done:false
 });
 input.value=""; save(); renderTasks();
};

$$("[data-water]").forEach(button => {
  button.onclick = () => {
    const health = getHealthData();
    health.waterValue = Math.max(
      0,
      health.waterValue + Number(button.dataset.water)
    );
    saveUnifiedHealth(health);
    populateHealthFields(health);
    refreshSharedViews();
  };
});

$$("[data-protein]").forEach(button => {
  button.onclick = () => {
    const health = getHealthData();
    health.proteinValue = Math.max(
      0,
      health.proteinValue + Number(button.dataset.protein)
    );
    saveUnifiedHealth(health);
    populateHealthFields(health);
    refreshSharedViews();
  };
});

if ($("#exercise")) {
  $("#exercise").onchange = event => {
    const health = getHealthData();
    health.exerciseComplete = event.target.checked;
    saveUnifiedHealth(health);
    populateHealthFields(health);
    refreshSharedViews();
  };
}

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


// Health Dashboard — one shared source of truth
const healthIds = [
  "waterValue",
  "proteinValue",
  "weightValue",
  "sleepValue",
  "exerciseComplete",
  "healthNotes"
];

function populateHealthFields(health = getSavedHealth()) {
  healthIds.forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;

    const value = health[id];

    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else {
      field.value = value ?? "";
    }
  });

  const originalWeight = document.getElementById("weight");
  if (originalWeight && health.weightValue !== undefined) {
    originalWeight.value = health.weightValue ?? "";
  }

  const originalExercise = document.getElementById("exercise");
  if (originalExercise) {
    originalExercise.checked = Boolean(health.exerciseComplete);
  }
}

function updateHealthProgress(shouldRefreshDependents = true) {
  const health = getHealthData();

  const waterDisplay = document.getElementById("waterDisplay");
  const proteinDisplay = document.getElementById("proteinDisplay");
  const waterProgress = document.getElementById("waterProgress");
  const proteinProgress = document.getElementById("proteinProgress");
  const status = document.getElementById("healthStatus");

  if (waterDisplay) waterDisplay.textContent = health.waterValue;
  if (proteinDisplay) proteinDisplay.textContent = health.proteinValue;

  if (waterProgress) {
    waterProgress.style.width =
      `${Math.min(100, (health.waterValue / 128) * 100)}%`;
  }

  if (proteinProgress) {
    proteinProgress.style.width =
      `${Math.min(100, (health.proteinValue / 170) * 100)}%`;
  }

  if (status) {
    if (
      health.waterValue >= 128 &&
      health.proteinValue >= 170 &&
      health.exerciseComplete
    ) {
      status.textContent = "GOALS COMPLETE";
    } else if (
      health.waterValue > 0 ||
      health.proteinValue > 0 ||
      health.exerciseComplete
    ) {
      status.textContent = "IN PROGRESS";
    } else {
      status.textContent = "DAILY PROGRESS";
    }
  }

  if (shouldRefreshDependents) {
    renderHealth();
    updateCaptainsBriefing();
    updateCaptainRecommendations();
    if (typeof updateMorningIntelligence === "function") {
      updateMorningIntelligence();
    }
  }
}

function saveHealthDashboard() {
  const health = saveUnifiedHealth(getHealthData());
  populateHealthFields(health);
  updateHealthProgress();
}

function initializeHealthDashboard() {
  const saved = getSavedHealth();

  // Migrate whichever copy contains real information into both stores.
  const mainHasHealth =
    numberOrZero(state.water) > 0 ||
    numberOrZero(state.protein) > 0 ||
    Boolean(state.exercise) ||
    Boolean(state.weight);

  const savedHasHealth =
    saved.waterValue > 0 ||
    saved.proteinValue > 0 ||
    saved.exerciseComplete ||
    Boolean(saved.weightValue) ||
    Boolean(saved.sleepValue) ||
    Boolean(saved.healthNotes);

  const initial = savedHasHealth
    ? saved
    : {
        ...saved,
        waterValue: numberOrZero(state.water),
        proteinValue: numberOrZero(state.protein),
        weightValue: state.weight ?? "",
        exerciseComplete: Boolean(state.exercise)
      };

  saveUnifiedHealth(initial);
  populateHealthFields(initial);

  healthIds.forEach(id => {
    const field = document.getElementById(id);
    if (!field || field.dataset.healthBound === "true") return;

    field.dataset.healthBound = "true";
    field.addEventListener("input", saveHealthDashboard);
    field.addEventListener("change", saveHealthDashboard);
  });

  const originalWeight = document.getElementById("weight");
  if (originalWeight && originalWeight.dataset.healthBound !== "true") {
    originalWeight.dataset.healthBound = "true";
    originalWeight.addEventListener("input", event => {
      const health = getHealthData();
      health.weightValue = event.target.value;
      saveUnifiedHealth(health);
      populateHealthFields(health);
      refreshSharedViews();
    });
  }

  updateHealthProgress();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeHealthDashboard,
    { once: true }
  );
} else {
  initializeHealthDashboard();
}


// Countdown Center
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
  return readStorage(BLISS_STORAGE_KEY, {});
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
  const health = getHealthData();
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
  const health = getHealthData();
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



// V3 Next Mission + Monthly Mission Calendar
function missionId(){return crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`}
function loadMissions(){const x=readStorage(MISSIONS_STORAGE_KEY,[]);return Array.isArray(x)?x:[]}
let missionItems=loadMissions();
function saveMissions(){localStorage.setItem(MISSIONS_STORAGE_KEY,JSON.stringify(missionItems))}
function missionDateTime(d,t="00:00"){if(!d)return null;const [y,m,day]=String(d).split("-").map(Number),[h,min]=String(t||"00:00").split(":").map(Number);if([y,m,day,h,min].some(v=>!Number.isFinite(v)))return null;return new Date(y,m-1,day,h,min,0,0)}
function missionStartDate(m){return missionDateTime(m.date,m.wakeTime||m.leaveTime||m.reportTime||"00:00")}
function missionEndDate(m){return missionDateTime(m.endDate||m.date,"23:59")}
function missionFormatDate(d){const x=missionDateTime(d,"12:00");return x?x.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric",year:"numeric"}):""}
function missionFormatTime(t){return captainTime(t)}
function missionRouteParts(v){return intelligenceClean(v).replace(/[→–—]/g,"-").replace(/\s*\/\s*/g,"-").split("-").map(x=>intelligenceClean(x).toUpperCase()).filter(Boolean)}
function missionNext(){const now=new Date();return missionItems.filter(m=>missionEndDate(m)>=now).sort((a,b)=>missionStartDate(a)-missionStartDate(b))[0]||null}
function missionCountdownText(m){const s=missionStartDate(m);if(!s)return"Mission time is not fully set.";const now=new Date(),diff=s-now;if(diff<=0)return missionEndDate(m)>=now?"This mission is active now.":"This mission is complete.";const mins=Math.floor(diff/60000),d=Math.floor(mins/1440),h=Math.floor((mins%1440)/60),mm=mins%60;return d>0?`${d} day${d===1?"":"s"}, ${h}h ${mm}m until mission start.`:`${h}h ${mm}m until mission start.`}
function missionPreparationMessage(m){if(!m)return"Add your next mission so tonight can prepare tomorrow.";const type=intelligenceClean(m.type).toLowerCase(),parts=missionRouteParts(m.route),first=parts.length>=2?`${parts[0]} → ${parts[1]}`:"",overnight=parts.length>=2?parts.at(-1):"";if(type==="flight")return first?`You do not have to carry the whole pairing yet. Prepare for ${first}; ${overnight} can wait until the day reaches it.`:"Complete the flight picture tonight so pre-dawn Ren has fewer decisions to make.";if(type.includes("trustee")||type.includes("meeting"))return"Prepare the notes, clothes, route, and one clear intention. The meeting deserves your presence—not last-minute scrambling.";if(type==="appointment")return"Review your purpose and questions before the mission begins. Future-you should arrive prepared, not rushed.";if(type==="home")return"This mission does not need to be large. Choose the one home outcome that will make the day feel intentionally lived.";if(type==="vacation")return"Preparation is part of the pleasure. Handle one practical detail now, then let anticipation remain light.";return"Tonight's work is simply to make the next mission easier."}
function updateNextMissionPanel(){const m=missionNext();if(!m){intelligenceSetText("nextMissionTitle","No mission scheduled");intelligenceSetText("nextMissionContext","Add the next flight, appointment, home mission, or trip below.");intelligenceSetText("nextMissionStatus","READY");intelligenceSetText("nextMissionWhen","Not scheduled");intelligenceSetText("nextMissionTiming","Wake, leave, report, and van times will appear here.");intelligenceSetText("nextMissionRoute","No route or purpose entered");intelligenceSetText("nextMissionOvernight","The final city entered will be treated as the overnight.");intelligenceSetText("nextMissionMessage","Tonight's work is to make the next mission easier.");intelligenceSetText("nextMissionCountdown","No countdown available.");return}const parts=missionRouteParts(m.route),overnight=parts.length>=2?parts.at(-1):"",times=[];if(m.wakeTime)times.push(`Wake ${missionFormatTime(m.wakeTime)}`);if(m.leaveTime)times.push(`Leave ${missionFormatTime(m.leaveTime)}`);if(m.reportTime)times.push(`Report ${missionFormatTime(m.reportTime)}`);if(m.vanTime)times.push(`Van ${missionFormatTime(m.vanTime)}`);intelligenceSetText("nextMissionTitle",`${m.type||"Mission"} • ${missionFormatDate(m.date)}`);intelligenceSetText("nextMissionContext",m.endDate&&m.endDate!==m.date?`Runs through ${missionFormatDate(m.endDate)}.`:"The next meaningful mission is in view.");intelligenceSetText("nextMissionStatus",missionCountdownText(m).includes("active")?"ACTIVE":"UPCOMING");intelligenceSetText("nextMissionWhen",missionFormatDate(m.date));intelligenceSetText("nextMissionTiming",times.join(" • ")||"Times not yet entered.");intelligenceSetText("nextMissionRoute",[m.number,m.route].filter(Boolean).join(" • ")||m.type);intelligenceSetText("nextMissionOvernight",overnight?`${overnight} is the overnight city.`:"No overnight city identified.");intelligenceSetText("nextMissionMessage",missionPreparationMessage(m));intelligenceSetText("nextMissionCountdown",missionCountdownText(m))}
function renderMissionList(){const list=document.getElementById("missionList"),empty=document.getElementById("missionEmpty"),status=document.getElementById("missionCalendarStatus");if(!list||!empty||!status)return;const now=new Date(),sorted=[...missionItems].sort((a,b)=>missionStartDate(a)-missionStartDate(b)),next=missionNext(),count=sorted.filter(m=>missionEndDate(m)>=now).length;status.textContent=`${count} UPCOMING`;empty.hidden=sorted.length>0;list.innerHTML="";sorted.forEach(m=>{const a=document.createElement("article");a.className="mission-item";if(next&&m.id===next.id)a.classList.add("is-next");if(missionEndDate(m)<now)a.classList.add("is-past");const main=document.createElement("div");main.className="mission-item-main";const h=document.createElement("h3");h.textContent=`${m.type||"Mission"} — ${m.route||m.number||"Untitled"}`;const meta=document.createElement("div");meta.className="mission-item-meta";[missionFormatDate(m.date),m.endDate&&m.endDate!==m.date?`through ${missionFormatDate(m.endDate)}`:"",m.wakeTime?`Wake ${missionFormatTime(m.wakeTime)}`:"",m.leaveTime?`Leave ${missionFormatTime(m.leaveTime)}`:"",m.reportTime?`Report ${missionFormatTime(m.reportTime)}`:"",m.vanTime?`Van ${missionFormatTime(m.vanTime)}`:""].filter(Boolean).forEach(v=>{const s=document.createElement("span");s.className="mission-chip";s.textContent=v;meta.append(s)});main.append(h,meta);if(m.notes){const p=document.createElement("p");p.textContent=m.notes;main.append(p)}const c=document.createElement("strong");c.textContent=missionCountdownText(m);const actions=document.createElement("div");actions.className="mission-item-actions";const del=document.createElement("button");del.type="button";del.textContent="Delete";del.onclick=()=>{missionItems=missionItems.filter(x=>x.id!==m.id);saveMissions();renderMissionList();updateNextMissionPanel()};actions.append(del);a.append(main,c,actions);list.append(a)})}
function parseMissionImport(text){return String(text||"").split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean).map(block=>{const lines=block.split("\n").map(x=>x.trim()).filter(Boolean),first=lines[0]||"",match=first.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(?:to|-)\s+(\d{4}-\d{2}-\d{2}))?$/),m={id:missionId(),type:"Flight",date:match?match[1]:"",endDate:match?.[2]||"",number:"",wakeTime:"",leaveTime:"",reportTime:"",vanTime:"",route:"",notes:""};lines.slice(match?1:0).forEach(line=>{const [rk,...rest]=line.split(":"),k=intelligenceClean(rk).toLowerCase(),v=intelligenceClean(rest.join(":"));if(k==="date")m.date=v;else if(k==="end"||k==="end date")m.endDate=v;else if(k==="type")m.type=v||"Flight";else if(["pairing","flight","number"].includes(k))m.number=v;else if(k==="wake")m.wakeTime=v;else if(k==="leave"||k==="leave home")m.leaveTime=v;else if(k==="report")m.reportTime=v;else if(k==="van"||k==="hotel van")m.vanTime=v;else if(k==="route"||k==="purpose")m.route=v;else if(k==="notes")m.notes=v});return m}).filter(m=>m.date&&(m.route||m.type))}
function initializeMissionCalendar(){const form=document.getElementById("missionForm");if(!form)return;form.addEventListener("submit",e=>{e.preventDefault();const m={id:missionId(),type:document.getElementById("missionType")?.value||"Flight",date:document.getElementById("missionDate")?.value||"",endDate:document.getElementById("missionEndDate")?.value||"",number:intelligenceClean(document.getElementById("missionNumber")?.value),wakeTime:document.getElementById("missionWakeTime")?.value||"",leaveTime:document.getElementById("missionLeaveTime")?.value||"",reportTime:document.getElementById("missionReportTime")?.value||"",vanTime:document.getElementById("missionVanTime")?.value||"",route:intelligenceClean(document.getElementById("missionRoute")?.value),notes:intelligenceClean(document.getElementById("missionNotes")?.value)};if(!m.date)return;missionItems.push(m);saveMissions();form.reset();document.getElementById("missionType").value="Flight";renderMissionList();updateNextMissionPanel();updateMorningIntelligence?.()});document.getElementById("missionImportButton")?.addEventListener("click",()=>{const t=document.getElementById("missionImportText"),items=parseMissionImport(t?.value||"");if(!items.length)return;missionItems.push(...items);saveMissions();if(t)t.value="";renderMissionList();updateNextMissionPanel();updateMorningIntelligence?.()});document.getElementById("missionImportExample")?.addEventListener("click",()=>{const t=document.getElementById("missionImportText");if(t)t.value=`2026-08-10 to 2026-08-11
Type: Flight
Pairing: 330
Wake: 03:00
Leave: 03:30
Report: 05:00
Route: DAL - AUS - TPA - SEA
Van: 04:45
Notes: SEA overnight

2026-08-18
Type: Trustee Meeting
Route: Texas AFL-CIO Scholarship Committee
Notes: Bring committee materials`});renderMissionList();updateNextMissionPanel();setInterval(updateNextMissionPanel,60000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeMissionCalendar,{once:true});else initializeMissionCalendar();


// Synchronize open tabs/windows on the same device.
window.addEventListener("storage", event => {
  if (
    event.key === KEY ||
    event.key === HEALTH_STORAGE_KEY ||
    event.key === FLIGHT_OPERATIONS_KEY ||
    event.key === COUNTDOWN_STORAGE_KEY ||
    event.key === BLISS_STORAGE_KEY ||
    event.key === MISSIONS_STORAGE_KEY
  ) {
    state = { ...defaults, ...readStorage(KEY, {}) };
    populateHealthFields(getSavedHealth());
    refreshSharedViews();
    renderCountdowns();
    updateDragonflyBlissStatus();
    missionItems = loadMissions();
    renderMissionList();
    updateNextMissionPanel();
  }
});

// Morning Intelligence v2.5 — Sage Voice, Time-Aware, Flight-Aware, Learning
function intelligenceSetText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function intelligenceEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function intelligenceClean(value) {
  return String(value ?? "").trim();
}

function intelligenceDaysUntil(dateValue) {
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

function intelligenceTimePhase(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "preflight";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "winddown";
}

function intelligenceGreeting(now = new Date()) {
  const phase = intelligenceTimePhase(now);
  if (phase === "preflight") return "Good Early Morning";
  if (phase === "morning") return "Good Morning";
  if (phase === "afternoon") return "Good Afternoon";
  return "Good Evening";
}

function intelligenceTimePerspective(phase) {
  const perspectives = {
    preflight: "The world is still quiet. Let this hour belong to preparation, not pressure.",
    morning: "The day is still shapeable. A grounded first move will make everything after it easier.",
    afternoon: "You have already carried part of today. Now we choose the next piece deliberately.",
    evening: "The day is beginning to soften. Preparation matters more than pushing.",
    winddown: "The day is ready to be put down. Record one win, release one worry, and protect tomorrow's runway."
  };
  return perspectives[phase];
}

function intelligenceModeLanguage(mode) {
  const modes = {
    home: {
      context: "Today is operating in Home Mode.",
      note: "Create one meaningful win inside Dragonfly Bliss."
    },
    flight: {
      context: "Today is operating in Flight Attendant Mode.",
      note: "Operational readiness comes before everything optional."
    },
    turbulence: {
      context: "Turbulence Mode is protecting today's energy.",
      note: "Steady progress—not perfection—is the assignment."
    }
  };
  return modes[mode] || modes.home;
}

function intelligenceReadSnapshot() {
  const countdowns = readStorage(COUNTDOWN_STORAGE_KEY, []);
  const bliss = readStorage(BLISS_STORAGE_KEY, {});
  return {
    state: { ...defaults, ...readStorage(KEY, {}) },
    health: getHealthData(),
    flight: readStorage(FLIGHT_OPERATIONS_KEY, {}),
    countdowns: Array.isArray(countdowns) ? countdowns : [],
    bliss: bliss && typeof bliss === "object" ? bliss : {}
  };
}

function intelligenceAppointment(snapshot) {
  const purpose = intelligenceClean(snapshot.state.appointmentPurpose);
  const date = snapshot.state.followUpDate || "";
  const days = intelligenceDaysUntil(date);
  if (!purpose && days === null) return null;
  return { purpose: purpose || "Appointment follow-up", date, days };
}

function intelligenceActiveCountdowns(countdowns) {
  if (!Array.isArray(countdowns)) return [];
  return countdowns
    .map(item => ({ ...item, days: intelligenceDaysUntil(item.date) }))
    .filter(item => item.days !== null && item.days >= 0)
    .sort((a, b) => a.days - b.days);
}

function intelligenceTopThree(snapshot) {
  const { state, health, bliss, flight } = snapshot;
  const items = [];
  const add = value => {
    const clean = intelligenceClean(value);
    if (clean && !items.includes(clean)) items.push(clean);
  };

  add(state.current);
  add(state.next);

  const openTask = Array.isArray(state.tasks)
    ? state.tasks.find(task => !task.done && task.text)
    : null;
  if (openTask) add(openTask.text);

  if (state.mode === "flight") {
    if (!intelligenceClean(flight.opsFlightNumber) &&
        !intelligenceClean(flight.opsRoute)) {
      add("Complete flight number and route");
    }
    if (!state.reportTime) add("Confirm report time");
    if (!state.leaveTime) add("Set leave-home time");
  }

  const appointment = intelligenceAppointment(snapshot);
  if (appointment && appointment.days !== null &&
      appointment.days >= 0 && appointment.days <= 7) {
    add(`Prepare for ${appointment.purpose}`);
  }

  if (health.waterValue < 64) add("Bring water forward early");
  if (health.proteinValue < 85) add("Anchor the next meal with protein");
  if (!health.exerciseComplete) {
    add(state.mode === "turbulence"
      ? "Choose ten minutes of gentle movement"
      : "Place movement on today's flight path");
  }

  if (state.mode === "home") {
    const blissAreas = [
      ["blissHomeDone", "Create one small home win"],
      ["blissGardenDone", "Touch the garden for ten minutes"],
      ["blissPhotographyDone", "Take today's intentional photo"],
      ["blissMealPrepDone", "Complete one meal-prep step"],
      ["blissLaundryDone", "Move one laundry load forward"],
      ["blissWorkoutDone", "Complete today's workout"]
    ];
    const nextBliss = blissAreas.find(([id]) => !Boolean(bliss[id]));
    if (nextBliss) add(nextBliss[1]);
  }

  add(state.later);
  return items.slice(0, 3);
}

function intelligenceUpcoming(snapshot) {
  const { state, flight, countdowns } = snapshot;
  const items = [];
  const now = new Date();

  if (state.leaveTime) {
    const [hours, minutes] = state.leaveTime.split(":").map(Number);
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target < now) target.setDate(target.getDate() + 1);
    const remaining = Math.max(0, Math.floor((target - now) / 60000));
    items.push({
      icon: "⏱",
      text: `Leave-home time is in ${Math.floor(remaining / 60)}h ${remaining % 60}m.`
    });
  }

  const flightLine = [
    intelligenceClean(flight.opsFlightNumber),
    intelligenceClean(flight.opsRoute)
  ].filter(Boolean).join(" • ");
  if (flightLine) items.push({ icon: "✈️", text: flightLine });

  if (intelligenceClean(flight.opsVanTime)) {
    items.push({ icon: "🚐", text: `Van time: ${captainTime(flight.opsVanTime)}.` });
  }

  intelligenceActiveCountdowns(countdowns).slice(0, 3).forEach(item => {
    const name = intelligenceClean(item.name || item.event) || "Upcoming event";
    const timing = item.days === 0 ? "today" :
      `in ${item.days} day${item.days === 1 ? "" : "s"}`;
    items.push({
      icon: item.category === "Travel" ? "🧳" :
            item.category === "Money" ? "💵" :
            item.category === "Work" ? "📌" :
            item.category === "Health" ? "🩺" : "📅",
      text: `${name} is ${timing}.`
    });
  });

  const appointment = intelligenceAppointment(snapshot);
  if (appointment && appointment.days !== null &&
      appointment.days >= 0 && appointment.days <= 7) {
    const timing = appointment.days === 0 ? "today" :
      `in ${appointment.days} day${appointment.days === 1 ? "" : "s"}`;
    items.push({ icon: "🩺", text: `${appointment.purpose} is ${timing}.` });
  }

  return items.slice(0, 5);
}

function intelligenceHealthSentence(health) {
  const notes = [];

  if (health.waterValue >= 128) {
    notes.push("your water goal is complete");
  } else if (health.waterValue >= 64) {
    notes.push(`you are making steady progress with water at ${health.waterValue} ounces`);
  } else {
    notes.push(`your body would benefit from bringing water forward; you are at ${health.waterValue} ounces`);
  }

  if (health.proteinValue >= 170) {
    notes.push("your protein goal is complete");
  } else if (health.proteinValue >= 85) {
    notes.push(`protein is moving in the right direction at ${health.proteinValue} grams`);
  } else {
    notes.push(`protein needs a dependable anchor; you are at ${health.proteinValue} grams`);
  }

  notes.push(health.exerciseComplete
    ? "and your movement is already complete"
    : "and movement is still available to support the day");

  return `${notes.join(", ")}.`;
}

function intelligenceBlissSentence(bliss) {
  const ids = [
    "blissHomeDone", "blissGardenDone", "blissPhotographyDone",
    "blissMealPrepDone", "blissLaundryDone", "blissWorkoutDone"
  ];
  const complete = ids.filter(id => Boolean(bliss[id])).length;
  if (complete === 6) return "Dragonfly Bliss is fully tended today.";
  if (complete > 0) {
    return `${complete} of 6 Dragonfly Bliss areas are complete, which is meaningful progress.`;
  }
  return "Dragonfly Bliss does not need a grand gesture today; one small home win is enough.";
}

function intelligenceNarrative(snapshot, topThree, upcoming) {
  const { state, health, bliss, flight } = snapshot;
  const mode = String(state.mode || "home").toLowerCase();
  const phase = intelligenceTimePhase();
  const sentences = [intelligenceTimePerspective(phase)];

  if (mode === "flight") {
    const flightLine = [
      intelligenceClean(flight.opsFlightNumber),
      intelligenceClean(flight.opsRoute)
    ].filter(Boolean).join(" • ");
    sentences.push(
      flightLine
        ? `Captain Ren, ${flightLine} begins long before boarding. Let the essentials lead so confidence is already waiting for you at the gate.`
        : "Captain Ren, this trip begins before report time. Complete the flight picture first, and the rest of the day will organize itself around what matters."
    );
  } else if (mode === "turbulence") {
    sentences.push(
      "Today does not ask for a full-capacity performance. We are protecting your energy and keeping only what is essential."
    );
  } else {
    sentences.push(
      "Home days are where future travel, health, and peace are quietly built. You do not need to finish the whole house to make today meaningful."
    );
  }

  if (topThree.length) {
    sentences.push(`The next wise move is ${topThree[0].replace(/[.]+$/, "")}.`);
  }

  sentences.push(intelligenceHealthSentence(health));

  const appointment = intelligenceAppointment(snapshot);
  if (appointment && appointment.days !== null &&
      appointment.days >= 0 && appointment.days <= 7) {
    sentences.push(
      appointment.days === 0
        ? `${appointment.purpose} is today. A calm review of your questions and notes will help you walk in feeling prepared.`
        : `${appointment.purpose} is coming in ${appointment.days} day${appointment.days === 1 ? "" : "s"}, which gives you time to prepare without rushing.`
    );
  } else if (upcoming.length) {
    sentences.push(
      `There ${upcoming.length === 1 ? "is" : "are"} ${upcoming.length} visible preparation item${upcoming.length === 1 ? "" : "s"}, but they do not all need your attention at once.`
    );
  }

  if (mode === "home") sentences.push(intelligenceBlissSentence(bliss));
  sentences.push("You do not have to carry the whole day right now—only the next clear step.");

  return sentences.join(" ");
}

function intelligenceObservation(snapshot, upcoming) {
  const { state, health } = snapshot;
  const mode = String(state.mode || "home").toLowerCase();
  const phase = intelligenceTimePhase();

  if (mode === "turbulence") {
    return {
      observation: "Today does not require your full capacity to still be a good day.",
      next: "Choose one essential mission, hydrate, eat something supportive, and let the rest move without guilt."
    };
  }

  if (phase === "winddown") {
    return {
      observation: "The day is ready to be put down.",
      next: "Record one win, release one worry, and prepare tomorrow's runway."
    };
  }

  const appointment = intelligenceAppointment(snapshot);
  if (appointment && appointment.days !== null &&
      appointment.days >= 0 && appointment.days <= 2) {
    return {
      observation: `${appointment.purpose} is close enough to deserve a little attention now.`,
      next: "Review your purpose, questions, and notes so future-you walks in feeling prepared."
    };
  }

  if (health.waterValue < 64) {
    return {
      observation: "Your body is asking for water before it asks for more productivity.",
      next: "Finish one full bottle, then return to the day with a clearer system."
    };
  }

  if (health.proteinValue < 85) {
    return {
      observation: "Protein is the most supportive next anchor for your energy.",
      next: "Choose one dependable protein source and let that be enough for the next move."
    };
  }

  if (!health.exerciseComplete) {
    return {
      observation: "Movement is still open, but it does not need to be dramatic to count.",
      next: mode === "flight"
        ? "Choose a short session that respects the trip and your energy."
        : "Place a realistic movement block on the flight path and keep it kind."
    };
  }

  if (upcoming.length) {
    return {
      observation: "Your preparation window is visible, which means you no longer have to carry it all in your head.",
      next: "Choose the first upcoming item and give only that one your attention."
    };
  }

  return {
    observation: "Your core systems are steady, and there is no emergency hiding in the day.",
    next: "Begin with the first item in your Top Three and let the rest wait its turn."
  };
}

function intelligenceTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function intelligenceSaveDailySnapshot(snapshot) {
  const history = readStorage(LEARNING_STORAGE_KEY, []);
  const list = Array.isArray(history) ? history : [];
  const today = intelligenceTodayKey();

  const entry = {
    date: today,
    mode: snapshot.state.mode || "home",
    water: Number(snapshot.health.waterValue || 0),
    protein: Number(snapshot.health.proteinValue || 0),
    exercise: Boolean(snapshot.health.exerciseComplete),
    tasksDone: Array.isArray(snapshot.state.tasks)
      ? snapshot.state.tasks.filter(task => task.done).length : 0,
    blissDone: [
      "blissHomeDone", "blissGardenDone", "blissPhotographyDone",
      "blissMealPrepDone", "blissLaundryDone", "blissWorkoutDone"
    ].filter(id => Boolean(snapshot.bliss[id])).length
  };

  const existingIndex = list.findIndex(item => item.date === today);
  if (existingIndex >= 0) list[existingIndex] = entry;
  else list.push(entry);

  const recent = list
    .filter(item => item && item.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(recent));
  return recent;
}

function intelligenceAverage(items, field) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Number(item[field] || 0), 0) / items.length;
}

function intelligencePatternMessage(history, snapshot) {
  if (history.length < 3) {
    return {
      text: `Sage has ${history.length} day${history.length === 1 ? "" : "s"} of rhythm to study. Keep using the Command Center; useful patterns begin appearing after three days.`,
      status: `${history.length}/3 DAYS`
    };
  }

  const recent = history.slice(-7);
  const avgWater = Math.round(intelligenceAverage(recent, "water"));
  const avgProtein = Math.round(intelligenceAverage(recent, "protein"));
  const exerciseDays = recent.filter(item => item.exercise).length;
  const homeDays = recent.filter(item => item.mode === "home");
  const flightDays = recent.filter(item => item.mode === "flight");

  if (snapshot.health.waterValue < avgWater - 16) {
    return {
      text: `You usually reach about ${avgWater} ounces by the end of a recorded day. Today is running behind that rhythm, so bringing one bottle forward would help you return to your own pattern.`,
      status: "PATTERN FOUND"
    };
  }

  if (snapshot.health.proteinValue < avgProtein - 25) {
    return {
      text: `Your recent protein rhythm averages about ${avgProtein} grams. Today is lighter than usual, so one dependable protein choice would protect your energy.`,
      status: "PATTERN FOUND"
    };
  }

  if (exerciseDays >= 4 && !snapshot.health.exerciseComplete) {
    return {
      text: `Movement has been part of ${exerciseDays} of your last ${recent.length} recorded days. Consistency is already present; today only needs a version that fits.`,
      status: "CONSISTENCY"
    };
  }

  if (snapshot.state.mode === "home" && homeDays.length >= 2) {
    const avgBliss = intelligenceAverage(homeDays, "blissDone").toFixed(1);
    return {
      text: `On recent Home Mode days, you complete about ${avgBliss} Dragonfly Bliss areas. One meaningful area today is enough to stay connected to that rhythm.`,
      status: "HOME RHYTHM"
    };
  }

  if (snapshot.state.mode === "flight" && flightDays.length >= 2) {
    return {
      text: "Your recent Flight Attendant Mode days show that preparation works best when the operational picture is completed first. Finish flight details before carrying anything optional.",
      status: "FLIGHT RHYTHM"
    };
  }

  return {
    text: `Over the last ${recent.length} recorded days, your average is ${avgWater} ounces of water, ${avgProtein} grams of protein, and movement on ${exerciseDays} days. Sage will keep watching for patterns that make your next move easier.`,
    status: "LEARNING"
  };
}


function sageObservationItems(snapshot, upcoming, history) {
  const { state, health, bliss, flight } = snapshot;
  const items = [];
  const add = (title, detail) => {
    if (items.length < 5) items.push({ title, detail });
  };

  if (health.exerciseComplete) {
    add(
      "Movement is already behind you.",
      "That creates permission to use your remaining energy somewhere else."
    );
  }

  if (health.waterValue < 64) {
    add(
      "Water is the smallest action with the biggest return.",
      "One full bottle now is likely to make the rest of the day feel easier."
    );
  } else if (health.waterValue >= 128) {
    add(
      "You kept a promise to your body today.",
      "Your water goal is complete, and that consistency matters."
    );
  }

  if (health.proteinValue < 85) {
    add(
      "Your body is asking for fuel, not perfection.",
      "A dependable protein choice will support the next part of the day."
    );
  }

  const upcomingCount = upcoming.length;
  if (upcomingCount > 0) {
    add(
      `${upcomingCount} preparation item${upcomingCount === 1 ? "" : "s"} are visible.`,
      "Nothing needs to be solved all at once. The first item is enough."
    );
  } else {
    add(
      "The calendar is not pressing on you right now.",
      "There is still room to shape the next part of the day intentionally."
    );
  }

  const blissIds = [
    "blissHomeDone","blissGardenDone","blissPhotographyDone",
    "blissMealPrepDone","blissLaundryDone","blissWorkoutDone"
  ];
  const blissDone = blissIds.filter(id => Boolean(bliss[id])).length;

  if (state.mode === "home") {
    if (blissDone === 0) {
      add(
        "Dragonfly Bliss is still open.",
        "It does not need a grand gesture—one small act of care is enough."
      );
    } else {
      add(
        `You have already touched ${blissDone} Dragonfly Bliss area${blissDone === 1 ? "" : "s"}.`,
        "Momentum is present. You do not need to force it."
      );
    }
  }

  if (state.mode === "flight") {
    const route = intelligenceClean(flight.opsRoute);
    add(
      route ? `The route is ${route}.` : "The route still needs to be entered.",
      "You do not have to carry the whole pairing at once—only the next leg."
    );
  }

  if (history.length >= 3) {
    const recent = history.slice(-7);
    const exerciseDays = recent.filter(item => item.exercise).length;
    if (exerciseDays >= 4) {
      add(
        "Consistency is already showing up.",
        `Movement has been complete on ${exerciseDays} of your last ${recent.length} recorded days.`
      );
    }
  }

  return items.slice(0, 5);
}

function parseFlightRoute(routeValue) {
  const route = intelligenceClean(routeValue)
    .replace(/[→–—]/g, "-")
    .replace(/\s*\/\s*/g, "-");

  if (!route) return [];

  return route
    .split("-")
    .map(part => intelligenceClean(part).toUpperCase())
    .filter(Boolean);
}

function flightDeckSummary(snapshot) {
  const { state, flight, health } = snapshot;
  const mode = String(state.mode || "home").toLowerCase();
  const legs = parseFlightRoute(flight.opsRoute);
  const routeText = legs.length ? legs.join(" → ") : "No route entered";
  const overnight = legs.length >= 2 ? legs[legs.length - 1] : "";
  const nextLeg = legs.length >= 2 ? `${legs[0]} → ${legs[1]}` : "";
  const flightNumber = intelligenceClean(flight.opsFlightNumber);

  if (mode === "flight") {
    const messageParts = [];
    if (flightNumber) messageParts.push(`Flight ${flightNumber}`);
    if (nextLeg) messageParts.push(`begins with ${nextLeg}`);

    return {
      status: overnight ? `${overnight} OVERNIGHT` : "FLIGHT MODE",
      route: routeText,
      overnight: overnight
        ? `${overnight} is the overnight city.`
        : "The last city entered will be treated as the overnight.",
      nextLeg: nextLeg || "Enter the route in order",
      legGuidance:
        "Flighty will keep watch over delays, gates, and operational changes.",
      message:
        messageParts.length
          ? `${messageParts.join(" ")}. You do not have to carry the whole pairing right now—only become ready for the first leg.`
          : "Captain Ren, this pairing starts with preparation. Complete the route and flight details, then let the day reveal itself one leg at a time.",
      support:
        health.waterValue < 64
          ? "Your body is asking for water before more complexity."
          : health.proteinValue < 85
            ? "One dependable protein choice will support the travel day."
            : "Your health instruments are steady enough to let the operation lead."
    };
  }

  if (mode === "turbulence") {
    return {
      status: "EASE",
      route: routeText,
      overnight: overnight
        ? `${overnight} remains the overnight, but it does not need your attention yet.`
        : "No route pressure is required right now.",
      nextLeg: nextLeg || "Only the essential next step",
      legGuidance: "Operational details can wait until your energy is ready.",
      message:
        "Today is not about carrying every leg. Reduce the plan to the one thing that keeps you safe, fed, hydrated, and steady.",
      support:
        "I’ll keep the briefing gentle and protect you from unnecessary urgency."
    };
  }

  return {
    status: "HOME MODE",
    route: routeText,
    overnight: overnight
      ? `${overnight} is waiting at the end of the pairing.`
      : "No overnight city is entered yet.",
    nextLeg: nextLeg || "Prepare the runway at home",
    legGuidance:
      "Flighty will handle live changes when the trip begins.",
    message:
      "Home Mode is where the pairing becomes easier. Pack the next bag, prepare the first meal, and let tomorrow arrive to a calmer system.",
    support:
      "One small home win now is part of the flight, even before report time."
  };
}

function updateSageObservations(snapshot, upcoming, history) {
  const list = document.getElementById("sageObservationsList");
  if (!list) return;

  const items = sageObservationItems(snapshot, upcoming, history);
  list.innerHTML = items.map(item => `
    <article class="sage-observation-item">
      <strong>${intelligenceEscape(item.title)}</strong>
      <p>${intelligenceEscape(item.detail)}</p>
    </article>
  `).join("");

  const status = document.getElementById("sageObservationsStatus");
  if (status) status.textContent = `${items.length} NOTICED`;
}

function updateFlightDeck(snapshot) {
  const briefing = flightDeckSummary(snapshot);
  intelligenceSetText("flightDeckStatus", briefing.status);
  intelligenceSetText("flightDeckRoute", briefing.route);
  intelligenceSetText("flightDeckOvernight", briefing.overnight);
  intelligenceSetText("flightDeckNextLeg", briefing.nextLeg);
  intelligenceSetText("flightDeckLegGuidance", briefing.legGuidance);
  intelligenceSetText("flightDeckMessage", briefing.message);
  intelligenceSetText("flightDeckSupport", briefing.support);
}

function updateMorningIntelligence() {
  const panel = document.getElementById("morningIntelligenceTitle");
  if (!panel) return;

  try {
    const snapshot = intelligenceReadSnapshot();
    const state = snapshot.state;
    const now = new Date();
    const mode = String(state.mode || "home").toLowerCase();
    const language = intelligenceModeLanguage(mode);
    const mission = intelligenceClean(state.mission) ||
      "Name the one outcome that would make today feel intentionally flown.";
    const topThree = intelligenceTopThree(snapshot);
    const upcoming = intelligenceUpcoming(snapshot);
    const observation = intelligenceObservation(snapshot, upcoming);
    const history = intelligenceSaveDailySnapshot(snapshot);
    const pattern = intelligencePatternMessage(history, snapshot);

    updateSageObservations(snapshot, upcoming, history);
    updateFlightDeck(snapshot);

    intelligenceSetText("morningIntelligenceTitle", `${intelligenceGreeting(now)}, Captain Ren`);
    intelligenceSetText("morningIntelligenceContext", language.context);
    intelligenceSetText("intelligenceMission", mission);
    intelligenceSetText("intelligenceModeNote", language.note);
    intelligenceSetText("intelligenceNarrative", intelligenceNarrative(snapshot, topThree, upcoming));

    const topThreeElement = document.getElementById("intelligenceTopThree");
    if (topThreeElement) {
      topThreeElement.innerHTML = topThree.length
        ? topThree.map(item => `<li>${intelligenceEscape(item)}</li>`).join("")
        : "<li>Choose today's first priority.</li>";
    }

    const upcomingElement = document.getElementById("intelligenceUpcoming");
    if (upcomingElement) {
      upcomingElement.innerHTML = upcoming.length
        ? upcoming.map(item => `
            <div class="intelligence-upcoming-item">
              <span class="intelligence-upcoming-icon">${item.icon}</span>
              <span>${intelligenceEscape(item.text)}</span>
            </div>
          `).join("")
        : "<p>No urgent preparation is showing.</p>";
    }

    intelligenceSetText("intelligenceObservation", observation.observation);
    intelligenceSetText("intelligenceNextMove", observation.next);
    intelligenceSetText("intelligencePatterns", pattern.text);
    intelligenceSetText("intelligenceLearningStatus", pattern.status);

    const status = document.getElementById("morningIntelligenceStatus");
    if (status) {
      status.textContent = upcoming.length ? `${upcoming.length} UPCOMING` : "SYSTEMS STEADY";
    }
  } catch (error) {
    console.error("Morning Intelligence could not refresh.", error);
    intelligenceSetText("morningIntelligenceContext", "The briefing needs one quick refresh.");
    intelligenceSetText(
      "intelligenceNarrative",
      "Your saved Command Center data remains intact. Refresh the page once; if this message remains, open the browser console for the exact error."
    );
  }
}

function initializeMorningIntelligence() {
  updateMorningIntelligence();
  document.addEventListener("input", () => setTimeout(updateMorningIntelligence, 0));
  document.addEventListener("change", () => setTimeout(updateMorningIntelligence, 0));
  window.addEventListener("storage", updateMorningIntelligence);
  setInterval(updateMorningIntelligence, 60000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMorningIntelligence, { once: true });
} else {
  initializeMorningIntelligence();
}
