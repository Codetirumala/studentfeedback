import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { FiCheck, FiX, FiUser } from 'react-icons/fi';
import './Enrollments.css';

const Enrollments = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('status') || 'pending';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [approvedEnrollments, setApprovedEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetchEnrollments();
  }, [activeTab]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      if (activeTab === 'pending') {
        const response = await api.get('/enrollments/pending');
        setPendingEnrollments(response.data);
      } else {
        const response = await api.get('/enrollments/approved');
        setApprovedEnrollments(response.data);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (enrollmentId) => {
    try {
      await api.put(`/enrollments/${enrollmentId}/approve`);
      fetchEnrollments();
    } catch (error) {
      alert('Failed to approve enrollment');
    }
  };

  const handleReject = async (enrollmentId) => {
    if (window.confirm('Are you sure you want to reject this enrollment?')) {
      try {
        await api.put(`/enrollments/${enrollmentId}/reject`);
        fetchEnrollments();
      } catch (error) {
        alert('Failed to reject enrollment');
      }
    }
  };

  const handleBulkAction = async (action) => {
    if (selected.length === 0) {
      alert('Please select enrollments');
      return;
    }

    try {
      await api.post('/enrollments/bulk-action', {
        enrollmentIds: selected,
        action
      });
      setSelected([]);
      fetchEnrollments();
    } catch (error) {
      alert(`Failed to ${action} enrollments`);
    }
  };

  const enrollments = activeTab === 'pending' ? pendingEnrollments : approvedEnrollments;

  return (
    <div className="enrollments">
      <div className="page-header">
        <h1>Enrollment Management</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Enrollments ({pendingEnrollments.length})
        </button>
        <button
          className={`tab ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved Enrollments ({approvedEnrollments.length})
        </button>
      </div>

      {activeTab === 'pending' && selected.length > 0 && (
        <div className="bulk-actions">
          <span>{selected.length} selected</span>
          <button className="btn-success" onClick={() => handleBulkAction('approve')}>
            Approve Selected
          </button>
          <button className="btn-danger" onClick={() => handleBulkAction('reject')}>
            Reject Selected
          </button>
        </div>
      )}

        <div className="enrollments-table">
          <table>
            <thead>
              <tr>
                {activeTab === 'pending' && <th><input type="checkbox" onChange={(e) => {
                  if (e.target.checked) {
                    setSelected(enrollments.map(e => e._id));
                  } else {
                    setSelected([]);
                  }
                }} /></th>}
                <th>Student Name</th>
                <th>Email</th>
                <th>Course</th>
                <th>Enrollment Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'pending' ? 7 : 6} className="empty-state">
                    No {activeTab} enrollments
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr key={enrollment._id}>
                    {activeTab === 'pending' && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(enrollment._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelected([...selected, enrollment._id]);
                            } else {
                              setSelected(selected.filter(id => id !== enrollment._id));
                            }
                          }}
                        />
                      </td>
                    )}
                    <td>
                      <div className="student-info">
                        {enrollment.student.profilePicture ? (
                          <img src={enrollment.student.profilePicture} alt={enrollment.student.name} />
                        ) : (
                          <div className="avatar"><FiUser /></div>
                        )}
                        <span>{enrollment.student.name}</span>
                      </div>
                    </td>
                    <td>{enrollment.student.email}</td>
                    <td>{enrollment.course?.title || 'N/A'}</td>
                    <td>{new Date(enrollment.enrolledAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${enrollment.status}`}>
                        {enrollment.status}
                      </span>
                    </td>
                    <td>
                      {activeTab === 'pending' && (
                        <div className="action-buttons">
                          <button
                            className="btn-icon success"
                            onClick={() => handleApprove(enrollment._id)}
                          >
                            <FiCheck /> Approve
                          </button>
                          <button
                            className="btn-icon danger"
                            onClick={() => handleReject(enrollment._id)}
                          >
                            <FiX /> Reject
                          </button>
                        </div>
                      )}
                      {activeTab === 'approved' && (
                        <span>Progress: {enrollment.progress}%</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
};

export default Enrollments;

