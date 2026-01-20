import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SecretAnalytics.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SecretAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/analytics/comprehensive-feedback`);
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="secret-analytics">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading comprehensive feedback data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="secret-analytics">
        <div className="error-container">
          <h2>❌ Failed to load data</h2>
          <button onClick={fetchData}>Retry</button>
        </div>
      </div>
    );
  }

  const filteredCourses = data.courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.courseCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || course.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="secret-analytics">
      <div className="analytics-header">
        <div className="header-content">
          <h1>🔒 Secret Analytics Dashboard</h1>
          <p className="subtitle">Comprehensive Feedback & Course Data</p>
        </div>
        <button className="refresh-btn" onClick={fetchData}>
          🔄 Refresh Data
        </button>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📚</div>
          <div className="stat-details">
            <h3>{data.stats.totalCourses}</h3>
            <p>Total Courses</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">📝</div>
          <div className="stat-details">
            <h3>{data.stats.totalEvaluations}</h3>
            <p>Evaluations</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">📊</div>
          <div className="stat-details">
            <h3>{data.stats.totalSurveys}</h3>
            <p>Course Surveys</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">⭐</div>
          <div className="stat-details">
            <h3>{data.stats.totalDayRatings}</h3>
            <p>Day Ratings</p>
          </div>
        </div>
        <div className="stat-card teal">
          <div className="stat-icon">👥</div>
          <div className="stat-details">
            <h3>{data.stats.totalEnrollments}</h3>
            <p>Total Enrollments</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          📚 Courses
        </button>
        <button 
          className={`tab ${activeTab === 'evaluations' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluations')}
        >
          📝 Evaluations
        </button>
        <button 
          className={`tab ${activeTab === 'surveys' ? 'active' : ''}`}
          onClick={() => setActiveTab('surveys')}
        >
          📋 Surveys
        </button>
        <button 
          className={`tab ${activeTab === 'dayratings' ? 'active' : ''}`}
          onClick={() => setActiveTab('dayratings')}
        >
          ⭐ Day Ratings
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <OverviewTab data={data} />
        )}

        {activeTab === 'courses' && (
          <CoursesTab 
            courses={filteredCourses}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
          />
        )}

        {activeTab === 'evaluations' && (
          <EvaluationsTab evaluations={data.allEvaluations} />
        )}

        {activeTab === 'surveys' && (
          <SurveysTab surveys={data.allSurveys} />
        )}

        {activeTab === 'dayratings' && (
          <DayRatingsTab dayRatings={data.allDayRatings} />
        )}
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <CourseDetailModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ data }) => {
  return (
    <div className="overview-content">
      <h2>📊 System Overview</h2>
      
      <div className="overview-section">
        <h3>Top Courses by Feedback</h3>
        <div className="top-courses-list">
          {data.courses
            .filter(c => c.evaluations.length > 0 || c.surveys.length > 0)
            .sort((a, b) => 
              (b.evaluations.length + b.surveys.length) - 
              (a.evaluations.length + a.surveys.length)
            )
            .slice(0, 5)
            .map(course => (
              <div key={course._id} className="top-course-item">
                <div className="course-info">
                  <h4>{course.title}</h4>
                  <p className="course-code">{course.courseCode}</p>
                  <p className="teacher-name">👨‍🏫 {course.teacher?.name}</p>
                </div>
                <div className="course-metrics">
                  <span className="metric">📝 {course.evaluations.length} Evaluations</span>
                  <span className="metric">📊 {course.surveys.length} Surveys</span>
                  <span className="metric">⭐ {course.dayRatings.length} Day Ratings</span>
                  <span className="metric">👥 {course.enrolledStudents} Students</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="overview-section">
        <h3>Recent Activity</h3>
        <div className="recent-activity">
          {[...data.allEvaluations, ...data.allSurveys, ...data.allDayRatings]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map((item, index) => (
              <div key={index} className="activity-item">
                <span className="activity-icon">
                  {item.answers ? '📝' : item.overallSatisfaction ? '📊' : '⭐'}
                </span>
                <div className="activity-details">
                  <p className="activity-text">
                    <strong>{item.student?.name}</strong> submitted{' '}
                    {item.answers ? 'evaluation' : item.overallSatisfaction ? 'survey' : 'day rating'} for{' '}
                    <strong>{item.course?.title}</strong>
                  </p>
                  <p className="activity-time">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Courses Tab Component
const CoursesTab = ({ 
  courses, 
  searchTerm, 
  setSearchTerm, 
  filterStatus, 
  setFilterStatus,
  selectedCourse,
  setSelectedCourse 
}) => {
  return (
    <div className="courses-content">
      <div className="courses-controls">
        <input 
          type="text"
          placeholder="🔍 Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="courses-grid">
        {courses.map(course => (
          <div 
            key={course._id} 
            className="course-card"
            onClick={() => setSelectedCourse(course)}
          >
            <div className="course-header">
              <h3>{course.title}</h3>
              <span className={`status-badge ${course.status}`}>
                {course.status}
              </span>
            </div>
            <p className="course-code">{course.courseCode}</p>
            <p className="teacher-info">👨‍🏫 {course.teacher?.name}</p>
            
            <div className="course-stats">
              <div className="stat-item">
                <span className="stat-label">Evaluations</span>
                <span className="stat-value">{course.evaluations.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Surveys</span>
                <span className="stat-value">{course.surveys.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Day Ratings</span>
                <span className="stat-value">{course.dayRatings.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Students</span>
                <span className="stat-value">{course.enrolledStudents}</span>
              </div>
            </div>

            {course.evaluationStats && (
              <div className="avg-score">
                Avg Evaluation Score: ⭐ {
                  Object.values(course.evaluationStats.averageScores)
                    .filter(s => s !== null)
                    .reduce((sum, s) => sum + parseFloat(s.average), 0) /
                  Object.values(course.evaluationStats.averageScores).filter(s => s !== null).length || 0
                }.toFixed(2) / 5.0
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Evaluations Tab Component
const EvaluationsTab = ({ evaluations }) => {
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  return (
    <div className="evaluations-content">
      <h2>📝 All Course Evaluations ({evaluations.length})</h2>
      
      <div className="evaluations-list">
        {evaluations.map(evaluation => (
          <div key={evaluation._id} className="evaluation-card">
            <div className="evaluation-header">
              <div>
                <h4>{evaluation.course?.title || 'Unknown Course'}</h4>
                <p className="student-name">👤 {evaluation.student?.name}</p>
              </div>
              <button 
                className="view-btn"
                onClick={() => setSelectedEvaluation(evaluation)}
              >
                View Details
              </button>
            </div>
            <p className="timestamp">
              📅 {new Date(evaluation.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {selectedEvaluation && (
        <div className="modal-overlay" onClick={() => setSelectedEvaluation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Evaluation Details</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedEvaluation(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Course:</strong> {selectedEvaluation.course?.title}</p>
              <p><strong>Student:</strong> {selectedEvaluation.student?.name}</p>
              <p><strong>Date:</strong> {new Date(selectedEvaluation.createdAt).toLocaleString()}</p>
              
              <h4>Responses:</h4>
              <div className="answers-grid">
                {Object.entries(selectedEvaluation.answers).map(([key, value]) => (
                  <div key={key} className="answer-item">
                    <span className="question-num">{key.toUpperCase()}</span>
                    <span className="answer-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Surveys Tab Component
const SurveysTab = ({ surveys }) => {
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  return (
    <div className="surveys-content">
      <h2>📋 All Course Surveys ({surveys.length})</h2>
      
      <div className="surveys-list">
        {surveys.map(survey => (
          <div key={survey._id} className="survey-card">
            <div className="survey-header">
              <div>
                <h4>{survey.course?.title || 'Unknown Course'}</h4>
                <p className="student-name">👤 {survey.student?.name}</p>
              </div>
              <button 
                className="view-btn"
                onClick={() => setSelectedSurvey(survey)}
              >
                View Details
              </button>
            </div>
            <div className="rating-summary">
              <div className="rating-item">
                <span>Overall:</span>
                <span className="stars">{'⭐'.repeat(survey.overallSatisfaction)}</span>
              </div>
              <div className="rating-item">
                <span>Content:</span>
                <span className="stars">{'⭐'.repeat(survey.contentQuality)}</span>
              </div>
              <div className="rating-item">
                <span>Teaching:</span>
                <span className="stars">{'⭐'.repeat(survey.teachingEffectiveness)}</span>
              </div>
            </div>
            <p className="timestamp">
              📅 {new Date(survey.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {selectedSurvey && (
        <div className="modal-overlay" onClick={() => setSelectedSurvey(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Survey Details</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedSurvey(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Course:</strong> {selectedSurvey.course?.title}</p>
              <p><strong>Student:</strong> {selectedSurvey.student?.name}</p>
              <p><strong>Date:</strong> {new Date(selectedSurvey.createdAt).toLocaleString()}</p>
              
              <h4>Ratings:</h4>
              <div className="ratings-detail">
                <div className="rating-row">
                  <span>Overall Satisfaction:</span>
                  <span className="stars">{'⭐'.repeat(selectedSurvey.overallSatisfaction)}</span>
                </div>
                <div className="rating-row">
                  <span>Content Quality:</span>
                  <span className="stars">{'⭐'.repeat(selectedSurvey.contentQuality)}</span>
                </div>
                <div className="rating-row">
                  <span>Teaching Effectiveness:</span>
                  <span className="stars">{'⭐'.repeat(selectedSurvey.teachingEffectiveness)}</span>
                </div>
                <div className="rating-row">
                  <span>Course Material Quality:</span>
                  <span className="stars">{'⭐'.repeat(selectedSurvey.courseMaterialQuality)}</span>
                </div>
                <div className="rating-row">
                  <span>Practical Application:</span>
                  <span className="stars">{'⭐'.repeat(selectedSurvey.practicalApplication)}</span>
                </div>
              </div>

              <h4>Feedback:</h4>
              <div className="feedback-section">
                <div className="feedback-item">
                  <strong>What You Learned:</strong>
                  <p>{selectedSurvey.whatYouLearned}</p>
                </div>
                <div className="feedback-item">
                  <strong>Improvements:</strong>
                  <p>{selectedSurvey.improvements}</p>
                </div>
                {selectedSurvey.additionalComments && (
                  <div className="feedback-item">
                    <strong>Additional Comments:</strong>
                    <p>{selectedSurvey.additionalComments}</p>
                  </div>
                )}
                <div className="feedback-item">
                  <strong>Would Recommend:</strong>
                  <p>{selectedSurvey.recommendToOthers ? '✅ Yes' : '❌ No'}</p>
                </div>
                <div className="feedback-item">
                  <strong>Difficulty Level:</strong>
                  <p>{selectedSurvey.difficultyLevel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Day Ratings Tab Component
const DayRatingsTab = ({ dayRatings }) => {
  return (
    <div className="dayratings-content">
      <h2>⭐ All Day Ratings ({dayRatings.length})</h2>
      
      <div className="dayratings-list">
        {dayRatings.map(rating => (
          <div key={rating._id} className="dayrating-card">
            <div className="rating-header">
              <div>
                <h4>{rating.course?.title || 'Unknown Course'}</h4>
                <p className="student-name">👤 {rating.student?.name}</p>
              </div>
              <div className="rating-badge">
                <span className="rating-number">{rating.rating}</span>
                <span className="rating-max">/5</span>
              </div>
            </div>
            <p className="day-number">📆 Day {rating.dayNumber}</p>
            {rating.comment && (
              <p className="rating-comment">💬 {rating.comment}</p>
            )}
            <p className="timestamp">
              📅 {new Date(rating.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Course Detail Modal Component
const CourseDetailModal = ({ course, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{course.title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="course-detail-section">
            <p><strong>Course Code:</strong> {course.courseCode}</p>
            <p><strong>Teacher:</strong> {course.teacher?.name} ({course.teacher?.email})</p>
            <p><strong>Status:</strong> <span className={`status-badge ${course.status}`}>{course.status}</span></p>
            <p><strong>Total Days:</strong> {course.totalDays}</p>
            <p><strong>Enrolled Students:</strong> {course.enrolledStudents}</p>
          </div>

          {course.evaluationStats && (
            <div className="course-detail-section">
              <h4>📝 Evaluation Statistics</h4>
              <p><strong>Total Responses:</strong> {course.evaluationStats.totalResponses}</p>
              <div className="scores-grid">
                {Object.entries(course.evaluationStats.averageScores)
                  .filter(([_, score]) => score !== null)
                  .map(([key, score]) => (
                    <div key={key} className="score-item">
                      <span className="score-label">{score.label}:</span>
                      <span className="score-value">{score.average} / 5.0</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {course.surveyStats && (
            <div className="course-detail-section">
              <h4>📊 Survey Statistics</h4>
              <p><strong>Total Responses:</strong> {course.surveyStats.totalResponses}</p>
              <div className="ratings-detail">
                <div className="rating-row">
                  <span>Overall Satisfaction:</span>
                  <span>{course.surveyStats.averageRatings.overallSatisfaction} / 5.0</span>
                </div>
                <div className="rating-row">
                  <span>Content Quality:</span>
                  <span>{course.surveyStats.averageRatings.contentQuality} / 5.0</span>
                </div>
                <div className="rating-row">
                  <span>Teaching Effectiveness:</span>
                  <span>{course.surveyStats.averageRatings.teachingEffectiveness} / 5.0</span>
                </div>
                <div className="rating-row">
                  <span>Material Quality:</span>
                  <span>{course.surveyStats.averageRatings.courseMaterialQuality} / 5.0</span>
                </div>
                <div className="rating-row">
                  <span>Practical Application:</span>
                  <span>{course.surveyStats.averageRatings.practicalApplication} / 5.0</span>
                </div>
              </div>
            </div>
          )}

          {course.dayRatingStats && (
            <div className="course-detail-section">
              <h4>⭐ Day Rating Statistics</h4>
              <p><strong>Total Ratings:</strong> {course.dayRatingStats.totalRatings}</p>
              <p><strong>Average Rating:</strong> {course.dayRatingStats.averageRating} / 5.0</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecretAnalytics;
