import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FiBook, FiUser } from 'react-icons/fi';
import './BrowseCourses.css';

const BrowseCourses = () => {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="browse-courses">
      <div className="page-header">
        <h1>Browse Courses</h1>
        <p>Discover and enroll in available courses.</p>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>No courses available at the moment.</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => {
            const enrolled = isEnrolled(course._id);
            const status = getEnrollmentStatus(course._id);

            return (
              <div key={course._id} className="course-card">
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
                </div>
                <div className="course-actions">
                  {enrolled ? (
                    <div className="enrollment-status">
                      <span className={`status-badge ${status}`}>
                        {status === 'pending' ? 'Pending Approval' : status === 'approved' ? 'Enrolled' : status}
                      </span>
                    </div>
                  ) : !course.enrollmentEnabled ? (
                    <div className="enrollment-status">
                      <span className="status-badge disabled">
                        Enrollment Closed
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
          })}
        </div>
      )}
    </div>
  );
};

export default BrowseCourses;

