import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_FILE 
  ? path.resolve(__dirname, '..', process.env.DATABASE_FILE)
  : path.resolve(__dirname, '../data/hostel.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hostel_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      gender_type TEXT DEFAULT 'coed',
      total_floors INTEGER DEFAULT 3,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL REFERENCES hostel_blocks(id) ON DELETE CASCADE,
      room_number TEXT NOT NULL,
      floor INTEGER NOT NULL DEFAULT 1,
      capacity INTEGER NOT NULL DEFAULT 2,
      occupied_beds INTEGER NOT NULL DEFAULT 0,
      room_type TEXT DEFAULT 'Non-AC',
      monthly_rent REAL DEFAULT 4500,
      status TEXT DEFAULT 'available',
      UNIQUE(block_id, room_number)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'warden', 'guard', 'technician')),
      roll_no TEXT UNIQUE,
      phone TEXT,
      parent_phone TEXT,
      gender TEXT,
      department TEXT,
      year_of_study INTEGER,
      room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS room_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      bed_number INTEGER DEFAULT 1,
      allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS outpasses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pass_type TEXT DEFAULT 'night_out',
      reason TEXT NOT NULL,
      destination TEXT NOT NULL,
      out_date TEXT NOT NULL,
      in_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'checked_out', 'completed', 'cancelled')),
      approved_by INTEGER REFERENCES users(id),
      rejection_reason TEXT,
      qr_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('electrical', 'plumbing', 'carpentry', 'cleaning', 'wifi', 'other')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      room_number TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      assigned_to TEXT,
      technician_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS mess_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      time_slot TEXT,
      menu_items TEXT NOT NULL,
      special_item TEXT,
      UNIQUE(day_of_week, meal_type)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'high', 'urgent')),
      posted_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gate_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outpass_id INTEGER REFERENCES outpasses(id) ON DELETE SET NULL,
      student_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL CHECK(action IN ('checkout', 'checkin')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      guard_id INTEGER REFERENCES users(id),
      remarks TEXT
    );
  `);
  console.log('✅ Database schema initialized successfully');
}