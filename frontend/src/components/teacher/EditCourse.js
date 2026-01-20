import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './CreateCourse.css';

const EditCourse = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    totalDays: 1,
    startDate: new Date().toISOString().split('T')[0],
    sections: []
  });
  const [expandedDays, setExpandedDays] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        const course = res.data;

        // normalize startDate to yyyy-mm-dd
        const startDate = course.startDate ? new Date(course.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // ensure day.date are plain dates for display
        const sections = (course.sections || []).map(day => ({
          dayNumber: day.dayNumber,
          date: day.date ? new Date(day.date) : null,
          sections: (day.sections || []).map(s => ({
            heading: s.heading || '',
            description: s.description || '',
            subSections: (s.subSections || []).map(ss => ({ title: ss.title || '', description: ss.description || '' }))
          }))
        }));

        setFormData({
          title: course.title || '',
          description: course.description || '',
          totalDays: course.totalDays || sections.length || 1,
          startDate,
          sections
        });
      } catch (err) {
        console.error('Failed to load course for editing', err);
        alert('Failed to load course');
        navigate('/teacher/courses');
      }
    };

    fetchCourse();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'totalDays' ? parseInt(value) : value }));

    if (name === 'totalDays') {
      const days = parseInt(value);
      const start = new Date(formData.startDate || new Date());
      const secs = [];
      for (let i = 1; i <= days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + (i - 1));
        secs.push({ dayNumber: i, date: d, sections: [] });
      }
      setFormData(prev => ({ ...prev, sections: secs }));
    }

    if (name === 'startDate') {
      const start = new Date(value);
      const secs = formData.sections.map((day, index) => {
        const d = new Date(start);
        d.setDate(start.getDate() + index);
        return { ...day, date: d };
      });
      setFormData(prev => ({ ...prev, startDate: value, sections: secs }));
    }
  };

  const toggleDay = (dayIndex) => setExpandedDays(prev => ({ ...prev, [dayIndex]: !prev[dayIndex] }));

  const addSection = (dayIndex) => {
    const secs = [...formData.sections];
    secs[dayIndex].sections.push({ heading: '', description: '', subSections: [] });
    setFormData(prev => ({ ...prev, sections: secs }));
  };

  const removeSection = (dayIndex, sectionIndex) => {
    const secs = [...formData.sections];
    secs[dayIndex].sections.splice(sectionIndex, 1);
    setFormData(prev => ({ ...prev, sections: secs }));
  };

  const updateSection = (dayIndex, sectionIndex, field, value) => {
    const secs = [...formData.sections];
    secs[dayIndex].sections[sectionIndex][field] = value;
    setFormData(prev => ({ ...prev, sections: secs }));
  };

  const addSubSection = (dayIndex, sectionIndex) => {
    const secs = [...formData.sections];
    secs[dayIndex].sections[sectionIndex].subSections.push({ title: '', description: '' });
    setFormData(prev => ({ ...prev, sections: secs }));
  };

  const removeSubSection = (dayIndex, sectionIndex, subSectionIndex) => {
    const secs = [...formData.sections];
    secs[dayIndex].sections[sectionIndex].subSections.splice(subSectionIndex, 1);
    setFormData(prev => ({ ...prev, sections: secs }));
  };

  const updateSubSection = (dayIndex, sectionIndex, subSectionIndex, field, value) => {
    const secs = [...formData.sections];
    secs[dayIndex].sections[sectionIndex].subSections[subSectionIndex][field] = value;
    setFormData(prev => ({ ...prev, sections: secs }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        title: formData.title,
        description: formData.description || '',
        totalDays: parseInt(formData.totalDays),
        startDate: formData.startDate,
        sections: formData.sections.map((day, index) => ({
          dayNumber: day.dayNumber || (index + 1),
          sections: (day.sections || []).map(section => ({
            heading: section.heading || '',
            description: section.description || '',
            subSections: (section.subSections || []).map(sub => ({ title: sub.title || '', description: sub.description || '' }))
          }))
        }))
      };

      await api.put(`/courses/${id}`, submitData);
      navigate(`/teacher/courses/${id}`);
    } catch (error) {
      console.error('Update course error:', error);
      alert(error.response?.data?.message || 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-course">
      <div className="page-header">
        <h1>Edit Course</h1>
      </div>

      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-section">
          <h2>Course Information</h2>
          <div className="form-group">
            <label>Course Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
          </div>
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Number of Days *</label>
            <select name="totalDays" value={formData.totalDays} onChange={handleChange} required>
              {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day} {day === 1 ? 'Day' : 'Days'}</option>
              ))}
            </select>
            <p className="form-hint">Dates will be automatically calculated from start date</p>
          </div>
        </div>

        <div className="form-section">
          <h2>Course Structure</h2>
          <p className="section-info">For each day, add sections (headings) and sub-sections under each section.</p>
          <div className="days-list">
            {formData.sections.map((day, dayIndex) => (
              <div key={dayIndex} className="day-item">
                <div className="day-header" onClick={() => toggleDay(dayIndex)}>
                  <div>
                    <h3>Day {day.dayNumber}</h3>
                    <span className="day-date-display">{day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Date not set'}</span>
                  </div>
                  {expandedDays[dayIndex] ? <FiChevronUp /> : <FiChevronDown />}
                </div>

                {expandedDays[dayIndex] && (
                  <div className="day-content">
                    <div className="sections-list">
                      {day.sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="section-item">
                          <div className="section-header-row">
                            <h4>Section {sectionIndex + 1}</h4>
                            <button type="button" className="btn-remove" onClick={() => removeSection(dayIndex, sectionIndex)}>
                              <FiTrash2 /> Remove
                            </button>
                          </div>

                          <div className="form-group">
                            <label>Section Heading *</label>
                            <input type="text" value={section.heading} onChange={(e) => updateSection(dayIndex, sectionIndex, 'heading', e.target.value)} placeholder="e.g., Introduction to Machine Learning" required />
                          </div>

                          <div className="form-group">
                            <label>Section Description</label>
                            <textarea value={section.description} onChange={(e) => updateSection(dayIndex, sectionIndex, 'description', e.target.value)} rows="2" placeholder="Brief description of this section" />
                          </div>

                          <div className="sub-sections">
                            <div className="sub-sections-header">
                              <label>Sub-Sections</label>
                              <button type="button" className="btn-add-small" onClick={() => addSubSection(dayIndex, sectionIndex)}>
                                <FiPlus /> Add Sub-Section
                              </button>
                            </div>

                            {section.subSections.map((subSection, subSectionIndex) => (
                              <div key={subSectionIndex} className="sub-section-item">
                                <div className="sub-section-header">
                                  <span>Sub-Section {subSectionIndex + 1}</span>
                                  <button type="button" className="btn-remove-small" onClick={() => removeSubSection(dayIndex, sectionIndex, subSectionIndex)}>
                                    <FiTrash2 />
                                  </button>
                                </div>
                                <div className="form-group">
                                  <input type="text" value={subSection.title} onChange={(e) => updateSubSection(dayIndex, sectionIndex, subSectionIndex, 'title', e.target.value)} placeholder="Sub-section title" required />
                                </div>
                                <div className="form-group">
                                  <textarea value={subSection.description} onChange={(e) => updateSubSection(dayIndex, sectionIndex, subSectionIndex, 'description', e.target.value)} rows="2" placeholder="Sub-section description" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button type="button" className="btn-add-section" onClick={() => addSection(dayIndex)}>
                      <FiPlus /> Add Section
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/teacher/courses')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Course'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCourse;
