import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
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

  // Course picker modals
  const [showEvalPicker, setShowEvalPicker] = useState(false);
  const [evalCourseList, setEvalCourseList] = useState([]);
  const [showAttPicker, setShowAttPicker] = useState(false);
  const [attCourseList, setAttCourseList] = useState([]);
  const [showDrPicker, setShowDrPicker] = useState(false);
  const [drCourseList, setDrCourseList] = useState([]);

  // Course list modal for overview section
  const [showCourseListModal, setShowCourseListModal] = useState(false);
  const [courseListType, setCourseListType] = useState('all'); // 'all', 'active', 'completed', 'draft'
  const [courseListTitle, setCourseListTitle] = useState('');

  // Generic report preview
  const [reportPreview, setReportPreview] = useState(null);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);

  // Attendance Reports tab
  const [attReportCourses, setAttReportCourses] = useState([]);
  const [attReportLoading, setAttReportLoading] = useState(false);
  const [attReportExpanded, setAttReportExpanded] = useState(null);
  const [attReportDetail, setAttReportDetail] = useState(null);
  const [attReportDetailLoading, setAttReportDetailLoading] = useState(false);
  const [attReportExpandedDay, setAttReportExpandedDay] = useState(null);
  const [attReportImageModal, setAttReportImageModal] = useState(null);

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

  // Function to open course list modal
  const openCourseListModal = (type, title) => {
    setCourseListType(type);
    setCourseListTitle(title);
    setShowCourseListModal(true);
  };

  // Get filtered course list based on type
  const getFilteredCourseList = () => {
    if (!courses) return [];
    switch (courseListType) {
      case 'active':
        return courses.filter(c => c.status === 'active');
      case 'completed':
        return courses.filter(c => c.status === 'completed');
      case 'draft':
        return courses.filter(c => c.status === 'draft');
      case 'enrolled':
        return courses.filter(c => c.enrolledCount > 0);
      default:
        return courses;
    }
  };

  const reportLabels = {
    students: '🎓 Students Data',
    teachers: '👨‍🏫 Teachers Data',
    courses: '📚 Courses Data',
    enrollments: '📝 Enrollments Data',
    evaluations: '📋 Evaluations Data',
    attendance: '✅ Attendance Data',
    feedback: '💬 Feedback Data',
    dayratings: '⭐ Day Ratings Data'
  };

  const fetchReportPreview = async (type, courseId = null, label = null) => {
    try {
      setReportPreviewLoading(true);
      setShowEvalPicker(false);
      setShowAttPicker(false);
      setShowDrPicker(false);
      let url = `${API_URL}/admin/export/${type}`;
      if (courseId) url += `?courseId=${courseId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.data.length === 0) {
        alert('No data found');
        setReportPreviewLoading(false);
        return;
      }
      const title = label || reportLabels[type] || type;
      setReportPreview({ data: res.data, type, title, courseId });
    } catch (error) {
      alert('Failed to load data');
    } finally {
      setReportPreviewLoading(false);
    }
  };

  const getPreviewColumns = () => {
    if (!reportPreview || !reportPreview.data.length) return [];
    const first = reportPreview.data[0];
    const type = reportPreview.type;

    if (type === 'evaluations') {
      // Get Q keys and sort them numerically (Q1, Q2, Q3... not Q1, Q10, Q11...)
      const qKeys = Object.keys(first).filter(k => k.match(/^Q\d+$/)).sort((a, b) => {
        return parseInt(a.replace('Q', '')) - parseInt(b.replace('Q', ''));
      });
      return qKeys.map(q => ({ key: q, label: q, render: item => item[q] ?? '-', isAnswer: true }));
    }

    if (type === 'attendance') {
      const dayKeys = Object.keys(first).filter(k => k.startsWith('Day')).sort((a, b) => {
        return parseInt(a.replace('Day', '')) - parseInt(b.replace('Day', ''));
      });
      return [
        { key: 'course', label: 'Course', render: item => item.course || '-' },
        { key: 'studentName', label: 'Student', render: item => item.studentName || '-' },
        { key: 'rollNumber', label: 'Roll No', render: item => item.rollNumber || '-' },
        { key: 'branch', label: 'Branch', render: item => item.branch || '-' },
        ...dayKeys.map(d => ({
          key: d, label: d, render: item => item[d] || '-',
          isStatus: true
        }))
      ];
    }

    if (type === 'dayratings') {
      const ratingKeys = Object.keys(first).filter(k => k.match(/^Day\d+_Rating$/)).sort((a, b) => {
        return parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]);
      });
      const cols = [
        { key: 'course', label: 'Course', render: item => item.course || '-' },
        { key: 'studentName', label: 'Student', render: item => item.studentName || '-' },
        { key: 'rollNumber', label: 'Roll No', render: item => item.rollNumber || '-' },
        { key: 'branch', label: 'Branch', render: item => item.branch || '-' },
      ];
      ratingKeys.forEach(rk => {
        const dayNum = rk.match(/\d+/)[0];
        cols.push({
          key: rk, label: `D${dayNum} ⭐`, render: item => item[rk] ?? '-',
          isRating: true
        });
        cols.push({
          key: `Day${dayNum}_Comment`, label: `D${dayNum} 💬`, render: item => item[`Day${dayNum}_Comment`] || '-',
          isComment: true
        });
      });
      return cols;
    }

    // Generic: flatten object keys smartly
    const skip = ['_id', '__v', 'password', 'profilePicture'];
    return Object.keys(first).filter(k => !skip.includes(k)).map(k => ({
      key: k,
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      render: item => {
        let val = item[k];
        if (val === null || val === undefined) return '-';
        if (typeof val === 'object') {
          if (val.name) return val.name;
          if (val.title) return val.title;
          return JSON.stringify(val).substring(0, 60);
        }
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
          return new Date(val).toLocaleDateString('en-GB');
        }
        return String(val);
      }
    }));
  };

  const downloadReportPreview = () => {
    if (!reportPreview) return;
    const data = reportPreview.data;
    const cols = getPreviewColumns();
    const csvRows = [cols.map(c => c.label).join(',')];
    data.forEach(item => {
      const values = cols.map(c => {
        let val = c.render(item);
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val || '';
      });
      csvRows.push(values.join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const safeName = reportPreview.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    a.download = `${reportPreview.type}_${safeName}_${dateStr}.csv`;
    a.click();
  };

  // Attendance Reports tab functions
  const fetchAttReportCourses = async () => {
    setAttReportLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_URL}/admin/attendance-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttReportCourses(res.data);
    } catch (error) {
      console.error('Error fetching attendance reports:', error);
    }
    setAttReportLoading(false);
  };

  const fetchAttReportDetail = async (courseId) => {
    if (attReportExpanded === courseId) {
      setAttReportExpanded(null);
      setAttReportDetail(null);
      setAttReportExpandedDay(null);
      return;
    }
    setAttReportExpanded(courseId);
    setAttReportDetailLoading(true);
    setAttReportExpandedDay(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_URL}/admin/attendance-reports/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttReportDetail(res.data);
    } catch (error) {
      console.error('Error fetching course attendance detail:', error);
    }
    setAttReportDetailLoading(false);
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
          <button 
            className={activeTab === 'attendance-reports' ? 'active' : ''} 
            onClick={() => setActiveTab('attendance-reports')}
          >
            <span className="nav-icon">📸</span> Attendance Reports
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

            {/* Course Lists Section */}
            <div className="course-lists-section">
              <h2>📚 Course Categories</h2>
              <div className="course-category-cards">
                <div 
                  className="course-category-card enrolled"
                  onClick={() => openCourseListModal('enrolled', 'Courses with Enrollments')}
                >
                  <div className="cc-icon">📝</div>
                  <div className="cc-content">
                    <h4>{courses?.filter(c => c.enrolledCount > 0).length || 0}</h4>
                    <p>With Enrollments</p>
                  </div>
                  <span className="cc-arrow">→</span>
                </div>
                <div 
                  className="course-category-card active"
                  onClick={() => openCourseListModal('active', 'Active Courses')}
                >
                  <div className="cc-icon">🟢</div>
                  <div className="cc-content">
                    <h4>{courses?.filter(c => c.status === 'active').length || 0}</h4>
                    <p>Active Courses</p>
                  </div>
                  <span className="cc-arrow">→</span>
                </div>
                <div 
                  className="course-category-card completed"
                  onClick={() => openCourseListModal('completed', 'Completed Courses')}
                >
                  <div className="cc-icon">✅</div>
                  <div className="cc-content">
                    <h4>{courses?.filter(c => c.status === 'completed').length || 0}</h4>
                    <p>Completed Courses</p>
                  </div>
                  <span className="cc-arrow">→</span>
                </div>
                <div 
                  className="course-category-card draft"
                  onClick={() => openCourseListModal('draft', 'Draft Courses')}
                >
                  <div className="cc-icon">📄</div>
                  <div className="cc-content">
                    <h4>{courses?.filter(c => c.status === 'draft').length || 0}</h4>
                    <p>Draft Courses</p>
                  </div>
                  <span className="cc-arrow">→</span>
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
                <button onClick={() => fetchReportPreview('students')}>
                  🔍 Preview & Export
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">👨‍🏫</div>
                <h4>Teachers Data</h4>
                <p>Export all teacher profiles with department and approval status</p>
                <button onClick={() => fetchReportPreview('teachers')}>
                  🔍 Preview & Export
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">📚</div>
                <h4>Courses Data</h4>
                <p>Export all courses with schedule, teacher assignments and status</p>
                <button onClick={() => fetchReportPreview('courses')}>
                  🔍 Preview & Export
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">📝</div>
                <h4>Enrollments Data</h4>
                <p>Export all enrollment records with student and course details</p>
                <button onClick={() => fetchReportPreview('enrollments')}>
                  🔍 Preview & Export
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">📋</div>
                <h4>Evaluations Data</h4>
                <p>Select a course to export its evaluation responses</p>
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('adminToken');
                    const res = await axios.get(`${API_URL}/admin/courses`, { headers: { Authorization: `Bearer ${token}` } });
                    setEvalCourseList(res.data || []);
                    setShowEvalPicker(true);
                  } catch (err) {
                    alert('Failed to load courses');
                  }
                }}>
                  � Preview & Export
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">✅</div>
                <h4>Attendance Data</h4>
                <p>Select a course to export day-wise attendance records</p>
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('adminToken');
                    const res = await axios.get(`${API_URL}/admin/courses`, { headers: { Authorization: `Bearer ${token}` } });
                    setAttCourseList(res.data || []);
                    setShowAttPicker(true);
                  } catch (err) {
                    alert('Failed to load courses');
                  }
                }}>
                  � Preview & Export
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">💬</div>
                <h4>Feedback Data</h4>
                <p>Export all student feedback submissions across courses</p>
                <button onClick={() => fetchReportPreview('feedback')}>
                  🔍 Preview & Export
                </button>
              </div>

              <div className="report-card">
                <div className="rc-icon">⭐</div>
                <h4>Day Ratings Data</h4>
                <p>Select a course to export day-wise student ratings</p>
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('adminToken');
                    const res = await axios.get(`${API_URL}/admin/courses`, { headers: { Authorization: `Bearer ${token}` } });
                    setDrCourseList(res.data || []);
                    setShowDrPicker(true);
                  } catch (err) {
                    alert('Failed to load courses');
                  }
                }}>
                  🔍 Preview & Export
                </button>
              </div>
            </div>

            {/* Evaluation Course Picker Modal */}
            {showEvalPicker && (
              <div className="eval-picker-overlay" onClick={() => setShowEvalPicker(false)}>
                <div className="eval-picker-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="eval-picker-header">
                    <h3>📋 Select Course</h3>
                    <button className="eval-picker-close" onClick={() => setShowEvalPicker(false)}>✕</button>
                  </div>
                  <p className="eval-picker-desc">Choose a course to export its evaluation data</p>
                  <div className="eval-picker-list">
                    {evalCourseList.length === 0 ? (
                      <p className="eval-picker-empty">No courses found</p>
                    ) : (
                      evalCourseList.map(course => (
                        <div key={course._id} className="eval-picker-item-row">
                          <button
                            className="eval-picker-item"
                            onClick={() => {
                              fetchReportPreview('evaluations', course._id, course.title);
                            }}
                          >
                            <div className="eval-picker-course-info">
                              <span className="eval-picker-title">{course.title}</span>
                              <span className="eval-picker-code">{course.courseCode}</span>
                            </div>
                            <span className="eval-picker-arrow">→</span>
                          </button>
                          <button
                            className="eval-picker-get-btn"
                            onClick={() => window.open(`${API_URL}/evaluations/export/${course._id}`, '_blank')}
                            title="View API JSON Data"
                          >
                            GET
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Course Picker Modal */}}
            {showAttPicker && (
              <div className="eval-picker-overlay" onClick={() => setShowAttPicker(false)}>
                <div className="eval-picker-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="eval-picker-header">
                    <h3>✅ Select Course</h3>
                    <button className="eval-picker-close" onClick={() => setShowAttPicker(false)}>✕</button>
                  </div>
                  <p className="eval-picker-desc">Choose a course to export its attendance data</p>
                  <div className="eval-picker-list">
                    {attCourseList.length === 0 ? (
                      <p className="eval-picker-empty">No courses found</p>
                    ) : (
                      <>
                        <button
                          className="eval-picker-item"
                          onClick={() => {
                            fetchReportPreview('attendance', null, 'All Courses Attendance');
                          }}
                        >
                          <div className="eval-picker-course-info">
                            <span className="eval-picker-title">All Courses</span>
                            <span className="eval-picker-code">Export everything</span>
                          </div>
                          <span className="eval-picker-arrow">🔍</span>
                        </button>
                        {attCourseList.map(course => (
                          <button
                            key={course._id}
                            className="eval-picker-item"
                            onClick={() => {
                              fetchReportPreview('attendance', course._id, course.title);
                            }}
                          >
                            <div className="eval-picker-course-info">
                              <span className="eval-picker-title">{course.title}</span>
                              <span className="eval-picker-code">{course.courseCode}</span>
                            </div>
                            <span className="eval-picker-arrow">�</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Day Ratings Course Picker Modal */}
            {showDrPicker && (
              <div className="eval-picker-overlay" onClick={() => setShowDrPicker(false)}>
                <div className="eval-picker-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="eval-picker-header">
                    <h3>⭐ Select Course</h3>
                    <button className="eval-picker-close" onClick={() => setShowDrPicker(false)}>✕</button>
                  </div>
                  <p className="eval-picker-desc">Choose a course to export its day ratings</p>
                  <div className="eval-picker-list">
                    {drCourseList.length === 0 ? (
                      <p className="eval-picker-empty">No courses found</p>
                    ) : (
                      <>
                        <button
                          className="eval-picker-item"
                          onClick={() => fetchReportPreview('dayratings', null, 'All Courses Day Ratings')}
                        >
                          <div className="eval-picker-course-info">
                            <span className="eval-picker-title">All Courses</span>
                            <span className="eval-picker-code">Export everything</span>
                          </div>
                          <span className="eval-picker-arrow">🔍</span>
                        </button>
                        {drCourseList.map(course => (
                          <button
                            key={course._id}
                            className="eval-picker-item"
                            onClick={() => fetchReportPreview('dayratings', course._id, course.title)}
                          >
                            <div className="eval-picker-course-info">
                              <span className="eval-picker-title">{course.title}</span>
                              <span className="eval-picker-code">{course.courseCode}</span>
                            </div>
                            <span className="eval-picker-arrow">🔍</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Report Preview Loading */}
            {reportPreviewLoading && (
              <div className="eval-picker-overlay">
                <div className="eval-preview-loading">
                  <div className="eval-spinner"></div>
                  <span>Loading data...</span>
                </div>
              </div>
            )}

            {/* Generic Report Data Preview Modal */}
            {reportPreview && (() => {
              const cols = getPreviewColumns();
              return (
                <div className="eval-picker-overlay" onClick={() => setReportPreview(null)}>
                  <div className="eval-preview-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="eval-preview-header">
                      <div>
                        <h3>{reportLabels[reportPreview.type]?.split(' ')[0] || '📄'} {reportPreview.title}</h3>
                        <p className="eval-preview-subtitle">{reportPreview.data.length} record{reportPreview.data.length !== 1 ? 's' : ''} found • {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="eval-preview-actions">
                        <button className="eval-download-btn" onClick={downloadReportPreview}>📥 Download CSV</button>
                        <button className="eval-picker-close" onClick={() => setReportPreview(null)}>✕</button>
                      </div>
                    </div>
                    <div className="eval-preview-table-wrap">
                      <table className="eval-preview-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            {cols.map(col => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportPreview.data.map((item, idx) => (
                            <tr key={idx}>
                              <td className="eval-row-num">{idx + 1}</td>
                              {cols.map(col => (
                                <td key={col.key} className={col.isAnswer ? 'eval-answer-cell' : col.isStatus ? `eval-status-cell ${item[col.key] === 'present' ? 'status-present' : item[col.key] === 'absent' ? 'status-absent' : 'status-notmarked'}` : col.isRating ? 'rating-cell' : col.isComment ? 'comment-cell' : ''}>
                                  {col.render(item)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Attendance Reports Tab */}
        {activeTab === 'attendance-reports' && (
          <div className="att-reports-tab">
            <div className="att-reports-header">
              <h2>📸 Course-wise Attendance Reports</h2>
              <p>View attendance data with class images and attendance sheet images for all courses</p>
              <button className="att-reports-refresh-btn" onClick={fetchAttReportCourses} disabled={attReportLoading}>
                {attReportLoading ? '⏳ Loading...' : '🔄 Load / Refresh'}
              </button>
            </div>

            {attReportCourses.length === 0 && !attReportLoading && (
              <div className="att-reports-empty">
                <span>📋</span>
                <p>Click "Load / Refresh" to fetch course attendance data</p>
              </div>
            )}

            <div className="att-reports-course-list">
              {attReportCourses.map(course => (
                <div className={`att-reports-course-card ${attReportExpanded === course.courseId ? 'expanded' : ''}`} key={course.courseId}>
                  <div className="att-reports-course-row" onClick={() => fetchAttReportDetail(course.courseId)}>
                    <div className="att-reports-course-info">
                      <h3>{course.title}</h3>
                      <div className="att-reports-course-meta">
                        <span>📝 {course.courseCode || 'N/A'}</span>
                        <span>👨‍🏫 {course.teacher}</span>
                        <span>📅 {course.totalDays} Days</span>
                        <span>🎓 {course.totalStudents} Students</span>
                      </div>
                    </div>
                    <span className="att-reports-expand-icon">{attReportExpanded === course.courseId ? '▼' : '▶'}</span>
                  </div>

                  {attReportExpanded === course.courseId && (
                    <div className="att-reports-detail">
                      {attReportDetailLoading ? (
                        <div className="att-reports-detail-loading">⏳ Loading course data...</div>
                      ) : attReportDetail ? (
                        <>
                          {/* Student Summary */}
                          <div className="att-reports-summary">
                            <h4>Student Summary</h4>
                            <div className="att-reports-table-wrap">
                              <table className="att-reports-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Roll No</th>
                                    <th>Branch</th>
                                    <th>Section</th>
                                    <th>Present</th>
                                    <th>Absent</th>
                                    <th>%</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {attReportDetail.studentSummary.map((s, i) => (
                                    <tr key={i}>
                                      <td>{i + 1}</td>
                                      <td>{s.name}</td>
                                      <td>{s.rollNumber || '-'}</td>
                                      <td>{s.branch || '-'}</td>
                                      <td>{s.section || '-'}</td>
                                      <td className="att-text-present">{s.presentDays}</td>
                                      <td className="att-text-absent">{s.absentDays}</td>
                                      <td>
                                        <span className={`att-pct-badge ${s.percentage >= 75 ? 'good' : s.percentage >= 50 ? 'warn' : 'bad'}`}>
                                          {s.percentage}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Day-wise Details */}
                          <div className="att-reports-days">
                            <h4>Day-wise Details</h4>
                            {attReportDetail.daysData.map(day => (
                              <div className={`att-reports-day-card ${attReportExpandedDay === day.dayNumber ? 'expanded' : ''}`} key={day.dayNumber}>
                                <div className="att-reports-day-header" onClick={() => setAttReportExpandedDay(attReportExpandedDay === day.dayNumber ? null : day.dayNumber)}>
                                  <div className="att-reports-day-info">
                                    <strong>Day {day.dayNumber}: {day.sectionTitle}</strong>
                                    <div className="att-reports-day-stats">
                                      <span className="att-stat-present">✅ {day.presentCount}</span>
                                      <span className="att-stat-absent">❌ {day.absentCount}</span>
                                      <span className="att-stat-total">👥 {day.totalStudents}</span>
                                      {(day.classImage || day.attendanceSheetImage) && <span className="att-has-images">📸 Images</span>}
                                    </div>
                                  </div>
                                  <span className="att-reports-expand-icon">{attReportExpandedDay === day.dayNumber ? '▼' : '▶'}</span>
                                </div>

                                {attReportExpandedDay === day.dayNumber && (
                                  <div className="att-reports-day-body">
                                    {/* Day Images */}
                                    <div className="att-reports-day-images">
                                      <div className="att-reports-img-card">
                                        <div className="att-reports-img-label">📷 Class Image</div>
                                        {day.classImage ? (
                                          <img
                                            src={day.classImage}
                                            alt={`Day ${day.dayNumber} Class`}
                                            className="att-reports-img"
                                            onClick={() => setAttReportImageModal(day.classImage)}
                                          />
                                        ) : (
                                          <div className="att-reports-img-empty">
                                            <span>🖼️</span>
                                            <p>No class image</p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="att-reports-img-card">
                                        <div className="att-reports-img-label">📋 Attendance Sheet</div>
                                        {day.attendanceSheetImage ? (
                                          <img
                                            src={day.attendanceSheetImage}
                                            alt={`Day ${day.dayNumber} Sheet`}
                                            className="att-reports-img"
                                            onClick={() => setAttReportImageModal(day.attendanceSheetImage)}
                                          />
                                        ) : (
                                          <div className="att-reports-img-empty">
                                            <span>🖼️</span>
                                            <p>No sheet image</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Day Attendance Table */}
                                    <div className="att-reports-table-wrap">
                                      <table className="att-reports-table">
                                        <thead>
                                          <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Roll No</th>
                                            <th>Branch</th>
                                            <th>Section</th>
                                            <th>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {day.students.map((s, i) => (
                                            <tr key={i}>
                                              <td>{i + 1}</td>
                                              <td>{s.name}</td>
                                              <td>{s.rollNumber || '-'}</td>
                                              <td>{s.branch || '-'}</td>
                                              <td>{s.section || '-'}</td>
                                              <td>
                                                <span className={`att-status-badge ${s.status}`}>
                                                  {s.status === 'present' ? '✅ Present' : s.status === 'absent' ? '❌ Absent' : '⚪ Not Marked'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Full Image Modal */}
            {attReportImageModal && (
              <div className="att-img-modal-overlay" onClick={() => setAttReportImageModal(null)}>
                <div className="att-img-modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="att-img-modal-close" onClick={() => setAttReportImageModal(null)}>✕</button>
                  <img src={attReportImageModal} alt="Full size" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Course List Modal */}
        {showCourseListModal && (
          <div className="course-list-modal-overlay" onClick={() => setShowCourseListModal(false)}>
            <div className="course-list-modal" onClick={(e) => e.stopPropagation()}>
              <div className="clm-header">
                <h2>{courseListTitle}</h2>
                <button className="clm-close" onClick={() => setShowCourseListModal(false)}>✕</button>
              </div>
              <div className="clm-body">
                {getFilteredCourseList().length === 0 ? (
                  <div className="clm-empty">No courses found in this category</div>
                ) : (
                  <div className="clm-list">
                    {getFilteredCourseList().map((course) => (
                      <div key={course._id} className="clm-item">
                        <div className="clm-item-main">
                          <h4>{course.title}</h4>
                          <span className="clm-code">{course.courseCode}</span>
                        </div>
                        <div className="clm-item-meta">
                          <span className="clm-teacher">
                            👨‍🏫 {course.teacher?.name || 'Unknown'}
                          </span>
                          <span className="clm-days">
                            📅 {course.totalDays} days
                          </span>
                          <span className="clm-enrolled">
                            👥 {course.enrolledCount || 0} enrolled
                          </span>
                          <span className={`clm-status ${course.status}`}>
                            {course.status}
                          </span>
                        </div>
                        <div className="clm-item-progress">
                          <div className="clm-progress-bar">
                            <div 
                              className="clm-progress-fill" 
                              style={{width: `${course.sections ? (course.sections.filter(s => s.completed).length / course.sections.length) * 100 : 0}%`}}
                            ></div>
                          </div>
                          <span className="clm-progress-text">
                            {course.sections ? course.sections.filter(s => s.completed).length : 0}/{course.sections?.length || 0} days completed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
