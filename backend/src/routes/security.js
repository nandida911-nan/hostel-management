import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { verifyOutPassToken } from '../utils/qr.js';

const router = express.Router();

// Verify QR Token or Roll Number (Security Guard & Warden)
router.post('/verify', authenticateToken, requireRole('guard', 'warden'), (req, res) => {
  try {
    const { qr_token, roll_no, outpass_id } = req.body;

    let outpass = null;

    if (qr_token) {
      // 1. First attempt to decode JWT token
      const tokenResult = verifyOutPassToken(qr_token);
      
      if (tokenResult.valid) {
        outpass = db.prepare(`
          SELECT 
            o.*,
            u.id AS student_id,
            u.name AS student_name,
            u.roll_no AS student_roll_no,
            u.phone AS student_phone,
            u.parent_phone,
            u.department,
            u.year_of_study,
            u.gender,
            r.room_number,
            hb.name AS block_name,
            w.name AS approved_by_name
          FROM outpasses o
          JOIN users u ON o.user_id = u.id
          LEFT JOIN rooms r ON u.room_id = r.id
          LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
          LEFT JOIN users w ON o.approved_by = w.id
          WHERE o.id = ?
        `).get(tokenResult.data.outpassId);
      } else {
        // Fallback: check if qr_token string matches in database directly
        outpass = db.prepare(`
          SELECT 
            o.*,
            u.id AS student_id,
            u.name AS student_name,
            u.roll_no AS student_roll_no,
            u.phone AS student_phone,
            u.parent_phone,
            u.department,
            u.year_of_study,
            u.gender,
            r.room_number,
            hb.name AS block_name,
            w.name AS approved_by_name
          FROM outpasses o
          JOIN users u ON o.user_id = u.id
          LEFT JOIN rooms r ON u.room_id = r.id
          LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
          LEFT JOIN users w ON o.approved_by = w.id
          WHERE o.qr_token = ?
        `).get(qr_token);
      }
    } else if (roll_no) {
      // Search active / approved outpass for roll number
      outpass = db.prepare(`
        SELECT 
          o.*,
          u.id AS student_id,
          u.name AS student_name,
          u.roll_no AS student_roll_no,
          u.phone AS student_phone,
          u.parent_phone,
          u.department,
          u.year_of_study,
          u.gender,
          r.room_number,
          hb.name AS block_name,
          w.name AS approved_by_name
        FROM users u
        JOIN outpasses o ON o.user_id = u.id
        LEFT JOIN rooms r ON u.room_id = r.id
        LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
        LEFT JOIN users w ON o.approved_by = w.id
        WHERE UPPER(TRIM(u.roll_no)) = UPPER(TRIM(?))
        ORDER BY CASE 
          WHEN o.status IN ('approved', 'checked_out') THEN 0 
          WHEN o.status = 'pending' THEN 1 
          ELSE 2 
        END, o.created_at DESC
        LIMIT 1
      `).get(roll_no);
    } else if (outpass_id) {
      outpass = db.prepare(`
        SELECT 
          o.*,
          u.id AS student_id,
          u.name AS student_name,
          u.roll_no AS student_roll_no,
          u.phone AS student_phone,
          u.parent_phone,
          u.department,
          u.year_of_study,
          u.gender,
          r.room_number,
          hb.name AS block_name,
          w.name AS approved_by_name
        FROM outpasses o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN rooms r ON u.room_id = r.id
        LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
        LEFT JOIN users w ON o.approved_by = w.id
        WHERE o.id = ?
      `).get(outpass_id);
    }

    if (!outpass) {
      return res.status(404).json({
        valid: false,
        verificationStatus: 'NOT_FOUND',
        message: 'No out-pass record found for the provided QR or Roll Number.'
      });
    }

    // Determine validity
    let isValid = false;
    let verificationStatus = 'INVALID';
    let message = '';
    let allowedAction = null; // 'checkout' | 'checkin' | null

    const now = new Date();
    const inDate = new Date(outpass.in_date);
    const isLate = now > inDate;

    if (outpass.status === 'approved') {
      isValid = true;
      verificationStatus = 'APPROVED_FOR_CHECKOUT';
      allowedAction = 'checkout';
      message = 'Valid Approved Pass. Student is cleared to leave campus.';
    } else if (outpass.status === 'checked_out') {
      isValid = true;
      verificationStatus = isLate ? 'OVERDUE_FOR_CHECKIN' : 'VALID_FOR_CHECKIN';
      allowedAction = 'checkin';
      message = isLate 
        ? 'Pass is OVERDUE for return! Student has exceeded approved in-time.'
        : 'Student is currently outside. Cleared for entry/check-in.';
    } else if (outpass.status === 'pending') {
      isValid = false;
      verificationStatus = 'PENDING_APPROVAL';
      message = 'Pass has NOT been approved yet by the Warden.';
    } else if (outpass.status === 'rejected') {
      isValid = false;
      verificationStatus = 'REJECTED';
      message = `Pass was REJECTED by Warden. Reason: ${outpass.rejection_reason || 'Not specified'}`;
    } else if (outpass.status === 'completed') {
      isValid = false;
      verificationStatus = 'ALREADY_COMPLETED';
      message = 'This pass has already been used and completed.';
    } else {
      isValid = false;
      verificationStatus = 'CANCELLED';
      message = 'This out-pass was cancelled.';
    }

    res.json({
      valid: isValid,
      verificationStatus,
      allowedAction,
      message,
      outpass,
      isLate
    });
  } catch (err) {
    console.error('Verify pass error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Perform Gate Action (Check-out or Check-in)
router.post('/gate-action', authenticateToken, requireRole('guard', 'warden'), (req, res) => {
  const gateTx = db.transaction(() => {
    const { outpass_id, action, remarks = '' } = req.body;

    if (!outpass_id || !action || !['checkout', 'checkin'].includes(action)) {
      throw new Error('Valid outpass_id and action (checkout/checkin) are required.');
    }

    const pass = db.prepare('SELECT * FROM outpasses WHERE id = ?').get(outpass_id);
    if (!pass) throw new Error('Outpass not found.');

    if (action === 'checkout') {
      if (pass.status !== 'approved') {
        throw new Error(`Cannot checkout pass with status: ${pass.status.toUpperCase()}`);
      }
      db.prepare(`UPDATE outpasses SET status = 'checked_out', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(outpass_id);
    } else if (action === 'checkin') {
      if (pass.status !== 'checked_out') {
        throw new Error(`Cannot checkin pass that is not currently checked out (Current status: ${pass.status.toUpperCase()})`);
      }
      db.prepare(`UPDATE outpasses SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(outpass_id);
    }

    // Insert into immutable gate_logs
    const insertLog = db.prepare(`
      INSERT INTO gate_logs (outpass_id, student_id, action, guard_id, remarks)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLog.run(outpass_id, pass.user_id, action, req.user.id, remarks);

    const updatedPass = db.prepare('SELECT * FROM outpasses WHERE id = ?').get(outpass_id);

    return {
      success: true,
      message: `Student successfully ${action === 'checkout' ? 'checked out of campus' : 'checked in to campus'}.`,
      outpass: updatedPass
    };
  });

  try {
    const result = gateTx();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Gate Movement Logs (Today & Historical)
router.get('/logs', authenticateToken, requireRole('guard', 'warden'), (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = db.prepare(`
      SELECT 
        gl.*,
        u.name AS student_name,
        u.roll_no AS student_roll_no,
        u.phone AS student_phone,
        r.room_number,
        hb.name AS block_name,
        o.destination,
        o.pass_type,
        g.name AS guard_name
      FROM gate_logs gl
      JOIN users u ON gl.student_id = u.id
      LEFT JOIN outpasses o ON gl.outpass_id = o.id
      LEFT JOIN rooms r ON u.room_id = r.id
      LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
      LEFT JOIN users g ON gl.guard_id = g.id
      ORDER BY gl.timestamp DESC
      LIMIT ?
    `).all(limit);

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;