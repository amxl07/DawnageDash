
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env variables
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '..', '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log('Loaded .env file');
    } catch (error) {
        console.warn('Could not load .env file. Assuming variables are present in environment.');
    }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set in environment or .env file');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigrations() {
    const migrationFiles = [
        'hierarchical_workout_plans_migration.sql',
        'beginner_home_workout_templates.sql',
        'intermediate_gym_workout_templates.sql',
        'intermediate_home_workout_templates.sql',
        'advanced_calisthenics_workout_templates.sql',
        'advanced_powerlifting_workout_templates.sql'
    ];

    const migrationsDir = path.resolve(__dirname, '..', 'sqlmigrationfiles');

    console.log('Starting migration execution...');

    for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        try {
            console.log(`Reading ${file}...`);
            const content = fs.readFileSync(filePath, 'utf8');

            console.log(`Executing ${file}...`);
            // Neon/Postgres driver might handle multiple statements if supported, 
            // otherwise we might need to split by ';'. 
            // @neondatabase/serverless 'neon' function executes a single query/command usually.
            // But it might accept a block. Let's try sending the whole block.
            // If it fails, we might need to use a different approach or split.

            await sql(content);
            console.log(`Successfully executed ${file}`);
        } catch (error) {
            console.error(`Error executing ${file}:`, error);
            process.exit(1);
        }
    }

    console.log('All migrations completed successfully!');
}

runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
