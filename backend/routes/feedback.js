const express = require('express');
const router = express.Router();
const { auth, isStudent } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Enrollment = require('../models/Enrollment');

// Random feedback options
const randomFeedbacks = [
  'Excellent session! Very informative.',
  'Great content, well explained.',
  'Good pace, easy to follow.',
  'Could use more examples.',
  'Very engaging presentation.',
  'Clear and concise explanation.',
  'Helpful materials provided.',
  'Interactive and interesting.',
  'Well structured lesson.',
  'Enjoyed the session!'
];

// Submit feedback (student only)
router.post('/', auth, isStudent, async (req, res) => {
  try {

    const { courseId, dayNumber, feedback } = req.body;

    // Check if student is enrolled
    const enrollment = await Enrollment.findOne({
      student: req.user.userId,
      course: courseId,
      status: 'approved'
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    const feedbackData = new Feedback({
      student: req.user.userId,
      course: courseId,
      dayNumber: dayNumber || null, // null for overall course feedback
      feedback: feedback || randomFeedbacks[Math.floor(Math.random() * randomFeedbacks.length)]
    });

    await feedbackData.save();
    res.status(201).json(feedbackData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get feedback for a course (teacher)
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const feedbacks = await Feedback.find({ course: courseId })
      .populate('student', 'name email rollNumber')
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my feedback (student)
router.get('/my-feedback', auth, isStudent, async (req, res) => {
  try {
    const { courseId } = req.query;

    const query = { student: req.user.userId };
    if (courseId) query.course = courseId;

    const feedbacks = await Feedback.find(query)
      .populate('course', 'title courseCode')
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

