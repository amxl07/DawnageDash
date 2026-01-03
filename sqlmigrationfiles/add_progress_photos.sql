CREATE TABLE IF NOT EXISTS "weekly_progress_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "front_url" text,
  "back_url" text,
  "side_left_url" text,
  "side_right_url" text,
  "created_at" timestamp DEFAULT now()
);
