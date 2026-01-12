-- ============================================================================
-- INSERT EGGETARIAN MEAL PLANS
-- ============================================================================

-- 1. Insert New Food Items (Eggetarian Specific)
-- Using ON CONFLICT DO NOTHING to avoid duplicates with Vegetarian items
-- 1. Insert New Food Items (Eggetarian Specific)
-- (Handled by sync_meal_plan_foods.sql to avoid constraint errors)
-- Ideally we'd adding a unique constraint on 'name' in a real migration, but here we just insert.
-- Postgres doesn't default unique on name. Let's just insert and rely on the fact we truncated in the previous script.

-- 2. Insert Meal Templates (Eggetarian 1200 - 2800)

-- Option 1: 1200 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 1200', 1200, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Egg Whites (6 pcs), Vegetables",
    "calories": 243, "protein": 27, "carbs": 29.6, "fats": 2.2
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup)",
     "calories": 89, "protein": 1.1, "carbs": 22.8, "fats": 0.3
  },
  "lunch": {
    "name": "Rice (40 g), Low Fat Paneer (100 g)",
    "calories": 312, "protein": 24.6, "carbs": 35.7, "fats": 8
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Almonds (10 pcs)",
    "calories": 310, "protein": 32.1, "carbs": 14.8, "fats": 14
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Egg Whites (6 pcs), Vegetables",
    "calories": 243, "protein": 24.6, "carbs": 32.2, "fats": 0.6
  }
}');

-- Option 2: 1400 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 1400', 1400, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Egg Whites (4 pcs), Whole Eggs (2 pcs)",
    "calories": 352, "protein": 31.5, "carbs": 25.2, "fats": 10.8
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs)",
     "calories": 159, "protein": 3.6, "carbs": 25.4, "fats": 6.3
  },
  "lunch": {
    "name": "Rice (40 g), Low Fat Paneer (100 g), Vegetables",
    "calories": 312, "protein": 24.6, "carbs": 35.7, "fats": 8
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml)",
    "calories": 240, "protein": 29.6, "carbs": 12.2, "fats": 8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Egg Whites (6 pcs), Almonds (10 pcs), Vegetables",
    "calories": 313, "protein": 27.7, "carbs": 34.8, "fats": 6.6
  }
}');

-- Option 3: 1600 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 1600', 1600, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 386, "protein": 38.7, "carbs": 25.6, "fats": 10.9
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (5 pcs)",
     "calories": 124, "protein": 2.3, "carbs": 24.1, "fats": 3.3
  },
  "lunch": {
    "name": "Rice (40 g), Low Fat Paneer (100 g), Vegetables",
    "calories": 312, "protein": 24.6, "carbs": 35.7, "fats": 8
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g)",
    "calories": 430, "protein": 35.9, "carbs": 46, "fats": 11.8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Vegetables",
    "calories": 310, "protein": 24.6, "carbs": 35.3, "fats": 8.3
  }
}');

-- Option 4: 1800 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 1800', 1800, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 526, "protein": 43.2, "carbs": 49.1, "fats": 12
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs)",
     "calories": 159, "protein": 3.6, "carbs": 25.4, "fats": 6.3
  },
  "lunch": {
    "name": "Rice (55 g), Low Fat Paneer (100 g)",
    "calories": 365, "protein": 26, "carbs": 47.4, "fats": 8
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g)",
    "calories": 430, "protein": 35.9, "carbs": 46, "fats": 11.8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Vegetables",
    "calories": 310, "protein": 24.6, "carbs": 35.3, "fats": 8.3
  }
}');

-- Option 5: 2000 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 2000', 2000, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 526, "protein": 43.2, "carbs": 49.1, "fats": 12
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs), Apple (1 pc)",
     "calories": 239, "protein": 4, "carbs": 46.9, "fats": 6.6
  },
  "lunch": {
    "name": "Rice (80 g), Low Fat Paneer (100 g), Cashew (5 pcs)",
    "calories": 508, "protein": 30, "carbs": 69.9, "fats": 12.4
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 494, "protein": 38.5, "carbs": 47.9, "fats": 16.9
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Egg Whites (6 pcs), Vegetables",
    "calories": 243, "protein": 25.2, "carbs": 32.2, "fats": 0.6
  }
}');

-- Option 6: 2200 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 2200', 2200, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 526, "protein": 43.2, "carbs": 49.1, "fats": 12
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs), Apple (1 pc)",
     "calories": 247, "protein": 4, "carbs": 48.9, "fats": 6.6
  },
  "lunch": {
    "name": "Rice (80 g), Soy Chunks (30 g), Vegetables",
    "calories": 386, "protein": 22.8, "carbs": 72.3, "fats": 0.1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 494, "protein": 38.5, "carbs": 47.9, "fats": 16.9
  },
  "dinner": {
    "name": "Wheat Flour (80 g), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 526, "protein": 41.4, "carbs": 63.7, "fats": 10.4
  }
}');

-- Option 7: 2400 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 2400', 2400, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 526, "protein": 43.2, "carbs": 49.1, "fats": 12
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (15 pcs), Apple (1 pc)",
     "calories": 281, "protein": 5.3, "carbs": 50.2, "fats": 9.6
  },
  "lunch": {
    "name": "Rice (80 g), Soy Chunks (30 g), Cashew (5 pcs)",
    "calories": 441, "protein": 24.6, "carbs": 75.3, "fats": 4.5
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Peanut Butter (10g)",
    "calories": 494, "protein": 38.5, "carbs": 47.9, "fats": 16.9
  },
  "dinner": {
    "name": "Wheat Flour (80 g), Low Fat Paneer (100 g), Vegetables",
    "calories": 450, "protein": 28.2, "carbs": 66.1, "fats": 8.6
  }
}');

-- Option 8: 2600 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 2600', 2600, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Vegetables",
    "calories": 383, "protein": 30.6, "carbs": 48.4, "fats": 2.5
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Curd (200g), Almonds (15 pcs), Apple (1 pc)",
     "calories": 399, "protein": 12.9, "carbs": 58.8, "fats": 15.6
  },
  "lunch": {
    "name": "Rice (80 g), Soy Chunks (30 g), Vegetables",
    "calories": 386, "protein": 22.8, "carbs": 72.3, "fats": 0.1
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

-- Option 9: 2800 Kcals (Eggetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Eggetarian Plan 2800', 2800, 'Eggetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Egg Whites (6 pcs), Whole Eggs (2 pcs), Vegetables",
    "calories": 526, "protein": 43.2, "carbs": 49.1, "fats": 12
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Curd (200g), Almonds (15 pcs), Apple (1 pc)",
     "calories": 399, "protein": 12.9, "carbs": 58.8, "fats": 15.6
  },
  "lunch": {
    "name": "Rice (100 g), Soy Chunks (30 g), Vegetables",
    "calories": 457, "protein": 24.6, "carbs": 87.9, "fats": 0.1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (250 ml), Oats (65g), Peanut Butter (10g)",
    "calories": 578, "protein": 41.9, "carbs": 60.4, "fats": 19.5
  },
  "dinner": {
    "name": "Wheat Flour (100 g), Full Fat Paneer (100 g), Cashew Nuts (10 pcs), Vegetables",
    "calories": 836, "protein": 26.6, "carbs": 86, "fats": 32.8
  }
}');
