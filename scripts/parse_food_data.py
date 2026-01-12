import re

def parse_val(v):
    if v == 'var': return 0.0
    if '-' in v:
        # handle ranges like 180-200 -> average
        try:
            parts = v.split('-')
            low = float(parts[0])
            high = float(parts[1])
            return (low + high) / 2
        except:
            return 0.0
    try:
        return float(v)
    except:
        return 0.0

def generate_sql():
    with open('food_data_raw.txt', 'r') as f:
        lines = f.readlines()

    sql_output = [
        "-- Import Full Food Database",
        "-- Widen columns to handle potential outliers/bad data from bulk import",
        "ALTER TABLE food_items ALTER COLUMN protein TYPE DECIMAL(10, 2);",
        "ALTER TABLE food_items ALTER COLUMN carbs TYPE DECIMAL(10, 2);",
        "ALTER TABLE food_items ALTER COLUMN fats TYPE DECIMAL(10, 2);",
        "TRUNCATE TABLE food_items RESTART IDENTITY CASCADE;",
        "INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats) VALUES"
    ]
    
    values_list = []

    for line in lines:
        line = line.strip()
        if not line: continue
        
        parts = line.split()
        if len(parts) < 5: 
            # Invalid line
            continue

        # Extract last 4 as macros/cal
        try:
            cal = parse_val(parts[-1])
            prot = parse_val(parts[-2])
            fat = parse_val(parts[-3])
            carbs = parse_val(parts[-4])
        except:
             # If parsing fails, skip or try fallback? skipping for now
             continue
        
        remainder = parts[:-4]
        if not remainder: continue

        # Parse Serving from remainder (Iterate right to left)
        # Rule: Serving starts at the right-most token that starts with a digit
        # OR is a known unit word 'per'
        split_idx = -1
        for i in range(len(remainder)-1, -1, -1):
            token = remainder[i]
            # Check if token starts with a digit
            if token and token[0].isdigit():
                split_idx = i
                break
            # Check for specific keywords
            if token.lower() in ['per', 'one', 'half']:
                split_idx = i
                break
        
        if split_idx != -1:
            name_parts = remainder[:split_idx]
            serv_parts = remainder[split_idx:]
            
            # Special case: if name matches '5 star' and '5' was consumed as serving?
            # '5 star' -> parts='5', 'star'. 
            # If serving was '100g' which came after, split_idx would be index of '100g'.
            # If line was '5 star 100g 74 ...' -> rem: '5', 'star', '100g'.
            # '100g' starts with digit. split_idx = 2.
            # name = '5 star', serv = '100g'. Correct.
            
            # If '5 star 1 bar (..)' -> rem: '5', 'star', '1', 'bar', '(..)'
            # '(..)' starts with '('. check next
            # 'bar' starts with 'b'.
            # '1' starts with digit. split_idx at '1'.
            # name = '5 star', serv = '1 bar (..)'. Correct.

            name = " ".join(name_parts)
            serving_raw = " ".join(serv_parts)
        else:
            # Fallback: Assume last token is serving if no digit found?
            # Or assume whole thing is name and serv is default?
            # Let's assume last token is serving if it contains 'g' or 'ml'
            last = remainder[-1]
            if 'g' in last or 'ml' in last or 'pc' in last:
                name = " ".join(remainder[:-1])
                serving_raw = last
            else:
                # Default
                name = " ".join(remainder)
                serving_raw = "100g"

        # Split serving_raw into size and unit
        # 100g -> 100, g
        # 1 bar -> 1, bar
        # (19.5g) -> ?
        serv_match = re.match(r'^([\d\.]+)\s*(.*)$', serving_raw)
        if serv_match:
            size_val = float(serv_match.group(1))
            unit_val = serv_match.group(2).strip()
            if not unit_val:
                # 100g case? re doesn't capture g if no space?
                # \d+ matches 100.
                # Actually regex `^([\d\.]+)` will match `100` in `100g`.
                # Remainder is `g`.
                # So if `100g` -> size=100, unit=g.
                pass
            if not unit_val: unit_val = 'unit'
        else:
            # If serving doesn't start with number (shouldn't happen due to logic above, but per bottle?)
            size_val = 1
            unit_val = serving_raw

        # Escape single quotes in name
        name = name.replace("'", "''")
        unit_val = unit_val.replace("'", "''")

        # Handle duplicates? SQL ON CONFLICT handled if needed, but we TRUNCATE.
        # Just append.
        values_list.append(f"('{name}', {size_val}, '{unit_val}', {int(cal)}, {prot}, {carbs}, {fat})")

    # Join values
    chunk_size = 1000
    for i in range(0, len(values_list), chunk_size):
        chunk = values_list[i:i+chunk_size]
        sql_output.append(",\n".join(chunk) + ";")
        if i + chunk_size < len(values_list):
             sql_output.append("INSERT INTO food_items (name, serving_size, serving_unit, calories, protein, carbs, fats) VALUES")

    with open('import_full_food_database.sql', 'w') as f:
        f.write("\n".join(sql_output))

if __name__ == "__main__":
    generate_sql()
