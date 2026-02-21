const mongoose = require('mongoose');

const attendanceDayImageSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  dayNumber: {
    type: Number,
    required: true
  },
  classImage: {
    type: String,
    default: ''
  },
  attendanceSheetImage: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// One record per course per day
attendanceDayImageSchema.index({ course: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceDayImage', attendanceDayImageSchema);
