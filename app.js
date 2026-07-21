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
