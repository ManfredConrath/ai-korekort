/* ============================================================
   AI-kørekort: fremdrift, låsning og navigation
   Gemmes lokalt i browseren (localStorage) pr. enhed/browser.
   ============================================================ */

(function (global) {
  const STORAGE_KEY = "aikorekort_progress_v1";
  const TOTAL_CHAPTERS = 7;

  const CHAPTERS = [
    { n: 1, title: "Teoretisk grundlag af AI", desc: "Hvad er AI, generativ AI og sprogmodeller, og hvordan opstår svarene?" },
    { n: 2, title: "Prompt engineering", desc: "Sådan skriver du prompts, der giver brugbare svar til din undervisning." },
    { n: 3, title: "AI modeller", desc: "Overblik over ChatGPT, Claude, Perplexity, SkoleGPT m.fl., og hvornår du må bruge hvad." },
    { n: 4, title: "AI i praksis", desc: "Videnstigen, faldgruber og Aabenraa Kommunes rammer for brug af AI i skolen." },
    { n: 5, title: "Undervisning med AI", desc: "Konkrete eksempler, kildekritik og AI-fodspor i elevernes opgaver." },
    { n: 6, title: "Anbefalinger til egen praksis", desc: "Sådan bruges AI ansvarligt, og hvordan I deler erfaringer som kolleger." },
    { n: 7, title: "Inspiration", desc: "Værktøjer, bøger og næste skridt, din bro fra viden til handling." },
  ];

  function getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { completed: [], reflections: {}, updatedAt: null };
      const parsed = JSON.parse(raw);
      return {
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        reflections: parsed.reflections || {},
        updatedAt: parsed.updatedAt || null,
      };
    } catch (e) {
      return { completed: [], reflections: {}, updatedAt: null };
    }
  }

  function saveState(state, opts) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!(opts && opts.silent) && typeof global.__aikorekortOnChange === "function") {
      global.__aikorekortOnChange(state);
    }
  }

  // Replace local state wholesale (used when syncing down from the cloud).
  // silent:true skips re-triggering the cloud sync hook (avoids write-back loops).
  function replaceState(newState, opts) {
    const state = {
      completed: Array.isArray(newState.completed) ? newState.completed.slice().sort((a, b) => a - b) : [],
      reflections: newState.reflections || {},
      updatedAt: newState.updatedAt || null,
    };
    saveState(state, opts);
    return state;
  }

  function isDone(n) {
    return getState().completed.includes(n);
  }

  function isUnlocked(n) {
    if (n <= 1) return true;
    return isDone(n - 1);
  }

  function markComplete(n, reflectionText) {
    const state = getState();
    if (!state.completed.includes(n)) state.completed.push(n);
    state.completed.sort((a, b) => a - b);
    if (typeof reflectionText === "string") {
      state.reflections[n] = reflectionText;
    }
    saveState(state);
    return state;
  }

  function saveReflectionDraft(n, text) {
    const state = getState();
    state.reflections[n] = text;
    saveState(state);
  }

  function allComplete() {
    return getState().completed.length >= TOTAL_CHAPTERS;
  }

  function resetProgress() {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof global.__aikorekortOnChange === "function") {
      global.__aikorekortOnChange(getState());
    }
  }

  /* ---------- Path helpers (works from root or /kapitler/) ---------- */
  function inChapterFolder() {
    return location.pathname.indexOf("/kapitler/") !== -1;
  }

  function rootPath(file) {
    return (inChapterFolder() ? "../" : "") + file;
  }

  function chapterPath(n) {
    return (inChapterFolder() ? "" : "kapitler/") + "kapitel" + n + ".html";
  }

  /* ---------- Guard for chapter pages ---------- */
  function guardChapter(n) {
    if (!isUnlocked(n)) {
      const url = rootPath("index.html") + "?locked=" + n;
      location.replace(url);
      return false;
    }
    return true;
  }

  /* ---------- Stepper UI ---------- */
  // Renders "Forside" + "Kapitel 1..7" as a row of labeled pills. Forside and any
  // unlocked chapter are real links (so you can jump straight back to a chapter
  // you've already done, or to the forside); locked chapters are inert.
  function renderStepper(container, currentN) {
    if (!container) return;
    container.innerHTML = "";

    const home = document.createElement("a");
    home.className = "step-pill home";
    home.href = rootPath("index.html");
    home.textContent = "Forside";
    container.appendChild(home);

    for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
      const done = isDone(i);
      const current = i === currentN;
      const unlocked = isUnlocked(i);

      const el = document.createElement(unlocked ? "a" : "span");
      if (unlocked) el.href = chapterPath(i);
      el.className = "step-pill" + (current ? " current" : done ? " done" : unlocked ? " open" : " locked");
      el.textContent = "Kapitel " + i;
      el.title = "Kapitel " + i + (done ? " (gennemført)" : unlocked ? "" : " (låst)");
      container.appendChild(el);
    }
  }

  /* ---------- Index page rendering ---------- */
  function renderIndex(opts) {
    const state = getState();
    const grid = opts.gridEl;
    const fill = opts.fillEl;
    const countEl = opts.countEl;
    const certCard = opts.certCardEl;

    const doneCount = state.completed.length;
    if (fill) fill.style.width = Math.round((doneCount / TOTAL_CHAPTERS) * 100) + "%";
    if (countEl) countEl.textContent = doneCount + " af " + TOTAL_CHAPTERS + " kapitler gennemført";

    if (grid) {
      grid.innerHTML = "";
      CHAPTERS.forEach((ch) => {
        const done = isDone(ch.n);
        const unlocked = isUnlocked(ch.n);
        const card = document.createElement("div");
        card.className = "chapter-card " + (done ? "is-done " : "") + (unlocked ? "is-unlocked" : "is-locked");

        let statusHtml;
        if (done) {
          statusHtml = '<span class="chapter-status done">✓ Gennemført</span>';
        } else if (unlocked) {
          statusHtml = '<span class="chapter-status open">→ Klar til start</span>';
        } else {
          statusHtml = '<span class="chapter-status locked">🔒 Lås op ved at gennemføre kapitel ' + (ch.n - 1) + '</span>';
        }

        card.innerHTML =
          '<div class="chapter-num">' + ch.n + "</div>" +
          '<p class="chapter-title">' + ch.title + "</p>" +
          '<p class="chapter-desc">' + ch.desc + "</p>" +
          statusHtml +
          (unlocked ? '<a class="chapter-card-link" href="' + chapterPath(ch.n) + '" aria-label="Åbn kapitel ' + ch.n + '"></a>' : "");

        grid.appendChild(card);
      });
    }

    if (certCard) {
      const link = certCard.querySelector("a.btn");
      if (allComplete()) {
        certCard.querySelector(".cert-status") && (certCard.querySelector(".cert-status").textContent = "Alle 7 kapitler er gennemført, dit certifikat venter!");
        if (link) { link.setAttribute("href", rootPath("certifikat.html")); link.textContent = "Hent dit certifikat →"; }
      } else {
        certCard.querySelector(".cert-status") && (certCard.querySelector(".cert-status").textContent = (TOTAL_CHAPTERS - doneCount) + " kapitler tilbage, før certifikatet låses op.");
        if (link) { link.setAttribute("href", rootPath("certifikat.html")); link.textContent = "Se certifikat-status"; }
      }
    }

    // Locked-chapter query message
    const params = new URLSearchParams(location.search);
    const lockedParam = params.get("locked");
    if (lockedParam && opts.lockedNoticeEl) {
      opts.lockedNoticeEl.style.display = "block";
      opts.lockedNoticeEl.textContent =
        "Kapitel " + lockedParam + " er endnu ikke låst op. Gennemfør kapitlerne i rækkefølge, start hvor din grønne markering slutter.";
    }
  }

  global.AIKorekort = {
    TOTAL_CHAPTERS,
    CHAPTERS,
    getState,
    replaceState,
    isDone,
    isUnlocked,
    markComplete,
    saveReflectionDraft,
    allComplete,
    resetProgress,
    guardChapter,
    renderStepper,
    renderIndex,
    rootPath,
    chapterPath,
  };
})(window);
