import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'hostel-super-secret-jwt-key-2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Fetch user details including room if allocated
    const user = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.role, u.roll_no, u.phone, u.parent_phone,
        u.gender, u.department, u.year_of_study, u.room_id,
        r.room_number, hb.name AS block_name
      FROM users u
      LEFT JOIN rooms r ON u.room_id = r.id
      LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
      WHERE u.id = ?
    `).get(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  });
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Unauthorized. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
}