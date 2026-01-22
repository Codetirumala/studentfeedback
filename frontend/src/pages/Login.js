import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPendingApproval(null);
    setLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      if (user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/teacher/dashboard');
      }
    } catch (err) {
      if (err.response?.data?.pendingApproval) {
        setPendingApproval(err.response.data);
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show pending approval screen
  if (pendingApproval) {
    return (
      <div className="auth-container">
        <div className="auth-card pending-card">
          <div className="pending-icon">⏳</div>
          <h1>Approval Pending</h1>
          <div className="pending-info">
            <p className="pending-name">Welcome, {pendingApproval.userInfo?.name}!</p>
            <p className="pending-message">
              Your teacher account is currently under review. An administrator will verify your account shortly.
            </p>
          </div>
          <div className="pending-details">
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{pendingApproval.userInfo?.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Role:</span>
              <span className="detail-value">Teacher</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value status-pending">⏳ Pending Verification</span>
            </div>
          </div>
          <p className="pending-note">
            You will be able to access the Teacher Portal once your account is approved.
          </p>
          <button 
            className="btn-secondary" 
            onClick={() => setPendingApproval(null)}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

