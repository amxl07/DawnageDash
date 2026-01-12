import re

# Food items extracted from the meal plan SQL scripts
# Format: (name, serving_size, serving_unit, calories, protein, carbs, fats)
meal_plan_foods = [
    # From reset_food_and_vegetarian_plans.sql
    ('Wheat Bread', 1, 'pcs', 70, 3.0, 14.1, 1.0),
    ('Low Fat Paneer', 100, 'g', 170, 21.0, 4.5, 8.0),
    ('Full Fat Paneer', 100, 'g', 375, 14.0, 3.0, 23.0),
    ('Vegetables', 100, 'g', 30, 1.5, 5.0, 0.2), 
    ('Banana', 100, 'g', 89, 1.1, 22.8, 0.3),
    ('Green Tea', 1, 'cup', 0, 0, 0, 0),
    ('Rice', 100, 'g', 355, 9.0, 78.0, 0.0), 
    ('Whey Protein', 1, 'scoop', 120, 23.0, 2.6, 1.8),
    ('Low Fat Milk', 100, 'ml', 60, 3.3, 4.8, 3.1),
    ('Wheat Flour', 100, 'g', 350, 9.0, 77.0, 0.8),
    ('Soy Chunks', 100, 'g', 345, 52.0, 33.0, 0.5),
    ('Almonds', 1, 'pcs', 7, 0.25, 0.26, 0.6),
    ('Cashew Nuts', 1, 'pcs', 11, 0.36, 0.88, 0.6),
    ('Oats', 100, 'g', 380, 12.6, 67.6, 7.6),
    ('Apple', 1, 'pcs', 80, 0.4, 21.5, 0.3),
    ('Peanut Butter', 100, 'g', 640, 26.0, 19.0, 51.0),
    ('Cheese', 1, 'slice', 62, 4.0, 0.3, 5.0),
    ('Curd', 100, 'g', 59, 3.8, 4.3, 3.0),
    # From insert_eggetarian_plans.sql
    ('Egg Whites', 1, 'pcs', 17, 3.6, 0.2, 0.1),
    ('Whole Eggs', 1, 'pcs', 72, 6.3, 0.4, 4.8),
    # From insert_non_vegetarian_plans.sql
    ('Chicken Breast', 100, 'g', 110, 31.0, 0.0, 1.0)
]

def generate_sync_sql():
    sql_lines = [
        "-- ============================================================================",
        "-- SYNCHRONIZE FOOD ITEMS FOR MEAL PLANS",
        "-- This script ensures the food items used in meal plans exist with EXACT values.",
        "-- ============================================================================",
        "",
        "-- First, ensure columns are wide enough (redundant but safe)",
        "ALTER TABLE food_items ALTER COLUMN protein TYPE DECIMAL(10, 2);",
        "ALTER TABLE food_items ALTER COLUMN carbs TYPE DECIMAL(10, 2);",
        "ALTER TABLE food_items ALTER COLUMN fats TYPE DECIMAL(10, 2);",
        "",
        "-- Insert or Update Logic using ON CONFLICT",
        "-- We assume 'name' is unique. If not, we might interpret duplicates based on ID, ",
        "-- but here we rely on Name matching since the App searches by Name.",
        ""
    ]

    for item in meal_plan_foods:
        name, size, unit, cal, prot, carbs, fats = item
        # Escape single quotes
        safe_name = name.replace("'", "''")
        safe_unit = unit.replace("'", "''")
        
        # We use DELETE + INSERT to ensure the item exists with exactly these properties,
        # without relying on a UNIQUE constraint which might not exist or might fail with duplicates.
        sql = f"""
DELETE FROM food_items WHERE name = '{safe_name}';
INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats)
VALUES ('{safe_name}', {size}, '{safe_unit}', {cal}, {prot}, {carbs}, {fats});
"""
        sql_lines.append(sql.strip())

    with open('sync_meal_plan_foods.sql', 'w') as f:
        f.write("\n\n".join(sql_lines))

if __name__ == "__main__":
    generate_sync_sql()
