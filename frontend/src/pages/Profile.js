import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    rollNumber: '',
    branch: '',
    section: '',
    department: '',
    designation: '',
    phone: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      const userData = response.data;
      setFormData({
        name: userData.name || '',
        bio: userData.bio || '',
        rollNumber: userData.rollNumber || '',
        branch: userData.branch || '',
        section: userData.section || '',
        department: userData.department || '',
        designation: userData.designation || '',
        phone: userData.phone || ''
      });
      setPreview(userData.profilePicture || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('bio', formData.bio);
      
      if (user.role === 'student') {
        formDataToSend.append('rollNumber', formData.rollNumber);
        formDataToSend.append('branch', formData.branch);
        formDataToSend.append('section', formData.section);
      } else {
        formDataToSend.append('department', formData.department);
        formDataToSend.append('designation', formData.designation);
        formDataToSend.append('phone', formData.phone);
      }

      if (profilePicture) {
        formDataToSend.append('profilePicture', profilePicture);
      }

      const response = await api.put('/users/profile', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      updateUser(response.data.user);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile Settings</h1>
        <p>Update your profile information and preferences.</p>
      </div>

      <div className="profile-card">
        <form onSubmit={handleSubmit}>
          <div className="profile-picture-section">
            <div className="avatar-preview">
              {preview ? (
                <img src={preview} alt="Profile" />
              ) : (
                <span>{formData.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="file-upload">
              <label htmlFor="profilePicture" className="file-label">
                Change Picture
              </label>
              <input
                type="file"
                id="profilePicture"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {user?.role === 'student' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <input
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          {user?.role === 'teacher' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;

