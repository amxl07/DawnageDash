-- ============================================================================
-- RESET FOOD DATABASE AND MEAL PLANS
-- ============================================================================

-- 1. Clear existing MEAL TEMPLATES only (Food items are handled by import_full_food_database.sql)
TRUNCATE TABLE meal_templates RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE food_items RESTART IDENTITY CASCADE; -- Removed to preserve bulk import

-- 2. Insert New Food Items (Derived from Vegetarian Plans)
-- 2. Insert New Food Items 
-- (MOVED TO sync_meal_plan_foods.sql to avoid constraint errors)
-- Use sync_meal_plan_foods.sql to populate these items correctly.


-- 3. Insert Meal Templates (Vegetarian 1200 - 2800)

-- Option 1: 1200 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 1200', 1200, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 310, "protein": 27, "carbs": 32.7, "fats": 9.9
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
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml)",
    "calories": 240, "protein": 29.6, "carbs": 12.2, "fats": 8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Soy Chunks (30 g), Vegetables",
    "calories": 243, "protein": 19.2, "carbs": 40.7, "fats": 0.4
  }
}');

-- Option 2: 1400 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 1400', 1400, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 310, "protein": 25.5, "carbs": 28, "fats": 9.1
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs)",
     "calories": 159, "protein": 3.6, "carbs": 25.4, "fats": 6.3
  },
  "lunch": {
    "name": "Rice (40 g), Soy Chunks (30 g), Cashew Nuts (5 pcs)",
    "calories": 300, "protein": 21, "carbs": 45.5, "fats": 3.1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml)",
    "calories": 240, "protein": 29.6, "carbs": 12.2, "fats": 8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Almonds (10 pcs), Vegetables",
    "calories": 380, "protein": 27.1, "carbs": 37.9, "fats": 14.3
  }
}');

-- Option 3: 1600 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 1600', 1600, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (2 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 310, "protein": 25.5, "carbs": 28, "fats": 9.1
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs)",
     "calories": 159, "protein": 3.6, "carbs": 25.4, "fats": 6.3
  },
  "lunch": {
    "name": "Rice (40 g), Soy Chunks (30 g)",
    "calories": 245, "protein": 19.2, "carbs": 41.1, "fats": 0.1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g), Almonds (10 pcs)",
    "calories": 500, "protein": 38.4, "carbs": 48.6, "fats": 17.6
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Cashew Nuts (10 pcs), Vegetables",
    "calories": 421, "protein": 28.2, "carbs": 41.3, "fats": 17.3
  }
}');

-- Option 4: 1800 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 1800', 1800, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 450, "protein": 30, "carbs": 51.5, "fats": 10.2
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs)",
     "calories": 159, "protein": 3.6, "carbs": 25.4, "fats": 6.3
  },
  "lunch": {
    "name": "Rice (55 g), Soy Chunks (30 g), Cashew Nuts (5 pcs)",
    "calories": 353, "protein": 22.4, "carbs": 57.2, "fats": 3.1
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (200 ml), Oats (50g)",
    "calories": 430, "protein": 35.9, "carbs": 46, "fats": 11.8
  },
  "dinner": {
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Almonds (10 pcs), Vegetables",
    "calories": 380, "protein": 27.1, "carbs": 37.9, "fats": 14.3
  }
}');

-- Option 5: 2000 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 2000', 2000, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 450, "protein": 30, "carbs": 51.5, "fats": 10.2
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Green Tea (1 cup), Almonds (10 pcs), Apple (1 pc)",
     "calories": 239, "protein": 4, "carbs": 46.9, "fats": 6.6
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
    "name": "Wheat Flour (40 g), Low Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 372, "protein": 28.6, "carbs": 35.6, "fats": 13.3
  }
}');

-- Option 6: 2200 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 2200', 2200, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 450, "protein": 30, "carbs": 51.5, "fats": 10.2
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
    "name": "Wheat Flour (80 g), Low Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 512, "protein": 32.2, "carbs": 66.4, "fats": 13.6
  }
}');

-- Option 7: 2400 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 2400', 2400, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 450, "protein": 30, "carbs": 51.5, "fats": 10.2
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
    "name": "Wheat Flour (80 g), Full Fat Paneer (100 g), Cheese (1 slice), Vegetables",
    "calories": 717, "protein": 25.2, "carbs": 64.9, "fats": 28.6
  }
}');

-- Option 8: 2600 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 2600', 2600, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 450, "protein": 30, "carbs": 51.5, "fats": 10.2
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Curd (200g), Almonds (15 pcs), Apple (1 pc)",
     "calories": 399, "protein": 12.9, "carbs": 58.8, "fats": 15.6
  },
  "lunch": {
    "name": "Rice (80 g), Low Fat Paneer (100 g), Cashew (5 pcs)",
    "calories": 508, "protein": 30, "carbs": 69.9, "fats": 12.4
  },
  "evening_snack": {
    "name": "Whey Protein (1 scoop), Low Fat Milk (300 ml), Oats (50g), Peanut Butter (15g)",
    "calories": 586, "protein": 43.1, "carbs": 53.7, "fats": 22.5
  },
  "dinner": {
    "name": "Wheat Flour (80 g), Full Fat Paneer (100 g), Vegetables",
    "calories": 655, "protein": 21.2, "carbs": 64.6, "fats": 23.6
  }
}');

-- Option 9: 2800 Kcals (Vegetarian)
INSERT INTO meal_templates (name, calories_target, diet_type, content) VALUES
('Vegetarian Plan 2800', 2800, 'Vegetarian', '{
  "breakfast": {
    "name": "Wheat Bread (4 pcs), Low Fat Paneer (100 g), Vegetables",
    "calories": 450, "protein": 30, "carbs": 51.5, "fats": 10.2
  },
  "mid_morning_snack": {
     "name": "Banana (100 g), Curd (200g), Almonds (15 pcs), Apple (1 pc)",
     "calories": 399, "protein": 12.9, "carbs": 58.8, "fats": 15.6
  },
  "lunch": {
    "name": "Rice (100 g), Low Fat Paneer (100 g), Vegetables",
    "calories": 524, "protein": 30, "carbs": 82.5, "fats": 8
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
