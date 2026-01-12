-- Remove duplicate food items, keeping the first one inserted (lowest ID)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY id ASC) AS rn
    FROM food_items
)
DELETE FROM food_items
WHERE id IN (
    SELECT id
    FROM duplicates
    WHERE rn > 1
);
