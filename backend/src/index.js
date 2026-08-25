import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import roomsRoutes from './routes/rooms.js';
import outpassesRoutes from './routes/outpasses.js';
import securityRoutes from './routes/security.js';
import complaintsRoutes from './routes/complaints.js';
import messRoutes from './routes/mess.js';
import noticesRoutes from './routes/notices.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite database schema
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for easy debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Hostel Management API',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/outpasses', outpassesRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/mess-menu', messRoutes);
app.use('/api/notices', noticesRoutes);

// 404 handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: `API route ${req.originalUrl} not found.` });
  }
  res.status(404).send('Not Found');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Hostel Management API running on http://localhost:${PORT}`);
});