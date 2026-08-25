import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get entire weekly mess menu
router.get('/', authenticateToken, (req, res) => {
  try {
    const menu = db.prepare(`
      SELECT * FROM mess_menu 
      ORDER BY 
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END,
        CASE meal_type
          WHEN 'breakfast' THEN 1
          WHEN 'lunch' THEN 2
          WHEN 'snacks' THEN 3
          WHEN 'dinner' THEN 4
        END
    `).all();

    res.json({ menu });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update or insert a meal entry (Warden)
router.put('/', authenticateToken, requireRole('warden'), (req, res) => {
  try {
    const { day_of_week, meal_type, menu_items, time_slot, special_item } = req.body;

    if (!day_of_week || !meal_type || !menu_items) {
      return res.status(400).json({ error: 'day_of_week, meal_type, and menu_items are required.' });
    }

    const upsert = db.prepare(`
      INSERT INTO mess_menu (day_of_week, meal_type, menu_items, time_slot, special_item)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(day_of_week, meal_type) DO UPDATE SET
        menu_items = excluded.menu_items,
        time_slot = COALESCE(excluded.time_slot, mess_menu.time_slot),
        special_item = excluded.special_item
    `);

    upsert.run(day_of_week, meal_type, menu_items, time_slot || null, special_item || null);

    const updated = db.prepare('SELECT * FROM mess_menu WHERE day_of_week = ? AND meal_type = ?').get(day_of_week, meal_type);

    res.json({
      message: 'Mess menu updated successfully.',
      item: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;