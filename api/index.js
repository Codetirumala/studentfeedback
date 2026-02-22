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
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not set');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
};

// Import Routes with error handling
let authRoutes, userRoutes, courseRoutes, enrollmentRoutes, feedbackRoutes;
let evaluationRoutes, attendanceRoutes, analyticsRoutes, ratingsRoutes;
let certificatesRoutes, adminRoutes;

try {
  authRoutes = require('../backend/routes/auth');
  userRoutes = require('../backend/routes/users');
  courseRoutes = require('../backend/routes/courses');
  enrollmentRoutes = require('../backend/routes/enrollments');
  feedbackRoutes = require('../backend/routes/feedback');
  evaluationRoutes = require('../backend/routes/evaluations');
  attendanceRoutes = require('../backend/routes/attendance');
  analyticsRoutes = require('../backend/routes/analytics');
  ratingsRoutes = require('../backend/routes/ratings');
  certificatesRoutes = require('../backend/routes/certificates');
  adminRoutes = require('../backend/routes/admin');
} catch (err) {
  console.error('Error loading routes:', err.message);
}

// Connect to DB
connectDB();

// Use Routes
if (authRoutes) app.use('/api/auth', authRoutes);
if (userRoutes) app.use('/api/users', userRoutes);
if (courseRoutes) app.use('/api/courses', courseRoutes);
if (enrollmentRoutes) app.use('/api/enrollments', enrollmentRoutes);
if (feedbackRoutes) app.use('/api/feedback', feedbackRoutes);
if (evaluationRoutes) app.use('/api/evaluations', evaluationRoutes);
if (attendanceRoutes) app.use('/api/attendance', attendanceRoutes);
if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);
if (ratingsRoutes) app.use('/api/ratings', ratingsRoutes);
if (certificatesRoutes) app.use('/api/certificates', certificatesRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);

// Health check
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Student Feedback API is running',
    mongodb: mongoose.connections[0].readyState === 1 ? 'connected' : 'disconnected',
    env: {
      mongoUri: process.env.MONGODB_URI ? 'set' : 'missing',
      jwtSecret: process.env.JWT_SECRET ? 'set' : 'missing'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Export for Vercel
module.exports = app;
