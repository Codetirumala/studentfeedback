import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { FiBook, FiUsers, FiAlertCircle, FiUserCheck, FiCheckCircle, FiBarChart2, FiPlus, FiClock, FiTrendingUp, FiActivity } from 'react-icons/fi';
import './TeacherDashboard.css';

const TeacherDashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [activeCoursesList, setActiveCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setStats(response.data);
      setCourses(response.data.courses || []);
      setActiveCoursesList(response.data.activeCoursesData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    {
      title: 'Total Courses',
      value: stats?.totalCourses || 0,
      icon: FiBook,
      color: '#3b82f6',
      bg: '#3b82f620',
      route: '/teacher/courses'
    },
    {
      title: 'Active Courses',
      value: stats?.activeCourses || 0,
      icon: FiBarChart2,
      color: '#10b981',
      bg: '#10b98120',
      route: '/teacher/courses?status=active'
    },
    {
      title: 'Students Enrolled',
      value: stats?.totalStudents || 0,
      icon: FiUsers,
      color: '#6366f1',
      bg: '#6366f120',
      route: '/teacher/enrollments'
    },
    {
      title: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      icon: FiClock,
      color: '#f59e0b',
      bg: '#f59e0b20',
      route: '/teacher/enrollments?status=pending'
    },
    {
      title: 'Avg Attendance',
      value: `${stats?.avgAttendance || 0}%`,
      icon: FiUserCheck,
      color: '#8b5cf6',
      bg: '#8b5cf620',
      route: '/teacher/attendance'
    },
    {
      title: 'Day Completion',
      value: `${stats?.completionRate || 0}%`,
      subtext: stats?.totalDays > 0 ? `${stats?.completedDays || 0}/${stats?.totalDays} days` : null,
      icon: FiTrendingUp,
      color: '#10b981',
      bg: '#10b98120',
      route: '/teacher/courses'
    }
  ];

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <p>Overview of your courses, students, and performance.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index} 
              className="stat-card-new clickable"
              onClick={() => navigate(card.route)}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-icon-wrapper" style={{ backgroundColor: card.bg }}>
                <Icon style={{ color: card.color }} />
              </div>
              <div className="stat-details">
                <h3>{card.value}</h3>
                <p>{card.title}</p>
                {card.subtext && <span className="stat-subtext">{card.subtext}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Courses List */}
      {activeCoursesList.length > 0 && (
        <div className="dashboard-card active-courses-section">
          <div className="card-header">
            <h2><FiActivity style={{ marginRight: '8px' }} /> Active Courses</h2>
            <span className="course-count">{activeCoursesList.length} courses</span>
          </div>
          <div className="active-courses-list">
            {activeCoursesList.map((course) => (
              <div 
                key={course._id} 
                className="active-course-item"
                onClick={() => navigate(`/teacher/courses/${course._id}`)}
              >
                <div className="active-course-info">
                  <h4>{course.title}</h4>
                  <span className="course-code-small">{course.courseCode}</span>
                </div>
                <div className="active-course-progress">
                  <div className="progress-info">
                    <span>{course.completedDays}/{course.totalDays} days</span>
                    <span>{course.totalDays > 0 ? Math.round((course.completedDays / course.totalDays) * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar-small">
                    <div 
                      className="progress-fill-small" 
                      style={{ width: `${course.totalDays > 0 ? (course.completedDays / course.totalDays) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="active-course-students">
                  <FiUsers /> {course.enrolledCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses Overview */}
      <div className="dashboard-card courses-full-width">
        <div className="card-header">
          <h2>My Courses Overview</h2>
          <button className="btn-create-small" onClick={() => navigate('/teacher/courses/create')}>
            <FiPlus /> Create Course
          </button>
        </div>
        
        {courses.length === 0 ? (
          <div className="empty-courses">
            <FiBook className="empty-icon" />
            <p>No courses yet</p>
            <button className="btn-primary-small" onClick={() => navigate('/teacher/courses/create')}>
              Create Your First Course
            </button>
          </div>
        ) : (
          <div className="courses-table">
            {courses.map((course) => (
              <div key={course._id} className="course-row" onClick={() => navigate(`/teacher/courses/${course._id}`)}>
                <div className="course-main">
                  <h4>{course.title}</h4>
                  <span className={`course-status ${course.status}`}>
                    {course.status}
                  </span>
                </div>
                <div className="course-metrics">
                  <div className="metric">
                    <span className="metric-label">Students</span>
                    <span className="metric-value">{course.enrolledCount || 0}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Pending</span>
                    <span className="metric-value">{course.pendingCount || 0}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Day Progress</span>
                    <span className="metric-value">
                      {course.dayCompletionRate || 0}%
                    </span>
                  </div>
                </div>
                <button 
                  className="btn-manage" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/teacher/courses/${course._id}`);
                  }}
                >
                  Manage
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboardHome;