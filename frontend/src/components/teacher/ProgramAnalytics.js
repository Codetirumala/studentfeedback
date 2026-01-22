import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import './ProgramAnalytics.css';

const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'];

const ProgramAnalytics = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [effectivenessData, setEffectivenessData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'dashboard') {
        const [dashboard, attendance] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/attendance-summary')
        ]);
        setDashboardData(dashboard.data);
        setAttendanceData(attendance.data);
      } else if (activeTab === 'effectiveness') {
        const response = await api.get('/analytics/effectiveness');
        setEffectivenessData(response.data);
      } else if (activeTab === 'distribution') {
        const response = await api.get('/analytics/distribution');
        setDistributionData(response.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="program-analytics">
      <div className="page-header">
        <h1>Program Analytics</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          Dashboard
        </button>
        <button className={`tab ${activeTab === 'effectiveness' ? 'active' : ''}`} onClick={() => setActiveTab('effectiveness')}>
          Program Effectiveness
        </button>
        <button className={`tab ${activeTab === 'distribution' ? 'active' : ''}`} onClick={() => setActiveTab('distribution')}>
          Program Distribution
        </button>
        <button className={`tab ${activeTab === 'department' ? 'active' : ''}`} onClick={() => setActiveTab('department')}>
          Department Performance
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="analytics-content">
          <div className="section">
            <h2>Course Overview</h2>
            <div className="courses-list">
              {dashboardData?.courses?.map((course) => (
                <div key={course._id} className="course-item">
                  <h3>{course.title}</h3>
                  <div className="course-metrics">
                    <span>Students: {course.enrolledCount || 0}</span>
                    <span>Completion: 75%</span>
                    <span>Attendance: {dashboardData.avgAttendance}%</span>
                    <span className={`status-badge ${course.status}`}>{course.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h2>Attendance Summary</h2>
            <div className="attendance-stats">
              <div className="stat-card">
                <h3>Overall Attendance</h3>
                <p className="stat-value">{attendanceData?.overall?.percentage || 0}%</p>
                <p>Present: {attendanceData?.overall?.present || 0} | Absent: {attendanceData?.overall?.absent || 0}</p>
              </div>
            </div>
            {attendanceData?.byCourse && attendanceData.byCourse.length > 0 && (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceData.byCourse}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="courseName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="percentage" fill="#007bff" name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'effectiveness' && (
        <div className="analytics-content">
          <div className="section">
            <h2>Effectiveness Metrics</h2>
            <div className="metrics-grid">
              {effectivenessData.map((item, index) => (
                <div key={index} className="metric-card">
                  <h3>{item.course.title}</h3>
                  <div className="metric-values">
                    <div className="metric-item">
                      <span>Completion Rate</span>
                      <span className="value">{item.completionRate}%</span>
                    </div>
                    <div className="metric-item">
                      <span>Student Count</span>
                      <span className="value">{item.studentCount}</span>
                    </div>
                    <div className="metric-item">
                      <span>Engagement Score</span>
                      <span className="value">{item.engagementScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="analytics-content">
          <div className="section">
            <h2>Enrollment Distribution</h2>
            {distributionData.length > 0 && (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, enrollmentCount }) => `${name}: ${enrollmentCount}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="enrollmentCount"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'department' && (
        <div className="analytics-content">
          <div className="section">
            <h2>Department Performance</h2>
            <p>Department performance metrics and trends will be displayed here.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramAnalytics;

