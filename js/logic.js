/* Pure calculation rules. See SPEC.md. This file does not touch the page or storage. */
(function (root) {
  'use strict';

  const Data = (typeof module !== 'undefined' && module.exports) ? require('./foods.js') : root.ConfidentMeData;

  const KG_PER_LB = 0.45359237;
  const CM_PER_IN = 2.54;
  const KCAL_PER_LB = 3500;
  const MAX_DEFICIT = 1000;
  const FLOORS = { female: 1200, male: 1500 };
  const ACTIVITY = { sitting: 1.2, light: 1.375, moderate: 1.55 };
  const SLOT_WEIGHT = { breakfast: 1, lunch: 1.2, dinner: 1.2, light: 0.6 };
  const SLOT_PLANS = {
    2: ['lunch', 'dinner'],
    3: ['breakfast', 'lunch', 'dinner'],
    4: ['breakfast', 'lunch', 'light', 'dinner'],
    5: ['breakfast', 'light', 'lunch', 'light', 'dinner']
  };
  const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', light: 'Light meal' };

  const lbToKg = (lb) => lb * KG_PER_LB;
  const kgToLb = (kg) => kg / KG_PER_LB;
  const ftInToCm = (ft, inches) => (ft * 12 + inches) * CM_PER_IN;

  function bmi(kg, cm) {
    const m = cm / 100;
    return kg / (m * m);
  }

  /* Bands use the one-decimal value the user sees, so 24.96 displays as 25.0 and reads as Overweight. */
  function bmiBand(raw) {
    const value = Math.round(raw * 10) / 10;
    if (value < 18.5) return 'Underweight';
    if (value < 25) return 'Healthy range';
    if (value < 30) return 'Overweight';
    return 'Obesity range';
  }

  function restingEnergy({ kg, cm, age, sex }) {
    return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
  }

  function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  /* Returns a map of field name to message. An empty map means valid. */
  function validateProfile(p) {
    const errors = {};
    const check = (key, value, min, max, label, range) => {
      if (!Number.isFinite(value)) errors[key] = `Enter your ${label.toLowerCase()}.`;
      else if (value < min || value > max) errors[key] = `${label} must be between ${range}.`;
    };
    const weightRange = '30 and 300 kg (about 66 and 661 lb)';
    check('cm', p.cm, 120, 220, 'Height', '120 and 220 cm (about 3 ft 11 in and 7 ft 3 in)');
    check('kg', p.kg, 30, 300, 'Current weight', weightRange);
    check('goalKg', p.goalKg, 30, 300, 'Desired weight', weightRange);
    check('days', p.days, 1, 730, 'Days to goal', '1 and 730');
    check('age', p.age, 10, 110, 'Age', '10 and 110');
    if (!(p.sex in FLOORS)) errors.sex = 'Choose a formula.';
    if (!(p.activity in ACTIVITY)) errors.activity = 'Choose an activity level.';
    return errors;
  }

  function calculatePlan(p, today) {
    const bmiNow = bmi(p.kg, p.cm);
    const bmiGoal = bmi(p.goalKg, p.cm);
    const m2 = (p.cm / 100) ** 2;
    const base = {
      bmiNow, bmiGoal,
      bandNow: bmiBand(bmiNow),
      bandGoal: bmiBand(bmiGoal),
      healthyMinKg: 18.5 * m2,
      healthyMaxKg: 24.9 * m2
    };
    const stop = (status) => Object.assign(base, { status, hasPlan: false });

    if (p.clinician) return stop('clinician');
    if (p.age < 18) return stop('minor');
    if (bmiNow < 18.5) return stop('underweight-now');
    if (p.goalKg >= p.kg) return stop('no-loss');
    if (bmiGoal < 18.5) return stop('underweight-goal');

    const floor = FLOORS[p.sex];
    const bmr = restingEnergy(p);
    const tdee = bmr * ACTIVITY[p.activity];
    const lb = kgToLb(p.kg - p.goalKg);
    const requiredDeficit = lb * KCAL_PER_LB / p.days;
    const room = tdee - floor;
    Object.assign(base, { floor, bmr, tdee, lb, requiredDeficit, requestedDate: addDays(today, p.days) });
    if (room <= 0) return stop('no-room');

    const deficit = Math.min(requiredDeficit, MAX_DEFICIT, room);
    const intake = Math.round(tdee - deficit);
    const estimatedDays = Math.ceil(lb * KCAL_PER_LB / deficit);
    return Object.assign(base, {
      status: requiredDeficit > deficit + 0.5 ? 'too-fast' : 'on-track',
      hasPlan: true,
      deficit,
      intake,
      estimatedDays,
      estimatedDate: addDays(today, estimatedDays),
      lbPerWeek: deficit * 7 / KCAL_PER_LB
    });
  }

  function timeToMinutes(text) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(text));
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function minutesToLabel(mins) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    const period = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
  }

  function buildSchedule({ mealCount, first, last, snackOn, snackTime }) {
    const start = timeToMinutes(first);
    const end = timeToMinutes(last);
    const warnings = [];
    if (start === null || end === null || end <= start) {
      return { items: [], warnings, error: 'Your last meal must be later than your first meal, on the same day.' };
    }
    const slots = SLOT_PLANS[mealCount];
    if (!slots) return { items: [], warnings, error: 'Choose between 2 and 5 meals.' };
    const gap = (end - start) / (slots.length - 1);
    const items = slots.map((slot, i) => ({
      kind: 'meal', slot, label: SLOT_LABEL[slot],
      minutes: Math.round((start + gap * i) / 5) * 5
    }));
    if (gap < 120) warnings.push('Your meals are less than 2 hours apart. Consider a longer day or fewer meals.');
    if (gap > 360 && !snackOn) warnings.push('Your meals are more than 6 hours apart. A planned snack may help you avoid becoming very hungry.');
    if (end - start < 480) warnings.push('Your eating day is under 8 hours. Check that this feels comfortable and leaves you with enough energy.');
    if (snackOn) {
      const snack = timeToMinutes(snackTime);
      if (snack === null) return { items: [], warnings, error: 'Enter a valid snack time.' };
      items.push({ kind: 'snack', slot: 'snack', label: 'Snack', minutes: snack });
    }
    items.sort((a, b) => a.minutes - b.minutes);
    return { items, warnings, error: null };
  }

  const foodById = (id) => Data.FOODS.find((food) => food.id === id);

  function templateAllowed(template, { sugarFree, vegetarian }) {
    return template.items.every(([id]) => {
      const food = foodById(id);
      return (!sugarFree || food.sugar === 0) && (!vegetarian || food.veg);
    });
  }

  function scaleItems(template, target, roundDown) {
    const raw = template.items.reduce((sum, [id, g]) => sum + foodById(id).kcal * g / 100, 0);
    const min = roundDown ? 0.05 : 0.25;
    const scale = Math.min(2.8, Math.max(min, target / raw));
    const items = template.items.map(([id, g]) => {
      const food = foodById(id);
      const wanted = g * scale;
      let grams;
      let count = null;
      if (food.unit) {
        count = Math.max(1, Math.round(wanted / food.unit.g));
        grams = count * food.unit.g;
      } else {
        grams = Math.max(5, (roundDown ? Math.floor(wanted / 5) : Math.round(wanted / 5)) * 5);
      }
      return { id, name: food.name, grams, count, unit: food.unit || null, kcal: food.kcal * grams / 100 };
    });
    const total = () => items.reduce((sum, item) => sum + item.kcal, 0);
    /* A snack limit is exact. Meals may run up to 5% over because portions are rounded. */
    const ceiling = roundDown ? target : target * 1.05;
    let guard = 400;
    while (total() > ceiling && guard > 0) {
      guard -= 1;
      const largest = items.filter((i) => !i.count && i.grams > 5).sort((a, b) => b.kcal - a.kcal)[0];
      if (!largest) break;
      largest.grams -= 5;
      largest.kcal = foodById(largest.id).kcal * largest.grams / 100;
    }
    return { items, kcal: Math.round(total()) };
  }

  function chooseTemplate(list, used, options, offset) {
    const allowed = list.filter((t) => templateAllowed(t, options));
    const favCount = (t) => t.items.filter(([id]) => options.favourites.includes(id)).length;
    const favs = allowed.filter((t) => favCount(t) > 0).sort((a, b) => favCount(b) - favCount(a));
    const rest = allowed.filter((t) => favCount(t) === 0);
    const ordered = favs.concat(rest);
    const rotated = ordered.map((_, i) => ordered[(i + offset) % ordered.length]);
    return rotated.find((t) => !used.has(t.id)) || rotated[0];
  }

  /* offset selects a different day's suggestions. */
  function buildMenu({ intake, schedule, snackLimit, sugarFree, vegetarian, favourites, offset }) {
    const options = { sugarFree, vegetarian, favourites: favourites || [] };
    const shift = offset || 0;
    const used = new Set();
    const meals = schedule.filter((s) => s.kind === 'meal');
    const snacks = schedule.filter((s) => s.kind === 'snack');
    const mealBudget = intake - (snacks.length ? snackLimit : 0);
    const totalWeight = meals.reduce((sum, s) => sum + SLOT_WEIGHT[s.slot], 0);

    const entries = schedule.map((entry) => {
      const isSnack = entry.kind === 'snack';
      const target = isSnack ? snackLimit : Math.round(mealBudget * SLOT_WEIGHT[entry.slot] / totalWeight);
      const list = Data.MEALS[isSnack ? 'snack' : entry.slot];
      const template = chooseTemplate(list, used, options, shift);
      used.add(template.id);
      const scaled = scaleItems(template, target, isSnack);
      return Object.assign({}, entry, { target, name: template.name, items: scaled.items, kcal: scaled.kcal, templateId: template.id });
    });
    return { entries, total: entries.reduce((sum, e) => sum + e.kcal, 0), target: intake };
  }

  function rateFood(food) {
    const reasons = [];
    if (food.protein >= 10) reasons.push('high in protein');
    else if (food.protein >= 5) reasons.push('a good source of protein');
    if (food.fibre >= 5) reasons.push('high in fibre');
    else if (food.fibre >= 2) reasons.push('a source of fibre');
    if (food.sugar >= 10) reasons.push('high in added or free sugar');
    else if (food.sugar > 0) reasons.push('contains some added or free sugar');
    if (food.kcal >= 250) reasons.push('high in calories for its weight');
    else if (food.kcal <= 100) reasons.push('low in calories for its weight');

    let level;
    if (food.sugar >= 10 || (food.kcal >= 400 && food.protein < 10 && food.fibre < 5)) level = 'sometimes';
    else if (food.kcal >= 250) level = 'portion';
    else if (food.protein >= 5 || food.fibre >= 2) level = 'great';
    else level = 'good';
    const label = { sometimes: 'Have sometimes', portion: 'Good in measured portions', great: 'Great choice', good: 'Good choice' }[level];
    return { level, label, reasons };
  }

  function editDistance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const saved = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = saved;
      }
    }
    return row[b.length];
  }

  /* Exact text matches first, then close spellings such as "yorgut". */
  function searchFoods(query) {
    const q = String(query).trim().toLowerCase().slice(0, 40);
    if (q.length < 2) return [];
    const scored = [];
    Data.FOODS.forEach((food, index) => {
      const names = [food.name.toLowerCase()].concat(food.aliases || []);
      let score = Infinity;
      names.forEach((name) => {
        if (name.includes(q)) score = Math.min(score, 0);
        name.split(/[^a-z0-9]+/).filter(Boolean).forEach((word) => {
          const distance = editDistance(q, word);
          if (distance <= (q.length <= 4 ? 1 : 2)) score = Math.min(score, distance);
        });
      });
      if (score !== Infinity) scored.push({ food, score, index });
    });
    scored.sort((a, b) => a.score - b.score || a.index - b.index);
    return scored.slice(0, 6).map((entry) => entry.food);
  }

  const DEFAULT_FORM = Object.freeze({
    units: 'imperial', ft: '5', inch: '5', cm: '165', weight: '145', goal: '141', days: '4', age: '30',
    sex: 'female', activity: 'sitting', clinician: false, mealCount: '3', first: '08:00', last: '19:00',
    snackOn: true, snackTime: '15:30', snackLimit: '150', sugarFree: true, vegetarian: false
  });

  /* Rebuilds saved data through an allow-list. Unknown or invalid values are dropped. */
  function sanitizeSaved(raw) {
    const clean = { form: Object.assign({}, DEFAULT_FORM), favourites: ['yogurt'], posture: { date: '', done: [] }, customised: false };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    const form = raw.form && typeof raw.form === 'object' ? raw.form : {};
    Object.keys(DEFAULT_FORM).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(form, key)) return;
      const value = form[key];
      if (typeof DEFAULT_FORM[key] === 'boolean') {
        if (typeof value === 'boolean') clean.form[key] = value;
      } else if (typeof value === 'string' && value.length <= 8 && /^[A-Za-z0-9:. -]*$/.test(value)) {
        clean.form[key] = value;
      }
    });
    if (!['imperial', 'metric'].includes(clean.form.units)) clean.form.units = 'imperial';
    if (!(clean.form.sex in FLOORS)) clean.form.sex = 'female';
    if (!(clean.form.activity in ACTIVITY)) clean.form.activity = 'sitting';
    if (!(clean.form.mealCount in SLOT_PLANS)) clean.form.mealCount = '3';
    if (Array.isArray(raw.favourites)) {
      clean.favourites = raw.favourites.filter((id) => typeof id === 'string' && foodById(id)).slice(0, 20);
    }
    const posture = raw.posture;
    if (posture && typeof posture === 'object' && typeof posture.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(posture.date) && Array.isArray(posture.done)) {
      clean.posture = { date: posture.date, done: posture.done.filter((id) => Data.POSTURE.some((move) => move.id === id)) };
    }
    clean.customised = raw.customised === true;
    return clean;
  }

  const api = {
    lbToKg, kgToLb, ftInToCm, bmi, bmiBand, restingEnergy, validateProfile, calculatePlan,
    timeToMinutes, minutesToLabel, buildSchedule, buildMenu, rateFood, searchFoods, foodById,
    sanitizeSaved, DEFAULT_FORM, FLOORS, MAX_DEFICIT
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConfidentMeLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
