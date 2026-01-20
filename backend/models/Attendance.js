const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  dayNumber: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate attendance for same day
attendanceSchema.index({ student: 1, course: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

