/* DragonFly Lotus V7.2 — Cloud State Correction */
(() => {
  "use strict";

  const CONFIG_KEY = "dragonflyLotusCloudConfig";
  const META_KEY = "dragonflyLotusCloudMeta";
  const LOG_KEY = "dragonflyLotusCloudLog";
  const BACKUP_KEY = "dragonflyLotusCloudSafetyBackup";
  const ACTIVE_WORKSPACE_KEY = "dragonflyLotusActiveWorkspace";
  const DATA_PREFIX = "dragonflyLotus";
  const TABLE_NAME = "dragonfly_cloud_state";
  const DEVICE_ID_KEY = "dragonflyLotusDeviceId";
  const CLOUD_EVENT = "dragonfly-cloud-status";

  const state = {
    client: null,
    session: null,
    user: null,
    channel: null,
    configured: false,
    syncing: false,
    applyingRemote: false,
    pendingPush: false,
    debounceTimer: null,
    lastRemoteUpdatedAt: null,
    databaseReady: null,
    lastError: null
  };

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  function id() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getDeviceId() {
    let value = localStorage.getItem(DEVICE_ID_KEY);
    if (!value) {
      value = id();
      originalSetItem.call(localStorage, DEVICE_ID_KEY, value);
    }
    return value;
  }

  function safeJSON(raw, fallback) {
    if (raw === null || raw === undefined || raw === "") return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function config() {
    const saved = safeJSON(localStorage.getItem(CONFIG_KEY), {});
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  }

  function meta() {
    return safeJSON(localStorage.getItem(META_KEY), {
      localChangedAt: null,
      lastSyncedAt: null,
      lastRemoteUpdatedAt: null,
      dirty: false
    });
  }

  function saveMeta(patch) {
    const next = { ...meta(), ...patch };
    originalSetItem.call(localStorage, META_KEY, JSON.stringify(next));
    return next;
  }

  function isDragonFlyDataKey(key) {
    if (!key) return false;
    if (key === CONFIG_KEY || key === META_KEY || key === LOG_KEY || key === BACKUP_KEY || key === DEVICE_ID_KEY) return false;
    return key.startsWith(DATA_PREFIX) || key === ACTIVE_WORKSPACE_KEY;
  }

  function collectPayload() {
    const payload = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!isDragonFlyDataKey(key)) continue;
      const raw = localStorage.getItem(key);
      payload[key] = safeJSON(raw, raw);
    }
    return payload;
  }

  function createSafetyBackup(reason, payload = collectPayload()) {
    const backup = {
      createdAt: new Date().toISOString(),
      reason,
      payload
    };
    originalSetItem.call(localStorage, BACKUP_KEY, JSON.stringify(backup));
  }

  function applyPayload(payload, remoteUpdatedAt) {
    if (!payload || typeof payload !== "object") return;
    createSafetyBackup("Before applying cloud data");
    state.applyingRemote = true;
    try {
      Object.entries(payload).forEach(([key, value]) => {
        if (!isDragonFlyDataKey(key)) return;
        originalSetItem.call(
          localStorage,
          key,
          typeof value === "string" ? value : JSON.stringify(value)
        );
      });
      saveMeta({
        dirty: false,
        lastSyncedAt: new Date().toISOString(),
        lastRemoteUpdatedAt: remoteUpdatedAt || new Date().toISOString()
      });
    } finally {
      state.applyingRemote = false;
    }
  }

  function addLog(message, type = "info") {
    const storedEntries = safeJSON(localStorage.getItem(LOG_KEY), []);
    const entries = Array.isArray(storedEntries) ? storedEntries : [];
    entries.unshift({
      id: id(),
      at: new Date().toISOString(),
      message,
      type
    });
    const trimmed = entries.slice(0, 20);
    originalSetItem.call(localStorage, LOG_KEY, JSON.stringify(trimmed));
    renderLog();
  }

  function renderLog() {
    const container = document.getElementById("cloudActivityLog");
    if (!container) return;
    const storedEntries = safeJSON(localStorage.getItem(LOG_KEY), []);
    const entries = Array.isArray(storedEntries) ? storedEntries : [];
    container.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "cloud-log-empty";
      empty.textContent = "No cloud activity yet.";
      container.append(empty);
      return;
    }
    entries.slice(0, 8).forEach(entry => {
      const article = document.createElement("article");
      article.className = "cloud-log-entry";
      const time = document.createElement("time");
      time.dateTime = entry.at;
      time.textContent = new Date(entry.at).toLocaleString([], {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      });
      const message = document.createElement("span");
      message.textContent = entry.message;
      article.append(time, message);
      container.append(article);
    });
  }

  function setStatus(label, mode = "") {
    ["cloudHeaderStatus", "cloudMirrorStatus"].forEach(elementId => {
      const element = document.getElementById(elementId);
      if (!element) return;
      element.textContent = label;
      element.classList.remove("is-connected", "is-syncing", "is-error");
      if (mode) element.classList.add(`is-${mode}`);
    });
    window.dispatchEvent(new CustomEvent(CLOUD_EVENT, { detail: { label, mode } }));
  }

  function setAuthMessage(message, mode = "") {
    const element = document.getElementById("cloudAuthMessage");
    if (!element) return;
    element.textContent = message;
    element.classList.remove("is-success", "is-error");
    if (mode) element.classList.add(`is-${mode}`);
  }

  function classifyCloudError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || error || "");
    const lower = message.toLowerCase();

    if (
      code === "42P01" ||
      code === "PGRST205" ||
      lower.includes("dragonfly_cloud_state") &&
      (lower.includes("not find") || lower.includes("does not exist") || lower.includes("schema cache"))
    ) {
      return {
        kind: "database-missing",
        headline: "Signed in • Database setup required",
        message: "Your account connection works. Run SUPABASE_SETUP.sql once in Supabase SQL Editor to activate mirroring."
      };
    }

    if (
      code === "42501" ||
      lower.includes("row-level security") ||
      lower.includes("permission denied")
    ) {
      return {
        kind: "security-policy",
        headline: "Signed in • Security setup required",
        message: "Authentication works, but the database security policies are missing or incomplete. Run SUPABASE_SETUP.sql again."
      };
    }

    if (
      lower.includes("failed to fetch") ||
      lower.includes("network") ||
      lower.includes("load failed")
    ) {
      return {
        kind: "network",
        headline: "Signed in • Waiting for internet",
        message: "Your account remains connected. Lotus will retry mirroring when the connection is available."
      };
    }

    return {
      kind: "unknown",
      headline: "Signed in • Mirror needs attention",
      message: message || "The account connection works, but the data mirror could not finish."
    };
  }

  function setCloudState(kind, detail = "") {
    state.lastError = kind.includes("error") || kind.includes("required") ? detail : null;

    if (!state.configured) {
      setStatus("Cloud not configured");
      return;
    }

    if (!state.user) {
      setStatus("Configured • Sign in required");
      return;
    }

    if (kind === "syncing") {
      setStatus("Signed in • Synchronizing…", "syncing");
      return;
    }

    if (kind === "connected") {
      setStatus("Cloud connected", "connected");
      return;
    }

    if (kind === "database-required") {
      setStatus("Signed in • Database setup required", "error");
      return;
    }

    if (kind === "security-required") {
      setStatus("Signed in • Security setup required", "error");
      return;
    }

    if (kind === "offline") {
      setStatus("Signed in • Offline changes waiting", "syncing");
      return;
    }

    setStatus("Signed in • Mirror needs attention", "error");
  }

  function showCloudSetupGuidance(classified) {
    const headline = document.getElementById("cloudSyncHeadline");
    const last = document.getElementById("cloudLastSync");
    if (headline) headline.textContent = classified.headline;
    if (last) last.textContent = classified.message;
    setAuthMessage(classified.message, classified.kind === "network" ? "" : "error");

    if (classified.kind === "database-missing") {
      setCloudState("database-required", classified.message);
    } else if (classified.kind === "security-policy") {
      setCloudState("security-required", classified.message);
    } else if (classified.kind === "network") {
      setCloudState("offline", classified.message);
    } else {
      setCloudState("error", classified.message);
    }
  }

  function renderAccount() {
    const label=document.getElementById("cloudAccountLabel");
    const detail=document.getElementById("cloudAccountDetail");
    const signOut=document.getElementById("cloudSignOutButton");
    const syncNow=document.getElementById("cloudSyncNowButton");
    const create=document.getElementById("cloudCreateAccountButton");
    const signInButton=document.getElementById("cloudSignInButton");
    const card=document.querySelector(".cloud-auth-card");
    if(state.user){
      if(label) label.textContent=state.user.email||"Signed in";
      if(detail) detail.textContent="This private account owns the cloud memory shared by your devices.";
      if(signOut) signOut.hidden=false; if(syncNow) syncNow.disabled=false;
      if(create) create.hidden=true; if(signInButton) signInButton.hidden=true;
      card?.classList.add("is-signed-in");
    } else {
      if(label) label.textContent=state.configured?"Configuration saved — sign in next":"Not signed in";
      if(detail) detail.textContent=state.configured?"Create the account once, then use the same email and password on every device.":"Connect your private Supabase project, then create your account.";
      if(signOut) signOut.hidden=true; if(syncNow) syncNow.disabled=true;
      if(create) create.hidden=false; if(signInButton) signInButton.hidden=false;
      card?.classList.remove("is-signed-in");
    }
  }

  function renderSyncMeta() {
    const current = meta();
    const headline = document.getElementById("cloudSyncHeadline");
    const last = document.getElementById("cloudLastSync");

    if (state.user && state.databaseReady === false) {
      if (headline) headline.textContent = "Signed in • Database setup required";
      if (last) last.textContent = "Run SUPABASE_SETUP.sql once in Supabase SQL Editor, then return and select Synchronize Now.";
      return;
    }

    if (headline) {
      headline.textContent = current.dirty
        ? "This device has changes waiting to mirror."
        : state.user && state.databaseReady
          ? "This device and cloud are aligned."
          : state.user
            ? "Signed in. Checking the data mirror."
            : "Local data is safe on this device.";
    }
    if (last) {
      last.textContent = current.lastSyncedAt
        ? `Last synchronized ${new Date(current.lastSyncedAt).toLocaleString()}.`
        : "No successful cloud synchronization yet.";
    }
  }

  function markLocalChanged(key) {
    if (!isDragonFlyDataKey(key) || state.applyingRemote) return;
    saveMeta({
      dirty: true,
      localChangedAt: new Date().toISOString()
    });
    renderSyncMeta();
    schedulePush();
  }

  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (this === localStorage) markLocalChanged(key);
  };

  Storage.prototype.removeItem = function(key) {
    originalRemoveItem.call(this, key);
    if (this === localStorage) markLocalChanged(key);
  };

  function schedulePush() {
    if (!state.user || !navigator.onLine) {
      state.pendingPush = true;
      return;
    }
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => pushLocal("Automatic mirror"), 1200);
  }

  async function initializeClient() {
    const saved = config();
    const savedKey = String(saved.anonKey || "");
    const savedSecret =
      savedKey.startsWith("sb_secret_") ||
      savedKey.toLowerCase().includes("service_role");

    if (savedSecret) {
      state.configured = false;
      setStatus("Unsafe key must be removed", "error");
      setAuthMessage(
        "A secret/server key was detected. Click Remove Configuration, rotate that secret in Supabase, then save the sb_publishable_ key.",
        "error"
      );
      renderAccount();
      return;
    }

    state.configured = Boolean(saved.url && saved.anonKey);
    renderAccount();

    const urlField = document.getElementById("cloudProjectUrl");
    const keyField = document.getElementById("cloudAnonKey");
    if (urlField) urlField.value = saved.url || "";
    if (keyField) keyField.value = saved.anonKey || "";

    if (!state.configured) {
      setStatus("Cloud not configured");
      return;
    }
    if (!window.supabase?.createClient) {
      setStatus("Cloud library unavailable", "error");
      addLog("Supabase library did not load. Check the internet connection.", "error");
      return;
    }

    state.client = window.supabase.createClient(saved.url, saved.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: { eventsPerSecond: 2 }
      }
    });

    const { data: { session } } = await state.client.auth.getSession();
    await handleSession(session);

    state.client.auth.onAuthStateChange((_event, sessionValue) => {
      setTimeout(() => handleSession(sessionValue), 0);
    });
  }

  async function handleSession(session) {
    state.session = session || null;
    state.user = session?.user || null;
    renderAccount();

    if (!state.user) {
      setStatus("Configured • Sign in required");
      if (state.channel && state.client) {
        await state.client.removeChannel(state.channel);
        state.channel = null;
      }
      return;
    }

    setCloudState("syncing");
    setAuthMessage("Signed in. Checking the DragonFly data mirror…", "success");
    addLog(`Signed in as ${state.user.email || "your account"}.`);
    await subscribeRealtime();
    await synchronize("Sign-in synchronization");
  }

  async function subscribeRealtime() {
    if (!state.client || !state.user) return;
    if (state.channel) await state.client.removeChannel(state.channel);

    state.channel = state.client
      .channel(`dragonfly-cloud-${state.user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: TABLE_NAME,
        filter: `user_id=eq.${state.user.id}`
      }, payload => {
        const row = payload.new;
        if (!row?.payload || row.device_id === getDeviceId()) return;
        handleRemoteRow(row, "Realtime update");
      })
      .subscribe(status => {
        if (status === "SUBSCRIBED") addLog("Realtime cloud mirror is listening.");
      });
  }

  async function fetchRemote() {
    const { data, error } = await state.client
      .from(TABLE_NAME)
      .select("user_id,payload,revision,device_id,updated_at")
      .eq("user_id", state.user.id)
      .maybeSingle();

    if (error) throw error;
    state.databaseReady = true;
    return data || null;
  }

  async function pushLocal(reason = "Manual synchronization") {
    if (!state.client || !state.user || state.syncing) return;
    if (!navigator.onLine) {
      state.pendingPush = true;
      saveMeta({ dirty: true });
      setCloudState("offline");
      renderSyncMeta();
      return;
    }

    state.syncing = true;
    setCloudState("syncing");
    try {
      const currentMeta = meta();
      const remote = await fetchRemote();
      const revision = Number(remote?.revision || 0) + 1;
      const row = {
        user_id: state.user.id,
        payload: collectPayload(),
        revision,
        device_id: getDeviceId(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await state.client
        .from(TABLE_NAME)
        .upsert(row, { onConflict: "user_id" })
        .select("updated_at,revision")
        .single();

      if (error) throw error;
      saveMeta({
        dirty: false,
        lastSyncedAt: new Date().toISOString(),
        lastRemoteUpdatedAt: data.updated_at
      });
      state.pendingPush = false;
      state.databaseReady = true;
      setCloudState("connected");
      addLog(`${reason} completed.`);
    } catch (error) {
      const classified = classifyCloudError(error);
      state.databaseReady = classified.kind === "database-missing" ? false : state.databaseReady;
      showCloudSetupGuidance(classified);
      addLog(classified.message, "error");
      console.error("DragonFly Cloud push failed:", error);
    } finally {
      state.syncing = false;
      renderSyncMeta();
    }
  }

  function newestSide(remote) {
    const currentMeta = meta();
    const localTime = Date.parse(currentMeta.localChangedAt || 0);
    const remoteTime = Date.parse(remote?.updated_at || 0);
    if (!remote) return "local";
    if (!currentMeta.dirty) return "remote";
    return localTime > remoteTime ? "local" : "remote";
  }

  async function handleRemoteRow(remote, reason) {
    if (!remote || state.syncing) return;
    const lastSeen = Date.parse(meta().lastRemoteUpdatedAt || 0);
    const remoteTime = Date.parse(remote.updated_at || 0);
    if (remoteTime <= lastSeen) return;

    if (newestSide(remote) === "local") {
      await pushLocal(`${reason}: kept newer device changes`);
      return;
    }

    applyPayload(remote.payload, remote.updated_at);
    state.databaseReady = true;
    setCloudState("connected");
    addLog(`${reason} received from another device.`);
    renderSyncMeta();
    setTimeout(() => location.reload(), 500);
  }

  async function synchronize(reason = "Manual synchronization") {
    if (!state.client || !state.user || state.syncing) return;
    if (!navigator.onLine) {
      setCloudState("offline");
      state.pendingPush = true;
      return;
    }

    state.syncing = true;
    setCloudState("syncing");
    try {
      const remote = await fetchRemote();
      if (!remote) {
        state.syncing = false;
        await pushLocal("First cloud upload");
        return;
      }

      const winner = newestSide(remote);
      if (winner === "local") {
        state.syncing = false;
        await pushLocal(reason);
        return;
      }

      applyPayload(remote.payload, remote.updated_at);
      state.databaseReady = true;
      setCloudState("connected");
      addLog(`${reason}: cloud copy restored to this device.`);
      renderSyncMeta();
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      const classified = classifyCloudError(error);
      state.databaseReady = classified.kind === "database-missing" ? false : state.databaseReady;
      showCloudSetupGuidance(classified);
      addLog(classified.message, "error");
      console.error("DragonFly Cloud sync failed:", error);
    } finally {
      state.syncing = false;
      renderSyncMeta();
    }
  }

  async function saveConfiguration() {
    const url = document.getElementById("cloudProjectUrl")?.value.trim() || "";
    const anonKey = document.getElementById("cloudAnonKey")?.value.trim() || "";
    const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url);
    const isPublishableKey = anonKey.startsWith("sb_publishable_");
    const isLegacyAnonKey = anonKey.startsWith("eyJ") && anonKey.length > 80;
    const isSecretKey =
      anonKey.startsWith("sb_secret_") ||
      anonKey.toLowerCase().includes("service_role");

    if (isSecretKey) {
      setAuthMessage(
        "Stop: this is a secret/server key. Remove it and use the sb_publishable_ key.",
        "error"
      );
      setStatus("Unsafe key rejected", "error");
      return;
    }

    if (!validUrl || (!isPublishableKey && !isLegacyAnonKey)) {
      setAuthMessage(
        "Enter your https://…supabase.co Project URL and the full sb_publishable_ key.",
        "error"
      );
      return;
    }
    originalSetItem.call(localStorage, CONFIG_KEY, JSON.stringify({
      url: url.replace(/\/$/, ""),
      anonKey
    }));
    setAuthMessage("Cloud configuration saved. Sign in next.", "success");
    addLog("Supabase project configuration saved.");
    location.reload();
  }

  async function clearConfiguration() {
    if (state.client) await state.client.auth.signOut();
    originalRemoveItem.call(localStorage, CONFIG_KEY);
    originalRemoveItem.call(localStorage, META_KEY);
    setAuthMessage("Cloud configuration removed. Local DragonFly data was not deleted.", "success");
    addLog("Cloud configuration removed; local data preserved.");
    setTimeout(() => location.reload(), 400);
  }

  function authCredentials(){return {email:document.getElementById("cloudEmail")?.value.trim()||"",password:document.getElementById("cloudPassword")?.value||""};}
  function validateCredentials(c,needPassword=true){if(!c.email.includes("@")){setAuthMessage("Enter the email you will use on every device.","error");return false;}if(needPassword&&c.password.length<8){setAuthMessage("Use a password with at least 8 characters.","error");return false;}return true;}
  async function createAccount(){
    if(!state.client){setAuthMessage("Save the cloud configuration first.","error");return;}
    const c=authCredentials(); if(!validateCredentials(c)) return; setAuthMessage("Creating your private DragonFly account…");
    const {data,error}=await state.client.auth.signUp({email:c.email,password:c.password,options:{emailRedirectTo:`${location.origin}${location.pathname}#cloud`,data:{display_name:"Captain Ren",app:"DragonFly Lotus"}}});
    if(error){setAuthMessage(error.message,"error");addLog(`Account creation failed: ${error.message}`,"error");return;}
    originalSetItem.call(localStorage,"dragonflyLotusCloudEmail",c.email);
    if(data.session){setAuthMessage("Account created and signed in. Preparing your first cloud mirror…","success");addLog(`DragonFly account created for ${c.email}.`);await handleSession(data.session);}else{setAuthMessage("Account created. Check your email to confirm, then return and sign in.","success");addLog(`Confirmation email sent to ${c.email}.`);}
  }
  async function signIn(){
    if(!state.client){setAuthMessage("Save the cloud configuration first.","error");return;}
    const c=authCredentials(); if(!validateCredentials(c)) return; setAuthMessage("Signing in…");
    const {data,error}=await state.client.auth.signInWithPassword(c);
    if(error){setAuthMessage("The email or password was not accepted. Check both and try again.","error");addLog(`Sign-in failed: ${error.message}`,"error");return;}
    originalSetItem.call(localStorage,"dragonflyLotusCloudEmail",c.email);setAuthMessage("Signed in. Comparing this device with DragonFly Cloud…","success");await handleSession(data.session);
  }
  async function requestPasswordReset(){
    if(!state.client){setAuthMessage("Save the cloud configuration first.","error");return;}
    const c=authCredentials(); if(!validateCredentials(c,false)) return; setAuthMessage("Sending password-reset instructions…");
    const {error}=await state.client.auth.resetPasswordForEmail(c.email,{redirectTo:`${location.origin}${location.pathname}#cloud`});
    if(error){setAuthMessage(error.message,"error");return;}setAuthMessage("Check your email for the password-reset link.","success");
  }

  async function signOut() {
    if (state.client) await state.client.auth.signOut();
    state.user = null;
    state.session = null;
    state.databaseReady = null;
    setCloudState("signed-out");
    setAuthMessage("Signed out. Local data remains on this device.", "success");
    addLog("Signed out of DragonFly Cloud.");
    renderAccount();
  }

  function bindUI() {
    document.getElementById("cloudSaveConfigButton")?.addEventListener("click", saveConfiguration);
    document.getElementById("cloudClearConfigButton")?.addEventListener("click", clearConfiguration);
    document.getElementById("cloudCreateAccountButton")?.addEventListener("click", createAccount);
    document.getElementById("cloudSignInButton")?.addEventListener("click", signIn);
    document.getElementById("cloudForgotPasswordButton")?.addEventListener("click", requestPasswordReset);
    document.getElementById("cloudSignOutButton")?.addEventListener("click", signOut);
    document.getElementById("cloudSyncNowButton")?.addEventListener("click", () => synchronize());
    document.getElementById("cloudClearLogButton")?.addEventListener("click", () => {
      originalSetItem.call(localStorage, LOG_KEY, JSON.stringify([]));
      renderLog();
    });

    document.getElementById("cloudPassword")?.addEventListener("keydown", event => { if(event.key === "Enter") signIn(); });

    const email = localStorage.getItem("dragonflyLotusCloudEmail");
    const emailField = document.getElementById("cloudEmail");
    if (email && emailField) emailField.value = email;

    window.addEventListener("online", () => {
      addLog("Internet connection restored.");
      if (state.user) synchronize("Connection restored");
    });
    window.addEventListener("offline", () => {
      setCloudState("offline");
      addLog("Offline mode active. Changes will wait on this device.");
    });

    window.addEventListener("dragonfly-data-change", () => {
      saveMeta({ dirty: true, localChangedAt: new Date().toISOString() });
      schedulePush();
    });

    renderLog();
    renderSyncMeta();
  }

  async function init() {
    getDeviceId();
    bindUI();
    try {
      await initializeClient();
    } catch (error) {
      setStatus("Cloud setup error", "error");
      setAuthMessage(error.message || "Cloud initialization failed.", "error");
      addLog(error.message || "Cloud initialization failed.", "error");
      console.error(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.DragonFlyCloud = {
    synchronize,
    pushLocal,
    collectPayload,
    createSafetyBackup,
    status: () => ({
      configured: state.configured,
      signedIn: Boolean(state.user),
      email: state.user?.email || null,
      databaseReady: state.databaseReady,
      syncing: state.syncing,
      lastError: state.lastError,
      meta: meta()
    })
  };
})();
