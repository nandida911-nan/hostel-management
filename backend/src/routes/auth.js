import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hostel-super-secret-jwt-key-2026';

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { 
      name, email, password, role = 'student', 
      roll_no, phone, parent_phone, gender, department, year_of_study 
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    if (role === 'student' && !roll_no) {
      return res.status(400).json({ error: 'Roll number is required for student registration.' });
    }

    // Check if email or roll_no already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR (roll_no IS NOT NULL AND roll_no = ?)').get(email, roll_no || '');
    if (existing) {
      return res.status(409).json({ error: 'Email or Roll Number is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const insert = db.prepare(`
      INSERT INTO users (
        name, email, password_hash, role, roll_no, 
        phone, parent_phone, gender, department, year_of_study
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insert.run(
      name, email, password_hash, role, roll_no || null,
      phone || null, parent_phone || null, gender || null, department || null, year_of_study || 1
    );

    const user = db.prepare(`
      SELECT id, name, email, role, roll_no, phone, parent_phone, gender, department, year_of_study, room_id, created_at 
      FROM users WHERE id = ?
    `).get(info.lastInsertRowid);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register account: ' + err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare(`
      SELECT 
        u.*,
        r.room_number,
        r.floor,
        hb.name AS block_name
      FROM users u
      LEFT JOIN rooms r ON u.room_id = r.id
      LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
      WHERE u.email = ?
    `).get(email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    delete user.password_hash;

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// List all users (Warden / Admin)
router.get('/users', authenticateToken, requireRole('warden'), (req, res) => {
  const { role, search } = req.query;
  let query = `
    SELECT 
      u.id, u.name, u.email, u.role, u.roll_no, u.phone, u.parent_phone,
      u.gender, u.department, u.year_of_study, u.room_id, u.created_at,
      r.room_number, hb.name AS block_name
    FROM users u
    LEFT JOIN rooms r ON u.room_id = r.id
    LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    query += ` AND u.role = ?`;
    params.push(role);
  }

  if (search) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.roll_no LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY u.created_at DESC`;

  const users = db.prepare(query).all(...params);
  res.json({ users });
});

export default router;