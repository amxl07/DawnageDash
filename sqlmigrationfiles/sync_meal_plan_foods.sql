-- ============================================================================

-- SYNCHRONIZE FOOD ITEMS FOR MEAL PLANS

-- This script ensures the food items used in meal plans exist with EXACT values.

-- ============================================================================



-- First, ensure columns are wide enough (redundant but safe)

ALTER TABLE food_items ALTER COLUMN protein TYPE DECIMAL(10, 2);

ALTER TABLE food_items ALTER COLUMN carbs TYPE DECIMAL(10, 2);

ALTER TABLE food_items ALTER COLUMN fats TYPE DECIMAL(10, 2);



-- Insert or Update Logic using ON CONFLICT

-- We assume 'name' is unique. If not, we might interpret duplicates based on ID, 

-- but here we rely on Name matching since the App searches by Name.



DELETE FROM food_items WHERE name = 'Wheat Bread';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Wheat Bread', 1, 'pcs', 70, 3.0, 14.1, 1.0);

DELETE FROM food_items WHERE name = 'Low Fat Paneer';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Low Fat Paneer', 100, 'g', 170, 21.0, 4.5, 8.0);

DELETE FROM food_items WHERE name = 'Full Fat Paneer';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Full Fat Paneer', 100, 'g', 375, 14.0, 3.0, 23.0);

DELETE FROM food_items WHERE name = 'Vegetables';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Vegetables', 100, 'g', 30, 1.5, 5.0, 0.2);

DELETE FROM food_items WHERE name = 'Banana';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Banana', 100, 'g', 89, 1.1, 22.8, 0.3);

DELETE FROM food_items WHERE name = 'Green Tea';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Green Tea', 1, 'cup', 0, 0, 0, 0);

DELETE FROM food_items WHERE name = 'Rice';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Rice', 100, 'g', 355, 9.0, 78.0, 0.0);

DELETE FROM food_items WHERE name = 'Whey Protein';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Whey Protein', 1, 'scoop', 120, 23.0, 2.6, 1.8);

DELETE FROM food_items WHERE name = 'Low Fat Milk';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Low Fat Milk', 100, 'ml', 60, 3.3, 4.8, 3.1);

DELETE FROM food_items WHERE name = 'Wheat Flour';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Wheat Flour', 100, 'g', 350, 9.0, 77.0, 0.8);

DELETE FROM food_items WHERE name = 'Soy Chunks';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Soy Chunks', 100, 'g', 345, 52.0, 33.0, 0.5);

DELETE FROM food_items WHERE name = 'Almonds';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Almonds', 1, 'pcs', 7, 0.25, 0.26, 0.6);

DELETE FROM food_items WHERE name = 'Cashew Nuts';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Cashew Nuts', 1, 'pcs', 11, 0.36, 0.88, 0.6);

DELETE FROM food_items WHERE name = 'Oats';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Oats', 100, 'g', 380, 12.6, 67.6, 7.6);

DELETE FROM food_items WHERE name = 'Apple';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Apple', 1, 'pcs', 80, 0.4, 21.5, 0.3);

DELETE FROM food_items WHERE name = 'Peanut Butter';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Peanut Butter', 100, 'g', 640, 26.0, 19.0, 51.0);

DELETE FROM food_items WHERE name = 'Cheese';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Cheese', 1, 'slice', 62, 4.0, 0.3, 5.0);

DELETE FROM food_items WHERE name = 'Curd';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Curd', 100, 'g', 59, 3.8, 4.3, 3.0);

DELETE FROM food_items WHERE name = 'Egg Whites';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Egg Whites', 1, 'pcs', 17, 3.6, 0.2, 0.1);

DELETE FROM food_items WHERE name = 'Whole Eggs';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Whole Eggs', 1, 'pcs', 72, 6.3, 0.4, 4.8);

DELETE FROM food_items WHERE name = 'Chicken Breast';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('Chicken Breast', 100, 'g', 110, 31.0, 0.0, 1.0);