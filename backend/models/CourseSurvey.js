const mongoose = require('mongoose');

const courseSurveySchema = new mongoose.Schema({
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
  // Course Experience Ratings (1-5)
  overallSatisfaction: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  contentQuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  teachingEffectiveness: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  courseMaterialQuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  practicalApplication: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  difficultyLevel: {
    type: String,
    enum: ['too_easy', 'easy', 'appropriate', 'challenging', 'too_difficult'],
    required: true
  },
  // Detailed Feedback
  whatYouLearned: {
    type: String,
    required: true,
    minlength: 20
  },
  improvements: {
    type: String,
    required: true,
    minlength: 20
  },
  recommendToOthers: {
    type: Boolean,
    required: true
  },
  additionalComments: {
    type: String,
    default: ''
  },
  // Course Statistics at time of survey
  courseStats: {
    totalDays: Number,
    attendedDays: Number,
    attendancePercentage: Number,
    completionDate: Date
  },
  // Certificate Info
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateIssuedAt: {
    type: Date
  },
  certificateNumber: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one survey per student per course
courseSurveySchema.index({ student: 1, course: 1 }, { unique: true });

// Generate unique certificate number
courseSurveySchema.methods.generateCertificateNumber = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${timestamp}-${random}`;
};

// Static method to get course survey analytics
courseSurveySchema.statics.getCourseAnalytics = async function(courseId) {
  const analytics = await this.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: '$course',
        totalSurveys: { $sum: 1 },
        avgOverallSatisfaction: { $avg: '$overallSatisfaction' },
        avgContentQuality: { $avg: '$contentQuality' },
        avgTeachingEffectiveness: { $avg: '$teachingEffectiveness' },
        avgCourseMaterialQuality: { $avg: '$courseMaterialQuality' },
        avgPracticalApplication: { $avg: '$practicalApplication' },
        recommendCount: { $sum: { $cond: ['$recommendToOthers', 1, 0] } },
        certificatesIssued: { $sum: { $cond: ['$certificateIssued', 1, 0] } }
      }
    }
  ]);
  return analytics[0] || null;
};

// Static method to get teacher's all courses analytics
courseSurveySchema.statics.getTeacherAnalytics = async function(teacherId) {
  const analytics = await this.aggregate([
    { $match: { teacher: new mongoose.Types.ObjectId(teacherId) } },
    {
      $group: {
        _id: '$teacher',
        totalSurveys: { $sum: 1 },
        avgOverallSatisfaction: { $avg: '$overallSatisfaction' },
        avgContentQuality: { $avg: '$contentQuality' },
        avgTeachingEffectiveness: { $avg: '$teachingEffectiveness' },
        avgCourseMaterialQuality: { $avg: '$courseMaterialQuality' },
        avgPracticalApplication: { $avg: '$practicalApplication' },
        totalCertificatesIssued: { $sum: { $cond: ['$certificateIssued', 1, 0] } }
      }
    }
  ]);
  return analytics[0] || null;
};

module.exports = mongoose.model('CourseSurvey', courseSurveySchema);
