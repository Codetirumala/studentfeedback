const express = require('express');
const router = express.Router();
const { auth, isTeacher, isStudent } = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const Feedback = require('../models/Feedback');

// Get dashboard analytics (teacher)
router.get('/dashboard', auth, isTeacher, async (req, res) => {
  try {
    const teacherId = req.user.userId;

    // Get all courses
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map(c => c._id);

    // Get enrollments
    const enrollments = await Enrollment.find({ course: { $in: courseIds } });
    const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
    const pendingEnrollments = enrollments.filter(e => e.status === 'pending');

    // Get attendance data
    const attendanceRecords = await Attendance.find({ 
      course: { $in: courseIds } 
    });

    // Calculate metrics
    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => c.status === 'active').length;
    const totalStudents = new Set(approvedEnrollments.map(e => e.student.toString())).size;
    const pendingRequests = pendingEnrollments.length;

    // Calculate average attendance
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const totalAttendanceRecords = attendanceRecords.length;
    const avgAttendance = totalAttendanceRecords > 0 
      ? Math.round((presentCount / totalAttendanceRecords) * 100)
      : 0;

    // Calculate completion rate
    const completedCourses = courses.filter(c => c.status === 'completed').length;
    const completionRate = totalCourses > 0 
      ? Math.round((completedCourses / totalCourses) * 100)
      : 0;

    res.json({
      totalCourses,
      activeCourses,
      totalStudents,
      pendingRequests,
      avgAttendance,
      completionRate,
      courses: courses.map(c => ({
        ...c.toObject(),
        enrolledCount: approvedEnrollments.filter(e => e.course.toString() === c._id.toString()).length,
        pendingCount: pendingEnrollments.filter(e => e.course.toString() === c._id.toString()).length
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student dashboard analytics
router.get('/student-dashboard', auth, isStudent, async (req, res) => {
  try {
    const studentId = req.user.userId;

    const enrollments = await Enrollment.find({ student: studentId })
      .populate('course', 'title courseCode totalDays status');

    const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
    const pendingEnrollments = enrollments.filter(e => e.status === 'pending');

    const totalEnrolled = approvedEnrollments.length;
    const inProgress = approvedEnrollments.filter(e => 
      e.course && e.course.status === 'active' && e.progress < 100
    ).length;
    const completed = approvedEnrollments.filter(e => e.progress === 100).length;

    // Calculate overall attendance
    const courseIds = approvedEnrollments.map(e => e.course?._id).filter(Boolean);
    const attendanceRecords = await Attendance.find({ 
      student: studentId, 
      course: { $in: courseIds } 
    });

    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const totalDays = approvedEnrollments.reduce((sum, e) => sum + (e.course?.totalDays || 0), 0);
    const overallAttendance = totalDays > 0 
      ? Math.round((presentCount / totalDays) * 100)
      : 0;

    res.json({
      totalEnrolled,
      inProgress,
      completed,
      overallAttendance,
      pendingApprovals: pendingEnrollments.length,
      courses: approvedEnrollments
        .filter(e => e.course) // Filter out enrollments with null courses
        .map(e => ({
          course: e.course,
          progress: e.progress,
          daysCompleted: e.daysCompleted,
          enrollment: e
        }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Program effectiveness analytics
router.get('/effectiveness', auth, isTeacher, async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map(c => c._id);

    const enrollments = await Enrollment.find({ 
      course: { $in: courseIds }, 
      status: 'approved' 
    });

    const feedbacks = await Feedback.find({ course: { $in: courseIds } });

    const courseStats = courses.map(course => {
      const courseEnrollments = enrollments.filter(e => 
        e.course.toString() === course._id.toString()
      );
      const courseFeedbacks = feedbacks.filter(f => 
        f.course.toString() === course._id.toString()
      );

      const completedCount = courseEnrollments.filter(e => e.progress === 100).length;
      const completionRate = courseEnrollments.length > 0
        ? Math.round((completedCount / courseEnrollments.length) * 100)
        : 0;

      return {
        course,
        studentCount: courseEnrollments.length,
        completionRate,
        averageRating: 4.5, // Placeholder
        engagementScore: 85, // Placeholder
        feedbackCount: courseFeedbacks.length
      };
    });

    res.json(courseStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Program distribution analytics
router.get('/distribution', auth, isTeacher, async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map(c => c._id);

    const enrollments = await Enrollment.find({ 
      course: { $in: courseIds }, 
      status: 'approved' 
    });

    const distribution = courses.map(course => {
      const count = enrollments.filter(e => 
        e.course.toString() === course._id.toString()
      ).length;
      return {
        courseName: course.title,
        enrollmentCount: count
      };
    });

    res.json(distribution);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Attendance summary
router.get('/attendance-summary', auth, isTeacher, async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map(c => c._id);

    const attendanceRecords = await Attendance.find({ 
      course: { $in: courseIds } 
    });

    const courseAttendance = courses.map(course => {
      const records = attendanceRecords.filter(a => 
        a.course.toString() === course._id.toString()
      );
      const present = records.filter(a => a.status === 'present').length;
      const total = records.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        courseName: course.title,
        present,
        absent: total - present,
        total,
        percentage
      };
    });

    const overallPresent = attendanceRecords.filter(a => a.status === 'present').length;
    const overallTotal = attendanceRecords.length;
    const overallPercentage = overallTotal > 0 
      ? Math.round((overallPresent / overallTotal) * 100)
      : 0;

    res.json({
      overall: {
        present: overallPresent,
        absent: overallTotal - overallPresent,
        total: overallTotal,
        percentage: overallPercentage
      },
      byCourse: courseAttendance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

