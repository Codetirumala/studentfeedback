import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Auth.css';

const StudentEvaluation = () => {
  const { id } = useParams(); // course id
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setCourse(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const questions = [
    { key: 'q1', text: 'How clearly were the objectives of the training program explained?' },
    { key: 'q2', text: 'How well was the program structured?' },
    { key: 'q3', text: 'Was the duration of the program appropriate?' },
    { key: 'q4', text: 'How relevant was the course content to your needs?' },
    { key: 'q5', text: 'How would you rate the quality of learning materials?' },
    { key: 'q6', text: 'How understandable was the content delivered?' },
    { key: 'q7', text: 'How knowledgeable was the trainer?' },
    { key: 'q8', text: 'How effective was the trainer’s explanation style?' },
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
    q1: ['Very Clear','Clear','Neutral','Unclear','Very Unclear'],
    q2: ['Excellent','Good','Average','Poor','Very Poor'],
    q3: ['Too Long','Slightly Long','Appropriate','Slightly Short','Too Short'],
    q4: ['Very Relevant','Relevant','Neutral','Less Relevant','Not Relevant'],
    q5: ['Excellent','Good','Average','Poor','Very Poor'],
    q6: ['Very Easy to Understand','Easy to Understand','Neutral','Difficult','Very Difficult'],
    q7: ['Highly Knowledgeable','Knowledgeable','Neutral','Less Knowledgeable','Not Knowledgeable'],
    q8: ['Very Effective','Effective','Neutral','Ineffective','Very Ineffective'],
    q9: ['Very Well','Well','Neutral','Poorly','Very Poorly'],
    q10: ['Highly Engaging','Engaging','Neutral','Less Engaging','Not Engaging'],
    q11: ['Very Helpful','Helpful','Neutral','Less Helpful','Not Helpful'],
    q12: ['Highly Motivated','Motivated','Neutral','Less Motivated','Not Motivated'],
    q13: ['A Lot','Good Amount','Moderate','Little','None'],
    q14: ['Very Confident','Confident','Neutral','Less Confident','Not Confident'],
    q15: ['Very Useful','Useful','Neutral','Less Useful','Not Useful'],
    q16: ['Attended All Sessions','Missed 1–2 Sessions','Missed Several Sessions','Attended Few Sessions','Rarely Attended'],
    q17: ['No Sessions Missed','Timing Issues','Academic Workload','Personal Reasons','Technical Issues'],
    q18: ['Very Convenient','Convenient','Neutral','Inconvenient','Very Inconvenient'],
    q19: ['Very Satisfied','Satisfied','Neutral','Dissatisfied','Very Dissatisfied'],
    q20: ['Definitely Yes','Probably Yes','Not Sure','Probably No','Definitely No']
  };

  const handleChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure all questions answered
      for (let i = 0; i < questions.length; i++) {
        const key = questions[i].key;
        if (!answers[key]) {
          alert('Please answer all questions');
          return;
        }
      }

      await api.post('/evaluations', { courseId: id, answers });
      alert('Evaluation submitted. Thank you!');
      navigate(`/student/course/${id}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit evaluation');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="auth-container">
      <h2>Course Evaluation: {course.title}</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {questions.map(q => (
          <div key={q.key} className="form-row">
            <label>{q.text}</label>
            <select value={answers[q.key] || ''} onChange={(e) => handleChange(q.key, e.target.value)}>
              <option value="">Select</option>
              {options[q.key].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}

        <div className="form-actions">
          <button type="submit" className="btn-primary">Submit Evaluation</button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default StudentEvaluation;
