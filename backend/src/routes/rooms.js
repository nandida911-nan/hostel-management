import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all hostel blocks
router.get('/blocks', authenticateToken, (req, res) => {
  const blocks = db.prepare(`
    SELECT 
      hb.*,
      COUNT(DISTINCT r.id) as total_rooms,
      SUM(r.capacity) as total_beds,
      SUM(r.occupied_beds) as occupied_beds
    FROM hostel_blocks hb
    LEFT JOIN rooms r ON hb.id = r.block_id
    GROUP BY hb.id
    ORDER BY hb.name ASC
  `).all();
  res.json({ blocks });
});

// Create hostel block (Warden)
router.post('/blocks', authenticateToken, requireRole('warden'), (req, res) => {
  try {
    const { name, gender_type = 'coed', total_floors = 3, description = '' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Block name is required.' });
    }

    const insert = db.prepare(`
      INSERT INTO hostel_blocks (name, gender_type, total_floors, description)
      VALUES (?, ?, ?, ?)
    `);
    const info = insert.run(name, gender_type, total_floors, description);
    const block = db.prepare('SELECT * FROM hostel_blocks WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ message: 'Hostel block created.', block });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all rooms with filtering
router.get('/', authenticateToken, (req, res) => {
  try {
    const { block_id, floor, status, room_type } = req.query;
    let query = `
      SELECT 
        r.*,
        hb.name AS block_name,
        hb.gender_type AS block_gender
      FROM rooms r
      JOIN hostel_blocks hb ON r.block_id = hb.id
      WHERE 1=1
    `;
    const params = [];

    if (block_id) {
      query += ` AND r.block_id = ?`;
      params.push(block_id);
    }
    if (floor) {
      query += ` AND r.floor = ?`;
      params.push(floor);
    }
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    if (room_type) {
      query += ` AND r.room_type = ?`;
      params.push(room_type);
    }

    query += ` ORDER BY hb.name ASC, r.room_number ASC`;

    const rooms = db.prepare(query).all(...params);

    // Attach student occupants to each room
    const getOccupants = db.prepare(`
      SELECT id, name, email, roll_no, phone, department, year_of_study
      FROM users
      WHERE room_id = ?
    `);

    const enrichedRooms = rooms.map(room => {
      const occupants = getOccupants.all(room.id);
      return {
        ...room,
        occupants,
        available_beds: Math.max(0, room.capacity - room.occupied_beds)
      };
    });

    res.json({ rooms: enrichedRooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new room (Warden)
router.post('/', authenticateToken, requireRole('warden'), (req, res) => {
  try {
    const { block_id, room_number, floor = 1, capacity = 2, room_type = 'Non-AC', monthly_rent = 4500 } = req.body;
    if (!block_id || !room_number) {
      return res.status(400).json({ error: 'Block ID and Room Number are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO rooms (block_id, room_number, floor, capacity, occupied_beds, room_type, monthly_rent, status)
      VALUES (?, ?, ?, ?, 0, ?, ?, 'available')
    `);
    const info = insert.run(block_id, room_number, floor, capacity, room_type, monthly_rent);
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ message: 'Room created successfully.', room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Allocate student to room (Warden)
router.post('/allocate', authenticateToken, requireRole('warden'), (req, res) => {
  const allocateTx = db.transaction(() => {
    const { user_id, room_id, bed_number = 1 } = req.body;

    if (!user_id || !room_id) {
      throw new Error('User ID and Room ID are required.');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) throw new Error('Student not found.');

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (!room) throw new Error('Room not found.');

    if (room.occupied_beds >= room.capacity) {
      throw new Error('Room is already at maximum capacity.');
    }

    // If student was in another room, decrement previous room count
    if (user.room_id) {
      db.prepare(`
        UPDATE rooms 
        SET occupied_beds = MAX(0, occupied_beds - 1),
            status = 'available'
        WHERE id = ?
      `).run(user.room_id);

      db.prepare(`
        UPDATE room_allocations 
        SET status = 'vacated' 
        WHERE user_id = ? AND status = 'active'
      `).run(user.id);
    }

    // Allocate to new room
    db.prepare('UPDATE users SET room_id = ? WHERE id = ?').run(room_id, user_id);

    db.prepare(`
      INSERT INTO room_allocations (user_id, room_id, bed_number, status)
      VALUES (?, ?, ?, 'active')
    `).run(user_id, room_id, bed_number);

    const newOccupancy = room.occupied_beds + 1;
    const newStatus = newOccupancy >= room.capacity ? 'full' : 'available';

    db.prepare(`
      UPDATE rooms 
      SET occupied_beds = ?, status = ?
      WHERE id = ?
    `).run(newOccupancy, newStatus, room_id);

    return { success: true, message: 'Student successfully allocated to room.' };
  });

  try {
    const result = allocateTx();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Deallocate student from room (Warden)
router.post('/deallocate', authenticateToken, requireRole('warden'), (req, res) => {
  const deallocateTx = db.transaction(() => {
    const { user_id } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user || !user.room_id) throw new Error('Student has no active room allocation.');

    const oldRoomId = user.room_id;

    db.prepare('UPDATE users SET room_id = NULL WHERE id = ?').run(user_id);

    db.prepare(`
      UPDATE room_allocations 
      SET status = 'vacated' 
      WHERE user_id = ? AND status = 'active'
    `).run(user_id);

    db.prepare(`
      UPDATE rooms 
      SET occupied_beds = MAX(0, occupied_beds - 1),
          status = 'available'
      WHERE id = ?
    `).run(oldRoomId);

    return { success: true, message: 'Student room allocation removed.' };
  });

  try {
    const result = deallocateTx();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get occupancy stats overview
router.get('/occupancy-stats', authenticateToken, (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(r.id) AS total_rooms,
      COALESCE(SUM(r.capacity), 0) AS total_beds,
      COALESCE(SUM(r.occupied_beds), 0) AS occupied_beds,
      COALESCE(SUM(r.capacity) - SUM(r.occupied_beds), 0) AS available_beds
    FROM rooms r
  `).get();

  const totalStudents = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").get().count;
  const unallocatedStudents = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND room_id IS NULL").get().count;

  const occupancyRate = stats.total_beds > 0 
    ? Math.round((stats.occupied_beds / stats.total_beds) * 100) 
    : 0;

  res.json({
    ...stats,
    totalStudents,
    unallocatedStudents,
    occupancyRate
  });
});

export default router;