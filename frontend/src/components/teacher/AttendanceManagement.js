import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { FiCheck, FiX, FiSave, FiCamera, FiFileText, FiUpload, FiImage } from 'react-icons/fi';
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
  const [dayImages, setDayImages] = useState({ classImage: '', attendanceSheetImage: '' });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const classImageRef = useRef(null);
  const sheetImageRef = useRef(null);

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
      fetchDayImages();
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

  const fetchDayImages = async () => {
    try {
      const response = await api.get(`/attendance/day-images/${selectedCourse}/${selectedDay}`);
      setDayImages({
        classImage: response.data.classImage || '',
        attendanceSheetImage: response.data.attendanceSheetImage || ''
      });
    } catch (error) {
      console.error('Error fetching day images:', error);
      setDayImages({ classImage: '', attendanceSheetImage: '' });
    }
  };

  const handleImageUpload = async (type) => {
    const fileInput = type === 'classImage' ? classImageRef.current : sheetImageRef.current;
    if (!fileInput || !fileInput.files[0]) return;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append(type, file);
    formData.append('courseId', selectedCourse);
    formData.append('dayNumber', selectedDay);

    try {
      setUploadingImages(true);
      const response = await api.post('/attendance/day-images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDayImages({
        classImage: response.data.dayImage.classImage || '',
        attendanceSheetImage: response.data.dayImage.attendanceSheetImage || ''
      });
      alert(`${type === 'classImage' ? 'Class photo' : 'Attendance sheet'} uploaded successfully!`);
      // Reset file input
      fileInput.value = '';
    } catch (error) {
      alert('Failed to upload image. Please try again.');
      console.error('Image upload error:', error);
    } finally {
      setUploadingImages(false);
    }
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
              setDayImages({ classImage: '', attendanceSheetImage: '' });
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
          <div className="day-images-section">
            <div className="day-images-row">
              <span className="day-images-title"><FiImage /> Day {selectedDay} Photos</span>
              <div className="day-images-thumbs">
                {/* Class Photo Thumb */}
                <div className="thumb-box">
                  {dayImages.classImage ? (
                    <>
                      <span className="thumb-check"><FiCheck size={12} /></span>
                      <img
                        src={dayImages.classImage}
                        alt="Class"
                        className="thumb-img"
                        onClick={() => setPreviewImage({ url: dayImages.classImage, title: 'Class Photo' })}
                      />
                    </>
                  ) : (
                    <label className="thumb-empty">
                      <FiCamera size={20} />
                      <span className="thumb-empty-text">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={classImageRef}
                        onChange={() => handleImageUpload('classImage')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                  <span className="thumb-label">Class</span>
                  {dayImages.classImage && (
                    <label className="thumb-change">
                      <FiUpload size={11} />
                      <input
                        type="file"
                        accept="image/*"
                        ref={classImageRef}
                        onChange={() => handleImageUpload('classImage')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                {/* Attendance Sheet Thumb */}
                <div className="thumb-box">
                  {dayImages.attendanceSheetImage ? (
                    <>
                      <span className="thumb-check"><FiCheck size={12} /></span>
                      <img
                        src={dayImages.attendanceSheetImage}
                        alt="Sheet"
                        className="thumb-img"
                        onClick={() => setPreviewImage({ url: dayImages.attendanceSheetImage, title: 'Attendance Sheet' })}
                      />
                    </>
                  ) : (
                    <label className="thumb-empty">
                      <FiFileText size={20} />
                      <span className="thumb-empty-text">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={sheetImageRef}
                        onChange={() => handleImageUpload('attendanceSheetImage')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                  <span className="thumb-label">Sheet</span>
                  {dayImages.attendanceSheetImage && (
                    <label className="thumb-change">
                      <FiUpload size={11} />
                      <input
                        type="file"
                        accept="image/*"
                        ref={sheetImageRef}
                        onChange={() => handleImageUpload('attendanceSheetImage')}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>
              {uploadingImages && (
                <div className="upload-progress-inline">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
          </div>

          {/* Full Image Preview Modal */}
          {previewImage && (
            <div className="image-modal-overlay" onClick={() => setPreviewImage(null)}>
              <div className="image-modal" onClick={(e) => e.stopPropagation()}>
                <div className="image-modal-header">
                  <span>{previewImage.title}</span>
                  <button onClick={() => setPreviewImage(null)}><FiX /></button>
                </div>
                <div className="image-modal-body">
                  <img src={previewImage.url} alt={previewImage.title} />
                </div>
              </div>
            </div>
          )}

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

