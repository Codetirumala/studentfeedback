import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { FiDownload, FiFileText, FiFile, FiEye, FiX, FiImage, FiCamera } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './Reports.css';

const Reports = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [reportType, setReportType] = useState('attendance');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(null);

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

  const fetchReportData = useCallback(async () => {
    if (!selectedCourse) {
      alert('Please select a course');
      return null;
    }
    setLoading(true);
    try {
      const response = await api.get(`/attendance/report/${selectedCourse}`);
      setReportData(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching report data:', error);
      alert('Failed to fetch report data');
      setLoading(false);
      return null;
    }
  }, [selectedCourse]);

  const handlePreview = async () => {
    const data = await fetchReportData();
    if (data) {
      setShowPreview(true);
    }
  };

  // Convert image URL to base64 for PDF embedding
  const getImageBase64 = async (url) => {
    if (!url) return null;
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  };

  const handleGeneratePDF = async () => {
    let data = reportData;
    if (!data) {
      data = await fetchReportData();
      if (!data) return;
    }

    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      // Title page
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Report', pageWidth / 2, 30, { align: 'center' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(data.course.title, pageWidth / 2, 42, { align: 'center' });

      doc.setFontSize(12);
      doc.text(`Course Code: ${data.course.courseCode || 'N/A'}`, margin, 58);
      doc.text(`Teacher: ${data.course.teacher}`, margin, 66);
      doc.text(`Total Days: ${data.course.totalDays}`, margin, 74);
      doc.text(`Total Students: ${data.totalStudents}`, margin, 82);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 90);

      // Student Summary Table
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Summary', margin, 108);

      const summaryHeaders = [['#', 'Name', 'Roll No', 'Branch', 'Section', 'Present', 'Absent', '%']];
      const summaryRows = data.studentSummary.map((s, i) => [
        i + 1,
        s.name,
        s.rollNumber || '-',
        s.branch || '-',
        s.section || '-',
        s.presentDays,
        s.absentDays,
        `${s.percentage}%`
      ]);

      doc.autoTable({
        head: summaryHeaders,
        body: summaryRows,
        startY: 114,
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 10 },
          5: { cellWidth: 16 },
          6: { cellWidth: 16 },
          7: { cellWidth: 14 }
        },
        margin: { left: margin, right: margin }
      });

      // Day-wise pages with images
      for (const day of data.daysData) {
        doc.addPage();

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Day ${day.dayNumber}: ${day.sectionTitle}`, margin, 20);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Present: ${day.presentCount} | Absent: ${day.absentCount} | Total: ${day.totalStudents}`, margin, 28);

        let currentY = 36;

        // Add class image and attendance sheet image side by side
        const imgWidth = (pageWidth - margin * 3) / 2;
        const imgHeight = 55;

        let classImgBase64 = null;
        let sheetImgBase64 = null;

        if (day.classImage) {
          classImgBase64 = await getImageBase64(day.classImage);
        }
        if (day.attendanceSheetImage) {
          sheetImgBase64 = await getImageBase64(day.attendanceSheetImage);
        }

        // Draw image placeholders/images
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Class Image', margin, currentY);
        doc.text('Attendance Sheet', margin + imgWidth + margin, currentY);
        currentY += 3;

        if (classImgBase64) {
          try {
            doc.addImage(classImgBase64, 'JPEG', margin, currentY, imgWidth, imgHeight);
          } catch (e) {
            doc.setDrawColor(200);
            doc.setFillColor(248, 249, 250);
            doc.rect(margin, currentY, imgWidth, imgHeight, 'FD');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Image unavailable', margin + imgWidth / 2, currentY + imgHeight / 2, { align: 'center' });
          }
        } else {
          doc.setDrawColor(200);
          doc.setFillColor(248, 249, 250);
          doc.rect(margin, currentY, imgWidth, imgHeight, 'FD');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150);
          doc.text('No class image', margin + imgWidth / 2, currentY + imgHeight / 2, { align: 'center' });
          doc.setTextColor(0);
        }

        if (sheetImgBase64) {
          try {
            doc.addImage(sheetImgBase64, 'JPEG', margin + imgWidth + margin, currentY, imgWidth, imgHeight);
          } catch (e) {
            doc.setDrawColor(200);
            doc.setFillColor(248, 249, 250);
            doc.rect(margin + imgWidth + margin, currentY, imgWidth, imgHeight, 'FD');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Image unavailable', margin + imgWidth + margin + imgWidth / 2, currentY + imgHeight / 2, { align: 'center' });
          }
        } else {
          doc.setDrawColor(200);
          doc.setFillColor(248, 249, 250);
          doc.rect(margin + imgWidth + margin, currentY, imgWidth, imgHeight, 'FD');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150);
          doc.text('No sheet image', margin + imgWidth + margin + imgWidth / 2, currentY + imgHeight / 2, { align: 'center' });
          doc.setTextColor(0);
        }

        currentY += imgHeight + 8;

        // Day attendance table
        const dayHeaders = [['#', 'Name', 'Roll No', 'Branch', 'Section', 'Status']];
        const dayRows = day.students.map((s, i) => [
          i + 1,
          s.name,
          s.rollNumber || '-',
          s.branch || '-',
          s.section || '-',
          s.status === 'present' ? 'Present' : s.status === 'absent' ? 'Absent' : 'Not Marked'
        ]);

        doc.autoTable({
          head: dayHeaders,
          body: dayRows,
          startY: currentY,
          styles: { fontSize: 9, cellPadding: 2.5, font: 'helvetica' },
          headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { cellWidth: 10 },
            5: { cellWidth: 22 }
          },
          margin: { left: margin, right: margin },
          didParseCell: function (hookData) {
            if (hookData.section === 'body' && hookData.column.index === 5) {
              const val = hookData.cell.raw;
              if (val === 'Present') {
                hookData.cell.styles.textColor = [22, 163, 74];
                hookData.cell.styles.fontStyle = 'bold';
              } else if (val === 'Absent') {
                hookData.cell.styles.textColor = [220, 38, 38];
                hookData.cell.styles.fontStyle = 'bold';
              } else {
                hookData.cell.styles.textColor = [150, 150, 150];
              }
            }
          }
        });
      }

      doc.save(`Attendance_Report_${data.course.courseCode || data.course.title}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
    setLoading(false);
  };

  const handleExportExcel = async () => {
    let data = reportData;
    if (!data) {
      data = await fetchReportData();
      if (!data) return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Student Summary
      const summaryData = [
        ['Attendance Report - ' + data.course.title],
        ['Course Code: ' + (data.course.courseCode || 'N/A'), 'Teacher: ' + data.course.teacher],
        ['Total Days: ' + data.course.totalDays, 'Total Students: ' + data.totalStudents],
        ['Generated: ' + new Date().toLocaleDateString()],
        [],
        ['#', 'Name', 'Roll No', 'Branch', 'Section', 'Present Days', 'Absent Days', 'Total Days', 'Attendance %']
      ];

      data.studentSummary.forEach((s, i) => {
        summaryData.push([
          i + 1, s.name, s.rollNumber || '-', s.branch || '-', s.section || '-',
          s.presentDays, s.absentDays, s.totalDays, `${s.percentage}%`
        ]);
      });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
        { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Sheet 2: Day-wise detail
      const dayDetailHeaders = ['Day', 'Section Title', 'Student Name', 'Roll No', 'Branch', 'Section', 'Status'];
      const dayDetailData = [dayDetailHeaders];

      data.daysData.forEach(day => {
        day.students.forEach(s => {
          dayDetailData.push([
            day.dayNumber,
            day.sectionTitle,
            s.name,
            s.rollNumber || '-',
            s.branch || '-',
            s.section || '-',
            s.status === 'present' ? 'Present' : s.status === 'absent' ? 'Absent' : 'Not Marked'
          ]);
        });
      });

      const dayWs = XLSX.utils.aoa_to_sheet(dayDetailData);
      dayWs['!cols'] = [
        { wch: 6 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, dayWs, 'Day-wise Detail');

      // Sheet 3: Cross-tab (students as rows, days as columns)
      const crossHeaders = ['Name', 'Roll No', 'Branch', 'Section'];
      for (let d = 1; d <= data.course.totalDays; d++) {
        crossHeaders.push(`Day ${d}`);
      }
      crossHeaders.push('Present', 'Absent', '%');

      const crossData = [crossHeaders];
      data.studentSummary.forEach(student => {
        const row = [student.name, student.rollNumber || '-', student.branch || '-', student.section || '-'];
        for (let d = 1; d <= data.course.totalDays; d++) {
          const dayData = data.daysData.find(dd => dd.dayNumber === d);
          if (dayData) {
            const stu = dayData.students.find(s => s.name === student.name && s.rollNumber === student.rollNumber);
            row.push(stu ? (stu.status === 'present' ? 'P' : stu.status === 'absent' ? 'A' : '-') : '-');
          } else {
            row.push('-');
          }
        }
        row.push(student.presentDays, student.absentDays, `${student.percentage}%`);
        crossData.push(row);
      });

      const crossWs = XLSX.utils.aoa_to_sheet(crossData);
      XLSX.utils.book_append_sheet(wb, crossWs, 'Cross Tab');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Attendance_Report_${data.course.courseCode || data.course.title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel');
    }
  };

  const renderPreview = () => {
    if (!reportData || !showPreview) return null;
    const data = reportData;

    return (
      <div className="report-preview-overlay">
        <div className="report-preview-container">
          <div className="preview-header">
            <h2>Attendance Report Preview</h2>
            <div className="preview-header-actions">
              <button className="btn-primary" onClick={handleGeneratePDF} disabled={loading}>
                <FiFileText /> Download PDF
              </button>
              <button className="btn-primary btn-excel" onClick={handleExportExcel} disabled={loading}>
                <FiFile /> Export Excel
              </button>
              <button className="btn-close-preview" onClick={() => setShowPreview(false)}>
                <FiX />
              </button>
            </div>
          </div>

          <div className="preview-body">
            {/* Course Header */}
            <div className="preview-course-header">
              <h1>{data.course.title}</h1>
              <div className="preview-meta">
                <span>Course Code: <strong>{data.course.courseCode || 'N/A'}</strong></span>
                <span>Teacher: <strong>{data.course.teacher}</strong></span>
                <span>Total Days: <strong>{data.course.totalDays}</strong></span>
                <span>Students: <strong>{data.totalStudents}</strong></span>
              </div>
            </div>

            {/* Student Summary */}
            <div className="preview-section">
              <h3>Student Summary</h3>
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Roll No</th>
                      <th>Branch</th>
                      <th>Section</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studentSummary.map((s, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{s.name}</td>
                        <td>{s.rollNumber || '-'}</td>
                        <td>{s.branch || '-'}</td>
                        <td>{s.section || '-'}</td>
                        <td className="text-success">{s.presentDays}</td>
                        <td className="text-danger">{s.absentDays}</td>
                        <td>
                          <span className={`percentage-badge ${s.percentage >= 75 ? 'good' : s.percentage >= 50 ? 'warn' : 'bad'}`}>
                            {s.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Day-wise Details with Images */}
            {data.daysData.map(day => (
              <div className="preview-section preview-day-section" key={day.dayNumber}>
                <div className="day-section-header">
                  <h3>Day {day.dayNumber}: {day.sectionTitle}</h3>
                  <div className="day-stats">
                    <span className="stat-present">Present: {day.presentCount}</span>
                    <span className="stat-absent">Absent: {day.absentCount}</span>
                    <span className="stat-total">Total: {day.totalStudents}</span>
                  </div>
                </div>

                {/* Day Images */}
                <div className="day-images-row">
                  <div className="day-image-card">
                    <div className="day-image-label"><FiCamera /> Class Image</div>
                    {day.classImage ? (
                      <img
                        src={day.classImage}
                        alt={`Day ${day.dayNumber} Class`}
                        className="day-image-preview"
                        onClick={() => setPreviewImageModal(day.classImage)}
                      />
                    ) : (
                      <div className="day-image-empty">
                        <FiImage />
                        <span>No class image</span>
                      </div>
                    )}
                  </div>
                  <div className="day-image-card">
                    <div className="day-image-label"><FiFileText /> Attendance Sheet</div>
                    {day.attendanceSheetImage ? (
                      <img
                        src={day.attendanceSheetImage}
                        alt={`Day ${day.dayNumber} Sheet`}
                        className="day-image-preview"
                        onClick={() => setPreviewImageModal(day.attendanceSheetImage)}
                      />
                    ) : (
                      <div className="day-image-empty">
                        <FiImage />
                        <span>No sheet image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Day Attendance Table */}
                <div className="preview-table-wrapper">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Roll No</th>
                        <th>Branch</th>
                        <th>Section</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.students.map((s, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{s.name}</td>
                          <td>{s.rollNumber || '-'}</td>
                          <td>{s.branch || '-'}</td>
                          <td>{s.section || '-'}</td>
                          <td>
                            <span className={`status-badge ${s.status}`}>
                              {s.status === 'present' ? 'Present' : s.status === 'absent' ? 'Absent' : 'Not Marked'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Image Modal */}
        {previewImageModal && (
          <div className="image-modal-overlay" onClick={() => setPreviewImageModal(null)}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="image-modal-close" onClick={() => setPreviewImageModal(null)}><FiX /></button>
              <img src={previewImageModal} alt="Full size" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="reports">
      <div className="page-header">
        <h1>Reports & Downloads</h1>
        <p>Generate and download attendance reports with class images for your courses.</p>
      </div>

      <div className="reports-content">
        <div className="report-generator">
          <h2>Generate Report</h2>
          <div className="report-form">
            <div className="form-group">
              <label>Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="attendance">Attendance Report</option>
              </select>
            </div>

            <div className="form-group">
              <label>Select Course</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                <option value="">-- Select a Course --</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>{course.title}</option>
                ))}
              </select>
            </div>

            <div className="report-actions">
              <button className="btn-primary btn-preview" onClick={handlePreview} disabled={loading || !selectedCourse}>
                <FiEye /> {loading ? 'Loading...' : 'Preview Report'}
              </button>
            </div>
            <div className="report-actions">
              <button className="btn-primary" onClick={handleGeneratePDF} disabled={loading || !selectedCourse}>
                <FiFileText /> {loading ? 'Generating...' : 'Download PDF'}
              </button>
              <button className="btn-primary btn-excel" onClick={handleExportExcel} disabled={loading || !selectedCourse}>
                <FiFile /> Export Excel
              </button>
            </div>
            <p className="report-note">
              <strong>Note:</strong> PDF includes class images & attendance sheet images. Excel contains data only (no images).
            </p>
          </div>
        </div>

        <div className="report-info">
          <h2>Report Details</h2>
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon pdf-icon"><FiFileText /></div>
              <div>
                <h4>PDF Report</h4>
                <p>Includes student summary, day-wise attendance tables, class images, and attendance sheet images for each day.</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon excel-icon"><FiFile /></div>
              <div>
                <h4>Excel Export</h4>
                <p>Contains summary sheet, day-wise detail sheet, and a cross-tab sheet. No images included in Excel.</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon preview-icon"><FiEye /></div>
              <div>
                <h4>Preview</h4>
                <p>Preview the full report with images before downloading. Click on any image to view full size.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderPreview()}
    </div>
  );
};

export default Reports;

