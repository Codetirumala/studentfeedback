import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { FiArrowLeft, FiSend, FiCheckCircle } from 'react-icons/fi';
import './CourseEvaluation.css';

const CourseEvaluation = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});

  const questions = [
    { key: 'q1', text: 'How clearly were the objectives of the training program explained?' },
    { key: 'q2', text: 'How well was the program structured?' },
    { key: 'q3', text: 'Was the duration of the program appropriate?' },
    { key: 'q4', text: 'How relevant was the course content to your needs?' },
    { key: 'q5', text: 'How would you rate the quality of learning materials?' },
    { key: 'q6', text: 'How understandable was the content delivered?' },
    { key: 'q7', text: 'How knowledgeable was the trainer?' },
    { key: 'q8', text: "How effective was the trainer's explanation style?" },
    { key: 'q9', text: 'How well did the trainer encourage interaction?' },
    { key: 'q10', text: 'How engaging were the sessions?' },
    { key: 'q11', text: 'Did activities or discussions help your understanding?' },
    { key: 'q12', text: 'How motivated were you to attend all sessions?' },
    { key: 'q13', text: 'How much knowledge or skill did you gain?' },
    { key: 'q14', text: 'How confident do you feel after completing the program?' },
    { key: 'q15', text: 'How useful is this program for your future goals?' },
    { key: 'q16', text: 'What best describes your attendance?' },
    { key: 'q17', text: 'What was the main reason for missing any sessions?' },
    { key: 'q18', text: 'How convenient was the session schedule?' },
    { key: 'q19', text: 'Overall, how satisfied are you with the program?' },
    { key: 'q20', text: 'Would you recommend this program to others?' }
  ];

  const options = {
    q1: ['Very Clear', 'Clear', 'Neutral', 'Unclear', 'Very Unclear'],
    q2: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'],
    q3: ['Too Long', 'Slightly Long', 'Appropriate', 'Slightly Short', 'Too Short'],
    q4: ['Very Relevant', 'Relevant', 'Neutral', 'Less Relevant', 'Not Relevant'],
    q5: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'],
    q6: ['Very Easy to Understand', 'Easy to Understand', 'Neutral', 'Difficult', 'Very Difficult'],
    q7: ['Highly Knowledgeable', 'Knowledgeable', 'Neutral', 'Less Knowledgeable', 'Not Knowledgeable'],
    q8: ['Very Effective', 'Effective', 'Neutral', 'Ineffective', 'Very Ineffective'],
    q9: ['Very Well', 'Well', 'Neutral', 'Poorly', 'Very Poorly'],
    q10: ['Highly Engaging', 'Engaging', 'Neutral', 'Less Engaging', 'Not Engaging'],
    q11: ['Very Helpful', 'Helpful', 'Neutral', 'Less Helpful', 'Not Helpful'],
    q12: ['Highly Motivated', 'Motivated', 'Neutral', 'Less Motivated', 'Not Motivated'],
    q13: ['A Lot', 'Good Amount', 'Moderate', 'Little', 'None'],
    q14: ['Very Confident', 'Confident', 'Neutral', 'Less Confident', 'Not Confident'],
    q15: ['Very Useful', 'Useful', 'Neutral', 'Less Useful', 'Not Useful'],
    q16: ['Attended All Sessions', 'Missed 1–2 Sessions', 'Missed Several Sessions', 'Attended Few Sessions', 'Rarely Attended'],
    q17: ['No Sessions Missed', 'Timing Issues', 'Academic Workload', 'Personal Reasons', 'Technical Issues'],
    q18: ['Very Convenient', 'Convenient', 'Neutral', 'Inconvenient', 'Very Inconvenient'],
    q19: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
    q20: ['Definitely Yes', 'Probably Yes', 'Not Sure', 'Probably No', 'Definitely No']
  };

  useEffect(() => {
    fetchCourseAndCheck();
  }, [courseId]);

  const fetchCourseAndCheck = async () => {
    try {
      setLoading(true);
      // Fetch course details
      const courseRes = await api.get(`/courses/${courseId}`);
      setCourse(courseRes.data);

      // Check if already submitted
      try {
        const eligibility = await api.get(`/certificates/eligibility/${courseId}`);
        // If no pending course evaluation, it means already submitted
        const hasPendingEval = eligibility.data.pendingReviews?.some(
          r => r.type === 'course_evaluation'
        );
        if (!hasPendingEval && eligibility.data.completedDays > 0) {
          setSubmitted(true);
        }
      } catch (err) {
        console.log('Could not check eligibility');
      }
    } catch (err) {
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check all questions answered
    for (const q of questions) {
      if (!answers[q.key]) {
        setError(`Please answer question ${questions.indexOf(q) + 1}: "${q.text}"`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');
      await api.post('/evaluations', { courseId, answers });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const getProgress = () => {
    const answered = Object.keys(answers).length;
    return Math.round((answered / questions.length) * 100);
  };

  if (loading) {
    return (
      <div className="evaluation-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="evaluation-page">
        <div className="success-container">
          <div className="success-icon">
            <FiCheckCircle />
          </div>
          <h2>Evaluation Submitted!</h2>
          <p>Thank you for your valuable feedback.</p>
          <div className="success-actions">
            <button 
              className="btn-primary"
              onClick={() => navigate(`/student/certificate/${courseId}`)}
            >
              View Certificate Status
            </button>
            <button 
              className="btn-secondary"
              onClick={() => navigate('/student/courses')}
            >
              Back to My Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FiArrowLeft /> Back
      </button>

      <div className="evaluation-header">
        <h1>📋 Course Evaluation</h1>
        {course && (
          <div className="course-info-banner">
            <h2>{course.title}</h2>
            <p>Instructor: {course.teacher?.name || 'Unknown'}</p>
          </div>
        )}
      </div>

      <div className="progress-indicator">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${getProgress()}%` }}
          />
        </div>
        <span className="progress-text">
          {Object.keys(answers).length} of {questions.length} questions answered
        </span>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="evaluation-form" onSubmit={handleSubmit}>
        {questions.map((q, index) => (
          <div 
            key={q.key} 
            className={`question-card ${answers[q.key] ? 'answered' : ''}`}
          >
            <div className="question-number">{index + 1}</div>
            <div className="question-content">
              <label>{q.text}</label>
              <div className="options-grid">
                {options[q.key].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`option-btn ${answers[q.key] === opt ? 'selected' : ''}`}
                    onClick={() => handleChange(q.key, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="submit-section">
          <button 
            type="submit" 
            className="submit-btn"
            disabled={submitting || Object.keys(answers).length < questions.length}
          >
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                <FiSend /> Submit Evaluation
              </>
            )}
          </button>
          <p className="submit-note">
            Please answer all questions before submitting
          </p>
        </div>
      </form>
    </div>
  );
};

export default CourseEvaluation;
