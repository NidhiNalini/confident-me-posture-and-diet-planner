# Confident Me: specification

## 1. Purpose

A private, browser-based planner for an adult who wants to lose a modest amount
of weight and improve posture without gym workouts. It checks whether a goal is
realistic, then builds a daily eating schedule within safety limits.

## 2. Functional requirements

| ID | Requirement |
|----|-------------|
| F1 | Accept height, current weight, desired weight, target days, age, formula sex and daily activity, in imperial or metric units. |
| F2 | Show current BMI, BMI at the desired weight, and the weight range for BMI 18.5 to 24.9. |
| F3 | Compare the requested goal with the safety limits and give an estimated goal date. |
| F4 | Accept meal count (2 to 5), first meal time and last meal time. |
| F5 | Offer one optional snack with a time and a calorie limit (50 to 300 kcal). |
| F6 | Suggest foods for every meal, scaled to that meal's calorie target. |
| F7 | Rate a food the user likes, explain the rating, and prefer that food in meals. |
| F8 | Tolerate misspelled food searches, for example "yorgut". |
| F9 | Offer a no-added-sugar mode. Whole fruit remains allowed. Juice, honey and foods with added sugar are removed. |
| F10 | Offer an optional vegetarian mode. |
| F11 | Provide a five-move posture routine with no equipment and no intense exercise. |
| F12 | Provide optional posture reminders while the page is open. |
| F13 | Save entries on the user's device and allow them to be deleted in one step. |

## 3. Calculation rules

| Value | Rule |
|-------|------|
| BMI | `weight_kg / height_m^2` |
| BMI bands | Underweight below 18.5; healthy 18.5 to 24.9; overweight 25 to 29.9; obesity 30 and above |
| Resting energy | Mifflin-St Jeor: `10 x kg + 6.25 x cm - 5 x age + 5` (male) or `- 161` (female) |
| Daily energy | Resting energy x activity factor: mostly sitting 1.2; light 1.375; moderate 1.55 |
| Energy per pound | 3,500 kcal per lb, a common estimate |
| Required deficit | `lb_to_lose x 3500 / target_days` |
| Daily deficit | The lowest of the required deficit, 1,000 kcal, and `daily energy - calorie floor` |
| Calorie floor | 1,200 kcal (female formula) or 1,500 kcal (male formula) |
| Estimated days | `lb_to_lose x 3500 / daily deficit`, rounded up |

## 4. Safety rules

The app does not create a calorie plan when any of these apply:

| Status | Condition |
|--------|-----------|
| `clinician` | The user says they are pregnant or breastfeeding, have a medical condition affecting food, or have a history of an eating disorder. |
| `minor` | Age is below 18. |
| `underweight-now` | Current BMI is below 18.5. |
| `underweight-goal` | Desired BMI is below 18.5. |
| `no-loss` | Desired weight is not below current weight. |
| `no-room` | Daily energy does not exceed the calorie floor. |

A goal faster than the limits receives the status `too-fast`. The app does not
reduce calories further. It shows a later estimated date instead. A goal within
the limits receives the status `on-track`.

The posture section stays available in every case. It does not depend on the
weight goal.

## 5. Food ratings

Values are approximate, per 100 g. Rules run in this order:

1. **Have sometimes:** at least 10 g of added or free sugar, or at least 400 kcal
   with under 10 g protein and under 5 g fibre.
2. **Good in measured portions:** at least 250 kcal.
3. **Great choice:** at least 5 g protein or at least 2 g fibre.
4. **Good choice:** everything else.

## 6. Security and privacy requirements

| ID | Requirement |
|----|-------------|
| S1 | No account, no server and no analytics. Health data never leaves the browser. |
| S2 | All text reaches the page through `textContent`. The app never uses `innerHTML`. |
| S3 | All numeric input is validated against fixed ranges before calculation. |
| S4 | Saved data is rebuilt through an allow-list when loaded, so damaged or altered data cannot change app behaviour. |
| S5 | The hosted page sets a Content Security Policy that blocks outside scripts and connections. |
| S6 | Storage failure, such as in a private window, does not stop the app. |

## 7. Out of scope

Medical advice, medication, intensive exercise plans, rapid-loss plans, accounts,
and syncing between devices.
