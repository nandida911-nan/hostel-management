import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// File a Complaint (Student & Warden)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { category, title, description, room_number, priority = 'medium' } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({ error: 'Category, title, and description are required.' });
    }

    const room = room_number || req.user.room_number || 'General Area';

    const insert = db.prepare(`
      INSERT INTO complaints (user_id, category, title, description, room_number, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `);

    const info = insert.run(req.user.id, category, title, description, room, priority);
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({
      message: 'Complaint ticket created successfully.',
      complaint
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Complaints (Student gets own, Warden/Tech gets all)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { category, status, priority, search } = req.query;
    let query = `
      SELECT 
        c.*,
        u.name AS student_name,
        u.roll_no AS student_roll_no,
        u.phone AS student_phone,
        hb.name AS block_name
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN rooms r ON u.room_id = r.id
      LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
      WHERE 1=1
    `;
    const params = [];

    // If student, only view own complaints
    if (req.user.role === 'student') {
      query += ` AND c.user_id = ?`;
      params.push(req.user.id);
    }

    if (category) {
      query += ` AND c.category = ?`;
      params.push(category);
    }
    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    if (priority) {
      query += ` AND c.priority = ?`;
      params.push(priority);
    }
    if (search) {
      query += ` AND (c.title LIKE ? OR c.description LIKE ? OR u.name LIKE ? OR c.room_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY 
      CASE WHEN c.status = 'open' THEN 0 WHEN c.status = 'in_progress' THEN 1 ELSE 2 END,
      CASE WHEN c.priority = 'urgent' THEN 0 WHEN c.priority = 'high' THEN 1 ELSE 2 END,
      c.created_at DESC
    `;

    const complaints = db.prepare(query).all(...params);
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Complaint Status & Assign Technician (Warden & Technician)
router.patch('/:id', authenticateToken, requireRole('warden', 'technician'), (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, technician_remarks, priority } = req.body;

    const existing = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Complaint ticket not found.' });
    }

    const newStatus = status || existing.status;
    const newAssignedTo = assigned_to !== undefined ? assigned_to : existing.assigned_to;
    const newRemarks = technician_remarks !== undefined ? technician_remarks : existing.technician_remarks;
    const newPriority = priority || existing.priority;
    const resolvedAt = (newStatus === 'resolved' || newStatus === 'closed') 
      ? new Date().toISOString() 
      : existing.resolved_at;

    db.prepare(`
      UPDATE complaints
      SET status = ?, assigned_to = ?, technician_remarks = ?, priority = ?, resolved_at = ?
      WHERE id = ?
    `).run(newStatus, newAssignedTo, newRemarks, newPriority, resolvedAt, id);

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);

    res.json({
      message: 'Complaint ticket updated.',
      complaint: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;