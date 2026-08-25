import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';
import { generateOutPassToken } from './utils/qr.js';

async function seed() {
  console.log('🌱 Starting database seeding...');
  initDatabase();

  // Clear existing data for fresh seed
  db.exec(`
    DELETE FROM gate_logs;
    DELETE FROM outpasses;
    DELETE FROM complaints;
    DELETE FROM notices;
    DELETE FROM mess_menu;
    DELETE FROM room_allocations;
    DELETE FROM users;
    DELETE FROM rooms;
    DELETE FROM hostel_blocks;
  `);

  const passwordHash = await bcrypt.hash('password123', 10);
  const wardenPass = await bcrypt.hash('warden123', 10);
  const guardPass = await bcrypt.hash('guard123', 10);
  const studentPass = await bcrypt.hash('student123', 10);

  // 1. Create Hostel Blocks
  const insertBlock = db.prepare(`
    INSERT INTO hostel_blocks (name, gender_type, total_floors, description)
    VALUES (?, ?, ?, ?)
  `);

  const b1 = insertBlock.run('Aryabhatta Block A', 'boys', 3, 'Senior Engineering & Computing Wing');
  const b2 = insertBlock.run('Gargi Block B', 'girls', 3, 'Main Girls Hostel & Research Scholars');

  const blockAId = b1.lastInsertRowid;
  const blockBId = b2.lastInsertRowid;

  // 2. Create Rooms
  const insertRoom = db.prepare(`
    INSERT INTO rooms (block_id, room_number, floor, capacity, occupied_beds, room_type, monthly_rent, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rA101 = insertRoom.run(blockAId, '101', 1, 2, 0, 'Non-AC', 4500, 'available').lastInsertRowid;
  const rA102 = insertRoom.run(blockAId, '102', 1, 2, 0, 'Non-AC', 4500, 'available').lastInsertRowid;
  const rA204 = insertRoom.run(blockAId, '204', 2, 2, 2, 'AC', 6500, 'full').lastInsertRowid;
  const rA305 = insertRoom.run(blockAId, '305', 3, 3, 0, 'Non-AC', 4000, 'available').lastInsertRowid;

  const rB101 = insertRoom.run(blockBId, '101', 1, 2, 0, 'Non-AC', 4500, 'available').lastInsertRowid;
  const rB102 = insertRoom.run(blockBId, '102', 1, 2, 1, 'AC', 6500, 'available').lastInsertRowid;
  const rB201 = insertRoom.run(blockBId, '201', 2, 3, 0, 'Non-AC', 4000, 'available').lastInsertRowid;

  // 3. Create Users
  const insertUser = db.prepare(`
    INSERT INTO users (
      name, email, password_hash, role, roll_no, 
      phone, parent_phone, gender, department, year_of_study, room_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Warden
  const warden = insertUser.run(
    'Dr. S. Ramanujan (Chief Warden)',
    'warden@campus.edu',
    wardenPass,
    'warden',
    null,
    '+91 98765 43210',
    null,
    'male',
    'Administration',
    null,
    null
  );
  const wardenId = warden.lastInsertRowid;

  // Security Guard
  const guard = insertUser.run(
    'Officer Rajesh Kumar (Main Gate)',
    'security@campus.edu',
    guardPass,
    'guard',
    null,
    '+91 98765 11223',
    null,
    'male',
    'Security Wing',
    null,
    null
  );
  const guardId = guard.lastInsertRowid;

  // Student 1 (Demo Primary)
  const student1 = insertUser.run(
    'Nandida K',
    'student@campus.edu',
    studentPass,
    'student',
    '22CS101',
    '+91 91234 56780',
    '+91 98450 12345',
    'female',
    'Computer Science & Engineering',
    3,
    rA204
  );
  const student1Id = student1.lastInsertRowid;

  // Student 2 (Roommate in 204)
  const student2 = insertUser.run(
    'Aravind Sundar',
    'aravind@campus.edu',
    studentPass,
    'student',
    '22CS102',
    '+91 91234 56781',
    '+91 98450 67890',
    'male',
    'Computer Science & Engineering',
    3,
    rA204
  );
  const student2Id = student2.lastInsertRowid;

  // Student 3 (in Block B)
  const student3 = insertUser.run(
    'Priya Sharma',
    'priya@campus.edu',
    studentPass,
    'student',
    '22EC205',
    '+91 91234 56782',
    '+91 98450 99887',
    'female',
    'Electronics & Communication',
    2,
    rB102
  );
  const student3Id = student3.lastInsertRowid;

  // Unallocated Student
  const student4 = insertUser.run(
    'Rohan Verma',
    'rohan@campus.edu',
    studentPass,
    'student',
    '23ME310',
    '+91 91234 56783',
    '+91 98450 33445',
    'male',
    'Mechanical Engineering',
    2,
    null
  );

  // 4. Room Allocations Table
  const insertAlloc = db.prepare(`
    INSERT INTO room_allocations (user_id, room_id, bed_number, status)
    VALUES (?, ?, ?, 'active')
  `);
  insertAlloc.run(student1Id, rA204, 1);
  insertAlloc.run(student2Id, rA204, 2);
  insertAlloc.run(student3Id, rB102, 1);

  // 5. Outpasses
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const outTimeStr = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const inTimeStr = new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000).toISOString().slice(0, 16);

  // Approved Pass with generated signed QR Token for Student 1
  const pass1Data = {
    id: 1,
    pass_type: 'night_out',
    reason: 'Attending Inter-College Tech Symposium & Hackathon',
    destination: 'IIT Campus Tech Pavilion, City Center',
    out_date: outTimeStr,
    in_date: inTimeStr
  };
  const token1 = generateOutPassToken(pass1Data, {
    id: student1Id,
    name: 'Nandida K',
    roll_no: '22CS101',
    room_number: '204'
  });

  db.prepare(`
    INSERT INTO outpasses (id, user_id, pass_type, reason, destination, out_date, in_date, status, approved_by, qr_token)
    VALUES (1, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
  `).run(
    student1Id,
    pass1Data.pass_type,
    pass1Data.reason,
    pass1Data.destination,
    pass1Data.out_date,
    pass1Data.in_date,
    wardenId,
    token1
  );

  // Pending Pass for Student 2
  db.prepare(`
    INSERT INTO outpasses (user_id, pass_type, reason, destination, out_date, in_date, status)
    VALUES (?, 'weekend_leave', 'Family function at hometown', 'Trichy Town Residency', ?, ?, 'pending')
  `).run(student2Id, outTimeStr, inTimeStr);

  // 6. Complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (user_id, category, title, description, room_number, priority, status, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertComplaint.run(
    student1Id,
    'electrical',
    'Ceiling Fan Regulator Malfunction',
    'The speed regulator in room 204 is stuck at high speed and sparking slightly when rotated.',
    '204',
    'high',
    'in_progress',
    'Tech. Suresh (Electrician)'
  );

  insertComplaint.run(
    student3Id,
    'plumbing',
    'Washroom Tap Leakage in Floor 1',
    'Continuous water drip from the central washbasin tap.',
    'B-102',
    'medium',
    'open',
    null
  );

  insertComplaint.run(
    student2Id,
    'wifi',
    'Hostel Wi-Fi Signal Drop in Wing A2',
    'Frequent disconnection during late evening hours on the 2nd floor access point.',
    '204',
    'low',
    'resolved',
    'Campus IT Support'
  );

  // 7. Mess Menu (Full 7 Days)
  const insertMenu = db.prepare(`
    INSERT INTO mess_menu (day_of_week, meal_type, time_slot, menu_items, special_item)
    VALUES (?, ?, ?, ?, ?)
  `);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const menuTemplates = {
    Monday: {
      breakfast: { time: '07:30 - 09:00 AM', items: 'Idli, Medu Vada, Sambar, Coconut Chutney, Tea/Coffee', special: 'Filter Coffee' },
      lunch: { time: '12:30 - 02:00 PM', items: 'Steamed Rice, South Indian Dal Tadka, Poriyal, Curd, Appalam, Pickle', special: 'Gulab Jamun' },
      snacks: { time: '05:00 - 06:00 PM', items: 'Veg Cutlet, Green Chutney, Masala Chai', special: 'Hot Chai' },
      dinner: { time: '07:30 - 09:00 PM', items: 'Phulka Roti, Paneer Butter Masala, Jeera Rice, Dal Fry, Fresh Salad', special: 'Paneer Butter Masala' }
    },
    Tuesday: {
      breakfast: { time: '07:30 - 09:00 AM', items: 'Poha with Roasted Peanuts, Sev, Mint Chutney, Boiled Eggs / Bananas, Tea/Coffee', special: 'Fresh Fruit' },
      lunch: { time: '12:30 - 02:00 PM', items: 'Jeera Rice, Rajma Masala, Aloo Gobi, Roti, Curd, Mixed Salad', special: 'Rajma Chawal' },
      snacks: { time: '05:00 - 06:00 PM', items: 'Onion Pakoda, Tomato Ketchup, Ginger Tea', special: 'Hot Pakoda' },
      dinner: { time: '07:30 - 09:00 PM', items: 'Chapati, Mixed Veg Kurma, Lemon Rice, Rasam, Curd', special: 'Lemon Rice' }
    },
    Wednesday: {
      breakfast: { time: '07:30 - 09:00 AM', items: 'Poori with Aloo Masala Bhaji, Suji Halwa, Tea/Coffee', special: 'Suji Halwa' },
      lunch: { time: '12:30 - 02:00 PM', items: 'Rice, Sambar, Cabbage Kootu, Tomato Rasam, Buttermilk, Fryums', special: 'Tomato Rasam' },
      snacks: { time: '05:00 - 06:00 PM', items: 'Sweet Corn Chaat, Biscuits, Cardamom Tea', special: 'Sweet Corn' },
      dinner: { time: '07:30 - 09:00 PM', items: 'Veg Biryani / Egg Biryani, Mirchi Ka Salan, Onion Raita, Ice Cream Cup', special: 'Special Biryani Feast' }
    },
    Thursday: {
      breakfast: { time: '07:30 - 09:00 AM', items: 'Masala Dosa, Tomato Chutney, Sambar, Boiled Sprouts, Tea/Coffee', special: 'Masala Dosa' },
      lunch: { time: '12:30 - 02:00 PM', items: 'Steamed Rice, Chole Masala, Bhature / Roti, Boondi Raita, Roasted Papad', special: 'Chole Bhature' },
      snacks: { time: '05:00 - 06:00 PM', items: 'Samosa with Tamarind Chutney, Lemon Tea', special: 'Crispy Samosa' },
      dinner: { time: '07:30 - 09:00 PM', items: 'Tawa Paratha, Kadai Veg, Yellow Moong Dal, Steamed Rice, Payasam', special: 'Payasam Dessert' }
    },
    Friday: {
      breakfast: { time: '07:30 - 09:00 AM', items: 'Upma with Coconut Chutney, Bread Butter Jam, Boiled Eggs / Fruits, Tea/Coffee', special: 'Bread & Butter' },
      lunch: { time: '12:30 - 02:00 PM', items: 'Rice, Drumstick Sambar, Bhindi Fry, Mor Kuzhambu, Curd, Papad', special: 'Bhindi Fry' },
      snacks: { time: '05:00 - 06:00 PM', items: 'Pani Puri / Bhel Puri Counter, Filter Coffee', special: 'Campus Chaat Counter' },
      dinner: { time: '07:30 - 09:00 PM', items: 'Phulkas, Egg Curry / Malai Kofta, Fried Rice, Manchurian Gravy', special: 'Indo-Chinese Night' }
    },
    Saturday: {
      breakfast: { time: '08:00 - 09:30 AM', items: 'Aloo Paratha with Fresh Butter & Curd, Green Mint Chutney, Tea/Coffee', special: 'Aloo Paratha' },
      lunch: { time: '12:30 - 02:00 PM', items: 'Bisibelebath with Kara Boondi, Curd Rice with Pomegranate, Potato Chips', special: 'Bisibelebath' },
      snacks: { time: '05:00 - 06:00 PM', items: 'Banana Cake / Bun Butter Jam, Hot Chocolate / Chai', special: 'Evening Bakery Treat' },
      dinner: { time: '07:30 - 09:00 PM', items: 'Naan, Paneer Tikka Masala, Ghee Rice, Dal Makhani, Fruit Custard', special: 'Fruit Custard' }
    },
    Sunday: {
      breakfast: { time: '08:00 - 10:00 AM', items: 'Uttapam with Tomato & Onion toppings, Coconut Chutney, Sambar, Coffee/Tea', special: 'Weekend Special Breakfast' },
      lunch: { time: '12:30 - 02:30 PM', items: 'Special Sunday Thali: Chicken Curry / Shahi Paneer, Pulao, Parotta, Raita, Rasgulla', special: 'Grand Weekend Feast' },
      snacks: { time: '05:00 - 06:00 PM', items: 'Pav Bhaji, Filter Coffee', special: 'Hot Pav Bhaji' },
      dinner: { time: '07:30 - 09:00 PM', items: 'Light Khichdi, Kadhi, Phulkas, Aloo Jeera, Warm Milk', special: 'Light Comfort Dinner' }
    }
  };

  for (const day of days) {
    const d = menuTemplates[day];
    insertMenu.run(day, 'breakfast', d.breakfast.time, d.breakfast.items, d.breakfast.special);
    insertMenu.run(day, 'lunch', d.lunch.time, d.lunch.items, d.lunch.special);
    insertMenu.run(day, 'snacks', d.snacks.time, d.snacks.items, d.snacks.special);
    insertMenu.run(day, 'dinner', d.dinner.time, d.dinner.items, d.dinner.special);
  }

  // 8. Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, content, category, priority, posted_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertNotice.run(
    'Night Curfew Timing Reminder (Effective Immediately)',
    'All resident students are requested to be back in their designated hostel blocks by 09:30 PM. Out-pass approvals for weekday late stays must be submitted at least 4 hours in advance via the portal.',
    'curfew',
    'urgent',
    wardenId
  );

  insertNotice.run(
    'Weekend Maintenance & Solar Water Heater Servicing',
    'Routine maintenance of hot water lines in Block A and B will be carried out this Saturday between 10:00 AM to 02:00 PM. Water supply will remain uninterrupted via auxiliary tanks.',
    'maintenance',
    'normal',
    wardenId
  );

  insertNotice.run(
    'Hostel Cultural & Sports League 2026 Registrations Open',
    'Inter-block Table Tennis, Badminton, and Chess tournaments will begin next week. Interested residents can register their teams with student coordinators.',
    'general',
    'normal',
    wardenId
  );

  console.log('🎉 Database seeding completed successfully!');
  console.log('Demo Accounts:');
  console.log(' - Warden:   warden@campus.edu   / warden123');
  console.log(' - Security: security@campus.edu / guard123');
  console.log(' - Student:  student@campus.edu  / student123 (Roll: 22CS101)');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});