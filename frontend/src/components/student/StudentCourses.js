import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { FiBook, FiCalendar, FiUser, FiArrowRight } from 'react-icons/fi';
import './StudentCourses.css';

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, enrollmentsRes, analyticsRes] = await Promise.all([
        api.get('/courses/my-courses'),
        api.get('/enrollments/my-enrollments'),
        api.get('/analytics/student-dashboard')
      ]);
      
      // Merge enrollment data with courses
      const coursesWithProgress = coursesRes.data.map(course => {
        const enrollment = enrollmentsRes.data.find(e => e.course?._id === course._id);
        const analyticsData = analyticsRes.data.courses?.find(c => c.course?._id === course._id);
        return {
          ...course,
          enrollment,
          progress: analyticsData?.progress || enrollment?.progress || 0,
          daysCompleted: analyticsData?.daysCompleted || enrollment?.daysCompleted || 0
        };
      });
      
      setCourses(coursesWithProgress);
      setEnrollments(enrollmentsRes.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#10b981';
    if (progress >= 50) return '#3b82f6';
    if (progress >= 25) return '#f59e0b';
    return '#6b7280';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="student-courses">
      <div className="page-header">
        <div>
          <h1>My Courses</h1>
          <p>Track your learning progress</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <FiBook className="empty-icon" />
          <h3>No courses enrolled</h3>
          <p>Start your learning journey by browsing available courses</p>
          <button className="btn-primary" onClick={() => navigate('/student/browse')}>
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="courses-list">
          {courses.map((course) => {
            const progressColor = getProgressColor(course.progress);
            
            return (
              <div 
                key={course._id} 
                className="course-card-simple"
                onClick={() => navigate(`/student/courses/${course._id}`)}
              >
                <div className="course-main">
                  <div className="course-icon">
                    <FiBook />
                  </div>
                  
                  <div className="course-info">
                    <h3 className="course-title">{course.title}</h3>
                    <span className="course-code">{course.courseCode}</span>
                    
                    <div className="course-meta">
                      {course.teacher && (
                        <div className="teacher-info-simple">
                          {course.teacher.profilePicture ? (
                            <img 
                              src={course.teacher.profilePicture} 
                              alt={course.teacher.name}
                              className="teacher-avatar-small"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="teacher-avatar-placeholder"
                            style={{ display: course.teacher.profilePicture ? 'none' : 'flex' }}
                          >
                            <FiUser />
                          </div>
                          <span className="teacher-name">{course.teacher.name}</span>
                        </div>
                      )}
                      
                      <div className="course-duration">
                        <FiCalendar />
                        <span>{course.totalDays} days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="course-progress">
                  <div className="progress-info">
                    <span className="progress-label">Progress</span>
                    <span className="progress-percent" style={{ color: progressColor }}>
                      {course.progress}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${course.progress}%`,
                        backgroundColor: progressColor 
                      }}
                    />
                  </div>
                  <span className="progress-days">
                    {course.daysCompleted} of {course.totalDays} days completed
                  </span>
                </div>

                <button className="view-btn">
                  <FiArrowRight />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentCourses;