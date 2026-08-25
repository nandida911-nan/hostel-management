import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all notices
router.get('/', authenticateToken, (req, res) => {
  try {
    const notices = db.prepare(`
      SELECT 
        n.*,
        u.name AS posted_by_name
      FROM notices n
      LEFT JOIN users u ON n.posted_by = u.id
      ORDER BY 
        CASE n.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        n.created_at DESC
    `).all();

    res.json({ notices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a Notice (Warden)
router.post('/', authenticateToken, requireRole('warden'), (req, res) => {
  try {
    const { title, content, category = 'general', priority = 'normal' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO notices (title, content, category, priority, posted_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = insert.run(title, content, category, priority, req.user.id);
    const notice = db.prepare(`
      SELECT n.*, u.name AS posted_by_name
      FROM notices n
      LEFT JOIN users u ON n.posted_by = u.id
      WHERE n.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json({
      message: 'Notice broadcasted successfully.',
      notice
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a Notice (Warden)
router.delete('/:id', authenticateToken, requireRole('warden'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM notices WHERE id = ?').run(id);
    res.json({ message: 'Notice deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;