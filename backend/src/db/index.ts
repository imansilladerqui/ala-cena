import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      restrictions TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pantry (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      quantity NUMERIC NOT NULL DEFAULT 1,
      unit TEXT,
      expires_at DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      recipe_title TEXT NOT NULL,
      cooked_at TIMESTAMPTZ DEFAULT NOW(),
      rating INTEGER CHECK (rating BETWEEN 1 AND 5)
    );

    CREATE TABLE IF NOT EXISTS menu_proposals (
      id SERIAL PRIMARY KEY,
      recipes JSONB NOT NULL,
      proposed_at DATE DEFAULT CURRENT_DATE,
      chosen_recipe_id TEXT
    );
  `)
  console.log('DB lista')
}
