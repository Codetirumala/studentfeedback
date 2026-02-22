import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FiBook, FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import './BrowseCourses.css';

const BrowseCourses = () => {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/enrollments/my-enrollments')
      ]);
      setCourses(coursesRes.data);
      setEnrollments(enrollmentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      await api.post('/enrollments', { courseId });
      alert('Enrollment request submitted! Waiting for teacher approval.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to enroll');
    }
  };

  const isEnrolled = (courseId) => {
    return enrollments.some(e => e.course && e.course._id === courseId);
  };

  const getEnrollmentStatus = (courseId) => {
    const enrollment = enrollments.find(e => e.course && e.course._id === courseId);
    return enrollment?.status;
  };

  // Separate courses into open and future enrollment
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
  
  const openCourses = courses.filter(course => {
    // Open courses: enrollmentEnabled is true AND current date is between startDate and endDate
    if (!course.enrollmentEnabled) return false;
    const startDate = course.startDate ? new Date(course.startDate) : null;
    const endDate = course.endDate ? new Date(course.endDate) : null;
    
    if (!startDate) return false; // Must have start date
    startDate.setHours(0, 0, 0, 0);
    
    if (endDate) {
      endDate.setHours(23, 59, 59, 999); // End of day
      return now >= startDate && now <= endDate;
    }
    
    return now >= startDate; // If no end date, show if started
  });

  const futureCourses = courses.filter(course => {
    // Future courses: enrollmentEnabled is true BUT startDate is in the future
    if (!course.enrollmentEnabled) return false;
    const startDate = course.startDate ? new Date(course.startDate) : null;
    if (!startDate) return false;
    startDate.setHours(0, 0, 0, 0);
    return startDate > now;
  });

  const displayCourses = activeTab === 'open' ? openCourses : futureCourses;

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeUntilStart = (dateString) => {
    if (!dateString) return '';
    const startDate = new Date(dateString);
    const diffTime = startDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Starts tomorrow';
    if (diffDays <= 7) return `Starts in ${diffDays} days`;
    if (diffDays <= 30) return `Starts in ${Math.ceil(diffDays / 7)} weeks`;
    return `Starts on ${formatDate(dateString)}`;
  };

  const renderCourseCard = (course) => {
    const enrolled = isEnrolled(course._id);
    const status = getEnrollmentStatus(course._id);
    const isFuture = activeTab === 'future';

    return (
      <div key={course._id} className={`course-card ${isFuture ? 'future-course' : ''}`}>
        {isFuture && (
          <div className="future-badge">
            <FiClock /> {getTimeUntilStart(course.startDate)}
          </div>
        )}
        <div className="course-header">
          <h3>{course.title}</h3>
          <span className="course-code">{course.courseCode}</span>
        </div>
        <div className="course-teacher">
          <FiUser /> {course.teacher?.name || 'Teacher'}
        </div>
        <p className="course-description">
          {course.description || 'No description available.'}
        </p>
        <div className="course-info">
          <span><FiBook /> {course.totalDays} Days</span>
          <span>{course.sections?.length || 0} Sections</span>
          <span><FiCalendar /> {formatDate(course.startDate)}</span>
        </div>
        {(course.startDate || course.endDate) && (
          <div className="course-dates">
            <span className="date-range">
              <FiCalendar /> {formatDate(course.startDate)} - {formatDate(course.endDate)}
            </span>
          </div>
        )}
        <div className="course-actions">
          {enrolled ? (
            <div className="enrollment-status">
              <span className={`status-badge ${status}`}>
                {status === 'pending' ? 'Pending Approval' : status === 'approved' ? 'Enrolled' : status}
              </span>
            </div>
          ) : isFuture ? (
            <div className="enrollment-status">
              <span className="status-badge upcoming">
                Opens on {formatDate(course.startDate)}
              </span>
            </div>
          ) : (
            <button
              className="btn-enroll"
              onClick={() => handleEnroll(course._id)}
            >
              Enroll Now
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="browse-courses">
      <div className="page-header">
        <h1>Browse Courses</h1>
        <p>Discover and enroll in available courses.</p>
      </div>

      <div className="courses-tabs">
        <button 
          className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`}
          onClick={() => setActiveTab('open')}
        >
          Open for Enrollment
          <span className="tab-count">{openCourses.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'future' ? 'active' : ''}`}
          onClick={() => setActiveTab('future')}
        >
          Future Courses
          <span className="tab-count">{futureCourses.length}</span>
        </button>
      </div>

      {displayCourses.length === 0 ? (
        <div className="empty-state">
          <p>{activeTab === 'open' 
            ? 'No courses currently open for enrollment.' 
            : 'No upcoming courses scheduled.'}</p>
        </div>
      ) : (
        <div className="courses-grid">
          {displayCourses.map(course => renderCourseCard(course))}
        </div>
      )}
    </div>
  );
};

export default BrowseCourses;

