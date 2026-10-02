/* FIT LIFE · dashboard runtime — SpaceX minimal palette */
(function () {
  "use strict";

  const LS_HABITS = "fitlife.habits.v1";
  const LS_NOTES = "fitlife.notes.v1";
  const LS_CHECKS = "fitlife.checks.v1";

  /* Monochrome + single accent */
  const C = {
    white: "#ffffff",
    soft: "rgba(255,255,255,0.55)",
    dim: "rgba(255,255,255,0.12)",
    track: "rgba(255,255,255,0.08)",
    blue: "#3d7eff",
    blueSoft: "rgba(61,126,255,0.35)",
    blueFill: "rgba(61,126,255,0.12)",
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
    const ms = Date.parse(b) - Date.parse(a);
    return Math.floor(ms / 86400000);
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
    const root = $("#app");
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
      restoreLocal();
    } catch (err) {
      root.innerHTML = `<div class="error">載入失敗 / LOAD ERROR<br><small>${err.message}</small></div>`;
      console.error(err);
    }
  }

  function bindNav() {
    $$(".nav button").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".nav button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const id = btn.dataset.section;
        $$(".section").forEach((s) => s.classList.toggle("active", s.id === id));
        Object.values(state.charts).forEach((c) => c && c.resize && c.resize());
      });
    });
  }

  function restoreLocal() {
    try {
      const habits = JSON.parse(localStorage.getItem(LS_HABITS) || "{}");
      $$(".chip[data-habit]").forEach((chip) => {
        if (habits[chip.dataset.habit]) chip.classList.add("on");
        chip.addEventListener("click", () => {
          chip.classList.toggle("on");
          const h = JSON.parse(localStorage.getItem(LS_HABITS) || "{}");
          h[chip.dataset.habit] = chip.classList.contains("on");
          localStorage.setItem(LS_HABITS, JSON.stringify(h));
        });
      });
    } catch (_) {}

    const notes = localStorage.getItem(LS_NOTES) || "";
    const ta = $("#local-notes");
    if (ta) {
      ta.value = notes;
      $("#save-notes")?.addEventListener("click", () => {
        localStorage.setItem(LS_NOTES, ta.value);
        const s = $("#notes-status");
        if (s) {
          s.textContent = "已儲存 · SAVED";
          setTimeout(() => (s.textContent = ""), 1800);
        }
      });
    }
  }

  function latestEntry() {
    const entries = state.log?.entries || [];
    return entries[entries.length - 1] || null;
  }

  function entryByDate(date) {
    return (state.log?.entries || []).find((e) => e.date === date) || null;
  }

  function todayOrLatest() {
    const t = todayISO();
    return entryByDate(t) || latestEntry();
  }

  function render() {
    const p = state.profile;
    const g = state.goals;
    const today = todayISO();
    const entry = todayOrLatest();
    const baseline = p.baseline;
    const dayNum = daysBetween(g.start, today) + 1;
    const progress = pctProgress(g.start, g.end, today);

    $("#brand-sub").textContent = `${p.name} · ${p.coach} · Day ${Math.max(1, dayNum)} / ${g.weeks * 7}`;
    $("#pill-phase").textContent = p.training.phaseName;
    $("#pill-weight").textContent = `${fmtNum(baseline.weightKg, 1)} kg`;
    $("#pill-bf").textContent = `${fmtNum(baseline.bodyFatPct, 1)}% BF`;
    $("#pill-date").textContent = today;

    renderKPIs(entry, p);
    renderWeekPlan(p);
    renderHabits(g);
    renderGoals(g, progress, dayNum);
    renderBodyComp(p);
    renderTraining(p);
    renderNutrition();
    renderStepsSleep();
    renderJournal();
    renderHeat();

    const ver = state.version;
    $("#footer-meta").textContent = ver
      ? `BUILD ${ver.version} · ${ver.built} ${ver.tz || "HKT"}`
      : "FIT LIFE";
  }

  function drawRing(canvasId, value, target, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const pct = target > 0 ? Math.min(value / target, 1.15) : 0;
    const remain = Math.max(0, 1 - Math.min(pct, 1));
    if (state.charts[canvasId]) state.charts[canvasId].destroy();
    state.charts[canvasId] = new Chart(canvas, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [Math.min(pct, 1), remain],
            backgroundColor: [color, C.track],
            borderWidth: 0,
            hoverOffset: 0,
          },
        ],
      },
      options: {
        cutout: "78%",
        responsive: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { animateRotate: true, duration: 900 },
      },
    });
  }

  function renderKPIs(entry, p) {
    const t = p.targets;
    const kcal = mid(entry?.kcal) ?? 0;
    const protein = mid(entry?.proteinG) ?? 0;
    const steps = entry?.steps ?? 0;
    const sleep = entry?.sleepH ?? 0;
    const kcalTarget = (t.kcal.min + t.kcal.max) / 2;
    const proteinTarget = (t.proteinG.min + t.proteinG.max) / 2;
    const stepsTarget = (t.steps.min + t.steps.max) / 2;
    const sleepTarget = t.sleepH.min;

    const incomplete = entry?.kcal?.incomplete || entry?.partial;

    $("#kpi-kcal-val").textContent = incomplete && kcal < 500 ? fmtNum(kcal, 0) + "*" : fmtNum(kcal, 0);
    $("#kpi-protein-val").textContent =
      incomplete && protein < 40 ? fmtNum(protein, 0) + "*" : fmtNum(protein, 0);
    $("#kpi-steps-val").textContent = steps ? fmtNum(steps, 0) : "—";
    $("#kpi-sleep-val").textContent = sleep ? fmtNum(sleep, 1) : "—";

    $("#kpi-kcal-tgt").textContent = `目標 ${t.kcal.min}–${t.kcal.max}`;
    $("#kpi-protein-tgt").textContent = `目標 ${t.proteinG.min}–${t.proteinG.max}g`;
    $("#kpi-steps-tgt").textContent = `目標 ${fmtNum(t.steps.min, 0)}–${fmtNum(t.steps.max, 0)}`;
    $("#kpi-sleep-tgt").textContent = `目標 ${t.sleepH.min}h+`;

    const dateLabel = entry?.date === todayISO() ? "今日 TODAY" : `最新 ${entry?.date || "—"}`;
    $("#kpi-hint").textContent = dateLabel + (incomplete ? " · partial" : "");

    drawRing("ring-kcal", kcal, kcalTarget, C.white);
    drawRing("ring-protein", protein, proteinTarget, C.soft);
    drawRing("ring-steps", steps || 0, stepsTarget, C.blue);
    drawRing("ring-sleep", sleep || 0, sleepTarget, C.gray);
  }

  function renderWeekPlan(p) {
    const el = $("#week-plan");
    el.innerHTML = (p.training.thisWeek || [])
      .map((d) => {
        const cls = d.status === "done" ? "done" : "planned";
        const st = d.status === "done" ? "COMPLETE" : "PLANNED";
        return `<div class="day-card ${cls}">
          <div class="d">${d.date} · ${d.day}</div>
          <div class="w">WORKOUT ${d.workout}</div>
          <div class="st">${st}</div>
        </div>`;
      })
      .join("");
    $("#week-note").textContent = p.training.note || "";
  }

  function renderHabits(g) {
    const el = $("#habit-chips");
    el.innerHTML = (g.habits || [])
      .map(
        (h) =>
          `<button type="button" class="chip" data-habit="${h.id}"><span class="ico">${h.icon}</span>${h.label}</button>`
      )
      .join("");
  }

  function renderGoals(g, progress, dayNum) {
    $("#goal-progress-bar").style.width = `${progress.toFixed(1)}%`;
    $("#goal-progress-txt").textContent = `${progress.toFixed(1)}% · Day ${Math.max(1, dayNum)}`;
    $("#goal-range").textContent = `${g.start} → ${g.end}`;
    $("#goal-summer").textContent = `${g.summerBody.weightKg.min}–${g.summerBody.weightKg.max} kg · ${g.summerBody.bodyFatPct.min}–${g.summerBody.bodyFatPct.max}% BF`;
    $("#goal-6m").textContent = `${g.sixMonth.targetWeightKg.min}–${g.sixMonth.targetWeightKg.max} kg（−${g.sixMonth.weightLossKg.min}–${g.sixMonth.weightLossKg.max}kg）`;

    const phases = $("#phase-timeline");
    const today = todayISO();
    phases.innerHTML = (g.phases || [])
      .map((ph) => {
        let cls = "";
        if (today > ph.end) cls = "done";
        else if (today >= ph.start && today <= ph.end) cls = "active";
        return `<div class="tl-item ${cls}">
          <div class="when">${ph.weeks} · ${ph.start} → ${ph.end}</div>
          <div class="what">${ph.name}</div>
          <div class="detail">${ph.focus} · 熱量 ${ph.kcal}</div>
        </div>`;
      })
      .join("");

    const miles = $("#milestones");
    miles.innerHTML = (g.milestones || [])
      .map((m) => {
        const cls = todayISO() >= m.date ? "done" : "";
        return `<div class="tl-item ${cls}">
          <div class="when">W${m.week} · ${m.date}</div>
          <div class="what">${m.weightKg.min}–${m.weightKg.max} kg</div>
          <div class="detail">${m.focus}</div>
        </div>`;
      })
      .join("");
  }

  function renderBodyComp(p) {
    const b = p.baseline;
    const pre = p.preScaleEstimate;
    $("#comp-grid").innerHTML = [
      ["體重 WEIGHT", `${fmtNum(b.weightKg, 1)} kg`],
      ["體脂 BF%", `${fmtNum(b.bodyFatPct, 1)}%`],
      ["脂肪量 FAT", `${fmtNum(b.fatMassKg, 1)} kg`],
      ["骨骼肌 SM", `${fmtNum(b.skeletalMuscleKg, 1)} kg`],
      ["去脂 FFM", `${fmtNum(b.ffmKg, 1)} kg`],
      ["BMI", fmtNum(b.bmi, 1)],
      ["內臟脂肪 VF", fmtNum(b.visceralFat, 0)],
      ["腰臀比 WHR", fmtNum(b.whr, 2)],
      ["BMR", `${fmtNum(b.bmr, 0)} kcal`],
      ["代謝年齡", `${b.metabolicAge} yrs`],
      ["儀器理想", `${fmtNum(b.deviceIdealKg, 1)} kg`],
      ["綜合分", fmtNum(b.score, 0)],
    ]
      .map(([k, v]) => `<div class="comp"><div class="k">${k}</div><div class="v">${v}</div></div>`)
      .join("");

    $("#comp-meta").textContent = `官方基準 ${b.date} ${b.time} · ${b.source} · ${b.note}`;
    $("#comp-prescale").textContent = `先前自報 ${pre.date}：${pre.weightKg} kg（${pre.note}）`;

    const entries = state.log.entries.filter((e) => e.weightKg != null);
    const labels = entries.map((e) => e.date.slice(5));
    const weights = entries.map((e) => e.weightKg);
    makeLineChart("chart-weight", labels, [
      {
        label: "體重 kg",
        data: weights,
        borderColor: C.white,
        backgroundColor: "rgba(255,255,255,0.06)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: C.white,
        borderWidth: 1.5,
      },
    ]);

    const bfEntries = state.log.entries.filter((e) => e.bodyComp?.bodyFatPct != null);
    makeLineChart("chart-bf", bfEntries.map((e) => e.date.slice(5)), [
      {
        label: "體脂 %",
        data: bfEntries.map((e) => e.bodyComp.bodyFatPct),
        borderColor: C.blue,
        backgroundColor: C.blueFill,
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: C.blue,
        borderWidth: 1.5,
      },
    ]);
  }

  function chartDefaults() {
    Chart.defaults.color = "#6b6b6b";
    Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    Chart.defaults.font.size = 11;
  }

  function makeLineChart(id, labels, datasets) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (state.charts[id]) state.charts[id].destroy();
    chartDefaults();
    state.charts[id] = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: datasets.length > 1, labels: { boxWidth: 12 } } },
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.04)" } },
          y: { grid: { color: "rgba(255,255,255,0.04)" }, beginAtZero: false },
        },
      },
    });
  }

  function makeBarChart(id, labels, datasets) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (state.charts[id]) state.charts[id].destroy();
    chartDefaults();
    state.charts[id] = new Chart(canvas, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: datasets.length > 1, labels: { boxWidth: 12 } } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "rgba(255,255,255,0.04)" }, beginAtZero: true },
        },
      },
    });
  }

  function renderTraining(p) {
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
      $("#workout-a-meta").textContent = `${latest.date} · Workout ${latest.training.workout} · FIRST COMPLETE`;
    } else {
      list.innerHTML = "<li>尚未有訓練記錄</li>";
    }

    const bList = $("#workout-b-plan");
    const B = p.workouts.B;
    bList.innerHTML = (B.exercises || [])
      .map((ex) => {
        const sug = ex.suggestedKg ? `建議 ${ex.suggestedKg}` : "";
        return `<li><span class="nm">${ex.nameZh}<small>${ex.name} · ${ex.sets}×${ex.reps}</small></span><span class="wt">${sug}</span></li>`;
      })
      .join("");
    $("#workout-b-meta").textContent = `計劃 ${B.plannedDate || "Sat"} · Workout B`;
  }

  function renderNutrition() {
    const entries = state.log.entries || [];
    const labels = entries.map((e) => e.date.slice(5));
    makeBarChart("chart-kcal", labels, [
      {
        label: "kcal (est)",
        data: entries.map((e) => mid(e.kcal)),
        backgroundColor: entries.map((e) =>
          e.kcal?.incomplete ? C.warn : "rgba(255,255,255,0.55)"
        ),
        borderRadius: 0,
      },
    ]);
    makeBarChart("chart-protein", labels, [
      {
        label: "protein g",
        data: entries.map((e) => mid(e.proteinG)),
        backgroundColor: entries.map((e) =>
          e.proteinG?.incomplete ? C.warn : C.blueSoft
        ),
        borderRadius: 0,
      },
    ]);
  }

  function renderStepsSleep() {
    const entries = state.log.entries || [];
    const labels = entries.map((e) => e.date.slice(5));
    makeBarChart("chart-steps", labels, [
      {
        label: "steps",
        data: entries.map((e) => e.steps),
        backgroundColor: "rgba(255,255,255,0.4)",
        borderRadius: 0,
      },
    ]);
    makeLineChart("chart-sleep", labels, [
      {
        label: "sleep h",
        data: entries.map((e) => e.sleepH),
        borderColor: C.blue,
        backgroundColor: C.blueFill,
        tension: 0.35,
        fill: true,
        spanGaps: true,
        pointRadius: 4,
        borderWidth: 1.5,
      },
    ]);
  }

  function renderJournal() {
    const feed = $("#journal-feed");
    const entries = [...(state.log.entries || [])].reverse();
    feed.innerHTML = entries
      .map((e) => {
        const badges = [];
        if (e.type === "train" || e.training?.status === "complete")
          badges.push('<span class="badge train">TRAIN</span>');
        if (e.type === "rest") badges.push('<span class="badge">REST</span>');
        if (e.type === "baseline") badges.push('<span class="badge">BASELINE</span>');
        if (e.freeMeal) badges.push('<span class="badge free">FREE MEAL</span>');
        if (e.partial) badges.push('<span class="badge">PARTIAL</span>');
        const meta = [];
        if (e.weightKg != null) meta.push(`<span>${e.weightKg} kg</span>`);
        if (e.steps != null) meta.push(`<span>${fmtNum(e.steps, 0)} steps</span>`);
        if (e.kcal) meta.push(`<span>${rangeLabel(e.kcal)} kcal</span>`);
        if (e.proteinG) meta.push(`<span>${rangeLabel(e.proteinG)}g P</span>`);
        return `<article class="jcard">
          <div class="top">
            <div class="date">${e.date}（${e.weekday || ""}）</div>
            <div>${badges.join(" ")}</div>
          </div>
          <div class="body">${e.journal || e.notes || ""}</div>
          <div class="meta">${meta.join("")}</div>
        </article>`;
      })
      .join("");
  }

  function renderHeat() {
    const el = $("#heat-cal");
    const entries = state.log.entries || [];
    const map = Object.fromEntries(entries.map((e) => [e.date, e]));
    const start = state.goals.start;
    const days = ["一", "二", "三", "四", "五", "六", "日"];
    const startDate = new Date(start + "T12:00:00");
    let dow = startDate.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() + mondayOffset);

    let html = days.map((d) => `<div class="hd">${d}</div>`).join("");
    for (let i = 0; i < 28; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const e = map[iso];
      let cls = "cell";
      let txt = String(d.getDate());
      if (e) {
        if (e.training?.status === "complete" || e.type === "train") cls += " train";
        else cls += " rest";
      }
      if (iso === todayISO()) cls += " today";
      html += `<div class="${cls}" title="${iso}">${txt}</div>`;
    }
    el.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
