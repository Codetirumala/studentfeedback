const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  daysCompleted: {
    type: Number,
    default: 0
  }
});

// Prevent duplicate enrollments
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);

