const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
};

connectDB();

// Import Routes
const authRoutes = require('../backend/routes/auth');
const userRoutes = require('../backend/routes/users');
const courseRoutes = require('../backend/routes/courses');
const enrollmentRoutes = require('../backend/routes/enrollments');
const feedbackRoutes = require('../backend/routes/feedback');
const evaluationRoutes = require('../backend/routes/evaluations');
const attendanceRoutes = require('../backend/routes/attendance');
const analyticsRoutes = require('../backend/routes/analytics');
const ratingsRoutes = require('../backend/routes/ratings');
const certificatesRoutes = require('../backend/routes/certificates');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/certificates', certificatesRoutes);

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'Student Feedback API is running' });
});

// Export for Vercel
module.exports = app;
