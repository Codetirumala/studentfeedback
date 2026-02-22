import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FiCalendar, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './StudentTimetable.css';

const StudentTimetable = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/my-courses');
      const allCourses = response.data || [];
      
      // Filter out past/completed courses
      const now = new Date();
      const activeCourses = allCourses.filter(course => {
        // If course has an endDate and it's passed, hide it
        if (course.endDate) {
          const endDate = new Date(course.endDate);
          if (endDate < now) return false;
        }
        
        // If course is marked as completed, hide it
        if (course.status === 'completed') return false;
        
        // Calculate if all days have passed based on startDate + totalDays
        if (course.startDate && course.totalDays) {
          const startDate = new Date(course.startDate);
          const courseEndDate = new Date(startDate);
          courseEndDate.setDate(courseEndDate.getDate() + course.totalDays);
          if (courseEndDate < now) return false;
        }
        
        return true;
      });
      
      setCourses(activeCourses);
      
      if (activeCourses.length > 0) {
        setSelectedCourse(activeCourses[0]._id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const toggleDay = (dayIndex) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayIndex]: !prev[dayIndex]
    }));
  };

  const selectedCourseData = courses.find(c => c._id === selectedCourse);

  const getDayDate = (day, startDate) => {
    if (!startDate) return null;
    const date = new Date(startDate);
    date.setDate(date.getDate() + (day.dayNumber - 1));
    return date;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Filter sections to show only today's day
  const getTodaySections = () => {
    if (!selectedCourseData || !selectedCourseData.sections) return [];
    return selectedCourseData.sections.filter((day) => {
      const dayDate = getDayDate(day, selectedCourseData.startDate);
      return isToday(dayDate);
    });
  };

  const todaySections = selectedCourseData ? getTodaySections() : [];

  // Auto-expand the current day
  useEffect(() => {
    if (selectedCourseData && selectedCourseData.sections) {
      const todaySectionsList = getTodaySections();
      if (todaySectionsList.length > 0) {
        const dayIndex = selectedCourseData.sections.findIndex((day) => {
          const dayDate = getDayDate(day, selectedCourseData.startDate);
          return isToday(dayDate);
        });
        if (dayIndex !== -1) {
          setExpandedDays({ [dayIndex]: true });
        }
      }
    }
  }, [selectedCourse, selectedCourseData]);

  return (
    <div className="student-timetable">
      <div className="page-header">
        <h1>Timetable</h1>
        <p>View your course schedule by day with sections and sub-sections.</p>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>No enrolled courses. Enroll in a course to see the timetable.</p>
        </div>
      ) : (
        <>
          <div className="course-selector">
            <label>Select Course:</label>
            <select
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.title} ({course.totalDays} days)
                </option>
              ))}
            </select>
          </div>

          {selectedCourseData && (
            <div className="timetable-content">
              <div className="course-info-header">
                <h2>{selectedCourseData.title}</h2>
                <p>
                  Start Date: {selectedCourseData.startDate 
                    ? new Date(selectedCourseData.startDate).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>

              {todaySections.length === 0 ? (
                <div className="empty-state">
                  <p>No schedule for today. Check back on a scheduled day.</p>
                </div>
              ) : (
                <div className="days-timetable">
                  {todaySections.map((day) => {
                    const dayIndex = selectedCourseData.sections.findIndex(d => d.dayNumber === day.dayNumber);
                    const dayDate = getDayDate(day, selectedCourseData.startDate);
                    const isExpanded = expandedDays[dayIndex];

                  return (
                    <div key={dayIndex} className="timetable-day-card">
                      <div className="timetable-day-header" onClick={() => toggleDay(dayIndex)}>
                        <div className="day-info">
                          <h3>Day {day.dayNumber}</h3>
                          {dayDate && (
                            <span className="day-date">
                              <FiCalendar /> {dayDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                          )}
                        </div>
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </div>

                      {isExpanded && (
                        <div className="day-content">
                          {day.sections && day.sections.length > 0 ? (
                            <div className="sections-list">
                              {day.sections.map((section, sectionIndex) => (
                                <div key={sectionIndex} className="section-item">
                                  <div className="section-heading">
                                    <h4>{section.heading}</h4>
                                    {section.description && (
                                      <p className="section-desc">{section.description}</p>
                                    )}
                                  </div>

                                  {section.subSections && section.subSections.length > 0 && (
                                    <div className="sub-sections-list">
                                      {section.subSections.map((subSection, subIndex) => (
                                        <div key={subIndex} className="sub-section-item">
                                          <strong>{subSection.title}</strong>
                                          {subSection.description && (
                                            <p>{subSection.description}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="no-sections">No sections added for this day</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentTimetable;
