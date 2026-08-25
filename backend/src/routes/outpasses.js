import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateOutPassToken, generateQRCodeDataURL } from '../utils/qr.js';

const router = express.Router();

// Apply for Outpass (Student)
router.post('/apply', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { pass_type = 'night_out', reason, destination, out_date, in_date } = req.body;

    if (!reason || !destination || !out_date || !in_date) {
      return res.status(400).json({ error: 'Please provide reason, destination, out date/time and in date/time.' });
    }

    const outDateObj = new Date(out_date);
    const inDateObj = new Date(in_date);

    if (isNaN(outDateObj.getTime()) || isNaN(inDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date/time format.' });
    }

    if (inDateObj <= outDateObj) {
      return res.status(400).json({ error: 'Expected return time must be after the departure time.' });
    }

    // Check if there is already an active pending or approved pass
    const activePass = db.prepare(`
      SELECT id, status FROM outpasses
      WHERE user_id = ? AND status IN ('pending', 'approved', 'checked_out')
    `).get(req.user.id);

    if (activePass) {
      return res.status(400).json({ 
        error: `You already have an active out-pass (Status: ${activePass.status.toUpperCase()}). Please resolve or cancel it before applying for a new one.` 
      });
    }

    const insert = db.prepare(`
      INSERT INTO outpasses (user_id, pass_type, reason, destination, out_date, in_date, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    const info = insert.run(req.user.id, pass_type, reason, destination, out_date, in_date);
    const pass = db.prepare('SELECT * FROM outpasses WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({
      message: 'Out-pass application submitted for Warden approval.',
      outpass: pass
    });
  } catch (err) {
    console.error('Apply outpass error:', err);
    res.status(500).json({ error: 'Failed to apply for out-pass: ' + err.message });
  }
});

// Get My Out-Passes (Student)
router.get('/my-passes', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const passes = db.prepare(`
      SELECT 
        o.*,
        w.name AS approved_by_name
      FROM outpasses o
      LEFT JOIN users w ON o.approved_by = w.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    // Enrich approved / checked_out passes with QR code data URLs
    const enriched = await Promise.all(
      passes.map(async (pass) => {
        let qrCodeDataUrl = null;
        if (pass.qr_token && ['approved', 'checked_out'].includes(pass.status)) {
          try {
            qrCodeDataUrl = await generateQRCodeDataURL(pass.qr_token);
          } catch (e) {
            console.error('Error generating QR for pass:', pass.id, e);
          }
        }
        return {
          ...pass,
          qrCodeDataUrl
        };
      })
    );

    res.json({ outpasses: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Out-Passes (Warden)
router.get('/all', authenticateToken, requireRole('warden'), (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT 
        o.*,
        u.name AS student_name,
        u.roll_no AS student_roll_no,
        u.phone AS student_phone,
        u.parent_phone,
        u.department,
        u.year_of_study,
        r.room_number,
        hb.name AS block_name,
        w.name AS approved_by_name
      FROM outpasses o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN rooms r ON u.room_id = r.id
      LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
      LEFT JOIN users w ON o.approved_by = w.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR u.roll_no LIKE ? OR o.destination LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY CASE WHEN o.status = 'pending' THEN 0 ELSE 1 END, o.created_at DESC`;

    const outpasses = db.prepare(query).all(...params);
    res.json({ outpasses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Out-Pass Status (Approve / Reject by Warden)
router.patch('/:id/status', authenticateToken, requireRole('warden'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason = '' } = req.body;

    if (!['approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const pass = db.prepare(`
      SELECT o.*, u.name, u.roll_no, u.room_id, r.room_number
      FROM outpasses o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN rooms r ON u.room_id = r.id
      WHERE o.id = ?
    `).get(id);

    if (!pass) {
      return res.status(404).json({ error: 'Out-pass not found.' });
    }

    let qrToken = pass.qr_token;
    if (status === 'approved' && !qrToken) {
      qrToken = generateOutPassToken(pass, {
        id: pass.user_id,
        name: pass.name,
        roll_no: pass.roll_no,
        room_number: pass.room_number
      });
    }

    db.prepare(`
      UPDATE outpasses 
      SET status = ?, 
          approved_by = ?, 
          rejection_reason = ?, 
          qr_token = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      status, 
      req.user.id, 
      status === 'rejected' ? rejection_reason : null, 
      status === 'approved' ? qrToken : pass.qr_token, 
      id
    );

    const updated = db.prepare('SELECT * FROM outpasses WHERE id = ?').get(id);

    res.json({
      message: `Out-pass ${status} successfully.`,
      outpass: updated
    });
  } catch (err) {
    console.error('Update pass error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cancel Out-Pass (Student)
router.post('/:id/cancel', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const { id } = req.params;
    const pass = db.prepare('SELECT * FROM outpasses WHERE id = ? AND user_id = ?').get(id, req.user.id);

    if (!pass) {
      return res.status(404).json({ error: 'Out-pass application not found.' });
    }

    if (pass.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending out-pass applications can be cancelled.' });
    }

    db.prepare("UPDATE outpasses SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

    res.json({ message: 'Out-pass cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;