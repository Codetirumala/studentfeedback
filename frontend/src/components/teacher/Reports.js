import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FiDownload, FiFileText, FiFile } from 'react-icons/fi';
import './Reports.css';

const Reports = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportType, setReportType] = useState('attendance');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/my-courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleGenerateReport = async (format) => {
    if (!selectedCourse && reportType !== 'enrollment') {
      alert('Please select a course');
      return;
    }

    try {
      // In a real implementation, this would generate and download the report
      alert(`${reportType} report will be generated in ${format} format`);
      // Here you would make an API call to generate the report
    } catch (error) {
      alert('Failed to generate report');
    }
  };

  return (
    <div className="reports">
      <div className="page-header">
        <h1>Reports & Downloads</h1>
        <p>Generate and download various reports for your courses.</p>
      </div>

      <div className="reports-content">
        <div className="report-generator">
          <h2>Generate Report</h2>
          <div className="report-form">
            <div className="form-group">
              <label>Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="attendance">Attendance Report</option>
                <option value="enrollment">Enrollment Report</option>
                <option value="analytics">Course Analytics Report</option>
              </select>
            </div>

            {reportType !== 'enrollment' && (
              <div className="form-group">
                <label>Select Course</label>
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.title}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'attendance' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="report-actions">
              <button className="btn-primary" onClick={() => handleGenerateReport('pdf')}>
                <FiFileText /> Generate PDF
              </button>
              <button className="btn-primary" onClick={() => handleGenerateReport('excel')}>
                <FiFile /> Export Excel
              </button>
            </div>
          </div>
        </div>

        <div className="report-history">
          <h2>Report History</h2>
          <div className="history-list">
            <div className="history-item">
              <div className="history-info">
                <FiFileText className="history-icon" />
                <div>
                  <h3>Attendance Report - Machine Learning</h3>
                  <p>Generated on {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <button className="btn-download">
                <FiDownload /> Download
              </button>
            </div>
            <div className="history-item">
              <div className="history-info">
                <FiFile className="history-icon" />
                <div>
                  <h3>Enrollment Report</h3>
                  <p>Generated on {new Date(Date.now() - 86400000).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="btn-download">
                <FiDownload /> Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

