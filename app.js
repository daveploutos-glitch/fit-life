/* FIT LIFE · SpaceX scroll storytelling runtime */
(function () {
  "use strict";

  const C = {
    white: "#ffffff",
    soft: "rgba(255,255,255,0.55)",
    dim: "rgba(255,255,255,0.12)",
    track: "rgba(255,255,255,0.08)",
    blue: "#3d7eff",
    blueSoft: "rgba(61,126,255,0.35)",
    blueFill: "rgba(61,126,255,0.1)",
    warn: "rgba(196,163,90,0.55)",
    gray: "rgba(255,255,255,0.28)",
  };

  const state = {
    profile: null,
    goals: null,
    log: null,
    version: null,
    charts: {},
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const setText = (sel, text) => {
    const n = $(sel);
    if (n) n.textContent = text;
  };
  const setHtml = (sel, html) => {
    const n = $(sel);
    if (n) n.innerHTML = html;
  };

  function fmtNum(n, d = 1) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString("en-HK", {
      maximumFractionDigits: d,
      minimumFractionDigits: Number.isInteger(n) ? 0 : Math.min(d, 1),
    });
  }

  function mid(range) {
    if (!range) return null;
    if (typeof range === "number") return range;
    if (range.est != null) return range.est;
    if (range.min != null && range.max != null) return (range.min + range.max) / 2;
    return range.min ?? range.max ?? null;
  }

  function rangeLabel(r, unit = "") {
    if (!r) return "—";
    if (r.min != null && r.max != null && r.min !== r.max)
      return `${fmtNum(r.min, 0)}–${fmtNum(r.max, 0)}${unit}`;
    const v = mid(r);
    return v == null ? "—" : `${fmtNum(v, 0)}${unit}`;
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function daysBetween(a, b) {
    return Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);
  }

  function pctProgress(start, end, now) {
    const total = daysBetween(start, end);
    const done = daysBetween(start, now);
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (done / total) * 100));
  }

  async function loadJSON(path) {
    const res = await fetch(path + "?t=" + Date.now());
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  async function boot() {
    try {
      const [profile, goals, log, version] = await Promise.all([
        loadJSON("data/profile.json"),
        loadJSON("data/goals.json"),
        loadJSON("data/log.json"),
        loadJSON("version.json").catch(() => null),
      ]);
      state.profile = profile;
      state.goals = goals;
      state.log = log;
      state.version = version;
      render();
      bindNav();
      bindReveal();
      bindParallax();
    } catch (err) {
      console.error(err);
      const banner = document.createElement("div");
      banner.className = "error";
      banner.innerHTML = `載入失敗 / LOAD ERROR<br><small>${err.message}</small><br><small>試下強制刷新：Safari 長按重新載入</small>`;
      document.body.prepend(banner);
    }
  }

  function bindNav() {
    const toggle = $("#nav-toggle");
    const links = $("#nav-links");
    const nav = $("#site-nav");

    toggle?.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    $$("#nav-links a").forEach((a) => {
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle?.classList.remove("open");
        toggle?.setAttribute("aria-expanded", "false");
      });
    });

    const sections = ["mission", "telemetry", "training", "fuel", "log"].map((id) =>
      document.getElementById(id)
    );
    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");

      let current = null;
      const y = window.scrollY + 120;
      sections.forEach((sec) => {
        if (!sec) return;
        if (sec.offsetTop <= y) current = sec.id;
      });
      $$("#nav-links a").forEach((a) => {
        a.classList.toggle("active", a.getAttribute("href") === "#" + current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function bindReveal() {
    const nodes = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((n) => io.observe(n));
  }

  function bindParallax() {
    const bgs = $$(".stage-bg");
    if (!bgs.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          bgs.forEach((bg) => {
            const stage = bg.parentElement;
            if (!stage) return;
            const top = stage.offsetTop;
            const h = stage.offsetHeight;
            if (y + window.innerHeight < top || y > top + h) return;
            const local = (y - top) * 0.12;
            bg.style.transform = `translate3d(0, ${local}px, 0)`;
          });
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  function latestEntry() {
    const entries = state.log?.entries || [];
    return entries[entries.length - 1] || null;
  }

  function entryByDate(date) {
    return (state.log?.entries || []).find((e) => e.date === date) || null;
  }

  function todayOrLatest() {
    return entryByDate(todayISO()) || latestEntry();
  }

  function render() {
    const p = state.profile;
    const g = state.goals;
    const today = todayISO();
    const entry = todayOrLatest();
    const baseline = p.baseline;
    const dayNum = daysBetween(g.start, today) + 1;
    const progress = pctProgress(g.start, g.end, today);

    setText("#hero-weight", fmtNum(baseline.weightKg, 1));
    setText("#hero-sub", `${p.name} · ${p.coach} · Day ${Math.max(1, dayNum)} / ${g.weeks * 7} · ${p.training.phaseName}`);

    renderMission(g, progress, dayNum);
    renderTelemetry(p);
    renderTraining(p);
    renderFuel(entry, p);
    renderJournal();

    const ver = state.version;
    $("#footer-meta").textContent = ver
      ? `DATA ${ver.version} · ${ver.built} ${ver.tz || "HKT"}`
      : "FIT AS FUCK";
  }

  function renderMission(g, progress, dayNum) {
    $("#mission-lede").innerHTML =
      `目標 summer body：${g.summerBody.weightKg.min}–${g.summerBody.weightKg.max} kg · ${g.summerBody.bodyFatPct.min}–${g.summerBody.bodyFatPct.max}% 體脂。<br />` +
      `時軸 ${g.start} → ${g.end}。`;
    setText("#mission-summer", `${g.summerBody.weightKg.min}–${g.summerBody.weightKg.max} kg`);
    setText("#mission-bf", `${g.summerBody.bodyFatPct.min}–${g.summerBody.bodyFatPct.max}% BF`);
    setText("#mission-6m", `${g.sixMonth.targetWeightKg.min}–${g.sixMonth.targetWeightKg.max} kg`);
    setText("#mission-loss", `−${g.sixMonth.weightLossKg.min}–${g.sixMonth.weightLossKg.max} kg`);
    setText("#mission-pct", `${progress.toFixed(1)}%`);
    setText("#mission-day", `Day ${Math.max(1, dayNum)} / ${g.weeks * 7}`);
    (() => { const __n = $("#mission-bar"); if (__n) __n.style.width = `${progress.toFixed(1)}%`; })();
    setText("#mission-range", `${g.start} → ${g.end}`);

    const today = todayISO();
    $("#phase-row").innerHTML = (g.phases || [])
      .map((ph) => {
        let cls = "";
        if (today > ph.end) cls = "done";
        else if (today >= ph.start && today <= ph.end) cls = "active";
        return `<div class="phase-card ${cls}">
          <div class="ph-w">${ph.weeks}</div>
          <div class="ph-n">${ph.name}</div>
          <div class="ph-f">${ph.focus}</div>
        </div>`;
      })
      .join("");
  }

  function renderTelemetry(p) {
    const b = p.baseline;
    setText("#telemetry-lede", `官方基準 ${b.source} · ${b.date} ${b.time} · ${b.note}`);
    $("#baseline-strip").innerHTML = [
      ["WEIGHT", `${fmtNum(b.weightKg, 1)} kg`],
      ["BF%", `${fmtNum(b.bodyFatPct, 1)}%`],
      ["FAT", `${fmtNum(b.fatMassKg, 1)} kg`],
      ["MUSCLE", `${fmtNum(b.skeletalMuscleKg, 1)} kg`],
      ["FFM", `${fmtNum(b.ffmKg, 1)} kg`],
      ["BMI", fmtNum(b.bmi, 1)],
      ["VF", fmtNum(b.visceralFat, 0)],
      ["BMR", fmtNum(b.bmr, 0)],
    ]
      .map(([k, v]) => `<div class="bs"><div class="k">${k}</div><div class="v">${v}</div></div>`)
      .join("");

    const entries = state.log.entries.filter((e) => e.weightKg != null);
    makeLineChart(
      "chart-weight",
      entries.map((e) => e.date.slice(5)),
      [
        {
          label: "kg",
          data: entries.map((e) => e.weightKg),
          borderColor: C.white,
          backgroundColor: "rgba(255,255,255,0.05)",
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: C.white,
          borderWidth: 1.5,
        },
      ]
    );

    const bfEntries = state.log.entries.filter((e) => e.bodyComp?.bodyFatPct != null);
    makeLineChart(
      "chart-bf",
      bfEntries.map((e) => e.date.slice(5)),
      [
        {
          label: "BF%",
          data: bfEntries.map((e) => e.bodyComp.bodyFatPct),
          borderColor: C.soft,
          backgroundColor: "rgba(255,255,255,0.04)",
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: C.soft,
          borderWidth: 1.5,
        },
      ]
    );

    const all = state.log.entries || [];
    makeBarChart(
      "chart-steps",
      all.map((e) => e.date.slice(5)),
      [
        {
          label: "steps",
          data: all.map((e) => e.steps),
          backgroundColor: "rgba(255,255,255,0.35)",
          borderRadius: 0,
        },
      ]
    );
  }

  function chartDefaults() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.color = "#6b6b6b";
    Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
    Chart.defaults.font.family = "Inter, Noto Sans TC, system-ui, sans-serif";
    Chart.defaults.font.size = 11;
  }

  function makeLineChart(id, labels, datasets) {
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return;
    if (state.charts[id]) state.charts[id].destroy();
    chartDefaults();
    state.charts[id] = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.04)" } },
          y: { grid: { color: "rgba(255,255,255,0.04)" }, beginAtZero: false },
        },
      },
    });
  }

  function makeBarChart(id, labels, datasets) {
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return;
    if (state.charts[id]) state.charts[id].destroy();
    chartDefaults();
    state.charts[id] = new Chart(canvas, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "rgba(255,255,255,0.04)" }, beginAtZero: true },
        },
      },
    });
  }

  function renderTraining(p) {
    setText("#training-lede", `${p.training.phaseName} · ${p.training.split}`);

    const done = (state.log.entries || []).filter((e) => e.training?.status === "complete");
    const latest = done[done.length - 1];
    const list = $("#workout-a-log");
    if (latest?.training) {
      list.innerHTML = latest.training.exercises
        .map((ex) => {
          const wt =
            ex.kg != null
              ? `${ex.sets}×${ex.reps}@${ex.kg}${ex.perSide ? "/side" : ""}kg`
              : `${ex.sets}×${ex.reps}`;
          return `<li><span class="nm">${ex.nameZh || ex.name}<small>${ex.name}</small></span><span class="wt">${wt}</span></li>`;
        })
        .join("");
      setText("#workout-a-meta", `${latest.date} · Workout ${latest.training.workout} · FIRST COMPLETE`);
    } else {
      list.innerHTML = "<li>尚未有訓練記錄</li>";
    }

    const B = p.workouts.B;
    $("#workout-b-plan").innerHTML = (B.exercises || [])
      .map((ex) => {
        const sug = ex.suggestedKg ? `建議 ${ex.suggestedKg}` : `${ex.sets}×${ex.reps}`;
        return `<li><span class="nm">${ex.nameZh}<small>${ex.name} · ${ex.sets}×${ex.reps}</small></span><span class="wt">${sug}</span></li>`;
      })
      .join("");
    setText("#workout-b-meta", `計劃 ${B.plannedDate || "Sat"} · Workout B`);

    $("#week-strip").innerHTML = (p.training.thisWeek || [])
      .map((d) => {
        const cls = d.status === "done" ? "done" : "";
        const st = d.status === "done" ? "COMPLETE" : "PLANNED";
        return `<div class="week-day ${cls}">
          <div class="wd">${d.date} · ${d.day}</div>
          <div class="ww">WORKOUT ${d.workout}</div>
          <div class="ws">${st}</div>
        </div>`;
      })
      .join("");
    setText("#week-note", p.training.note || "");
  }

  function renderFuel(entry, p) {
    const t = p.targets;
    const kcal = mid(entry?.kcal) ?? 0;
    const protein = mid(entry?.proteinG) ?? 0;
    const steps = entry?.steps ?? 0;
    const sleep = entry?.sleepH ?? 0;
    const incomplete = entry?.kcal?.incomplete || entry?.partial;

    const dateLabel = entry?.date === todayISO() ? "今日 TODAY" : `最近 ${entry?.date || "—"}`;
    setText("#fuel-lede", dateLabel + (incomplete ? " · partial" : ""));

    setText("#fuel-kcal", kcal ? fmtNum(kcal, 0) + (incomplete && kcal < 500 ? "*" : "") : "—");
    setText("#fuel-protein", protein ? fmtNum(protein, 0) + (incomplete && protein < 40 ? "*" : "") : "—");
    setText("#fuel-steps", steps ? fmtNum(steps, 0) : "—");
    setText("#fuel-sleep", sleep ? fmtNum(sleep, 1) : "—");

    setText("#fuel-kcal-t", `目標 ${t.kcal.min}–${t.kcal.max}`);
    setText("#fuel-protein-t", `目標 ${t.proteinG.min}–${t.proteinG.max}g`);
    setText("#fuel-steps-t", `目標 ${fmtNum(t.steps.min, 0)}–${fmtNum(t.steps.max, 0)}`);
    setText("#fuel-sleep-t", `目標 ${t.sleepH.min}h+`);

    const kcalT = (t.kcal.min + t.kcal.max) / 2;
    const proteinT = (t.proteinG.min + t.proteinG.max) / 2;
    const stepsT = (t.steps.min + t.steps.max) / 2;
    const sleepT = t.sleepH.min;

    setBar("fuel-kcal-bar", kcal, kcalT);
    setBar("fuel-protein-bar", protein, proteinT);
    setBar("fuel-steps-bar", steps, stepsT);
    setBar("fuel-sleep-bar", sleep, sleepT);

    const entries = state.log.entries || [];
    const labels = entries.map((e) => e.date.slice(5));
    makeBarChart("chart-kcal", labels, [
      {
        label: "kcal",
        data: entries.map((e) => mid(e.kcal)),
        backgroundColor: entries.map((e) =>
          e.kcal?.incomplete ? C.warn : "rgba(255,255,255,0.5)"
        ),
        borderRadius: 0,
      },
    ]);
    makeBarChart("chart-protein", labels, [
      {
        label: "protein",
        data: entries.map((e) => mid(e.proteinG)),
        backgroundColor: entries.map((e) =>
          e.proteinG?.incomplete ? C.warn : "rgba(255,255,255,0.28)"
        ),
        borderRadius: 0,
      },
    ]);
  }

  function setBar(id, value, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
    requestAnimationFrame(() => {
      el.style.width = `${pct}%`;
    });
  }

  function renderJournal() {
    const feed = $("#journal-feed");
    const entries = [...(state.log.entries || [])].reverse();
    feed.innerHTML = entries
      .map((e) => {
        const tags = [];
        if (e.type === "train" || e.training?.status === "complete")
          tags.push('<span class="j-tag train">TRAIN</span>');
        if (e.type === "rest") tags.push('<span class="j-tag">REST</span>');
        if (e.type === "baseline") tags.push('<span class="j-tag">BASELINE</span>');
        if (e.freeMeal) tags.push('<span class="j-tag free">FREE MEAL</span>');
        if (e.partial) tags.push('<span class="j-tag">PARTIAL</span>');
        const meta = [];
        if (e.weightKg != null) meta.push(`<span>${e.weightKg} kg</span>`);
        if (e.steps != null) meta.push(`<span>${fmtNum(e.steps, 0)} steps</span>`);
        if (e.kcal) meta.push(`<span>${rangeLabel(e.kcal)} kcal</span>`);
        if (e.proteinG) meta.push(`<span>${rangeLabel(e.proteinG)}g P</span>`);
        if (e.sleepH != null) meta.push(`<span>${fmtNum(e.sleepH, 1)}h sleep</span>`);
        return `<article class="j-entry reveal">
          <div class="j-date">${e.date}（${e.weekday || ""}）${tags.join("")}</div>
          <div class="j-body">${e.journal || e.notes || ""}</div>
          <div class="j-meta">${meta.join("")}</div>
        </article>`;
      })
      .join("");

    // re-observe newly injected journal reveals
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("in");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      $$(".j-entry.reveal", feed).forEach((n) => io.observe(n));
    } else {
      $$(".j-entry.reveal", feed).forEach((n) => n.classList.add("in"));
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
