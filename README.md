# Confident Me - Posture and Diet Planner

[![Tests](https://github.com/NidhiNalini/confident-me-posture-and-diet-planner/actions/workflows/test.yml/badge.svg)](https://github.com/NidhiNalini/confident-me-posture-and-diet-planner/actions/workflows/test.yml)

A private, browser-based planner that checks whether a weight goal is realistic,
builds a daily meal schedule, and adds a short posture routine that requires no gym.

**Live demo:** https://nidhinalini.github.io/confident-me-posture-and-diet-planner/

## Features

- **Goal check:** compares your target date with safety limits and estimates a realistic date.
- **BMI:** shows your current BMI and your BMI at the desired weight, on a to-scale chart.
- **Meal schedule:** set your meal count, first meal, last meal, snack time and snack calorie limit.
- **Food checker:** search for a food you like, see its rating, and add it to your meals. Misspellings such as "yorgut" still work.
- **No-added-sugar mode:** removes added and free sugars, and keeps whole fruit.
- **Posture routine:** five gentle moves, a daily checklist and optional reminders.
- **Privacy:** no account, no server and no analytics. Your entries stay in your browser.

## Safety design

The most important rule in this project is what the app refuses to do. A request
such as 4 lb in 4 days would need a deficit of about 3,500 kcal per day, so the app
keeps its calorie limits and shows a later date instead. It also declines to create
a calorie plan for a goal below BMI 18.5, for users under 18, and for users who say
they have a relevant medical situation. See [SPEC.md](SPEC.md) for every rule.

## Technology

HTML, CSS and JavaScript with no dependencies. Calculations are kept separate from the
page code in `js/logic.js`, which makes them easy to test.

## Run it

Open `index.html` in a browser. To run the tests, install Node.js 20 or later and run:

```
npm test
```

## Project files

| Path | Purpose |
|------|---------|
| `SPEC.md` | Requirements and calculation rules |
| `SECURITY.md` | Privacy and security controls |
| `js/logic.js` | Calculations and safety rules |
| `js/foods.js` | Food values, meals and posture moves |
| `js/app.js` | Page behaviour |
| `tests/logic.test.js` | Automated tests |

## Disclaimer

This project gives general information and estimates, and is not medical advice.
Nutrition values are approximate.

## Licence

MIT
