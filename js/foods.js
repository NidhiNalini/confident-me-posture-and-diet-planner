/* Approximate nutrition per 100 g, rounded from common food composition tables.
   sugar = added or free sugar (g per 100 g). Sugar inside whole fruit is not counted. */
(function (root) {
  'use strict';

  function f(id, name, kcal, protein, fibre, sugar, veg, tip, extra) {
    return Object.assign({ id, name, kcal, protein, fibre, sugar, veg, tip }, extra || {});
  }

  const FOODS = [
    f('yogurt', 'Plain yogurt', 63, 5.3, 0, 0, true, 'Add it to oats at breakfast, or have it with berries as a snack. Use it in place of cream in curries.', { aliases: ['yoghurt', 'curd', 'dahi'] }),
    f('greek', 'Plain Greek yogurt', 59, 10, 0, 0, true, 'It has about twice the protein of regular yogurt, so it keeps you full for longer. Try it with fruit or as a savoury dip.', { aliases: ['greek yoghurt'] }),
    f('flav-yogurt', 'Flavoured yogurt', 99, 4, 0, 10, true, 'Many flavoured yogurts contain a lot of added sugar. Choose plain yogurt and add fresh fruit for sweetness.', { aliases: ['fruit yogurt', 'sweetened yogurt', 'vanilla yogurt'] }),
    f('egg', 'Egg', 143, 12.6, 0, 0, true, 'Boil a few in advance for a quick breakfast or lunch.', { unit: { name: 'egg', plural: 'eggs', g: 50 } }),
    f('oats', 'Rolled oats (dry)', 379, 13, 10, 0, true, 'Measure the dry oats before cooking. The fibre helps you stay full.', { aliases: ['oatmeal', 'porridge'] }),
    f('blueberries', 'Blueberries', 57, 0.7, 2.4, 0, true, 'Fresh or frozen berries both work well with yogurt or oats.', { aliases: ['berries'] }),
    f('banana', 'Banana', 89, 1.1, 2.6, 0, true, 'A convenient snack. It can also sweeten oats without added sugar.'),
    f('apple', 'Apple', 52, 0.3, 2.4, 0, true, 'Pair it with a few nuts for a snack that lasts longer.'),
    f('orange', 'Orange', 47, 0.9, 2.4, 0, true, 'Eat the whole fruit in place of juice to keep the fibre.'),
    f('chicken', 'Chicken breast (cooked)', 165, 31, 0, 0, false, 'Grill or bake it, then keep some ready for salads and rice bowls.'),
    f('salmon', 'Salmon (cooked)', 206, 22, 0, 0, false, 'Bake it with lemon and serve it with vegetables.'),
    f('whitefish', 'White fish (cooked)', 105, 23, 0, 0, false, 'A lean protein that suits curries and baking.', { aliases: ['cod', 'fish'] }),
    f('tuna', 'Tuna in water', 100, 22, 0, 0, false, 'Mix it with plain yogurt for a light salad filling.'),
    f('lentils', 'Lentils / dal (cooked)', 116, 9, 7.9, 0, true, 'Dal gives you protein and fibre together. Measure any added oil.', { aliases: ['dal', 'dhal', 'daal'] }),
    f('chickpeas', 'Chickpeas (cooked)', 164, 8.9, 7.6, 0, true, 'Add them to salads and curries, or roast them.', { aliases: ['chana', 'garbanzo'] }),
    f('tofu', 'Firm tofu', 144, 17, 2.3, 0, true, 'Pan-fry it with spices and a small amount of oil.'),
    f('brownrice', 'Brown rice (cooked)', 123, 2.7, 1.6, 0, true, 'Weigh it once so that you know what your portion looks like.'),
    f('rice', 'White rice (cooked)', 130, 2.7, 0.4, 0, true, 'Keep the portion measured, and fill the rest of the plate with vegetables and protein.'),
    f('roti', 'Whole wheat roti', 297, 11, 4.9, 0, true, 'Count your rotis, and serve them with dal or vegetables.', { aliases: ['chapati', 'chapatti'], unit: { name: 'roti', plural: 'rotis', g: 40 } }),
    f('sweetpotato', 'Sweet potato (baked)', 90, 2, 3.3, 0, true, 'Bake it with its skin on for extra fibre.'),
    f('potato', 'Potato (boiled)', 87, 1.9, 1.8, 0, true, 'Boiled or baked potatoes are filling. Measure any butter or oil you add.'),
    f('spinach', 'Spinach (cooked)', 23, 3, 2.4, 0, true, 'Stir it into dal, eggs or curry.'),
    f('broccoli', 'Broccoli (cooked)', 35, 2.4, 3.3, 0, true, 'Steam or roast it to add volume to a meal for few calories.'),
    f('salad', 'Salad vegetables', 18, 1, 1.5, 0, true, 'Start lunch or dinner with these to help you feel full.', { aliases: ['lettuce', 'tomato', 'cucumber', 'vegetables'] }),
    f('carrot', 'Carrot', 41, 0.9, 2.8, 0, true, 'Carrot sticks and hummus make a good crunchy snack.'),
    f('almonds', 'Almonds', 579, 21, 12.5, 0, true, 'Nourishing but high in calories. A small handful, about 15 g, is enough.', { aliases: ['nuts'] }),
    f('peanutbutter', 'Natural peanut butter', 600, 25, 6, 0, true, 'Measure one tablespoon, and choose a jar with no added sugar.'),
    f('hummus', 'Hummus', 166, 8, 6, 0, true, 'Use it as a dip for vegetables or as a spread for roti.'),
    f('cottage', 'Low-fat cottage cheese', 72, 12.4, 0, 0, true, 'A high-protein snack that goes well with fruit.', { aliases: ['paneer'] }),
    f('milk', 'Milk (2%)', 50, 3.4, 0, 0, true, 'Use it in oats or in tea, without added sugar.'),
    f('oil', 'Olive oil', 884, 0, 0, 0, true, 'Healthy in small amounts. Use a measuring spoon, since each tablespoon has about 120 kcal.', { aliases: ['cooking oil'] }),
    f('popcorn', 'Air-popped popcorn', 387, 13, 15, 0, true, 'A light snack when it is air-popped. Measure about 15 g.'),
    f('darkchoc', 'Dark chocolate (70%)', 598, 7.8, 10.9, 24, true, 'One or two squares can be a planned treat.', { aliases: ['chocolate'] }),
    f('milkchoc', 'Milk chocolate', 535, 7.6, 3.4, 50, true, 'Keep it as an occasional treat in a small portion.'),
    f('granola', 'Sweetened granola', 470, 10, 7, 20, true, 'Many granolas have added sugar. Rolled oats with fruit are a simple swap.'),
    f('juice', 'Fruit juice', 45, 0.7, 0.2, 8.4, true, 'Juice has less fibre than fruit and is easy to overdrink. Eat the whole fruit instead.', { aliases: ['orange juice', 'apple juice'] }),
    f('soda', 'Soft drink', 41, 0, 0, 10, true, 'Try sparkling water with lime or lemon instead.', { aliases: ['pop', 'cola', 'coke'] }),
    f('honey', 'Honey', 304, 0.3, 0.2, 82, true, 'Honey counts as a free sugar. Sugar-free mode removes it.'),
    f('icecream', 'Ice cream', 207, 3.5, 0.7, 20, true, 'Enjoy a small planned portion, or try frozen yogurt and berries blended at home.'),
    f('donut', 'Doughnut', 421, 5, 1.5, 20, true, 'Keep it as an occasional treat.', { aliases: ['donut'] }),
    f('chips', 'Potato chips', 536, 7, 4.4, 0, true, 'Pour a small portion into a bowl instead of eating from the bag. Popcorn is a lighter swap.', { aliases: ['crisps'] }),
    f('noodles', 'Instant noodles (dry)', 450, 9, 3, 0, true, 'Use half the packet, and add vegetables and an egg.', { aliases: ['ramen', 'maggi'] })
  ];

  const T = (id, name, items) => ({ id, name, items });

  const MEALS = {
    breakfast: [
      T('b1', 'Yogurt oats with berries', [['yogurt', 150], ['oats', 40], ['blueberries', 80], ['almonds', 10]]),
      T('b2', 'Eggs with spinach and roti', [['egg', 100], ['spinach', 80], ['roti', 40], ['oil', 3]]),
      T('b3', 'Greek yogurt and banana bowl', [['greek', 170], ['banana', 100], ['oats', 25], ['almonds', 10]]),
      T('b4', 'Banana oats with milk', [['oats', 45], ['milk', 200], ['banana', 80], ['peanutbutter', 8]]),
      T('b5', 'Savoury tofu scramble with sweet potato', [['tofu', 120], ['spinach', 60], ['sweetpotato', 100], ['oil', 4]])
    ],
    lunch: [
      T('l1', 'Dal, rice and salad with yogurt', [['lentils', 180], ['brownrice', 100], ['salad', 100], ['yogurt', 80]]),
      T('l2', 'Chicken rice bowl', [['chicken', 100], ['brownrice', 120], ['broccoli', 100], ['oil', 4]]),
      T('l3', 'Chickpea and yogurt salad', [['chickpeas', 130], ['salad', 150], ['yogurt', 80], ['oil', 5]]),
      T('l4', 'Tuna salad with potato', [['tuna', 100], ['potato', 180], ['salad', 120], ['yogurt', 40]]),
      T('l5', 'Tofu and vegetable rice bowl', [['tofu', 120], ['rice', 110], ['broccoli', 100], ['oil', 4]])
    ],
    dinner: [
      T('d1', 'Fish curry with rice and greens', [['whitefish', 130], ['rice', 110], ['spinach', 100], ['yogurt', 40], ['oil', 5]]),
      T('d2', 'Baked salmon with sweet potato', [['salmon', 110], ['sweetpotato', 130], ['broccoli', 100]]),
      T('d3', 'Chicken with roti and salad', [['chicken', 110], ['roti', 40], ['salad', 120], ['yogurt', 60]]),
      T('d4', 'Chickpea and spinach curry with roti', [['chickpeas', 130], ['spinach', 100], ['roti', 40], ['oil', 5]]),
      T('d5', 'Dal with roti and broccoli', [['lentils', 170], ['roti', 40], ['broccoli', 100], ['yogurt', 60]])
    ],
    light: [
      T('m1', 'Boiled eggs with salad', [['egg', 100], ['salad', 120]]),
      T('m2', 'Hummus, carrot and roti', [['hummus', 50], ['carrot', 100], ['roti', 40]]),
      T('m3', 'Yogurt with apple and almonds', [['yogurt', 150], ['apple', 100], ['almonds', 10]]),
      T('m4', 'Cottage cheese with orange', [['cottage', 130], ['orange', 120]])
    ],
    snack: [
      T('s1', 'Yogurt and berries', [['yogurt', 150], ['blueberries', 80]]),
      T('s2', 'Apple and almonds', [['apple', 120], ['almonds', 10]]),
      T('s3', 'Carrot and hummus', [['carrot', 100], ['hummus', 40]]),
      T('s4', 'Cottage cheese and orange', [['cottage', 80], ['orange', 100]]),
      T('s5', 'Banana', [['banana', 110]]),
      T('s6', 'Air-popped popcorn', [['popcorn', 25]])
    ]
  };

  const POSTURE = [
    { id: 'chin', name: 'Chin tucks', dose: '10 slow reps', how: 'Sit tall. Slide your chin straight back, as if making a double chin. Hold for 3 seconds, then release.', helps: 'Brings your head back over your shoulders.' },
    { id: 'squeeze', name: 'Shoulder blade squeezes', dose: '10 slow reps', how: 'Keep your arms relaxed. Draw your shoulder blades gently back and down. Hold for 5 seconds.', helps: 'Practises the open-shoulder position.' },
    { id: 'angels', name: 'Wall angels', dose: '8 slow reps', how: 'Stand with your back against a wall. Slide your arms up and down the wall, moving only as far as is comfortable.', helps: 'Builds movement through the shoulders and upper back.' },
    { id: 'doorway', name: 'Doorway chest stretch', dose: '30 seconds, 2 times', how: 'Place your forearms on a door frame and step forward until you feel a gentle stretch across your chest.', helps: 'Eases tightness from sitting and phone use.' },
    { id: 'chair', name: 'Seated back extension', dose: '5 slow breaths', how: 'Sit on a sturdy chair with your hands behind your head. Lift your chest gently and look slightly upward.', helps: 'Eases stiffness in a rounded upper back.' }
  ];

  const api = { FOODS, MEALS, POSTURE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConfidentMeData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
