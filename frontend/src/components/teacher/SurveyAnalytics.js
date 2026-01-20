import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './SurveyAnalytics.css';

const SurveyAnalytics = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [courseId]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/certificates/survey-analytics/${courseId}`);
      setAnalytics(response.data.analytics);
      setSurveys(response.data.surveys);
      setDifficultyDistribution(response.data.difficultyDistribution);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={`star ${rating >= star ? 'filled' : ''}`}>★</span>
        ))}
        <span className="rating-value">({rating?.toFixed(1) || 'N/A'})</span>
      </div>
    );
  };

  const getDifficultyLabel = (level) => {
    const labels = {
      too_easy: 'Too Easy',
      easy: 'Easy',
      appropriate: 'Appropriate',
      challenging: 'Challenging',
      too_difficult: 'Too Difficult'
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <div className="survey-analytics">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-analytics">
        <div className="error-message">{error}</div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="survey-analytics">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back to Course
      </button>

      <h1>📊 Course Survey Analytics</h1>

      {!analytics || surveys.length === 0 ? (
        <div className="no-data">
          <div className="empty-icon">📋</div>
          <h3>No Survey Data Yet</h3>
          <p>Students will submit surveys after completing the course.</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="analytics-overview">
            <div className="overview-card">
              <div className="card-icon">📝</div>
              <div className="card-content">
                <span className="card-value">{analytics.totalSurveys}</span>
                <span className="card-label">Total Surveys</span>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">🎓</div>
              <div className="card-content">
                <span className="card-value">{analytics.certificatesIssued}</span>
                <span className="card-label">Certificates Issued</span>
              </div>
            </div>
            <div className="overview-card recommend">
              <div className="card-icon">👍</div>
              <div className="card-content">
                <span className="card-value">
                  {Math.round((analytics.recommendCount / analytics.totalSurveys) * 100)}%
                </span>
                <span className="card-label">Would Recommend</span>
              </div>
            </div>
          </div>

          {/* Rating Summary */}
          <div className="ratings-section">
            <h2>Average Ratings</h2>
            <div className="ratings-grid">
              <div className="rating-item">
                <span className="rating-label">Overall Satisfaction</span>
                {renderStars(analytics.avgOverallSatisfaction)}
              </div>
              <div className="rating-item">
                <span className="rating-label">Content Quality</span>
                {renderStars(analytics.avgContentQuality)}
              </div>
              <div className="rating-item">
                <span className="rating-label">Teaching Effectiveness</span>
                {renderStars(analytics.avgTeachingEffectiveness)}
              </div>
              <div className="rating-item">
                <span className="rating-label">Course Material Quality</span>
                {renderStars(analytics.avgCourseMaterialQuality)}
              </div>
              <div className="rating-item">
                <span className="rating-label">Practical Application</span>
                {renderStars(analytics.avgPracticalApplication)}
              </div>
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div className="difficulty-section">
            <h2>Difficulty Distribution</h2>
            <div className="difficulty-bars">
              {difficultyDistribution.map(item => (
                <div key={item._id} className="difficulty-bar">
                  <span className="difficulty-label">{getDifficultyLabel(item._id)}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${(item.count / surveys.length) * 100}%`,
                        backgroundColor: item._id === 'appropriate' ? '#38a169' : 
                                        item._id === 'too_difficult' || item._id === 'too_easy' ? '#e53e3e' : '#f6ad55'
                      }}
                    ></div>
                  </div>
                  <span className="difficulty-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Surveys */}
          <div className="surveys-section">
            <h2>Individual Responses ({surveys.length})</h2>
            <div className="surveys-list">
              {surveys.map(survey => (
                <div 
                  key={survey._id} 
                  className="survey-item"
                  onClick={() => setSelectedSurvey(selectedSurvey?._id === survey._id ? null : survey)}
                >
                  <div className="survey-header">
                    <div className="student-info">
                      <span className="student-name">{survey.student?.name || 'Anonymous'}</span>
                      <span className="survey-date">
                        {new Date(survey.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="survey-quick-stats">
                      <span className="quick-rating">
                        ★ {survey.overallSatisfaction}
                      </span>
                      <span className={`recommend-badge ${survey.recommendToOthers ? 'yes' : 'no'}`}>
                        {survey.recommendToOthers ? '👍 Recommends' : '👎 Not Recommended'}
                      </span>
                    </div>
                  </div>

                  {selectedSurvey?._id === survey._id && (
                    <div className="survey-details">
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Overall Satisfaction</label>
                          {renderStars(survey.overallSatisfaction)}
                        </div>
                        <div className="detail-item">
                          <label>Content Quality</label>
                          {renderStars(survey.contentQuality)}
                        </div>
                        <div className="detail-item">
                          <label>Teaching Effectiveness</label>
                          {renderStars(survey.teachingEffectiveness)}
                        </div>
                        <div className="detail-item">
                          <label>Course Material</label>
                          {renderStars(survey.courseMaterialQuality)}
                        </div>
                        <div className="detail-item">
                          <label>Practical Application</label>
                          {renderStars(survey.practicalApplication)}
                        </div>
                        <div className="detail-item">
                          <label>Difficulty</label>
                          <span className="difficulty-badge">
                            {getDifficultyLabel(survey.difficultyLevel)}
                          </span>
                        </div>
                      </div>

                      <div className="feedback-section">
                        <div className="feedback-item">
                          <h4>What They Learned</h4>
                          <p>{survey.whatYouLearned}</p>
                        </div>
                        <div className="feedback-item">
                          <h4>Suggested Improvements</h4>
                          <p>{survey.improvements}</p>
                        </div>
                        {survey.additionalComments && (
                          <div className="feedback-item">
                            <h4>Additional Comments</h4>
                            <p>{survey.additionalComments}</p>
                          </div>
                        )}
                      </div>

                      <div className="attendance-info">
                        <span>Attendance: {survey.courseStats?.attendancePercentage}%</span>
                        <span>Days Attended: {survey.courseStats?.attendedDays}/{survey.courseStats?.totalDays}</span>
                        {survey.certificateIssued && (
                          <span className="cert-issued">✓ Certificate Issued</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SurveyAnalytics;
