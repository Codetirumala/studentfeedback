import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FiCheckCircle, FiXCircle, FiCalendar, FiAward } from 'react-icons/fi';
import './StudentAttendance.css';

const StudentAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await api.get('/attendance/my-attendance');
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatus = (percentage) => {
    if (percentage >= 90) return { status: 'Excellent', color: '#10b981' };
    if (percentage >= 75) return { status: 'Good', color: '#3b82f6' };
    if (percentage >= 60) return { status: 'Average', color: '#f59e0b' };
    return { status: 'Poor', color: '#ef4444' };
  };

  const calculateOverallAttendance = () => {
    if (attendance.length === 0) return 0;
    const totalPresent = attendance.reduce((sum, item) => sum + item.present, 0);
    const totalDays = attendance.reduce((sum, item) => sum + item.totalDays, 0);
    return totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
  };

  const overallAttendance = calculateOverallAttendance();
  const overallStatus = getAttendanceStatus(overallAttendance);

  return (
    <div className="student-attendance">
      <div className="page-header">
        <div>
          <h1>My Attendance</h1>
          <p>Track your attendance across all enrolled courses</p>
        </div>
      </div>

      {/* Overall Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <FiAward />
          </div>
          <div className="stat-content">
            <h3>{overallAttendance}%</h3>
            <p>Overall Attendance</p>
            <span className="stat-badge" style={{ background: `${overallStatus.color}20`, color: overallStatus.color }}>
              {overallStatus.status}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <h3>{attendance.reduce((sum, item) => sum + item.present, 0)}</h3>
            <p>Total Present</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
            <FiXCircle />
          </div>
          <div className="stat-content">
            <h3>{attendance.reduce((sum, item) => sum + item.absent, 0)}</h3>
            <p>Total Absent</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}>
            <FiCalendar />
          </div>
          <div className="stat-content">
            <h3>{attendance.reduce((sum, item) => sum + item.totalDays, 0)}</h3>
            <p>Total Days</p>
          </div>
        </div>
      </div>

      {/* Course-wise Attendance */}
      <div className="courses-section">
        <h2 className="section-title">Course-wise Attendance</h2>
        
        {attendance.length === 0 ? (
          <div className="empty-state">
            <FiCalendar className="empty-icon" />
            <h3>No Attendance Records</h3>
            <p>Your attendance records will appear here once marked by your teachers</p>
          </div>
        ) : (
          <div className="attendance-list">
            {attendance.map((item, index) => {
              const status = getAttendanceStatus(item.attendancePercentage);
              const isExpanded = selectedCourse === index;
              
              return (
                <div 
                  key={index} 
                  className={`attendance-card ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setSelectedCourse(isExpanded ? null : index)}
                >
                  <div className="card-header">
                    <div className="course-info">
                      <h3>{item.course.title}</h3>
                      <span className="course-code">{item.course.courseCode}</span>
                    </div>
                    <div className="attendance-percentage">
                      <span className="percentage-value" style={{ color: status.color }}>
                        {item.attendancePercentage}%
                      </span>
                      <span className="status-badge-small" style={{ background: `${status.color}20`, color: status.color }}>
                        {status.status}
                      </span>
                    </div>
                  </div>

                  <div className="card-stats">
                    <div className="stat-item">
                      <div className="stat-icon-small" style={{ background: '#10b98120', color: '#10b981' }}>
                        <FiCheckCircle />
                      </div>
                      <div className="stat-text">
                        <span className="stat-value">{item.present}</span>
                        <span className="stat-label">Present</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon-small" style={{ background: '#ef444420', color: '#ef4444' }}>
                        <FiXCircle />
                      </div>
                      <div className="stat-text">
                        <span className="stat-value">{item.absent}</span>
                        <span className="stat-label">Absent</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-icon-small" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                        <FiCalendar />
                      </div>
                      <div className="stat-text">
                        <span className="stat-value">{item.totalDays}</span>
                        <span className="stat-label">Total Days</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && item.records && (
                    <div className="attendance-details">
                      <h4>Attendance History</h4>
                      <div className="days-grid">
                        {item.records.map((record, idx) => (
                          <div 
                            key={idx} 
                            className={`day-badge ${record.status}`}
                            title={`Day ${record.dayNumber}: ${record.status}`}
                          >
                            <span className="day-number">D{record.dayNumber}</span>
                            <span className="day-status">
                              {record.status === 'present' ? <FiCheckCircle /> : <FiXCircle />}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill"
                      style={{ 
                        width: `${item.attendancePercentage}%`,
                        backgroundColor: status.color 
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;