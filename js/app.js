/* Page behaviour. All text is written with textContent (SPEC S2). */
(function () {
  'use strict';

  const L = window.ConfidentMeLogic;
  const D = window.ConfidentMeData;
  const STORAGE_KEY = 'confident-me.v1';
  const $ = (id) => document.getElementById(id);

  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else if (key === 'on') Object.entries(value).forEach(([type, fn]) => node.addEventListener(type, fn));
      else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value === true ? '' : value);
    });
    children.flat().forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return L.sanitizeSaved(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return L.sanitizeSaved(null);
    }
  }

  let state = loadState();
  let menuOffset = 0;
  let selectedFood = 'yogurt';

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* The app still works without storage. */ }
  }

  const FIELD_IDS = Object.keys(L.DEFAULT_FORM);

  function fillForm() {
    FIELD_IDS.forEach((id) => {
      const el = $(id);
      if (el.type === 'checkbox') el.checked = state.form[id];
      else el.value = state.form[id];
    });
    $('example-note').hidden = state.customised;
  }

  function readProfile() {
    const f = state.form;
    const metric = f.units === 'metric';
    const num = (value) => (value === '' ? NaN : Number(value));
    const cm = metric ? num(f.cm) : L.ftInToCm(num(f.ft), num(f.inch));
    const kg = metric ? num(f.weight) : L.lbToKg(num(f.weight));
    const goalKg = metric ? num(f.goal) : L.lbToKg(num(f.goal));
    return { cm, kg, goalKg, days: num(f.days), age: num(f.age), sex: f.sex, activity: f.activity, clinician: f.clinician };
  }

  const fmtDate = (d) => d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
  const fmtNum = (n) => Math.round(n).toLocaleString('en-CA');

  function showWeight(kg) {
    return state.form.units === 'metric' ? `${kg.toFixed(1)} kg` : `${Math.round(L.kgToLb(kg))} lb`;
  }

  const STOP_MESSAGES = {
    clinician: ['Please plan this with a professional', 'Your needs may differ from a standard calorie plan, so this app does not set a calorie target. A doctor or registered dietitian can advise you safely. The posture section remains available.'],
    minor: ['This calorie planner is for adults', 'Growing bodies have different needs, so this app does not set a calorie target for anyone under 18. A doctor can give advice that fits you. The posture section remains available.'],
    'underweight-now': ['Weight loss is not recommended here', 'Your current BMI is below 18.5, so this app does not create a weight loss plan. A doctor or registered dietitian can help you with your goals.'],
    'underweight-goal': ['This goal is below the healthy BMI range', 'Your desired weight would give a BMI below 18.5, so this app does not create a plan for it. Try a desired weight within the range shown below.'],
    'no-loss': ['Your desired weight is not lower', 'This app plans for weight loss only. Enter a desired weight below your current weight. The posture section remains available.'],
    'no-room': ['A lower calorie target is not advisable', 'Your estimated daily energy is already close to the minimum this app allows. A registered dietitian can suggest a plan that suits you.']
  };

  function renderVerdict(plan) {
    const box = $('verdict');
    box.replaceChildren();
    if (!plan) {
      box.append(h('div', { class: 'verdict stop' }, h('p', { class: 'verdict-tag' }, 'Check your details'), h('p', { class: 'verdict-main' }, 'Correct the details listed under your entries to see your plan.')));
      return;
    }
    if (!plan.hasPlan) {
      const [title, body] = STOP_MESSAGES[plan.status];
      box.append(h('div', { class: 'verdict stop' }, h('p', { class: 'verdict-tag' }, 'No calorie plan'), h('p', { class: 'verdict-main' }, title), h('p', {}, body)));
      return;
    }
    const metric = state.form.units === 'metric';
    const amount = metric ? `${String(Math.round(L.lbToKg(plan.lb) * 10) / 10)} kg` : `${String(Math.round(plan.lb * 10) / 10)} lb`;
    const pace = metric ? `${L.lbToKg(plan.lbPerWeek).toFixed(1)} kg per week` : `${plan.lbPerWeek.toFixed(1)} lb per week`;
    const onTrack = plan.status === 'on-track';
    const days = Number(state.form.days);
    box.append(h('div', { class: `verdict ${onTrack ? 'ok' : 'adjust'}` },
      h('p', { class: 'verdict-tag' }, onTrack ? 'Realistic goal' : 'Goal date adjusted'),
      h('p', { class: 'verdict-main' }, `Estimated goal date: ${fmtDate(plan.estimatedDate)}`),
      onTrack
        ? h('p', {}, `Losing ${amount} in ${days} days fits within this planner's limits.`)
        : h('p', {}, `Losing ${amount} of body fat in ${days} days would need a deficit of about ${fmtNum(plan.requiredDeficit)} kcal per day. That is not safe to do through food. The scale may drop quickly in the first days, but that is mostly water. This plan takes about ${plan.estimatedDays} days instead.`),
      h('dl', { class: 'stats' },
        h('div', {}, h('dt', {}, 'Daily target'), h('dd', {}, `${fmtNum(plan.intake)} kcal`)),
        h('div', {}, h('dt', {}, 'Estimated daily use'), h('dd', {}, `${fmtNum(plan.tdee)} kcal`)),
        h('div', {}, h('dt', {}, 'Estimated pace'), h('dd', {}, pace))
      )));
  }

  const SCALE_MIN = 15;
  const SCALE_MAX = 40;
  const pct = (v) => ((Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  function renderBmi(plan) {
    const box = $('bmi-panel');
    box.replaceChildren();
    if (!plan) return;
    const bands = [['Under', SCALE_MIN, 18.5, 'band-low'], ['Healthy', 18.5, 25, 'band-good'], ['Over', 25, 30, 'band-mid'], ['Obesity', 30, SCALE_MAX, 'band-high']];
    const bar = h('div', { class: 'scale' }, bands.map(([label, a, b, cls]) => h('span', { class: `band ${cls}`, style: null }, label)));
    bar.querySelectorAll('.band').forEach((el, i) => { el.style.width = `${pct(bands[i][2]) - pct(bands[i][1])}%`; });
    const marker = (value, text, cls) => {
      const m = h('span', { class: `marker ${cls}` }, h('span', { class: 'marker-text' }, `${text} ${value.toFixed(1)}`));
      m.style.left = `${pct(value)}%`;
      return m;
    };
    const ticks = h('div', { class: 'ticks', 'aria-hidden': 'true' }, [18.5, 25, 30].map((v) => {
      const t = h('span', {}, v);
      t.style.left = `${pct(v)}%`;
      return t;
    }));
    const goalIsLeft = plan.bmiGoal <= plan.bmiNow;
    box.append(h('div', { class: 'bmi' },
      h('h3', {}, 'Your BMI'),
      h('p', {}, `Now: ${plan.bmiNow.toFixed(1)} (${plan.bandNow}). At your goal: ${plan.bmiGoal.toFixed(1)} (${plan.bandGoal}).`),
      h('div', { class: 'scale-wrap', 'aria-hidden': 'true' }, marker(plan.bmiNow, 'Now', goalIsLeft ? 'to-right' : 'to-left'), marker(plan.bmiGoal, 'Goal', goalIsLeft ? 'to-left' : 'to-right'), bar, ticks),
      h('p', { class: 'fine' }, `The healthy BMI range at your height is about ${showWeight(plan.healthyMinKg)} to ${showWeight(plan.healthyMaxKg)}. BMI is a screening number. It does not measure muscle, body shape or overall health.`)));
  }

  function itemText(item) {
    if (item.count) return `${item.count} ${item.count === 1 ? item.unit.name : item.unit.plural}`;
    return `${item.name}, ${item.grams} g`;
  }

  function renderMenu(plan) {
    const box = $('menu');
    box.replaceChildren();
    $('next-day').hidden = true;
    if (!plan || !plan.hasPlan) {
      box.append(h('p', { class: 'empty' }, 'Meal suggestions appear when a calorie plan is available.'));
      return;
    }
    const f = state.form;
    const snackOn = f.snackOn;
    const limit = Number(f.snackLimit);
    if (snackOn && !(limit >= 50 && limit <= 300)) {
      box.append(h('p', { class: 'empty' }, 'Enter a snack limit between 50 and 300 kcal.'));
      return;
    }
    const schedule = L.buildSchedule({ mealCount: Number(f.mealCount), first: f.first, last: f.last, snackOn, snackTime: f.snackTime });
    if (schedule.error) {
      box.append(h('p', { class: 'empty' }, schedule.error));
      return;
    }
    const menu = L.buildMenu({ intake: plan.intake, schedule: schedule.items, snackLimit: limit, sugarFree: f.sugarFree, vegetarian: f.vegetarian, favourites: state.favourites, offset: menuOffset });
    $('next-day').hidden = false;
    schedule.warnings.forEach((text) => box.append(h('p', { class: 'warn' }, text)));
    const list = h('ol', { class: 'day' }, menu.entries.map((entry) => h('li', { class: entry.kind === 'snack' ? 'snack' : '' },
      h('time', {}, L.minutesToLabel(entry.minutes)),
      h('div', { class: 'meal-body' },
        h('p', { class: 'meal-kicker' }, entry.kind === 'snack' ? `Snack, limit ${limit} kcal` : entry.label),
        h('h3', {}, entry.name),
        h('p', {}, entry.items.map(itemText).join(' · '))),
      h('p', { class: 'meal-kcal' }, `${entry.kcal} kcal`))));
    box.append(list, h('p', { class: 'day-total' }, `Total ${fmtNum(menu.total)} kcal, compared with a target of ${fmtNum(menu.target)} kcal. Drink water through the day, and count any added milk, sugar or oil.`));
    if (menu.total < menu.target * 0.95) box.append(h('p', { class: 'warn' }, `These meals are about ${fmtNum(menu.target - menu.total)} kcal below your target. Add another meal, or add a side such as fruit, yogurt or vegetables.`));

    const removed = state.favourites.map(L.foodById).filter((food) => food && ((f.sugarFree && food.sugar > 0) || (f.vegetarian && !food.veg)));
    if (removed.length) box.append(h('p', { class: 'warn' }, `Your settings keep these favourites out of the meals: ${removed.map((food) => food.name).join(', ')}.`));
  }

  function renderFoodResults() {
    const box = $('food-results');
    const results = L.searchFoods($('food-search').value);
    box.replaceChildren();
    if ($('food-search').value.trim().length >= 2 && !results.length) {
      box.append(h('p', { class: 'empty' }, 'That food is not in the list yet. Check the label for protein, fibre and added sugar, then compare the serving size with your plan.'));
      return;
    }
    results.forEach((food) => box.append(h('button', {
      type: 'button', class: `chip${food.id === selectedFood ? ' active' : ''}`,
      on: { click: () => { selectedFood = food.id; renderFoodResults(); renderFoodCard(); } }
    }, food.name)));
  }

  function renderFoodCard() {
    const box = $('food-card');
    box.replaceChildren();
    const food = L.foodById(selectedFood);
    if (!food) return;
    const rating = L.rateFood(food);
    const isFav = state.favourites.includes(food.id);
    const sentence = rating.reasons.length ? `Per 100 g, it is ${rating.reasons.join(', ')}.` : 'It is a moderate choice for its weight.';
    box.append(h('article', { class: `food level-${rating.level}` },
      h('div', { class: 'food-head' }, h('h3', {}, food.name), h('span', { class: 'pill' }, rating.label)),
      h('p', {}, sentence),
      h('p', {}, h('strong', {}, 'How to include it: '), food.tip),
      h('dl', { class: 'facts' },
        h('div', {}, h('dt', {}, 'Energy'), h('dd', {}, `${food.kcal} kcal`)),
        h('div', {}, h('dt', {}, 'Protein'), h('dd', {}, `${food.protein} g`)),
        h('div', {}, h('dt', {}, 'Fibre'), h('dd', {}, `${food.fibre} g`)),
        h('div', {}, h('dt', {}, 'Added or free sugar'), h('dd', {}, `${food.sugar} g`))),
      h('button', { type: 'button', class: 'button', on: { click: () => toggleFavourite(food.id) } }, isFav ? 'Remove from my meals' : 'Add to my meals')));
  }

  function toggleFavourite(id) {
    state.favourites = state.favourites.includes(id) ? state.favourites.filter((x) => x !== id) : state.favourites.concat(id);
    state.customised = true;
    menuOffset = 0;
    save();
    renderAll();
  }

  function renderFavourites() {
    const box = $('favourites');
    box.replaceChildren();
    if (!state.favourites.length) box.append(h('p', { class: 'empty' }, 'Search for a food above, then add it to your meals.'));
    state.favourites.forEach((id) => {
      const food = L.foodById(id);
      box.append(h('button', { type: 'button', class: 'chip active', 'aria-label': `Remove ${food.name}`, on: { click: () => toggleFavourite(id) } }, `${food.name} ×`));
    });
  }

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function renderPosture() {
    const key = todayKey();
    if (state.posture.date !== key) state.posture = { date: key, done: [] };
    const box = $('moves');
    box.replaceChildren();
    D.POSTURE.forEach((move) => {
      const id = `move-${move.id}`;
      const input = h('input', {
        type: 'checkbox', id, checked: state.posture.done.includes(move.id),
        on: { change: (e) => {
          state.posture.done = e.target.checked ? state.posture.done.concat(move.id) : state.posture.done.filter((x) => x !== move.id);
          save();
          updatePostureCount();
        } }
      });
      box.append(h('li', {}, h('label', { for: id, class: 'move' }, input,
        h('span', {}, h('span', { class: 'move-title' }, h('strong', {}, move.name), h('span', { class: 'dose' }, move.dose)),
          h('span', { class: 'move-how' }, move.how), h('span', { class: 'move-help' }, move.helps)))));
    });
    updatePostureCount();
  }

  function updatePostureCount() {
    $('posture-count').textContent = `${state.posture.done.length} of ${D.POSTURE.length} done today`;
  }

  function renderErrors(errors, extra) {
    const box = $('errors');
    const messages = Object.values(errors).concat(extra);
    box.replaceChildren(...messages.map((m) => h('li', {}, m)));
    box.hidden = !messages.length;
  }

  function renderForm() {
    const metric = state.form.units === 'metric';
    $('imperial-height').hidden = metric;
    $('metric-height').hidden = !metric;
    document.querySelectorAll('.unit-w').forEach((el) => { el.textContent = metric ? 'kg' : 'lb'; });
    $('snack-fields').hidden = !state.form.snackOn;
  }

  function renderAll() {
    renderForm();
    const profile = readProfile();
    const errors = L.validateProfile(profile);
    const valid = !Object.keys(errors).length;
    const extra = [];
    if (state.form.units === 'imperial' && Number(state.form.inch) > 11) extra.push('Inches must be between 0 and 11.');
    renderErrors(errors, extra);
    const plan = valid && !extra.length ? L.calculatePlan(profile, new Date()) : null;
    renderVerdict(plan);
    renderBmi(plan);
    renderMenu(plan);
    renderFoodResults();
    renderFoodCard();
    renderFavourites();
    $('example-note').hidden = state.customised;
  }

  $('details').addEventListener('submit', (e) => e.preventDefault());
  FIELD_IDS.forEach((id) => {
    const el = $(id);
    const handler = () => {
      state.form[id] = el.type === 'checkbox' ? el.checked : el.value;
      state.customised = true;
      menuOffset = 0;
      $('delete-status').textContent = '';
      save();
      renderAll();
    };
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', handler);
  });
  $('food-search').addEventListener('input', () => {
    const first = L.searchFoods($('food-search').value)[0];
    if (first) selectedFood = first.id;
    renderFoodResults();
    renderFoodCard();
  });
  $('next-day').addEventListener('click', () => {
    menuOffset += 1;
    renderMenu(L.calculatePlan(readProfile(), new Date()));
  });
  $('delete-data').addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* Nothing was stored. */ }
    state = L.sanitizeSaved(null);
    menuOffset = 0;
    selectedFood = 'yogurt';
    $('food-search').value = '';
    fillForm();
    renderPosture();
    renderAll();
    $('delete-status').textContent = 'Your data was deleted. The example values are back.';
  });

  let reminderTimer = null;
  $('reminder').addEventListener('change', (e) => {
    clearInterval(reminderTimer);
    const minutes = Number(e.target.value);
    if (minutes > 0) reminderTimer = setInterval(() => { $('reminder-banner').hidden = false; }, minutes * 60000);
  });
  $('reminder-close').addEventListener('click', () => { $('reminder-banner').hidden = true; });

  fillForm();
  renderPosture();
  renderAll();
})();
