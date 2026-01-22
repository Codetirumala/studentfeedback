const mongoose = require('mongoose');

const subSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: false,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: '' // e.g., "30 minutes"
  }
});

const sectionSchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sections: [{
    heading: {
      type: String,
      required: false,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    subSections: {
      type: [subSectionSchema],
      default: []
    }
  }]
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  courseCode: {
    type: String,
    unique: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalDays: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  sections: [sectionSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft'
  },
  enrollmentEnabled: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Auto-generate course code
courseSchema.pre('save', async function(next) {
  if (!this.courseCode) {
    // Find the highest existing course code
    const lastCourse = await mongoose.model('Course')
      .findOne({ courseCode: { $regex: /^CRS\d+$/ } })
      .sort({ courseCode: -1 })
      .select('courseCode');
    
    let nextNumber = 1;
    if (lastCourse && lastCourse.courseCode) {
      const currentNumber = parseInt(lastCourse.courseCode.replace('CRS', ''), 10);
      nextNumber = currentNumber + 1;
    }
    
    this.courseCode = `CRS${String(nextNumber).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);

