const express = require('express');
const router = express.Router();
const { auth, isStudent, isTeacher } = require('../middleware/auth');
const DayRating = require('../models/DayRating');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Student submits a rating for a completed day
router.post('/day', auth, isStudent, async (req, res) => {
  try {
    const { courseId, dayNumber, rating, comment } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Ensure day exists and is marked completed by teacher
    const section = course.sections && course.sections[dayNumber - 1];
    if (!section || !section.completed) {
      return res.status(400).json({ message: 'Day not marked completed by teacher' });
    }

    // Ensure student is enrolled and approved
    const enrollment = await Enrollment.findOne({
      student: req.user.userId,
      course: courseId,
      status: 'approved'
    });
    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Prevent multiple ratings per student per day
    const existing = await DayRating.findOne({ student: req.user.userId, course: courseId, dayNumber });
    if (existing) {
      return res.status(400).json({ message: 'You have already rated this day' });
    }

    const dr = new DayRating({
      student: req.user.userId,
      course: courseId,
      dayNumber,
      rating,
      comment: comment || ''
    });
    await dr.save();

    res.status(201).json(dr);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current student's rating for a specific day
router.get('/my', auth, isStudent, async (req, res) => {
  try {
    const { courseId, dayNumber } = req.query;
    const rating = await DayRating.findOne({ student: req.user.userId, course: courseId, dayNumber });
    res.json(rating || null);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Teacher can fetch aggregated ratings for a course/day
router.get('/course/:courseId/day/:dayNumber', auth, isTeacher, async (req, res) => {
  try {
    const { courseId, dayNumber } = req.params;
    const ratings = await DayRating.find({ course: courseId, dayNumber }).populate('student', 'name email');
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
