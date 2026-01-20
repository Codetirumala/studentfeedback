const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
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
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  certificateNumber: {
    type: String,
    required: true,
    unique: true
  },
  studentName: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  // Completion Statistics
  completionStats: {
    totalDays: {
      type: Number,
      required: true
    },
    attendedDays: {
      type: Number,
      required: true
    },
    attendancePercentage: {
      type: Number,
      required: true
    },
    courseStartDate: {
      type: Date
    },
    courseEndDate: {
      type: Date
    }
  },
  // Issue Details
  issuedAt: {
    type: Date,
    default: Date.now
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: {
    type: Date
  },
  // Verification
  verificationCode: {
    type: String,
    required: true
  },
  isValid: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique certificate per student per course
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

// Generate verification code
certificateSchema.statics.generateVerificationCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate certificate number
certificateSchema.statics.generateCertificateNumber = function() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SF-${year}-${timestamp}-${random}`;
};

module.exports = mongoose.model('Certificate', certificateSchema);
