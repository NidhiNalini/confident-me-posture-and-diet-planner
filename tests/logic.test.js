'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logic.js');
const D = require('../js/foods.js');

const TODAY = new Date(2026, 10, 2);
const example = (over) => Object.assign({
  cm: L.ftInToCm(5, 5), kg: L.lbToKg(150), goalKg: L.lbToKg(146), days: 4, age: 30,
  sex: 'female', activity: 'sitting', clinician: false
}, over);

test('BMI matches a known value', () => {
  assert.ok(Math.abs(L.bmi(70, 175) - 22.86) < 0.01);
});

test('BMI bands use the correct boundaries', () => {
  assert.equal(L.bmiBand(18.4), 'Underweight');
  assert.equal(L.bmiBand(18.5), 'Healthy range');
  assert.equal(L.bmiBand(24.9), 'Healthy range');
  assert.equal(L.bmiBand(24.96), 'Overweight');
  assert.equal(L.bmiBand(25), 'Overweight');
  assert.equal(L.bmiBand(30), 'Obesity range');
});

test('resting energy follows Mifflin-St Jeor', () => {
  assert.equal(L.restingEnergy({ kg: 70, cm: 170, age: 30, sex: 'female' }), 700 + 1062.5 - 150 - 161);
  assert.equal(L.restingEnergy({ kg: 70, cm: 170, age: 30, sex: 'male' }), 700 + 1062.5 - 150 + 5);
});

test('4 lb in 4 days is marked too fast and receives a later date', () => {
  const plan = L.calculatePlan(example(), TODAY);
  assert.equal(plan.status, 'too-fast');
  assert.ok(Math.abs(plan.requiredDeficit - 3500) < 1);
  assert.ok(plan.intake >= 1200);
  assert.ok(plan.estimatedDays >= 14);
  assert.ok(plan.estimatedDate > plan.requestedDate);
});

test('a slow goal is on track and uses the required deficit only', () => {
  const plan = L.calculatePlan(example({ days: 60 }), TODAY);
  assert.equal(plan.status, 'on-track');
  assert.ok(Math.abs(plan.deficit - plan.requiredDeficit) < 1e-9);
  assert.equal(plan.estimatedDays, 60);
});

test('the deficit never exceeds 1,000 kcal and intake never falls below the floor', () => {
  for (const kg of [60, 80, 100, 140, 200]) {
    for (const sex of ['female', 'male']) {
      for (const activity of ['sitting', 'light', 'moderate']) {
        const plan = L.calculatePlan({ cm: 175, kg, goalKg: kg - 5, days: 3, age: 35, sex, activity, clinician: false }, TODAY);
        if (!plan.hasPlan) continue;
        assert.ok(plan.deficit <= L.MAX_DEFICIT);
        assert.ok(plan.intake >= L.FLOORS[sex]);
      }
    }
  }
});

test('safety stops produce no calorie target', () => {
  const cases = [
    [example({ clinician: true }), 'clinician'],
    [example({ age: 16 }), 'minor'],
    [example({ kg: L.lbToKg(100), goalKg: L.lbToKg(95) }), 'underweight-now'],
    [example({ goalKg: L.lbToKg(100) }), 'underweight-goal'],
    [example({ goalKg: L.lbToKg(150) }), 'no-loss']
  ];
  for (const [profile, status] of cases) {
    const plan = L.calculatePlan(profile, TODAY);
    assert.equal(plan.status, status);
    assert.equal(plan.hasPlan, false);
    assert.equal(plan.intake, undefined);
  }
});

test('no plan when energy use is already at the floor', () => {
  const plan = L.calculatePlan({ cm: 150, kg: 48, goalKg: 45, days: 60, age: 80, sex: 'female', activity: 'sitting', clinician: false }, TODAY);
  assert.equal(plan.status, 'no-room');
  assert.equal(plan.hasPlan, false);
});

test('validation rejects missing and out-of-range values', () => {
  assert.deepEqual(L.validateProfile(example()), {});
  const errors = L.validateProfile(example({ cm: NaN, kg: 900, days: 0, sex: 'x' }));
  assert.deepEqual(Object.keys(errors).sort(), ['cm', 'days', 'kg', 'sex']);
});

test('schedule spreads meals and places the snack in time order', () => {
  const s = L.buildSchedule({ mealCount: 3, first: '08:00', last: '19:00', snackOn: true, snackTime: '15:30' });
  assert.equal(s.error, null);
  assert.deepEqual(s.items.map((i) => i.label), ['Breakfast', 'Lunch', 'Snack', 'Dinner']);
  assert.equal(s.items[0].minutes, 480);
  assert.equal(s.items[3].minutes, 1140);
});

test('schedule rejects a last meal before the first meal', () => {
  assert.ok(L.buildSchedule({ mealCount: 3, first: '19:00', last: '08:00', snackOn: false }).error);
  assert.ok(L.buildSchedule({ mealCount: 3, first: 'bad', last: '08:00', snackOn: false }).error);
});

test('two meals never exceed the target by more than 10%', () => {
  for (let intake = 1200; intake <= 2600; intake += 100) {
    const schedule = L.buildSchedule({ mealCount: 2, first: '10:00', last: '19:00', snackOn: false }).items;
    const menu = L.buildMenu({ intake, schedule, snackLimit: 150, sugarFree: false, vegetarian: false, favourites: [], offset: 2 });
    assert.ok(menu.total < intake * 1.1);
  }
});

test('menu stays within 10% of target for 3 to 5 meals', () => {
  for (const mealCount of [3, 4, 5]) {
    for (let intake = 1200; intake <= 2600; intake += 100) {
      for (const offset of [0, 1, 2, 3, 4]) {
        const schedule = L.buildSchedule({ mealCount, first: '08:00', last: '20:00', snackOn: true, snackTime: '16:00' }).items;
        const menu = L.buildMenu({ intake, schedule, snackLimit: 150, sugarFree: false, vegetarian: false, favourites: [], offset });
        const ratio = menu.total / intake;
        assert.ok(ratio > 0.9 && ratio < 1.1, `meals ${mealCount}, intake ${intake}, offset ${offset}: ${menu.total}`);
      }
    }
  }
});

test('snack never exceeds its limit', () => {
  for (const snackLimit of [50, 80, 100, 150, 200, 300]) {
    for (let offset = 0; offset < 6; offset += 1) {
      const schedule = L.buildSchedule({ mealCount: 3, first: '08:00', last: '19:00', snackOn: true, snackTime: '15:00' }).items;
      const menu = L.buildMenu({ intake: 1500, schedule, snackLimit, sugarFree: true, vegetarian: false, favourites: [], offset });
      const snack = menu.entries.find((e) => e.kind === 'snack');
      assert.ok(snack.kcal <= snackLimit, `limit ${snackLimit}, ${snack.name}: ${snack.kcal}`);
    }
  }
});

test('no-added-sugar and vegetarian modes remove the correct foods', () => {
  const schedule = L.buildSchedule({ mealCount: 5, first: '07:00', last: '20:00', snackOn: true, snackTime: '16:00' }).items;
  for (let offset = 0; offset < 6; offset += 1) {
    const menu = L.buildMenu({ intake: 1800, schedule, snackLimit: 150, sugarFree: true, vegetarian: true, favourites: [], offset });
    for (const entry of menu.entries) {
      for (const item of entry.items) {
        const food = L.foodById(item.id);
        assert.equal(food.sugar, 0);
        assert.equal(food.veg, true);
      }
    }
  }
});

test('a favourite food appears in the first menu', () => {
  const schedule = L.buildSchedule({ mealCount: 3, first: '08:00', last: '19:00', snackOn: false }).items;
  const menu = L.buildMenu({ intake: 1500, schedule, snackLimit: 150, sugarFree: true, vegetarian: false, favourites: ['yogurt'], offset: 0 });
  assert.ok(menu.entries.some((e) => e.items.some((i) => i.id === 'yogurt')));
});

test('food ratings follow the specification', () => {
  const rate = (id) => L.rateFood(L.foodById(id)).level;
  assert.equal(rate('yogurt'), 'great');
  assert.equal(rate('flav-yogurt'), 'sometimes');
  assert.equal(rate('almonds'), 'portion');
  assert.equal(rate('soda'), 'sometimes');
  assert.equal(rate('chips'), 'sometimes');
});

test('food search accepts misspellings and limits input', () => {
  assert.equal(L.searchFoods('yorgut')[0].id, 'yogurt');
  assert.equal(L.searchFoods('yogurt')[0].id, 'yogurt');
  assert.equal(L.searchFoods('dal')[0].id, 'lentils');
  assert.deepEqual(L.searchFoods('a'), []);
  assert.deepEqual(L.searchFoods('zzzzzzzz'), []);
});

test('every meal template refers to a real food', () => {
  for (const list of Object.values(D.MEALS)) {
    for (const template of list) {
      for (const [id] of template.items) assert.ok(L.foodById(id), id);
    }
  }
});

test('saved data is cleaned through an allow-list', () => {
  const clean = L.sanitizeSaved(JSON.parse('{"form":{"age":"<img src=x>","weight":"160","evil":"x","clinician":"yes","units":"other"},"favourites":["yogurt","nope",5],"posture":{"date":"bad","done":["chin"]},"__proto__":{"polluted":true}}'));
  assert.equal(clean.form.age, L.DEFAULT_FORM.age);
  assert.equal(clean.form.weight, '160');
  assert.equal(clean.form.evil, undefined);
  assert.equal(clean.form.clinician, false);
  assert.equal(clean.form.units, 'imperial');
  assert.deepEqual(clean.favourites, ['yogurt']);
  assert.deepEqual(clean.posture.done, []);
  assert.equal({}.polluted, undefined);
  for (const bad of [null, 5, 'x', []]) assert.deepEqual(L.sanitizeSaved(bad).form, L.DEFAULT_FORM);
});

test('the app never writes HTML from strings', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(source));
});
