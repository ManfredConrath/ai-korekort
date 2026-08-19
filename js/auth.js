/* ============================================================
   AI-kørekort – brugerlogin og synkronisering på tværs af enheder
   Bygger oven på Firebase Authentication (brugernavn+kode, gemt som
   en intern "@ai-korekort.local"-mail) og Cloud Firestore (fremdrift).
   Er login IKKE tilgængeligt (fx script blokeret), fungerer sitet
   præcis som før: fremdrift gemmes lokalt i browseren via progress.js.
   ============================================================ */

(function (global) {
  // Hvis Firebase-scripts ikke kunne indlæses (fx offline, ad-blocker eller
  // netværksrestriktion), skal sitet fortsætte med at virke som før – bare
  // uden login/cloud-sync. AIAuth.available afspejler dette til UI-koden.
  if (typeof firebase === "undefined") {
    console.warn("AI-kørekort: Firebase kunne ikke indlæses – login er ikke tilgængeligt. Fremdrift gemmes lokalt som før.");
    global.AIAuth = {
      available: false,
      signUp: function () { return Promise.reject({ message: "Login er ikke tilgængeligt lige nu." }); },
      logIn: function () { return Promise.reject({ message: "Login er ikke tilgængeligt lige nu." }); },
      logOut: function () { return Promise.resolve(); },
      openModal: function () {},
      closeModal: function () {},
    };
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

  let pushTimer = null;
  let currentUid = null;
  let syncingDown = false; // guards against push-loops while we apply a cloud pull

  /* ---------- Username <-> internal email ---------- */
  function usernameToEmail(username) {
    return username.trim().toLowerCase() + "@ai-korekort.local";
  }

  function validateUsername(username) {
    const u = (username || "").trim().toLowerCase();
    if (!USERNAME_RE.test(u)) {
      return { valid: false, message: "Brugernavn skal være 3-30 tegn: kun små bogstaver, tal, punktum, bindestreg eller underscore." };
    }
    return { valid: true, value: u };
  }

  function validatePassword(password) {
    if (!password || password.length < 6) {
      return { valid: false, message: "Koden skal være mindst 6 tegn." };
    }
    return { valid: true };
  }

  function friendlyError(err) {
    const code = err && err.code;
    switch (code) {
      case "auth/email-already-in-use":
        return "Det brugernavn er allerede taget. Vælg et andet, eller log ind i stedet.";
      case "auth/invalid-email":
        return "Ugyldigt brugernavn. Brug kun bogstaver, tal, punktum, bindestreg eller underscore.";
      case "auth/weak-password":
        return "Koden skal være mindst 6 tegn.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Forkert brugernavn eller kode.";
      case "auth/too-many-requests":
        return "For mange forsøg lige nu. Vent lidt, og prøv igen.";
      case "auth/network-request-failed":
        return "Kunne ikke oprette forbindelse. Tjek din internetforbindelse.";
      default:
        return "Der skete en fejl. Prøv igen.";
    }
  }

  /* ---------- Merge local + cloud progress ---------- */
  function mergeStates(local, cloud) {
    const completedSet = new Set([...(local.completed || []), ...(cloud.completed || [])]);
    const completed = Array.from(completedSet).sort((a, b) => a - b);
    const localNewer = !cloud.updatedAt || (local.updatedAt && new Date(local.updatedAt) > new Date(cloud.updatedAt));
    const reflections = {};
    const keys = new Set([...Object.keys(local.reflections || {}), ...Object.keys(cloud.reflections || {})]);
    keys.forEach((k) => {
      const l = (local.reflections || {})[k] || "";
      const c = (cloud.reflections || {})[k] || "";
      if (l && c) reflections[k] = localNewer ? l : c;
      else reflections[k] = l || c;
    });
    return { completed, reflections, updatedAt: new Date().toISOString() };
  }

  /* ---------- Cloud read/write ---------- */
  function docRef(uid) {
    return db.collection("progress").doc(uid);
  }

  function pushToCloud(state, username) {
    if (!currentUid) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      const payload = {
        completed: state.completed || [],
        reflections: state.reflections || {},
        updatedAt: state.updatedAt || new Date().toISOString(),
      };
      if (username) payload.username = username;
      docRef(currentUid).set(payload, { merge: true }).catch(function (e) {
        console.error("AI-kørekort: kunne ikke gemme fremdrift i skyen", e);
      });
    }, 600);
  }

  function pullAndMerge(uid) {
    return docRef(uid).get().then(function (snap) {
      const cloud = snap.exists ? snap.data() : { completed: [], reflections: {}, updatedAt: null };
      const local = global.AIKorekort.getState();
      const merged = mergeStates(local, cloud);
      syncingDown = true;
      global.AIKorekort.replaceState(merged, { silent: true });
      syncingDown = false;
      pushToCloud(merged);
      return merged;
    });
  }

  /* ---------- Sign up / log in / log out ---------- */
  function signUp(rawUsername, password, password2) {
    const uv = validateUsername(rawUsername);
    if (!uv.valid) return Promise.reject({ message: uv.message });
    const pv = validatePassword(password);
    if (!pv.valid) return Promise.reject({ message: pv.message });
    if (password !== password2) return Promise.reject({ message: "De to koder er ikke ens." });

    const email = usernameToEmail(uv.value);
    return auth.createUserWithEmailAndPassword(email, password)
      .then(function (cred) {
        return cred.user.updateProfile({ displayName: uv.value }).then(function () {
          const local = global.AIKorekort.getState();
          const initial = {
            username: uv.value,
            completed: local.completed || [],
            reflections: local.reflections || {},
            updatedAt: new Date().toISOString(),
          };
          return docRef(cred.user.uid).set(initial);
        });
      })
      .catch(function (err) {
        return Promise.reject({ message: friendlyError(err) });
      });
  }

  function logIn(rawUsername, password) {
    const uv = validateUsername(rawUsername);
    if (!uv.valid) return Promise.reject({ message: uv.message });
    const email = usernameToEmail(uv.value);
    return auth.signInWithEmailAndPassword(email, password)
      .catch(function (err) {
        return Promise.reject({ message: friendlyError(err) });
      });
  }

  function logOut() {
    return auth.signOut();
  }

  /* ---------- Widget / modal rendering ---------- */
  function renderWidget(user) {
    const el = document.getElementById("auth-widget");
    if (!el) return;
    if (user) {
      const name = user.displayName || "underviser";
      el.innerHTML =
        '<span class="auth-hello">Hej, ' + escapeHtml(name) + '</span>' +
        '<button type="button" class="auth-link-btn" id="auth-logout-btn">Log ud</button>';
      const btn = document.getElementById("auth-logout-btn");
      if (btn) btn.addEventListener("click", function () { logOut(); });
    } else {
      el.innerHTML = '<button type="button" class="pill auth-open-btn" id="auth-open-btn">👤 Log ind / Opret bruger</button>';
      const btn = document.getElementById("auth-open-btn");
      if (btn) btn.addEventListener("click", function () { openModal("login"); });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function openModal(tab) {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    modal.style.display = "flex";
    switchTab(tab || "login");
  }

  function closeModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    modal.style.display = "none";
    ["login-error", "signup-error"].forEach(function (id) {
      const e = document.getElementById(id);
      if (e) { e.textContent = ""; e.style.display = "none"; }
    });
  }

  function switchTab(tab) {
    const loginForm = document.getElementById("auth-form-login");
    const signupForm = document.getElementById("auth-form-signup");
    const tabs = document.querySelectorAll("#auth-tabs .tab-btn");
    tabs.forEach(function (t) { t.classList.toggle("active", t.dataset.tab === tab); });
    if (loginForm) loginForm.style.display = tab === "login" ? "block" : "none";
    if (signupForm) signupForm.style.display = tab === "signup" ? "block" : "none";
  }

  function showError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.display = "block";
  }

  function setBusy(formEl, busy) {
    if (!formEl) return;
    const btn = formEl.querySelector("button[type=submit]");
    if (btn) btn.disabled = busy;
  }

  function wireModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    const closeBtn = document.getElementById("auth-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });

    document.querySelectorAll("#auth-tabs .tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.dataset.tab); });
    });

    const loginForm = document.getElementById("auth-form-login");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        showError("login-error", "");
        document.getElementById("login-error").style.display = "none";
        setBusy(loginForm, true);
        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;
        logIn(username, password)
          .then(function () { closeModal(); })
          .catch(function (err) { showError("login-error", err.message); })
          .finally(function () { setBusy(loginForm, false); });
      });
    }

    const signupForm = document.getElementById("auth-form-signup");
    if (signupForm) {
      signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        showError("signup-error", "");
        document.getElementById("signup-error").style.display = "none";
        setBusy(signupForm, true);
        const username = document.getElementById("signup-username").value;
        const password = document.getElementById("signup-password").value;
        const password2 = document.getElementById("signup-password2").value;
        signUp(username, password, password2)
          .then(function () { closeModal(); })
          .catch(function (err) { showError("signup-error", err.message); })
          .finally(function () { setBusy(signupForm, false); });
      });
    }
  }

  /* ---------- Boot ---------- */
  function init() {
    wireModal();

    global.__aikorekortOnChange = function (state) {
      if (syncingDown) return;
      if (!currentUid) return;
      pushToCloud(state);
    };

    auth.onAuthStateChanged(function (user) {
      currentUid = user ? user.uid : null;
      renderWidget(user);
      if (user) {
        pullAndMerge(user.uid).then(function () {
          // Re-render anything on the page that depends on progress (index/certifikat use this).
          if (typeof global.__aikorekortAfterSync === "function") global.__aikorekortAfterSync();
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.AIAuth = { available: true, signUp, logIn, logOut, openModal, closeModal };
})(window);
