const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const AttendanceDayImage = require('../models/AttendanceDayImage');
const Evaluation = require('../models/Evaluation');
const DayRating = require('../models/DayRating');
const Feedback = require('../models/Feedback');

// Hardcoded Admin Credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@vagtraining.com',
  password: 'Admin@123'
};

// Admin Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    return res.json({
      token,
      user: {
        email: ADMIN_CREDENTIALS.email,
        role: 'admin',
        name: 'Administrator'
      }
    });
  }

  return res.status(401).json({ message: 'Invalid admin credentials' });
});

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all users (students and teachers)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    const students = users.filter(u => u.role === 'student');
    const teachers = users.filter(u => u.role === 'teacher');

    res.json({
      totalUsers: users.length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      pendingTeachers: teachers.filter(t => !t.verifiedTeacher).length,
      students,
      teachers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve teacher
router.put('/approve-teacher/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }

    user.verifiedTeacher = true;
    await user.save();

    res.json({ message: 'Teacher approved successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Revoke teacher approval
router.put('/revoke-teacher/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }

    user.verifiedTeacher = false;
    await user.save();

    res.json({ message: 'Teacher approval revoked', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/user/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Comprehensive Dashboard Analytics
router.get('/dashboard-analytics', verifyAdmin, async (req, res) => {
  try {
    // Get all data
    const [users, courses, enrollments, evaluations, dayRatings] = await Promise.all([
      User.find().select('-password'),
      Course.find().populate('teacher', 'name email'),
      Enrollment.find().populate('student', 'name email branch section').populate('course', 'title courseCode'),
      Evaluation.find().populate('student', 'name').populate('course', 'title'),
      DayRating.find().populate('student', 'name').populate('course', 'title')
    ]);

    const students = users.filter(u => u.role === 'student');
    const teachers = users.filter(u => u.role === 'teacher');

    // Course Stats
    const activeCourses = courses.filter(c => c.status === 'active');
    const completedCourses = courses.filter(c => c.status === 'completed');
    const draftCourses = courses.filter(c => c.status === 'draft');

    // Enrollment Stats
    const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
    const pendingEnrollments = enrollments.filter(e => e.status === 'pending');
    
    // Progress & Completion
    const completedStudents = approvedEnrollments.filter(e => e.progress === 100);
    const avgProgress = approvedEnrollments.length > 0 
      ? Math.round(approvedEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / approvedEnrollments.length)
      : 0;

    // Attendance calculation
    const attendanceRecords = await Attendance.find();
    let totalPresent = 0;
    let totalAttendanceRecords = 0;
    attendanceRecords.forEach(record => {
      if (record.records) {
        record.records.forEach(r => {
          totalAttendanceRecords++;
          if (r.status === 'present') totalPresent++;
        });
      }
    });
    const avgAttendance = totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 0;

    // Day Ratings Analysis
    const avgDayRating = dayRatings.length > 0
      ? (dayRatings.reduce((sum, r) => sum + r.rating, 0) / dayRatings.length).toFixed(1)
      : 0;

    // Branch-wise student distribution
    const branchDistribution = {};
    students.forEach(s => {
      const branch = s.branch || 'Not Specified';
      branchDistribution[branch] = (branchDistribution[branch] || 0) + 1;
    });

    // Section-wise distribution
    const sectionDistribution = {};
    students.forEach(s => {
      const section = s.section || 'Not Specified';
      sectionDistribution[section] = (sectionDistribution[section] || 0) + 1;
    });

    // Department-wise teacher distribution
    const departmentDistribution = {};
    teachers.forEach(t => {
      const dept = t.department || 'Not Specified';
      departmentDistribution[dept] = (departmentDistribution[dept] || 0) + 1;
    });

    // Course-wise enrollment count
    const courseEnrollments = {};
    enrollments.forEach(e => {
      if (e.course) {
        const courseId = e.course._id.toString();
        if (!courseEnrollments[courseId]) {
          courseEnrollments[courseId] = {
            title: e.course.title,
            code: e.course.courseCode,
            count: 0,
            approved: 0,
            pending: 0
          };
        }
        courseEnrollments[courseId].count++;
        if (e.status === 'approved') courseEnrollments[courseId].approved++;
        if (e.status === 'pending') courseEnrollments[courseId].pending++;
      }
    });

    // Feedback Sentiment (based on day ratings)
    const positiveFeedback = dayRatings.filter(r => r.rating >= 4).length;
    const neutralFeedback = dayRatings.filter(r => r.rating === 3).length;
    const negativeFeedback = dayRatings.filter(r => r.rating <= 2).length;

    // Monthly registrations (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyRegistrations = {};
    users.filter(u => new Date(u.createdAt) >= sixMonthsAgo).forEach(u => {
      const month = new Date(u.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyRegistrations[month] = (monthlyRegistrations[month] || 0) + 1;
    });

    res.json({
      // Summary Stats
      summary: {
        totalUsers: users.length,
        totalStudents: students.length,
        totalTeachers: teachers.length,
        pendingTeachers: teachers.filter(t => !t.verifiedTeacher).length,
        approvedTeachers: teachers.filter(t => t.verifiedTeacher).length
      },
      
      // Course Stats
      courses: {
        total: courses.length,
        active: activeCourses.length,
        completed: completedCourses.length,
        draft: draftCourses.length,
        list: courses.map(c => ({
          _id: c._id,
          title: c.title,
          courseCode: c.courseCode,
          status: c.status,
          teacher: c.teacher?.name || 'Unassigned',
          totalDays: c.totalDays,
          startDate: c.startDate,
          enrolledCount: courseEnrollments[c._id.toString()]?.approved || 0
        }))
      },

      // Enrollment Stats
      enrollments: {
        total: enrollments.length,
        approved: approvedEnrollments.length,
        pending: pendingEnrollments.length,
        courseWise: Object.values(courseEnrollments)
      },

      // Performance Metrics
      performance: {
        avgProgress,
        avgAttendance,
        avgDayRating: parseFloat(avgDayRating),
        completionRate: approvedEnrollments.length > 0 
          ? Math.round((completedStudents.length / approvedEnrollments.length) * 100) 
          : 0,
        totalCompletions: completedStudents.length
      },

      // Feedback Analysis
      feedback: {
        totalRatings: dayRatings.length,
        totalEvaluations: evaluations.length,
        sentiment: {
          positive: positiveFeedback,
          neutral: neutralFeedback,
          negative: negativeFeedback
        }
      },

      // Distributions
      distributions: {
        branches: branchDistribution,
        sections: sectionDistribution,
        departments: departmentDistribution,
        monthlyRegistrations
      },

      // Raw data for tables
      students,
      teachers,
      recentEnrollments: enrollments.slice(0, 20)
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get courses for management
router.get('/courses', verifyAdmin, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('teacher', 'name email department')
      .sort({ createdAt: -1 });
    
    const enrollmentCounts = await Enrollment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    enrollmentCounts.forEach(e => {
      countMap[e._id.toString()] = e.count;
    });

    const coursesWithStats = courses.map(c => ({
      ...c.toObject(),
      enrolledCount: countMap[c._id.toString()] || 0
    }));

    res.json(coursesWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export data endpoint
router.get('/export/:type', verifyAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    let data;

    switch (type) {
      case 'students':
        data = await User.find({ role: 'student' }).select('-password');
        break;
      case 'teachers':
        data = await User.find({ role: 'teacher' }).select('-password');
        break;
      case 'courses':
        data = await Course.find().populate('teacher', 'name email');
        break;
      case 'enrollments':
        data = await Enrollment.find()
          .populate('student', 'name email branch')
          .populate('course', 'title courseCode');
        break;
      case 'evaluations':
        const evalQuery = {};
        if (req.query.courseId) {
          evalQuery.course = req.query.courseId;
        }
        const evaluations = await Evaluation.find(evalQuery)
          .populate('student', 'name email rollNumber branch section')
          .populate('course', 'title courseCode');
        
        // Transform evaluations to flat rows with only question columns in numerical order
        data = evaluations.map(ev => {
          const row = {};
          
          // Add questions in numerical order (Q1, Q2, Q3... Q20)
          for (let i = 1; i <= 20; i++) {
            const key = `q${i}`;
            row[`Q${i}`] = ev.answers?.[key] || '';
          }
          
          return row;
        });
        break;
      case 'attendance':
        // Pivot format: rows = students, columns = Day1..DayN
        const attQuery = {};
        if (req.query.courseId) {
          attQuery.course = req.query.courseId;
        }
        const attRecords = await Attendance.find(attQuery)
          .populate('student', 'name email rollNumber branch section')
          .populate('course', 'title courseCode');

        // Get courses involved to know totalDays
        const courseIds = [...new Set(attRecords.map(r => r.course?._id?.toString()).filter(Boolean))];
        const attCourses = await Course.find({ _id: { $in: courseIds } }).select('title courseCode totalDays');
        const courseMap = {};
        attCourses.forEach(c => { courseMap[c._id.toString()] = c; });

        // Get enrolled students per course
        const attEnrollments = await Enrollment.find(
          courseIds.length === 1 ? { course: courseIds[0] } : { course: { $in: courseIds } }
        ).populate('student', 'name email rollNumber branch section');

        // Build pivot per course
        const pivotRows = [];
        const groupedByCourse = {};
        
        // Group attendance records by course
        attRecords.forEach(r => {
          const cid = r.course?._id?.toString();
          if (!cid) return;
          if (!groupedByCourse[cid]) groupedByCourse[cid] = [];
          groupedByCourse[cid].push(r);
        });

        // Also include courses with enrolled students but no attendance yet
        attEnrollments.forEach(enr => {
          const cid = enr.course?.toString();
          if (cid && !groupedByCourse[cid]) groupedByCourse[cid] = [];
        });

        for (const cid of Object.keys(groupedByCourse)) {
          const course = courseMap[cid];
          if (!course) continue;
          const totalDays = course.totalDays || 1;
          const records = groupedByCourse[cid];

          // Build lookup: studentId -> { dayNumber -> status }
          const studentAttMap = {};
          records.forEach(r => {
            const sid = r.student?._id?.toString();
            if (!sid) return;
            if (!studentAttMap[sid]) {
              studentAttMap[sid] = {
                name: r.student.name,
                email: r.student.email,
                rollNumber: r.student.rollNumber || '',
                branch: r.student.branch || '',
                section: r.student.section || '',
                days: {}
              };
            }
            studentAttMap[sid].days[r.dayNumber] = r.status;
          });

          // Also add enrolled students who may have no attendance
          attEnrollments
            .filter(e => e.course?.toString() === cid && e.student)
            .forEach(e => {
              const sid = e.student._id.toString();
              if (!studentAttMap[sid]) {
                studentAttMap[sid] = {
                  name: e.student.name,
                  email: e.student.email,
                  rollNumber: e.student.rollNumber || '',
                  branch: e.student.branch || '',
                  section: e.student.section || '',
                  days: {}
                };
              }
            });

          // Build rows for this course
          for (const sid of Object.keys(studentAttMap)) {
            const s = studentAttMap[sid];
            const row = {
              course: course.title,
              courseCode: course.courseCode,
              studentName: s.name,
              email: s.email,
              rollNumber: s.rollNumber,
              branch: s.branch,
              section: s.section
            };
            for (let d = 1; d <= totalDays; d++) {
              row[`Day${d}`] = s.days[d] || 'Not Marked';
            }
            pivotRows.push(row);
          }
        }
        data = pivotRows;
        break;
      case 'feedback':
        data = await Feedback.find()
          .populate('student', 'name email rollNumber branch')
          .populate('course', 'title courseCode');
        break;
      case 'dayratings':
        // Pivot format: rows = students, columns = Day1_Rating, Day1_Comment...
        const drQuery = {};
        if (req.query.courseId) {
          drQuery.course = req.query.courseId;
        }
        const drRecords = await DayRating.find(drQuery)
          .populate('student', 'name email rollNumber branch section')
          .populate('course', 'title courseCode');

        const drCourseIds = [...new Set(drRecords.map(r => r.course?._id?.toString()).filter(Boolean))];
        const drCourses = await Course.find({ _id: { $in: drCourseIds } }).select('title courseCode totalDays');
        const drCourseMap = {};
        drCourses.forEach(c => { drCourseMap[c._id.toString()] = c; });

        // Group by course
        const drGrouped = {};
        drRecords.forEach(r => {
          const cid = r.course?._id?.toString();
          if (!cid) return;
          if (!drGrouped[cid]) drGrouped[cid] = [];
          drGrouped[cid].push(r);
        });

        const drPivotRows = [];
        for (const cid of Object.keys(drGrouped)) {
          const course = drCourseMap[cid];
          if (!course) continue;
          const totalDays = course.totalDays || 1;
          const records = drGrouped[cid];

          // Build lookup: studentId -> { dayNumber -> { rating, comment } }
          const studentMap = {};
          records.forEach(r => {
            const sid = r.student?._id?.toString();
            if (!sid) return;
            if (!studentMap[sid]) {
              studentMap[sid] = {
                name: r.student.name,
                email: r.student.email,
                rollNumber: r.student.rollNumber || '',
                branch: r.student.branch || '',
                days: {}
              };
            }
            studentMap[sid].days[r.dayNumber] = { rating: r.rating, comment: r.comment || '' };
          });

          for (const sid of Object.keys(studentMap)) {
            const s = studentMap[sid];
            const row = {
              course: course.title,
              courseCode: course.courseCode,
              studentName: s.name,
              email: s.email,
              rollNumber: s.rollNumber,
              branch: s.branch
            };
            for (let d = 1; d <= totalDays; d++) {
              row[`Day${d}_Rating`] = s.days[d] ? s.days[d].rating : 'Not Rated';
              row[`Day${d}_Comment`] = s.days[d] ? s.days[d].comment : '';
            }
            drPivotRows.push(row);
          }
        }
        data = drPivotRows;
        break;
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Get all courses with attendance report data (structured, with images)
router.get('/attendance-reports', verifyAdmin, async (req, res) => {
  try {
    const courses = await Course.find().populate('teacher', 'name email').sort({ createdAt: -1 });

    const result = [];

    for (const course of courses) {
      // Get enrollments
      const enrollments = await Enrollment.find({
        course: course._id,
        status: 'approved'
      }).populate('student', 'name email rollNumber branch section');

      // Get attendance
      const attendance = await Attendance.find({ course: course._id }).sort({ dayNumber: 1 });

      // Get day images
      const dayImages = await AttendanceDayImage.find({ course: course._id }).sort({ dayNumber: 1 });

      // Build day-wise data
      const daysData = [];
      for (let day = 1; day <= course.totalDays; day++) {
        const dayAtt = attendance.filter(a => a.dayNumber === day);
        const dayImg = dayImages.find(di => di.dayNumber === day);

        const students = enrollments.map(enrollment => {
          const att = dayAtt.find(a => a.student.toString() === enrollment.student._id.toString());
          return {
            name: enrollment.student.name,
            rollNumber: enrollment.student.rollNumber || '',
            branch: enrollment.student.branch || '',
            section: enrollment.student.section || '',
            status: att ? att.status : 'not-marked'
          };
        });

        daysData.push({
          dayNumber: day,
          sectionTitle: course.sections && course.sections[day - 1] ? course.sections[day - 1].title : `Day ${day}`,
          classImage: dayImg ? dayImg.classImage : '',
          attendanceSheetImage: dayImg ? dayImg.attendanceSheetImage : '',
          students,
          presentCount: students.filter(s => s.status === 'present').length,
          absentCount: students.filter(s => s.status === 'absent').length,
          totalStudents: students.length
        });
      }

      // Build student summary
      const studentSummary = enrollments.map(enrollment => {
        const stuAtt = attendance.filter(a => a.student.toString() === enrollment.student._id.toString());
        const presentDays = stuAtt.filter(a => a.status === 'present').length;
        const absentDays = stuAtt.filter(a => a.status === 'absent').length;
        return {
          name: enrollment.student.name,
          email: enrollment.student.email,
          rollNumber: enrollment.student.rollNumber || '',
          branch: enrollment.student.branch || '',
          section: enrollment.student.section || '',
          presentDays,
          absentDays,
          totalDays: course.totalDays,
          percentage: course.totalDays > 0 ? Math.round((presentDays / course.totalDays) * 100) : 0
        };
      });

      result.push({
        courseId: course._id,
        title: course.title,
        courseCode: course.courseCode || '',
        teacher: course.teacher ? course.teacher.name : 'Unknown',
        totalDays: course.totalDays,
        totalStudents: enrollments.length,
        daysData,
        studentSummary
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Get single course attendance report data (with images)
router.get('/attendance-reports/:courseId', verifyAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate('teacher', 'name email');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollments = await Enrollment.find({
      course: courseId,
      status: 'approved'
    }).populate('student', 'name email rollNumber branch section');

    const attendance = await Attendance.find({ course: courseId }).sort({ dayNumber: 1 });
    const dayImages = await AttendanceDayImage.find({ course: courseId }).sort({ dayNumber: 1 });

    const daysData = [];
    for (let day = 1; day <= course.totalDays; day++) {
      const dayAtt = attendance.filter(a => a.dayNumber === day);
      const dayImg = dayImages.find(di => di.dayNumber === day);

      const students = enrollments.map(enrollment => {
        const att = dayAtt.find(a => a.student.toString() === enrollment.student._id.toString());
        return {
          name: enrollment.student.name,
          email: enrollment.student.email,
          rollNumber: enrollment.student.rollNumber || '',
          branch: enrollment.student.branch || '',
          section: enrollment.student.section || '',
          status: att ? att.status : 'not-marked'
        };
      });

      daysData.push({
        dayNumber: day,
        sectionTitle: course.sections && course.sections[day - 1] ? course.sections[day - 1].title : `Day ${day}`,
        classImage: dayImg ? dayImg.classImage : '',
        attendanceSheetImage: dayImg ? dayImg.attendanceSheetImage : '',
        students,
        presentCount: students.filter(s => s.status === 'present').length,
        absentCount: students.filter(s => s.status === 'absent').length,
        totalStudents: students.length
      });
    }

    const studentSummary = enrollments.map(enrollment => {
      const stuAtt = attendance.filter(a => a.student.toString() === enrollment.student._id.toString());
      const presentDays = stuAtt.filter(a => a.status === 'present').length;
      const absentDays = stuAtt.filter(a => a.status === 'absent').length;
      return {
        name: enrollment.student.name,
        email: enrollment.student.email,
        rollNumber: enrollment.student.rollNumber || '',
        branch: enrollment.student.branch || '',
        section: enrollment.student.section || '',
        presentDays,
        absentDays,
        totalDays: course.totalDays,
        percentage: course.totalDays > 0 ? Math.round((presentDays / course.totalDays) * 100) : 0
      };
    });

    res.json({
      courseId: course._id,
      title: course.title,
      courseCode: course.courseCode || '',
      teacher: course.teacher ? course.teacher.name : 'Unknown',
      totalDays: course.totalDays,
      totalStudents: enrollments.length,
      daysData,
      studentSummary
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
