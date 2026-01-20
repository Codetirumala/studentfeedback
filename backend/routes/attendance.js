const express = require('express');
const router = express.Router();
const { auth, isTeacher, isStudent } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Mark attendance (teacher only)
router.post('/mark', auth, isTeacher, async (req, res) => {
  try {
    const { courseId, dayNumber, attendanceData } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (dayNumber < 1 || dayNumber > course.totalDays) {
      return res.status(400).json({ message: 'Invalid day number' });
    }

    // Get enrolled students
    const enrollments = await Enrollment.find({ 
      course: courseId, 
      status: 'approved' 
    });

    const attendanceRecords = [];

    for (const data of attendanceData) {
      const { studentId, status, notes } = data;

      // Check if enrollment exists
      const enrollment = enrollments.find(e => e.student.toString() === studentId);
      if (!enrollment) {
        continue;
      }

      // Update or create attendance
      const attendance = await Attendance.findOneAndUpdate(
        { student: studentId, course: courseId, dayNumber },
        {
          student: studentId,
          course: courseId,
          dayNumber,
          status,
          notes: notes || '',
          markedBy: req.user.userId
        },
        { upsert: true, new: true }
      );

      attendanceRecords.push(attendance);

      // Update enrollment progress
      const totalAttendance = await Attendance.countDocuments({
        student: studentId,
        course: courseId,
        status: 'present'
      });

      enrollment.daysCompleted = totalAttendance;
      enrollment.progress = Math.round((totalAttendance / course.totalDays) * 100);
      await enrollment.save();
    }

    res.json({ message: 'Attendance marked successfully', attendanceRecords });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance for a specific day
router.get('/course/:courseId/day/:dayNumber', auth, isTeacher, async (req, res) => {
  try {
    const { courseId, dayNumber } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const enrollments = await Enrollment.find({ 
      course: courseId, 
      status: 'approved' 
    }).populate('student', 'name email rollNumber branch section profilePicture');

    const attendance = await Attendance.find({ 
      course: courseId, 
      dayNumber: parseInt(dayNumber) 
    });

    const attendanceMap = {};
    attendance.forEach(a => {
      attendanceMap[a.student.toString()] = a;
    });

    const result = enrollments.map(enrollment => {
      const att = attendanceMap[enrollment.student._id.toString()];
      return {
        student: enrollment.student,
        enrollmentId: enrollment._id,
        attendance: att || null,
        status: att ? att.status : null
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance history (teacher)
router.get('/history', auth, isTeacher, async (req, res) => {
  try {
    const { courseId, startDate, endDate } = req.query;

    const query = { markedBy: req.user.userId };
    if (courseId) query.course = courseId;

    const attendance = await Attendance.find(query)
      .populate('student', 'name email rollNumber')
      .populate('course', 'title courseCode')
      .sort({ markedAt: -1 });

    // Group by course and day
    const grouped = {};
    attendance.forEach(a => {
      const key = `${a.course._id}-${a.dayNumber}`;
      if (!grouped[key]) {
        grouped[key] = {
          course: a.course,
          dayNumber: a.dayNumber,
          date: a.markedAt,
          records: []
        };
      }
      grouped[key].records.push(a);
    });

    const result = Object.values(grouped).map(group => ({
      ...group,
      presentCount: group.records.filter(r => r.status === 'present').length,
      absentCount: group.records.filter(r => r.status === 'absent').length,
      totalCount: group.records.length,
      attendancePercentage: group.records.length > 0 
        ? Math.round((group.records.filter(r => r.status === 'present').length / group.records.length) * 100)
        : 0
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Recalculate progress for all students in a course based on attendance for a given day
router.post('/course/:courseId/day/:dayNumber/complete', auth, isTeacher, async (req, res) => {
  try {
    const { courseId, dayNumber } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Ensure valid day
    const dayNum = parseInt(dayNumber, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > course.totalDays) {
      return res.status(400).json({ message: 'Invalid day number' });
    }

    // Get all approved enrollments for this course
    const enrollments = await Enrollment.find({
      course: courseId,
      status: 'approved'
    });

    // Mark the day as completed on the course sections
    const sectionIndex = dayNum - 1;
    if (course.sections && course.sections[sectionIndex]) {
      course.sections[sectionIndex].completed = true;
      course.sections[sectionIndex].completedAt = new Date();
      course.sections[sectionIndex].completedBy = req.user.userId;
      await course.save();
    }

    // For each enrollment, recalculate progress based on present attendance records
    for (const enrollment of enrollments) {
      const presentDays = await Attendance.distinct('dayNumber', {
        student: enrollment.student,
        course: courseId,
        status: 'present'
      });

      const daysCompleted = presentDays.length;
      enrollment.daysCompleted = daysCompleted;
      enrollment.progress = course.totalDays > 0
        ? Math.round((daysCompleted / course.totalDays) * 100)
        : 0;

      await enrollment.save();
    }

    res.json({ message: 'Day marked as complete and progress updated for all students' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unmark a day as completed (teacher only)
router.post('/course/:courseId/day/:dayNumber/uncomplete', auth, isTeacher, async (req, res) => {
  try {
    const { courseId, dayNumber } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const dayNum = parseInt(dayNumber, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > course.totalDays) {
      return res.status(400).json({ message: 'Invalid day number' });
    }

    const sectionIndex = dayNum - 1;
    if (course.sections && course.sections[sectionIndex]) {
      course.sections[sectionIndex].completed = false;
      course.sections[sectionIndex].completedAt = null;
      course.sections[sectionIndex].completedBy = null;
      await course.save();
    }

    res.json({ message: 'Day unmarked as complete' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student attendance (student view)
router.get('/my-attendance', auth, isStudent, async (req, res) => {
  try {
    const { courseId } = req.query;

    const query = { student: req.user.userId };
    if (courseId) query.course = courseId;

    const attendance = await Attendance.find(query)
      .populate('course', 'title courseCode totalDays')
      .sort({ dayNumber: 1 });

    // Calculate statistics
    const courseStats = {};
    attendance.forEach(a => {
      const courseId = a.course._id.toString();
      if (!courseStats[courseId]) {
        courseStats[courseId] = {
          course: a.course,
          totalDays: a.course.totalDays,
          present: 0,
          absent: 0,
          records: []
        };
      }
      courseStats[courseId].records.push(a);
      if (a.status === 'present') courseStats[courseId].present++;
      else courseStats[courseId].absent++;
    });

    const result = Object.values(courseStats).map(stat => ({
      ...stat,
      attendancePercentage: stat.totalDays > 0 
        ? Math.round((stat.present / stat.totalDays) * 100)
        : 0
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

