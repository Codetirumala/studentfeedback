const express = require('express');
const router = express.Router();
const { auth, isStudent, isTeacher } = require('../middleware/auth');
const Evaluation = require('../models/Evaluation');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Submit overall MCQ evaluation (student) - only after course completed
router.post('/', auth, isStudent, async (req, res) => {
  try {
    const { courseId, answers } = req.body; // answers should be object q1..q20

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check if all course sections/days are completed
    const courseSections = course.sections || [];
    const totalDays = courseSections.length;
    const completedDays = courseSections.filter(s => s.completed).length;
    const isCourseCompleted = totalDays > 0 && completedDays === totalDays;

    // Also check if course status is 'completed' (for backwards compatibility)
    if (!isCourseCompleted && course.status !== 'completed') {
      return res.status(400).json({ message: 'Course is not completed yet' });
    }

    // Ensure student enrolled (check both approved and any enrollment)
    let enrollment = await Enrollment.findOne({ student: req.user.userId, course: courseId, status: 'approved' });
    if (!enrollment) {
      enrollment = await Enrollment.findOne({ student: req.user.userId, course: courseId });
    }
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this course' });

    // Prevent duplicate submission
    const existing = await Evaluation.findOne({ student: req.user.userId, course: courseId });
    if (existing) return res.status(400).json({ message: 'Evaluation already submitted' });

    // Basic validation: expect answers to have keys q1..q20
    for (let i = 1; i <= 20; i++) {
      if (!("q" + i in answers)) {
        return res.status(400).json({ message: `Missing answer for q${i}` });
      }
    }

    const ev = new Evaluation({ student: req.user.userId, course: courseId, answers });
    await ev.save();
    res.status(201).json(ev);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student's own evaluation for a course
router.get('/my-evaluation', auth, isStudent, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ message: 'courseId is required' });

    const evaluation = await Evaluation.findOne({ 
      student: req.user.userId, 
      course: courseId 
    }).populate('course', 'title courseCode');
    
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' });
    }
    
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Teacher fetches all evaluations for a course
router.get('/course/:courseId', auth, isTeacher, async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    const evaluations = await Evaluation.find({ course: courseId }).populate('student', 'name email');
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
