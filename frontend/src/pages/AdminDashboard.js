import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const REFRESH_INTERVAL = 10000; // Realtime refresh every 10 seconds

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRealtime, setIsRealtime] = useState(true);
  const intervalRef = useRef(null);
  
  // Analytics Data
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    branch: '',
    section: '',
    department: '',
    status: '',
    search: ''
  });

  // Fetch data function with useCallback for stable reference
  const fetchAllData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      
      const [analyticsRes, coursesRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard-analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/courses`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setAnalytics(analyticsRes.data);
      setCourses(coursesRes.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        handleLogout();
      }
    }
    if (showLoader) setLoading(false);
  }, []);

  // Initial load when logged in
  useEffect(() => {
    if (adminToken) {
      setIsLoggedIn(true);
      fetchAllData(true);
    }
  }, [adminToken, fetchAllData]);

  // Realtime data polling
  useEffect(() => {
    if (isLoggedIn && isRealtime) {
      // Set up interval for realtime updates
      intervalRef.current = setInterval(() => {
        fetchAllData(false); // Silent refresh without loader
      }, REFRESH_INTERVAL);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isLoggedIn, isRealtime, fetchAllData]);

  // Toggle realtime updates
  const toggleRealtime = () => {
    setIsRealtime(prev => !prev);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const res = await axios.post(`${API_URL}/admin/login`, loginData);
      localStorage.setItem('adminToken', res.data.token);
      setAdminToken(res.data.token);
      setIsLoggedIn(true);
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken('');
    setIsLoggedIn(false);
    setAnalytics(null);
  };

  const handleApproveTeacher = async (userId) => {
    try {
      await axios.put(`${API_URL}/admin/approve-teacher/${userId}`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fetchAllData();
    } catch (error) {
      alert('Failed to approve teacher');
    }
  };

  const handleRevokeTeacher = async (userId) => {
    if (!window.confirm('Are you sure you want to revoke this teacher?')) return;
    try {
      await axios.put(`${API_URL}/admin/revoke-teacher/${userId}`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fetchAllData();
    } catch (error) {
      alert('Failed to revoke teacher');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API_URL}/admin/user/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      fetchAllData();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const exportData = async (type) => {
    try {
      const res = await axios.get(`${API_URL}/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const data = res.data;
      if (data.length === 0) {
        alert('No data to export');
        return;
      }
      
      const headers = Object.keys(data[0]).filter(k => k !== '_id' && k !== '__v');
      const csvRows = [headers.join(',')];
      
      data.forEach(item => {
        const values = headers.map(h => {
          let val = item[h];
          if (typeof val === 'object') val = JSON.stringify(val);
          if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
          return val || '';
        });
        csvRows.push(values.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      alert('Export failed');
    }
  };

  // Filter functions
  const getFilteredStudents = () => {
    if (!analytics?.students) return [];
    return analytics.students.filter(s => {
      if (filters.branch && s.branch !== filters.branch) return false;
      if (filters.section && s.section !== filters.section) return false;
      if (filters.search && !s.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !s.email.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  };

  const getFilteredTeachers = () => {
    if (!analytics?.teachers) return [];
    return analytics.teachers.filter(t => {
      if (filters.department && t.department !== filters.department) return false;
      if (filters.status === 'approved' && !t.verifiedTeacher) return false;
      if (filters.status === 'pending' && t.verifiedTeacher) return false;
      if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !t.email.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  };

  const getFilteredCourses = () => {
    return courses.filter(c => {
      if (filters.status && c.status !== filters.status) return false;
      if (filters.search && !c.title.toLowerCase().includes(filters.search.toLowerCase()) && 
          !c.courseCode?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  };

  // Get unique values for filters
  const getBranches = () => [...new Set(analytics?.students?.map(s => s.branch).filter(Boolean))];
  const getSections = () => [...new Set(analytics?.students?.map(s => s.section).filter(Boolean))];
  const getDepartments = () => [...new Set(analytics?.teachers?.map(t => t.department).filter(Boolean))];

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-icon">🛡️</div>
            <h1>Admin Portal</h1>
            <p>VAG Training Management System</p>
          </div>
          
          <form onSubmit={handleLogin} className="admin-login-form">
            {loginError && <div className="admin-error">{loginError}</div>}
            
            <div className="admin-input-group">
              <label>Email Address</label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="admin@vagtraining.com"
                required
              />
            </div>
            
            <div className="admin-input-group">
              <label>Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            
            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>
          
          <p className="back-link" onClick={() => navigate('/login')}>
            ← Back to User Login
          </p>
        </div>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-icon">🛡️</span>
          <h2>Admin Panel</h2>
        </div>
        
        <nav className="admin-nav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">📊</span> Overview
          </button>
          <button 
            className={activeTab === 'courses' ? 'active' : ''} 
            onClick={() => setActiveTab('courses')}
          >
            <span className="nav-icon">📚</span> Courses
          </button>
          <button 
            className={activeTab === 'enrollments' ? 'active' : ''} 
            onClick={() => setActiveTab('enrollments')}
          >
            <span className="nav-icon">📝</span> Enrollments
          </button>
          <button 
            className={activeTab === 'teachers' ? 'active' : ''} 
            onClick={() => setActiveTab('teachers')}
          >
            <span className="nav-icon">👨‍🏫</span> Teachers
          </button>
          <button 
            className={activeTab === 'students' ? 'active' : ''} 
            onClick={() => setActiveTab('students')}
          >
            <span className="nav-icon">🎓</span> Students
          </button>
          <button 
            className={activeTab === 'feedback' ? 'active' : ''} 
            onClick={() => setActiveTab('feedback')}
          >
            <span className="nav-icon">💬</span> Feedback
          </button>
          <button 
            className={activeTab === 'reports' ? 'active' : ''} 
            onClick={() => setActiveTab('reports')}
          >
            <span className="nav-icon">📁</span> Reports
          </button>
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            {lastUpdated && (
              <span className="last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="header-actions">
            <button 
              className={`realtime-toggle ${isRealtime ? 'active' : ''}`} 
              onClick={toggleRealtime}
              title={isRealtime ? 'Realtime updates ON' : 'Realtime updates OFF'}
            >
              <span className={`realtime-dot ${isRealtime ? 'pulse' : ''}`}></span>
              {isRealtime ? 'LIVE' : 'PAUSED'}
            </button>
            <button className="refresh-btn" onClick={() => fetchAllData(true)}>
              🔄 Refresh
            </button>
          </div>
        </header>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="overview-content">
            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card primary">
                <div className="card-icon">👥</div>
                <div className="card-content">
                  <h3>Total Users</h3>
                  <p className="big-number">{analytics.summary.totalUsers}</p>
                </div>
              </div>
              
              <div className="summary-card success">
                <div className="card-icon">🎓</div>
                <div className="card-content">
                  <h3>Students</h3>
                  <p className="big-number">{analytics.summary.totalStudents}</p>
                </div>
              </div>
              
              <div className="summary-card info">
                <div className="card-icon">👨‍🏫</div>
                <div className="card-content">
                  <h3>Teachers</h3>
                  <p className="big-number">{analytics.summary.totalTeachers}</p>
                  <span className="sub-stat">{analytics.summary.pendingTeachers} pending</span>
                </div>
              </div>
              
              <div className="summary-card warning">
                <div className="card-icon">📚</div>
                <div className="card-content">
                  <h3>Courses</h3>
                  <p className="big-number">{analytics.courses.total}</p>
                  <span className="sub-stat">{analytics.courses.active} active</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="metrics-section">
              <h2>📈 Performance Metrics</h2>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-ring" style={{'--progress': analytics.performance.avgProgress}}>
                    <span>{analytics.performance.avgProgress}%</span>
                  </div>
                  <h4>Avg Progress</h4>
                </div>
                
                <div className="metric-card">
                  <div className="metric-ring" style={{'--progress': analytics.performance.avgAttendance}}>
                    <span>{analytics.performance.avgAttendance}%</span>
                  </div>
                  <h4>Avg Attendance</h4>
                </div>
                
                <div className="metric-card">
                  <div className="metric-ring" style={{'--progress': analytics.performance.completionRate}}>
                    <span>{analytics.performance.completionRate}%</span>
                  </div>
                  <h4>Completion Rate</h4>
                </div>
                
                <div className="metric-card">
                  <div className="rating-display">
                    <span className="star">⭐</span>
                    <span className="rating-value">{analytics.performance.avgDayRating}</span>
                  </div>
                  <h4>Avg Rating</h4>
                </div>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="quick-stats-row">
              <div className="quick-stat">
                <span className="qs-icon">✅</span>
                <div>
                  <h4>{analytics.enrollments.approved}</h4>
                  <p>Approved Enrollments</p>
                </div>
              </div>
              <div className="quick-stat">
                <span className="qs-icon">⏳</span>
                <div>
                  <h4>{analytics.enrollments.pending}</h4>
                  <p>Pending Enrollments</p>
                </div>
              </div>
              <div className="quick-stat">
                <span className="qs-icon">🏆</span>
                <div>
                  <h4>{analytics.performance.totalCompletions}</h4>
                  <p>Course Completions</p>
                </div>
              </div>
              <div className="quick-stat">
                <span className="qs-icon">💬</span>
                <div>
                  <h4>{analytics.feedback.totalRatings}</h4>
                  <p>Feedback Submitted</p>
                </div>
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="distribution-section">
              <div className="dist-card">
                <h3>🎓 Branch Distribution</h3>
                <div className="dist-bars">
                  {Object.entries(analytics.distributions.branches).map(([branch, count]) => (
                    <div key={branch} className="dist-item">
                      <span className="dist-label">{branch}</span>
                      <div className="dist-bar-container">
                        <div 
                          className="dist-bar" 
                          style={{width: `${(count / analytics.summary.totalStudents) * 100}%`}}
                        ></div>
                      </div>
                      <span className="dist-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dist-card">
                <h3>💬 Feedback Sentiment</h3>
                <div className="sentiment-chart">
                  <div className="sentiment-item positive">
                    <span className="sentiment-icon">😊</span>
                    <div className="sentiment-info">
                      <span>Positive</span>
                      <strong>{analytics.feedback.sentiment.positive}</strong>
                    </div>
                  </div>
                  <div className="sentiment-item neutral">
                    <span className="sentiment-icon">😐</span>
                    <div className="sentiment-info">
                      <span>Neutral</span>
                      <strong>{analytics.feedback.sentiment.neutral}</strong>
                    </div>
                  </div>
                  <div className="sentiment-item negative">
                    <span className="sentiment-icon">😔</span>
                    <div className="sentiment-info">
                      <span>Negative</span>
                      <strong>{analytics.feedback.sentiment.negative}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Approvals Alert */}
            {analytics.summary.pendingTeachers > 0 && (
              <div className="pending-alert">
                <span>⚠️</span>
                <p>You have <strong>{analytics.summary.pendingTeachers}</strong> teacher(s) waiting for approval</p>
                <button onClick={() => setActiveTab('teachers')}>Review Now →</button>
              </div>
            )}
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="courses-content">
            <div className="content-header">
              <div className="filter-bar">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="search-input"
                />
                <select 
                  value={filters.status} 
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Course Stats */}
            <div className="course-stats-row">
              <div className="cs-card">
                <span className="cs-value">{analytics?.courses.active}</span>
                <span className="cs-label">Active</span>
              </div>
              <div className="cs-card">
                <span className="cs-value">{analytics?.courses.completed}</span>
                <span className="cs-label">Completed</span>
              </div>
              <div className="cs-card">
                <span className="cs-value">{analytics?.courses.draft}</span>
                <span className="cs-label">Draft</span>
              </div>
              <div className="cs-card">
                <span className="cs-value">{analytics?.enrollments.total}</span>
                <span className="cs-label">Total Enrollments</span>
              </div>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Code</th>
                    <th>Teacher</th>
                    <th>Status</th>
                    <th>Days</th>
                    <th>Enrolled</th>
                    <th>Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredCourses().map(course => (
                    <tr key={course._id}>
                      <td className="course-title">{course.title}</td>
                      <td><code>{course.courseCode}</code></td>
                      <td>{course.teacher?.name || 'Unassigned'}</td>
                      <td>
                        <span className={`status-badge status-${course.status}`}>
                          {course.status}
                        </span>
                      </td>
                      <td>{course.totalDays}</td>
                      <td>{course.enrolledCount}</td>
                      <td>{course.startDate ? new Date(course.startDate).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Enrollments Tab */}
        {activeTab === 'enrollments' && (
          <div className="enrollments-content">
            <div className="enrollment-stats">
              {analytics?.enrollments.courseWise.slice(0, 10).map((item, idx) => (
                <div key={idx} className="enrollment-course-card">
                  <h4>{item.title}</h4>
                  <p className="course-code">{item.code}</p>
                  <div className="enrollment-numbers">
                    <span className="en-approved">✅ {item.approved}</span>
                    <span className="en-pending">⏳ {item.pending}</span>
                  </div>
                </div>
              ))}
            </div>

            <h3>Recent Enrollments</h3>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Branch</th>
                    <th>Course</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.recentEnrollments.map(e => (
                    <tr key={e._id}>
                      <td>{e.student?.name}</td>
                      <td>{e.student?.email}</td>
                      <td>{e.student?.branch || '-'}</td>
                      <td>{e.course?.title}</td>
                      <td>
                        <span className={`status-badge status-${e.status}`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="teachers-content">
            <div className="content-header">
              <div className="filter-bar">
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="search-input"
                />
                <select 
                  value={filters.department} 
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                >
                  <option value="">All Departments</option>
                  {getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select 
                  value={filters.status} 
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTeachers().map(teacher => (
                    <tr key={teacher._id}>
                      <td className="user-name">
                        <span className="avatar">{teacher.name?.charAt(0)}</span>
                        {teacher.name}
                      </td>
                      <td>{teacher.email}</td>
                      <td>{teacher.department || '-'}</td>
                      <td>
                        {teacher.verifiedTeacher ? (
                          <span className="status-badge status-approved">Approved</span>
                        ) : (
                          <span className="status-badge status-pending">Pending</span>
                        )}
                      </td>
                      <td className="actions">
                        {!teacher.verifiedTeacher ? (
                          <button 
                            className="action-btn approve"
                            onClick={() => handleApproveTeacher(teacher._id)}
                          >
                            ✓ Approve
                          </button>
                        ) : (
                          <button 
                            className="action-btn revoke"
                            onClick={() => handleRevokeTeacher(teacher._id)}
                          >
                            ✗ Revoke
                          </button>
                        )}
                        <button 
                          className="action-btn delete"
                          onClick={() => handleDeleteUser(teacher._id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="students-content">
            <div className="content-header">
              <div className="filter-bar">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="search-input"
                />
                <select 
                  value={filters.branch} 
                  onChange={(e) => setFilters({...filters, branch: e.target.value})}
                >
                  <option value="">All Branches</option>
                  {getBranches().map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select 
                  value={filters.section} 
                  onChange={(e) => setFilters({...filters, section: e.target.value})}
                >
                  <option value="">All Sections</option>
                  {getSections().map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-summary">
                Showing {getFilteredStudents().length} of {analytics?.summary.totalStudents} students
              </div>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Roll Number</th>
                    <th>Branch</th>
                    <th>Section</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredStudents().map(student => (
                    <tr key={student._id}>
                      <td className="user-name">
                        <span className="avatar student">{student.name?.charAt(0)}</span>
                        {student.name}
                      </td>
                      <td>{student.email}</td>
                      <td>{student.rollNumber || '-'}</td>
                      <td>{student.branch || '-'}</td>
                      <td>{student.section || '-'}</td>
                      <td>{student.phone || '-'}</td>
                      <td className="actions">
                        <button 
                          className="action-btn delete"
                          onClick={() => handleDeleteUser(student._id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="feedback-content">
            <div className="feedback-overview">
              <div className="feedback-stat-card">
                <div className="fsc-icon">💬</div>
                <div className="fsc-content">
                  <h3>Total Ratings</h3>
                  <p>{analytics?.feedback.totalRatings}</p>
                </div>
              </div>
              <div className="feedback-stat-card">
                <div className="fsc-icon">📋</div>
                <div className="fsc-content">
                  <h3>Evaluations</h3>
                  <p>{analytics?.feedback.totalEvaluations}</p>
                </div>
              </div>
              <div className="feedback-stat-card">
                <div className="fsc-icon">⭐</div>
                <div className="fsc-content">
                  <h3>Avg Rating</h3>
                  <p>{analytics?.performance.avgDayRating}/5</p>
                </div>
              </div>
            </div>

            <div className="sentiment-overview">
              <h3>Sentiment Analysis</h3>
              <div className="sentiment-bars">
                <div className="sentiment-row">
                  <span className="s-label">😊 Positive (4-5 stars)</span>
                  <div className="s-bar-container">
                    <div 
                      className="s-bar positive" 
                      style={{width: `${analytics?.feedback.totalRatings ? (analytics.feedback.sentiment.positive / analytics.feedback.totalRatings) * 100 : 0}%`}}
                    ></div>
                  </div>
                  <span className="s-count">{analytics?.feedback.sentiment.positive}</span>
                </div>
                <div className="sentiment-row">
                  <span className="s-label">😐 Neutral (3 stars)</span>
                  <div className="s-bar-container">
                    <div 
                      className="s-bar neutral" 
                      style={{width: `${analytics?.feedback.totalRatings ? (analytics.feedback.sentiment.neutral / analytics.feedback.totalRatings) * 100 : 0}%`}}
                    ></div>
                  </div>
                  <span className="s-count">{analytics?.feedback.sentiment.neutral}</span>
                </div>
                <div className="sentiment-row">
                  <span className="s-label">😔 Negative (1-2 stars)</span>
                  <div className="s-bar-container">
                    <div 
                      className="s-bar negative" 
                      style={{width: `${analytics?.feedback.totalRatings ? (analytics.feedback.sentiment.negative / analytics.feedback.totalRatings) * 100 : 0}%`}}
                    ></div>
                  </div>
                  <span className="s-count">{analytics?.feedback.sentiment.negative}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="reports-content">
            <h2>📁 Export Reports</h2>
            <p className="reports-desc">Download data exports in CSV format</p>

            <div className="reports-grid">
              <div className="report-card">
                <div className="rc-icon">🎓</div>
                <h4>Students Data</h4>
                <p>Export all student information including branch, section, and contact details</p>
                <button onClick={() => exportData('students')}>
                  📥 Download CSV
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">👨‍🏫</div>
                <h4>Teachers Data</h4>
                <p>Export all teacher profiles with department and approval status</p>
                <button onClick={() => exportData('teachers')}>
                  📥 Download CSV
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">📚</div>
                <h4>Courses Data</h4>
                <p>Export all courses with schedule, teacher assignments and status</p>
                <button onClick={() => exportData('courses')}>
                  📥 Download CSV
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">📝</div>
                <h4>Enrollments Data</h4>
                <p>Export all enrollment records with student and course details</p>
                <button onClick={() => exportData('enrollments')}>
                  📥 Download CSV
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">📋</div>
                <h4>Evaluations Data</h4>
                <p>Export all student evaluations and feedback responses</p>
                <button onClick={() => exportData('evaluations')}>
                  📥 Download CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
