-- ============================================================================
-- INSERT NON-VEGETARIAN MEAL PLANS
-- ============================================================================

-- 1. Insert New Food Items (Non-Vegetarian Specific)
-- Using ON CONFLICT DO NOTHING to avoid duplicates
-- 1. Insert New Food Items (Non-Vegetarian Specific)
-- (Handled by sync_meal_plan_foods.sql to avoid constraint errors)


-- 2. Insert Meal Templates (Non-Vegetarian 1200 - 2800)

-- Option 1: 1200 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 1200', 1200, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Egg Whites (6 pcs), Vegetables",
    "calories": 243, "protein": 27, "carbs": 29.6, "fats": 2.2
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup)",
     "calories": 89, "protein": 1.1, "carbs": 22.8, "fats": 0.3
  },
  "lunch": {
    "name": "Rice (40 g), Chicken Breast (100 g)",
    "calories": 252, "protein": 34.6, "carbs": 31.2, "fats": 1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Almonds (10 pcs)",
    "calories": 310, "protein": 32.1, "carbs": 14.8, "fats": 14
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Soy Chunks (30 g), Vegetables",
    "calories": 243, "protein": 19.2, "carbs": 40.7, "fats": 0.4
  }
}');

-- Option 2: 1400 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 1400', 1400, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Egg Whites (4 pcs), Whole Eggs (2 pcs)",
    "calories": 352, "protein": 31.5, "carbs": 25.2, "fats": 10.8
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs)",
     "calories": 159, "protein": 3.6, "carbs": 25.4, "fats": 6.3
  },
  "lunch": {
    "name": "Rice (40 g), Chicken Breast (100 g), Vegetables",
    "calories": 252, "protein": 34.6, "carbs": 31.2, "fats": 1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml)",
    "calories": 240, "protein": 29.6, "carbs": 12.2, "fats": 8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 372, "protein": 28.6, "carbs": 35.6, "fats": 13.3
  }
}');

-- Option 3: 1600 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 1600', 1600, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 386, "protein": 38.7, "carbs": 25.6, "fats": 10.9
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (5 pcs)",
     "calories": 124, "protein": 2.3, "carbs": 24.1, "fats": 3.3
  },
  "lunch": {
    "name": "Rice (40 g), Chicken Breast (100 g), Vegetables",
    "calories": 252, "protein": 34.6, "carbs": 31.2, "fats": 1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 494, "protein": 38.5, "carbs": 47.9, "fats": 16.9
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Cashew Nuts (5 pcs), Vegetables",
    "calories": 345, "protein": 25.8, "carbs": 36.6, "fats": 11.3
  }
}');

-- Option 4: 1800 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 1800', 1800, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 526, "protein": 43.2, "carbs": 49.1, "fats": 12
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs)",
     "calories": 159, "protein": 3.6, "carbs": 25.4, "fats": 6.3
  },
  "lunch": {
    "name": "Rice (55 g), Chicken Breast (100 g), Vegetables",
    "calories": 305, "protein": 36, "carbs": 42.9, "fats": 1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g)",
    "calories": 430, "protein": 35.9, "carbs": 46, "fats": 11.8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 372, "protein": 28.6, "carbs": 35.6, "fats": 13.3
  }
}');

-- Option 5: 2000 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 2000', 2000, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Peanut Butter (10g), Vegetables",
    "calories": 447, "protein": 33.2, "carbs": 50.3, "fats": 7.6
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Tea/Coffee (1 cup), Almonds (10 pcs), Apple (1 pc)",
     "calories": 239, "protein": 4, "carbs": 46.9, "fats": 6.6
  },
  "lunch": {
    "name": "Rice (80 g), Chicken Breast (100 g), Cashew (5 pcs)",
    "calories": 448, "protein": 40, "carbs": 65.4, "fats": 5.4
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 494, "protein": 38.5, "carbs": 47.9, "fats": 16.9
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 372, "protein": 28.6, "carbs": 35.6, "fats": 13.3
  }
}');

-- Option 6: 2200 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 2200', 2200, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Peanut Butter (10g), Vegetables",
    "calories": 447, "protein": 33.2, "carbs": 50.3, "fats": 7.6
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (15 pcs), Apple (1 pc)",
     "calories": 281, "protein": 5.3, "carbs": 50.2, "fats": 9.6
  },
  "lunch": {
    "name": "Rice (80 g), Chicken Breast (100 g), Cashew (5 pcs)",
    "calories": 448, "protein": 40, "carbs": 65.4, "fats": 5.4
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 494, "protein": 38.5, "carbs": 47.9, "fats": 16.9
  },
  "dinner": {
    "name": "Wheat Flour (80 g), Low Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 512, "protein": 32.2, "carbs": 66.4, "fats": 13.6
  }
}');

-- Option 7: 2400 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 2400', 2400, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Peanut Butter (10g), Vegetables",
    "calories": 447, "protein": 33.2, "carbs": 50.3, "fats": 7.6
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (15 pcs), Apple (1 pc)",
     "calories": 281, "protein": 5.3, "carbs": 50.2, "fats": 9.6
  },
  "lunch": {
    "name": "Rice (80 g), Chicken Breast (100 g), Cashew (5 pcs)",
    "calories": 448, "protein": 40, "carbs": 65.4, "fats": 5.4
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 494, "protein": 38.5, "carbs": 47.9, "fats": 16.9
  },
  "dinner": {
    "name": "Wheat Flour (80 g), Full Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 717, "protein": 25.2, "carbs": 64.9, "fats": 28.6
  }
}');

-- Option 8: 2600 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 2600', 2600, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Peanut Butter (15g), Vegetables",
    "calories": 479, "protein": 34.5, "carbs": 51.2, "fats": 10.1
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Curd (200g), Almonds (15 pcs), Apple (1 pc)",
     "calories": 399, "protein": 12.9, "carbs": 58.8, "fats": 15.6
  },
  "lunch": {
    "name": "Rice (80 g), Chicken Breast (100 g), Cashew (5 pcs)",
    "calories": 448, "protein": 40, "carbs": 65.4, "fats": 5.4
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (300 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 554, "protein": 41.8, "carbs": 52.7, "fats": 20
  },
  "dinner": {
    "name": "Wheat Flour (80 g), Full Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 717, "protein": 25.2, "carbs": 64.9, "fats": 28.6
  }
}');

-- Option 9: 2800 Kcals (Non-Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Non-Vegetarian Plan 2800', 2800, 'Non-Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Peanut Butter (15g), Vegetables",
    "calories": 479, "protein": 34.5, "carbs": 51.2, "fats": 10.1
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Curd (200g), Almonds (15 pcs), Apple (1 pc)",
     "calories": 399, "protein": 12.9, "carbs": 58.8, "fats": 15.6
  },
  "lunch": {
    "name": "Rice (100 g), Chicken Breast (100 g), Cashew (5 pcs)",
    "calories": 519, "protein": 41.8, "carbs": 81, "fats": 5.4
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (300 ml), Oats (65g), Peanut Butter (10g)",
    "calories": 608, "protein": 43.6, "carbs": 62.8, "fats": 21.1
  },
  "dinner": {
    "name": "Wheat Flour (100 g), Full Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 787, "protein": 27, "carbs": 80.3, "fats": 28.8
  }
}');
