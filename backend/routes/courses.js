const express = require('express');
const router = express.Router();
const { auth, isTeacher } = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');

// Get all courses (for students - available courses)
router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find({ 
      status: 'active',
      enrollmentEnabled: true 
    })
      .populate('teacher', 'name email profilePicture')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my courses (teacher's courses or student's enrolled courses)
router.get('/my-courses', auth, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const courses = await Course.find({ teacher: req.user.userId })
        .populate('teacher', 'name email')
        .sort({ createdAt: -1 });
      res.json(courses);
    } else {
      const enrollments = await Enrollment.find({ 
        student: req.user.userId, 
        status: 'approved' 
      }).populate({
        path: 'course',
        populate: { path: 'teacher', select: 'name email profilePicture' }
      });
      res.json(enrollments.map(e => e.course).filter(course => course !== null));
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single course
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name email profilePicture department designation');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create course (teacher only)
router.post('/', auth, isTeacher, async (req, res) => {
  try {
    const { title, description, totalDays, sections, startDate } = req.body;

    // Calculate dates for each day based on start date
    let processedSections = sections || [];
    const start = startDate ? new Date(startDate) : new Date();
    
    // Ensure we have sections for all days
    if (processedSections.length === 0) {
      // Create empty sections for each day
      processedSections = Array.from({ length: totalDays }, (_, index) => ({
        dayNumber: index + 1,
        date: new Date(start.getTime() + index * 24 * 60 * 60 * 1000),
        sections: []
      }));
    } else {
      // Process existing sections
      processedSections = processedSections.map((day, index) => {
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + index);
        
        // Ensure sections array exists and has proper structure
        const daySections = (day.sections || []).map(section => ({
          heading: section.heading || '',
          description: section.description || '',
          subSections: (section.subSections || []).map(sub => ({
            title: sub.title || '',
            description: sub.description || '',
            duration: sub.duration || ''
          }))
        }));

        return {
          dayNumber: day.dayNumber || (index + 1),
          date: dayDate,
          sections: daySections
        };
      });
    }

    const course = new Course({
      title: title.trim(),
      description: description || '',
      totalDays: parseInt(totalDays),
      sections: processedSections,
      startDate: start,
      teacher: req.user.userId,
      status: 'draft'
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Update course (teacher only)
router.put('/:id', auth, isTeacher, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, totalDays, sections, status, enrollmentEnabled, startDate } = req.body;

    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (totalDays) course.totalDays = totalDays;
    if (sections) {
      // Recalculate dates if start date changed
      let processedSections = sections;
      const baseStartDate = startDate ? new Date(startDate) : course.startDate || new Date();
      if (baseStartDate) {
        processedSections = sections.map((day, index) => {
          const dayDate = new Date(baseStartDate);
          dayDate.setDate(baseStartDate.getDate() + index);
          return {
            ...day,
            date: dayDate
          };
        });
      }
      course.sections = processedSections;
    }
    if (status) {
      course.status = status;
      // When publishing (setting to active), course becomes live immediately
      if (status === 'active' && course.status !== 'active') {
        if (!course.startDate) {
          course.startDate = new Date();
        }
      }
    }
    if (enrollmentEnabled !== undefined) course.enrollmentEnabled = enrollmentEnabled;
    if (startDate) {
      course.startDate = new Date(startDate);
      // Recalculate all day dates
      if (course.sections && course.sections.length > 0) {
        course.sections = course.sections.map((day, index) => {
          const dayDate = new Date(startDate);
          dayDate.setDate(dayDate.getDate() + index);
          return {
            ...day,
            date: dayDate
          };
        });
      }
    }

    // If marking as completed
    if (status === 'completed' && course.status !== 'completed') {
      course.completedAt = new Date();
    }

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete course (teacher only)
router.delete('/:id', auth, isTeacher, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get course with enrolled students (teacher only)
router.get('/:id/students', auth, isTeacher, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const enrollments = await Enrollment.find({ 
      course: req.params.id, 
      status: 'approved' 
    }).populate('student', 'name email rollNumber branch section profilePicture');

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle enrollment (teacher only)
router.put('/:id/toggle-enrollment', auth, isTeacher, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    course.enrollmentEnabled = !course.enrollmentEnabled;
    await course.save();

    res.json({ 
      message: course.enrollmentEnabled ? 'Enrollment enabled' : 'Enrollment disabled',
      enrollmentEnabled: course.enrollmentEnabled 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove student from course (teacher only)
router.delete('/:id/students/:enrollmentId', auth, isTeacher, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const enrollment = await Enrollment.findById(req.params.enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.course.toString() !== req.params.id) {
      return res.status(400).json({ message: 'Enrollment does not belong to this course' });
    }

    await Enrollment.findByIdAndDelete(req.params.enrollmentId);
    res.json({ message: 'Student removed from course successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark entire course as completed (teacher only) - only allowed when all days are marked completed
router.put('/:id/mark-completed', auth, isTeacher, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacher.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    // Ensure all sections exist and are completed
    const allCompleted = course.sections && course.sections.length > 0 && course.sections.every(s => s.completed === true);
    if (!allCompleted) return res.status(400).json({ message: 'Not all days are marked completed' });

    course.status = 'completed';
    course.completedAt = new Date();
    await course.save();

    res.json({ message: 'Course marked as completed', course });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

