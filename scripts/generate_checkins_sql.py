import datetime
import random
import os

# Configuration
USER_ID = "950030ed-fef7-46dc-9547-dcd994be27c4"
START_DATE = datetime.date(2025, 12, 1)
END_DATE = datetime.date(2026, 1, 8)
START_WEIGHT = 92.0
END_WEIGHT = 88.0

OUTPUT_FILE = "sqlmigrationfiles/reset_checkins_for_user.sql"

def generate_random_time():
    # Return random string like '2025-12-01 08:30:00+00'
    return "NOW()"

def interpolate(start, end, progress):
    return start + (end - start) * progress

def main():
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    total_days = (END_DATE - START_DATE).days + 1
    
    sql_statements = []
    
    # Header
    sql_statements.append(f"-- Reset daily check-ins for user {USER_ID}")
    sql_statements.append(f"-- Generated on {datetime.datetime.now()}")
    sql_statements.append("")
    
    # Delete existing data
    sql_statements.append(f"DELETE FROM daily_check_ins WHERE user_id = '{USER_ID}';")
    sql_statements.append("")
    
    current_date = START_DATE
    day_count = 0
    
    while current_date <= END_DATE:
        progress = day_count / max(1, total_days - 1)
        
        # Weight calculation: Linear trend + noise
        base_weight = interpolate(START_WEIGHT, END_WEIGHT, progress)
        noise = random.uniform(-0.4, 0.4)
        morning_weight = round(base_weight + noise, 2)
        
        # Other random stats
        sleep_hours = round(random.uniform(6.5, 8.5), 1)
        
        # Workout logic
        if random.random() < 0.15: # 15% chance of rest day
            workout_status = 'rest_day'
            workout_performance = "NULL"
            steps = random.randint(3000, 6000)
        elif random.random() < 0.1: # 10% chance of cardio
            workout_status = 'cardio_day'
            workout_performance = "NULL"
            steps = random.randint(8000, 12000)
        elif random.random() < 0.1: # 10% chance of missed
            workout_status = 'no'
            workout_performance = "NULL"
            steps = random.randint(3000, 6000)
        else: # Normal workout
            workout_status = 'done'
            workout_performance = random.randint(7, 10)
            steps = random.randint(6000, 10000)
            
        nutrition_score = random.randint(6, 10)
        calorie_intake = random.randint(1800, 2400)
        water_liters = round(random.uniform(2.0, 3.5), 1)
        protein = round(random.uniform(140, 180), 1)
        carbs = round(random.uniform(150, 250), 1)
        fats = round(random.uniform(50, 80), 1)
        
        energy_level = random.randint(6, 9)
        hunger_level = random.randint(4, 7)
        stress_level = random.randint(2, 6)
        
        digestions = ['none', 'none', 'none', 'none', 'bloated']
        digestion = random.choice(digestions)
        
        # Construct INSERT statement
        # Note: day_number is removed from schema, so we don't insert it.
        insert_sql = f"""
INSERT INTO daily_check_ins (
    user_id, date, morning_weight, sleep_hours,
    workout_status, workout_performance,
    nutrition_score, calorie_intake, water_liters, daily_steps,
    protein, carbs, fats,
    energy_level, hunger_level, stress_level, digestion
) VALUES (
    '{USER_ID}', '{current_date}', {morning_weight}, {sleep_hours},
    '{workout_status}', {workout_performance},
    {nutrition_score}, {calorie_intake}, {water_liters}, {steps},
    {protein}, {carbs}, {fats},
    {energy_level}, {hunger_level}, {stress_level}, '{digestion}'
);"""
        sql_statements.append(insert_sql.strip())
        
        current_date += datetime.timedelta(days=1)
        day_count += 1
        
    # Write to file
    with open(OUTPUT_FILE, 'w') as f:
        f.write('\n'.join(sql_statements))
        f.write('\n')
        
    print(f"Generated SQL file at {OUTPUT_FILE} with {day_count} records.")

if __name__ == "__main__":
    main()
