
-- Create food_items table
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  serving_size DECIMAL(10, 2) DEFAULT 100,
  serving_unit VARCHAR(20) DEFAULT 'g',
  calories INTEGER NOT NULL,
  protein DECIMAL(5, 1) NOT NULL,
  carbs DECIMAL(5, 1) NOT NULL,
  fats DECIMAL(5, 1) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data based on meal templates (Values per 100g/standard unit approx)
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats) VALUES
('Chicken Breast (Raw)', 100, 'g', 110, 31.0, 0.0, 1.0), -- From template
('Rice (Raw)', 100, 'g', 354, 9.0, 78.0, 0.0), -- Template: 100g Rice -> 354 cal (Matches raw)
('Low Fat Paneer', 100, 'g', 170, 21.0, 4.5, 8.0), -- From template
('Full Fat Paneer', 100, 'g', 375, 14.0, 3.0, 23.0), -- From template
('Soy Chunks', 100, 'g', 345, 52.0, 33.0, 0.5), -- Template: 30g -> 103cal. 100g -> ~343. USDA ~345.
('Egg Whites', 1, 'pcs', 17, 3.6, 0.2, 0.1), -- Template: 6pcs -> 103cal (~17/pc).
('Whole Eggs', 1, 'pcs', 72, 6.3, 0.4, 4.8), -- Template: 2pcs -> 143cal (~72/pc).
('Whey Protein', 1, 'scoop', 120, 23.0, 2.6, 1.8), -- From template (approx 30g scoop)
('Oats', 100, 'g', 380, 12.6, 67.6, 7.6), -- Template: 50g -> 190cal. 100g -> 380.
('Banana', 100, 'g', 89, 1.1, 22.8, 0.3), -- From template
('Almond', 1, 'pcs', 7, 0.25, 0.26, 0.6), -- Template: 10pcs -> 70cal.
('Cashew Nuts', 1, 'pcs', 11, 0.36, 0.6, 0.9), -- Template: 10pcs -> 111cal.
('Peanut Butter', 100, 'g', 640, 26.0, 19.0, 51.0), -- Template: 10g -> 64cal.
('Wheat Bread', 1, 'pcs', 70, 2.25, 11.75, 0.55), -- Template: 4pcs -> 280cal.
('Wheat Flour', 100, 'g', 350, 9.0, 77.0, 0.8), -- From template
('Low Fat Milk', 100, 'ml', 60, 3.3, 4.8, 3.1), -- Template: 200ml -> 120cal.
('Curd', 100, 'g', 59, 3.8, 4.3, 3.0), -- Template: 200g -> 118cal.
('Cheese', 1, 'slice', 62, 4.0, 0.3, 5.0), -- From template
('Apple', 1, 'pcs', 80, 0.4, 21.5, 0.3), -- From template (Medium size)
('Vegetables (Mixed)', 100, 'g', 30, 1.5, 5.0, 0.2); -- Generic estimate
