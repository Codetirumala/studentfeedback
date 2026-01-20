const express = require('express');
const router = express.Router();
const { auth, isTeacher, isStudent } = require('../middleware/auth');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Enroll in course (student only) - Requires teacher approval
router.post('/', auth, isStudent, async (req, res) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.status !== 'active') {
      return res.status(400).json({ message: 'Course is not available for enrollment' });
    }

    if (!course.enrollmentEnabled) {
      return res.status(400).json({ message: 'Enrollment is currently disabled for this course' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.userId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled or enrollment pending' });
    }

    // Create enrollment with pending status - requires teacher approval
    const enrollment = new Enrollment({
      student: req.user.userId,
      course: courseId,
      status: 'pending'
    });

    await enrollment.save();
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending enrollments (teacher only)
router.get('/pending', auth, isTeacher, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ status: 'pending' })
      .populate('student', 'name email rollNumber branch section profilePicture')
      .populate({
        path: 'course',
        match: { teacher: req.user.userId }
      })
      .sort({ enrolledAt: -1 });

    // Filter out enrollments for courses not owned by teacher
    const filteredEnrollments = enrollments.filter(e => e.course !== null);
    res.json(filteredEnrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get approved enrollments (teacher only)
router.get('/approved', auth, isTeacher, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ status: 'approved' })
      .populate('student', 'name email rollNumber branch section profilePicture')
      .populate({
        path: 'course',
        match: { teacher: req.user.userId }
      })
      .sort({ approvedAt: -1 });

    const filteredEnrollments = enrollments.filter(e => e.course !== null);
    res.json(filteredEnrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve enrollment (teacher only)
router.put('/:id/approve', auth, isTeacher, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    enrollment.status = 'approved';
    enrollment.approvedAt = new Date();
    await enrollment.save();

    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject enrollment (teacher only)
router.put('/:id/reject', auth, isTeacher, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    enrollment.status = 'rejected';
    await enrollment.save();

    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk approve/reject
router.post('/bulk-action', auth, isTeacher, async (req, res) => {
  try {
    const { enrollmentIds, action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const enrollments = await Enrollment.find({ _id: { $in: enrollmentIds } })
      .populate('course');

    // Filter to only teacher's courses
    const validEnrollments = enrollments.filter(e => 
      e.course && e.course.teacher.toString() === req.user.userId
    );

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected'
    };

    if (action === 'approve') {
      updateData.approvedAt = new Date();
    }

    await Enrollment.updateMany(
      { _id: { $in: validEnrollments.map(e => e._id) } },
      { $set: updateData }
    );

    res.json({ message: `${action} completed`, count: validEnrollments.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student enrollments (student only)
router.get('/my-enrollments', auth, isStudent, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.userId })
      .populate({
        path: 'course',
        populate: { path: 'teacher', select: 'name email profilePicture' }
      })
      .sort({ enrolledAt: -1 });

    // Filter out enrollments with null courses (deleted courses)
    const filteredEnrollments = enrollments.filter(e => e.course !== null);
    res.json(filteredEnrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

