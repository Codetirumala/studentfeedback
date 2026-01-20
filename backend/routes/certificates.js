const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const CourseSurvey = require('../models/CourseSurvey');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const DayRating = require('../models/DayRating');
const Evaluation = require('../models/Evaluation');

// Check certificate eligibility for a course
router.get('/eligibility/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    // Support both 'userId' and 'id' from token
    const studentId = req.user.userId || req.user.id;

    // Get course details
    const course = await Course.findById(courseId).populate('teacher', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check enrollment - accept both 'approved' status or any enrollment with progress
    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'approved'
    });

    // If not found with 'approved', check for any enrollment (some systems may not use status)
    if (!enrollment) {
      enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId
      });
    }

    if (!enrollment) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Get course sections and check if completed (use 'sections' not 'schedule')
    const courseSections = course.sections || [];
    const totalScheduledDays = courseSections.length;
    const completedDays = courseSections.filter(s => s.completed).length;
    const isCourseCompleted = totalScheduledDays > 0 && completedDays === totalScheduledDays;

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      course: courseId,
      student: studentId
    });

    const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
    const attendancePercentage = completedDays > 0 
      ? Math.round((presentDays / completedDays) * 100) 
      : 0;

    // Check if attendance meets minimum requirement (50%)
    const meetsAttendanceRequirement = attendancePercentage >= 50;

    // Check for pending reviews (day ratings only, not evaluation)
    const pendingReviews = await checkPendingReviews(studentId, courseId, courseSections);

    // Check if survey already submitted
    const existingSurvey = await CourseSurvey.findOne({
      student: studentId,
      course: courseId
    });

    // Check if overall course evaluation submitted (also counts as survey)
    const existingEvaluation = await Evaluation.findOne({
      student: studentId,
      course: courseId
    });

    // Either survey OR evaluation is sufficient
    const surveyOrEvalCompleted = !!existingSurvey || !!existingEvaluation;

    // Check if certificate already issued
    const existingCertificate = await Certificate.findOne({
      student: studentId,
      course: courseId
    });

    const eligibility = {
      courseId,
      courseName: course.title || course.name,
      teacherName: course.teacher?.name || 'Unknown',
      isCourseCompleted,
      totalDays: totalScheduledDays,
      completedDays,
      attendedDays: presentDays,
      attendancePercentage,
      meetsAttendanceRequirement,
      pendingReviews,
      hasPendingReviews: pendingReviews.length > 0,
      surveySubmitted: surveyOrEvalCompleted,
      evaluationSubmitted: !!existingEvaluation,
      certificateIssued: !!existingCertificate,
      certificateNumber: existingCertificate?.certificateNumber || null,
      canDownloadCertificate: isCourseCompleted && 
                              meetsAttendanceRequirement && 
                              pendingReviews.length === 0 && 
                              surveyOrEvalCompleted
    };

    res.json(eligibility);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to check pending reviews (only day-wise ratings)
async function checkPendingReviews(studentId, courseId, schedule) {
  const pendingReviews = [];
  
  // Check day-wise ratings (using DayRating model)
  const completedDays = schedule.filter(s => s.completed);
  
  for (const day of completedDays) {
    // Check DayRating instead of Feedback
    const dayRating = await DayRating.findOne({
      student: studentId,
      course: courseId,
      dayNumber: day.dayNumber
    });
    
    if (!dayRating) {
      // Get topic from sections if available
      const topic = day.sections && day.sections[0] ? day.sections[0].heading : `Day ${day.dayNumber}`;
      pendingReviews.push({
        type: 'day_feedback',
        date: day.date,
        dayNumber: day.dayNumber,
        topic: topic,
        message: `Please submit feedback for ${topic} (${new Date(day.date).toLocaleDateString()})`
      });
    }
  }

  // Note: Overall course evaluation is now checked separately in eligibility
  // It's not included in pending reviews since it's tracked via surveySubmitted flag

  return pendingReviews;
}

// Submit course completion survey
router.post('/survey/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.userId || req.user.id;
    const {
      overallSatisfaction,
      contentQuality,
      teachingEffectiveness,
      courseMaterialQuality,
      practicalApplication,
      difficultyLevel,
      whatYouLearned,
      improvements,
      recommendToOthers,
      additionalComments
    } = req.body;

    // Validate required fields
    if (!overallSatisfaction || !contentQuality || !teachingEffectiveness ||
        !courseMaterialQuality || !practicalApplication || !difficultyLevel ||
        !whatYouLearned || !improvements || recommendToOthers === undefined) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    // Check if survey already exists
    const existingSurvey = await CourseSurvey.findOne({
      student: studentId,
      course: courseId
    });

    if (existingSurvey) {
      return res.status(400).json({ message: 'Survey already submitted for this course' });
    }

    // Get course and teacher info
    const course = await Course.findById(courseId).populate('teacher', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get attendance stats (use 'sections' not 'schedule')
    const courseSections = course.sections || [];
    const totalDays = courseSections.filter(s => s.completed).length;
    const attendanceRecords = await Attendance.find({
      course: courseId,
      student: studentId,
      status: 'present'
    });
    const attendedDays = attendanceRecords.length;
    const attendancePercentage = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;

    // Create survey
    const survey = new CourseSurvey({
      student: studentId,
      course: courseId,
      teacher: course.teacher._id,
      overallSatisfaction,
      contentQuality,
      teachingEffectiveness,
      courseMaterialQuality,
      practicalApplication,
      difficultyLevel,
      whatYouLearned,
      improvements,
      recommendToOthers,
      additionalComments: additionalComments || '',
      courseStats: {
        totalDays,
        attendedDays,
        attendancePercentage,
        completionDate: new Date()
      }
    });

    await survey.save();

    res.status(201).json({
      message: 'Survey submitted successfully',
      survey
    });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate and download certificate
router.post('/generate/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.userId || req.user.id;

    // Re-verify eligibility
    const course = await Course.findById(courseId).populate('teacher', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check enrollment - accept any enrollment
    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'approved'
    });

    if (!enrollment) {
      enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId
      });
    }

    if (!enrollment) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Check if course is completed (use 'sections' not 'schedule')
    const courseSections = course.sections || [];
    const totalDays = courseSections.length;
    const completedDays = courseSections.filter(s => s.completed).length;
    
    if (completedDays < totalDays) {
      return res.status(400).json({ message: 'Course is not yet completed' });
    }

    // Check attendance
    const attendanceRecords = await Attendance.find({
      course: courseId,
      student: studentId,
      status: 'present'
    });
    const attendancePercentage = completedDays > 0 
      ? Math.round((attendanceRecords.length / completedDays) * 100) 
      : 0;

    if (attendancePercentage < 50) {
      return res.status(400).json({ 
        message: 'Attendance requirement not met. Minimum 50% attendance required.' 
      });
    }

    // Check pending reviews
    const pendingReviews = await checkPendingReviews(studentId, courseId, courseSections);
    if (pendingReviews.length > 0) {
      return res.status(400).json({ 
        message: 'Please complete all pending reviews before downloading certificate',
        pendingReviews 
      });
    }

    // Check if survey OR evaluation submitted (either one is valid)
    const survey = await CourseSurvey.findOne({
      student: studentId,
      course: courseId
    });

    const evaluation = await Evaluation.findOne({
      student: studentId,
      course: courseId
    });

    if (!survey && !evaluation) {
      return res.status(400).json({ 
        message: 'Please complete the course evaluation first' 
      });
    }

    // Check if certificate already exists
    let certificate = await Certificate.findOne({
      student: studentId,
      course: courseId
    });

    const User = require('../models/User');
    const student = await User.findById(studentId);

    if (!certificate) {
      // Generate new certificate
      certificate = new Certificate({
        student: studentId,
        course: courseId,
        teacher: course.teacher._id,
        certificateNumber: Certificate.generateCertificateNumber(),
        studentName: student.name,
        courseName: course.title || course.name,
        teacherName: course.teacher.name,
        completionStats: {
          totalDays: completedDays,
          attendedDays: attendanceRecords.length,
          attendancePercentage,
          courseStartDate: courseSections[0]?.date,
          courseEndDate: courseSections[courseSections.length - 1]?.date
        },
        verificationCode: Certificate.generateVerificationCode()
      });

      await certificate.save();

      // Update survey with certificate info if exists
      if (survey) {
        survey.certificateIssued = true;
        survey.certificateIssuedAt = new Date();
        survey.certificateNumber = certificate.certificateNumber;
        await survey.save();
      }
    }

    // Update download count
    certificate.downloadCount += 1;
    certificate.lastDownloadedAt = new Date();
    await certificate.save();

    res.json({
      message: 'Certificate generated successfully',
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        teacherName: certificate.teacherName,
        completionStats: certificate.completionStats,
        issuedAt: certificate.issuedAt,
        verificationCode: certificate.verificationCode
      }
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify certificate
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const certificate = await Certificate.findOne({ certificateNumber })
      .populate('student', 'name email')
      .populate('course', 'name')
      .populate('teacher', 'name');

    if (!certificate) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Certificate not found' 
      });
    }

    res.json({
      valid: certificate.isValid,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        teacherName: certificate.teacherName,
        issuedAt: certificate.issuedAt,
        verificationCode: certificate.verificationCode,
        completionStats: certificate.completionStats
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all certificates for a student
router.get('/my-certificates', auth, async (req, res) => {
  try {
    const studentId = req.user.userId || req.user.id;
    const certificates = await Certificate.find({ student: studentId })
      .populate('course', 'name')
      .populate('teacher', 'name')
      .sort({ issuedAt: -1 });

    res.json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course survey analytics (for teachers)
router.get('/survey-analytics/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify teacher owns this course
    const teacherId = req.user.userId || req.user.id;
    if (course.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const analytics = await CourseSurvey.getCourseAnalytics(courseId);
    
    // Get all surveys for detailed view
    const surveys = await CourseSurvey.find({ course: courseId })
      .populate('student', 'name')
      .select('-__v')
      .sort({ createdAt: -1 });

    // Get difficulty distribution
    const difficultyDistribution = await CourseSurvey.aggregate([
      { $match: { course: course._id } },
      { $group: { _id: '$difficultyLevel', count: { $sum: 1 } } }
    ]);

    res.json({
      analytics,
      surveys,
      difficultyDistribution
    });
  } catch (error) {
    console.error('Error fetching survey analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all survey analytics for teacher
router.get('/teacher-analytics', auth, async (req, res) => {
  try {
    const teacherId = req.user.userId || req.user.id;
    const analytics = await CourseSurvey.getTeacherAnalytics(teacherId);
    
    // Get course-wise breakdown
    const courseBreakdown = await CourseSurvey.aggregate([
      { $match: { teacher: req.user._id } },
      {
        $group: {
          _id: '$course',
          surveyCount: { $sum: 1 },
          avgSatisfaction: { $avg: '$overallSatisfaction' },
          recommendCount: { $sum: { $cond: ['$recommendToOthers', 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $project: {
          courseName: '$courseInfo.name',
          surveyCount: 1,
          avgSatisfaction: 1,
          recommendCount: 1,
          recommendPercentage: {
            $multiply: [{ $divide: ['$recommendCount', '$surveyCount'] }, 100]
          }
        }
      }
    ]);

    res.json({
      analytics,
      courseBreakdown
    });
  } catch (error) {
    console.error('Error fetching teacher analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
