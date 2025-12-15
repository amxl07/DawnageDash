
-- Insert Protein Sources
-- Insert Protein Sources
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
SELECT * FROM (VALUES
('Large Whole Egg', 1, 'pcs', 69, 6.0, 0.0, 5.0),
('Prawns', 100, 'g', 78, 17.6, 0.0, 0.7),
('White Fish', 110, 'g', 144, 18.4, 0.0, 7.2),
('Soya Paneer (Tofu)', 100, 'g', 153, 16.6, 7.2, 6.4)
) AS t (name, serving_size, serving_unit, calories, protein, carbs, fats)
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = t.name);

-- Note: Removed duplicates found in create_food_database.sql:
-- Chicken Breast, Egg Whites, Soya Chunks, Low Fat Paneer, Full Fat Paneer, Whey Protein, Low Fat Milk, Low Fat Curd.

-- Insert Carbohydrate Sources
-- Insert Carbohydrate Sources
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
SELECT * FROM (VALUES
('Dal', 100, 'g', 340, 24.0, 56.0, 2.0),
('Rajma', 100, 'g', 337, 22.5, 46.1, 1.1),
('Kelloggs Chocos', 100, 'g', 387, 9.0, 83.6, 2.9),
('Quaker Oats', 100, 'g', 375, 12.5, 67.5, 7.5),
('Brown Rice', 100, 'g', 320, 6.0, 70.0, 2.0),
('Semolina', 100, 'g', 360, 12.7, 72.8, 1.0),
('Flattened Rice (Poha)', 100, 'g', 321, 14.3, 135.7, 3.6),
('White Bread', 2, 'pcs', 130, 4.0, 28.2, 1.9),
('Pasta', 100, 'g', 342, 13.0, 64.7, 1.9),
('Noodles', 100, 'g', 353, 12.3, 72.3, 2.0),
('Spaghetti', 100, 'g', 343, 13.0, 65.0, 1.9),
('Atta Maggi', 1, 'block', 312, 5.8, 46.0, 11.7),
('Potato', 100, 'g', 110, 3.0, 26.0, 0.2),
('Sweet Potato', 100, 'g', 109, 1.3, 16.8, 4.3)
) AS t (name, serving_size, serving_unit, calories, protein, carbs, fats)
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = t.name);

-- Note: Removed duplicates:
-- Wheat Flour, Rice, Wheat Bread.

-- Insert Fruits
-- Insert Fruits
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
SELECT * FROM (VALUES
('Watermelon', 100, 'g', 30, 0.6, 7.6, 0.2),
('Grapes', 100, 'g', 69, 0.7, 18.1, 0.2),
('Mango', 100, 'g', 60, 0.8, 15.0, 0.4),
('Papaya', 100, 'g', 43, 0.5, 9.1, 0.3)
) AS t (name, serving_size, serving_unit, calories, protein, carbs, fats)
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = t.name);

-- Note: Removed duplicates:
-- Apple, Banana.

-- Insert Snacks/Others (Categorized under Carbs/General in list but separate here for clarity or just append)
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats) VALUES
('Parle-G', 5, 'pcs', 128, 2.0, 22.0, 3.6),
('Oreo', 2, 'pcs', 107, 1.1, 15.6, 5.0),
('Mcvities Digestive', 2, 'pcs', 93, 1.4, 12.7, 4.0),
('Sugar', 10, 'g', 38, 0.0, 9.9, 0.0),
('Dairy Milk', 2, 'blocks', 60, 0.9, 6.2, 3.0),
('Jaggery', 10, 'g', 35, 0.0, 8.5, 0.0),
('Kissan Jam', 10, 'g', 32, 0.1, 8.0, 0.0),
('Honey', 10, 'g', 35, 0.0, 8.8, 0.0);

-- Insert Fat Sources
-- Insert Fat Sources and Others
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
SELECT * FROM (VALUES
('Walnuts', 10, 'halves', 160, 3.8, 3.4, 16.3),
('Butter', 10, 'g', 72, 0.1, 0.0, 8.0),
('Peanuts', 10, 'g', 56, 2.6, 1.6, 4.9),
('Avocado', 100, 'g', 160, 2.0, 8.5, 14.7),
('Ghee', 10, 'g', 90, 0.0, 0.0, 10.0),
('Oil (Cooking)', 10, 'g', 90, 0.0, 0.0, 10.0),
('Olive Oil', 10, 'g', 90, 0.0, 0.0, 10.0),
('Cheese Slice', 1, 'slice', 62, 4.0, 0.3, 5.0),
('Cheese Cubes', 25, 'g', 80, 5.0, 0.4, 6.5),
('Kissan Ketchup', 10, 'g', 10, 0.1, 2.5, 0.0),
('White Mayonnaise', 10, 'g', 67, 0.0, 0.0, 7.5),
('Chings Schezwan Sauce', 10, 'g', 13, 0.0, 2.0, 0.7)
) AS t (name, serving_size, serving_unit, calories, protein, carbs, fats)
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = t.name);

-- Note: Removed duplicates:
-- Peanut Butter, Cashew Nuts, Almonds.