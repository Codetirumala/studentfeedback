import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { FiCheck, FiX, FiSave } from 'react-icons/fi';
import './AttendanceManagement.css';

const AttendanceManagement = () => {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('all'); // all, absent-only, one-by-one

  useEffect(() => {
    fetchCourses();
    const courseId = searchParams.get('course');
    if (courseId) {
      setSelectedCourse(courseId);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedDay) {
      fetchAttendanceData();
    }
  }, [selectedCourse, selectedDay]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/my-courses');
      setCourses(response.data.filter(c => c.status === 'active'));
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance/course/${selectedCourse}/day/${selectedDay}`);
      const attendanceMap = {};
      response.data.forEach(item => {
        attendanceMap[item.student._id] = item.attendance?.status || 'present';
      });
      setAttendance(attendanceMap);
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status) => {
    const newAttendance = {};
    students.forEach(item => {
      newAttendance[item.student._id] = status;
    });
    setAttendance(newAttendance);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
        notes: ''
      }));

      await api.post('/attendance/mark', {
        courseId: selectedCourse,
        dayNumber: parseInt(selectedDay),
        attendanceData
      });

      alert('Attendance saved successfully!');
      fetchAttendanceData();
    } catch (error) {
      alert('Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseData = courses.find(c => c._id === selectedCourse);
  const filteredStudents = mode === 'absent-only' 
    ? students.filter(item => attendance[item.student._id] === 'absent')
    : students;

  return (
    <div className="attendance-management">
      <div className="page-header">
        <h1>Mark Attendance</h1>
      </div>

      <div className="attendance-controls">
        <div className="control-group">
          <label>Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedDay('');
              setStudents([]);
              setAttendance({});
            }}
          >
            <option value="">Select a course</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title} ({course.totalDays} days)
              </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <div className="control-group">
            <label>Select Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              <option value="">Select a day</option>
              {Array.from({ length: selectedCourseData?.totalDays || 0 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>Day {day}</option>
              ))}
            </select>
          </div>
        )}

        {selectedCourse && selectedDay && (
          <div className="control-group">
            <label>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="all">All Students</option>
              <option value="absent-only">Absent Only</option>
              <option value="one-by-one">One by One</option>
            </select>
          </div>
        )}
      </div>

      {selectedCourse && selectedDay && (
        <>
          <div className="quick-actions">
            <button className="btn-secondary" onClick={() => handleMarkAll('present')}>
              Mark All Present
            </button>
            <button className="btn-secondary" onClick={() => handleMarkAll('absent')}>
              Mark All Absent
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              <FiSave /> Save Attendance
            </button>
          </div>

          <div className="attendance-summary">
            <p>
              Present: {Object.values(attendance).filter(s => s === 'present').length} | 
              Absent: {Object.values(attendance).filter(s => s === 'absent').length} | 
              Total: {students.length}
            </p>
          </div>

          {students.length > 0 && (
            <div className="students-attendance">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((item) => (
                    <tr key={item.student._id}>
                      <td>{item.student.name}</td>
                      <td>{item.student.rollNumber || '-'}</td>
                      <td>
                        <span className={`status-badge ${attendance[item.student._id] || 'present'}`}>
                          {attendance[item.student._id] || 'present'}
                        </span>
                      </td>
                      <td>
                        <div className="status-buttons">
                          <button
                            type="button"
                            className={`btn-status ${attendance[item.student._id] === 'present' ? 'active present' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusChange(item.student._id, 'present');
                            }}
                          >
                            <FiCheck /> Present
                          </button>
                          <button
                            type="button"
                            className={`btn-status ${attendance[item.student._id] === 'absent' ? 'active absent' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStatusChange(item.student._id, 'absent');
                            }}
                          >
                            <FiX /> Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceManagement;

