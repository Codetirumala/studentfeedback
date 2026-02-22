import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiZap } from 'react-icons/fi';
import './CreateCourse.css';

const CreateCourse = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    totalDays: 1,
    startDate: new Date().toISOString().split('T')[0],
    sections: []
  });
  const [expandedDays, setExpandedDays] = useState({});
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingSectionDesc, setGeneratingSectionDesc] = useState({});
  const navigate = useNavigate();

  // Generate course description based on all day titles/sections
  const generateCourseDescription = async () => {
    setGeneratingDescription(true);
    try {
      // Collect all section headings from all days
      const allTopics = [];
      formData.sections.forEach((day, index) => {
        const dayTopics = day.sections.map(s => s.heading).filter(h => h);
        if (dayTopics.length > 0) {
          allTopics.push(`Day ${index + 1}: ${dayTopics.join(', ')}`);
        }
      });

      if (allTopics.length === 0) {
        alert('Please add section headings to at least one day first.');
        setGeneratingDescription(false);
        return;
      }

      const prompt = `Generate a professional course description for a training program titled "${formData.title}".

The course covers the following topics:
${allTopics.join('\n')}

The description should be:
- 2-3 paragraphs (around 150-200 words)
- Professional and engaging
- Summarize what students will learn across all days
- Highlight key skills and knowledge they will gain
- Suitable for corporate training

Only return the description text, no headings or formatting.`;

      // eslint-disable-next-line no-undef
      const response = await puter.ai.chat(prompt, {
        model: 'gemini-2.0-flash'
      });
      
      if (response) {
        const generatedText = typeof response === 'string' ? response.trim() : response.message?.content?.trim() || '';
        if (generatedText) {
          setFormData(prev => ({
            ...prev,
            description: generatedText
          }));
        }
      }
    } catch (error) {
      console.error('Error generating description:', error);
      alert('AI generation failed. Please enter description manually.');
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Generate description for individual section based on its heading
  const generateSectionDescription = async (dayIndex, sectionIndex, heading) => {
    if (!heading || heading.trim().length < 3) {
      alert('Please enter a section heading first.');
      return;
    }

    const key = `${dayIndex}-${sectionIndex}`;
    setGeneratingSectionDesc(prev => ({ ...prev, [key]: true }));
    
    try {
      const prompt = `Generate a brief professional description (2-3 sentences, around 40-60 words) for a training section titled "${heading}".

The description should:
- Explain what will be covered
- Be suitable for a corporate training environment
- Be informative and engaging

Only return the description text.`;

      // eslint-disable-next-line no-undef
      const response = await puter.ai.chat(prompt, {
        model: 'gemini-2.0-flash'
      });
      
      if (response) {
        const generatedText = typeof response === 'string' ? response.trim() : response.message?.content?.trim() || '';
        if (generatedText) {
          const sections = [...formData.sections];
          sections[dayIndex].sections[sectionIndex].description = generatedText;
          setFormData(prev => ({ ...prev, sections }));
        }
      }
    } catch (error) {
      console.error('Error generating section description:', error);
    } finally {
      setGeneratingSectionDesc(prev => ({ ...prev, [key]: false }));
    }
  };

  // Check if all days have at least one section heading
  const hasAllDayTitles = () => {
    return formData.sections.length > 0 && 
           formData.sections.every(day => day.sections.some(s => s.heading && s.heading.trim()));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalDays' ? parseInt(value) : value
    }));

    if (name === 'totalDays') {
      const days = parseInt(value);
      const startDate = new Date(formData.startDate || new Date());
      const sections = [];
      for (let i = 1; i <= days; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + (i - 1));
        sections.push({
          dayNumber: i,
          date: dayDate,
          sections: [] // Array of section headings
        });
      }
      setFormData(prev => ({ ...prev, sections }));
    }

    if (name === 'startDate') {
      const startDate = new Date(value);
      const sections = formData.sections.map((day, index) => {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + index);
        return {
          ...day,
          date: dayDate
        };
      });
      setFormData(prev => ({ ...prev, startDate: value, sections }));
    }
  };

  const toggleDay = (dayIndex) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayIndex]: !prev[dayIndex]
    }));
  };

  const addSection = (dayIndex) => {
    const sections = [...formData.sections];
    sections[dayIndex].sections.push({
      heading: '',
      description: '',
      subSections: []
    });
    setFormData(prev => ({ ...prev, sections }));
  };

  const removeSection = (dayIndex, sectionIndex) => {
    const sections = [...formData.sections];
    sections[dayIndex].sections.splice(sectionIndex, 1);
    setFormData(prev => ({ ...prev, sections }));
  };

  const updateSection = (dayIndex, sectionIndex, field, value) => {
    const sections = [...formData.sections];
    sections[dayIndex].sections[sectionIndex][field] = value;
    setFormData(prev => ({ ...prev, sections }));
  };

  const addSubSection = (dayIndex, sectionIndex) => {
    const sections = [...formData.sections];
    sections[dayIndex].sections[sectionIndex].subSections.push({
      title: '',
      description: ''
    });
    setFormData(prev => ({ ...prev, sections }));
  };

  const removeSubSection = (dayIndex, sectionIndex, subSectionIndex) => {
    const sections = [...formData.sections];
    sections[dayIndex].sections[sectionIndex].subSections.splice(subSectionIndex, 1);
    setFormData(prev => ({ ...prev, sections }));
  };

  const updateSubSection = (dayIndex, sectionIndex, subSectionIndex, field, value) => {
    const sections = [...formData.sections];
    sections[dayIndex].sections[sectionIndex].subSections[subSectionIndex][field] = value;
    setFormData(prev => ({ ...prev, sections }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for submission - clean up the structure
      const submitData = {
        title: formData.title,
        description: formData.description || '',
        totalDays: parseInt(formData.totalDays),
        startDate: formData.startDate,
        sections: formData.sections.map((day, index) => {
          // Clean sections array
          const cleanSections = (day.sections || []).map(section => ({
            heading: section.heading || '',
            description: section.description || '',
            subSections: (section.subSections || []).map(sub => ({
              title: sub.title || '',
              description: sub.description || ''
            }))
          }));

          return {
            dayNumber: day.dayNumber || (index + 1),
            sections: cleanSections
            // Don't send date - backend will calculate it from startDate
          };
        })
      };

      const response = await api.post('/courses', submitData);
      navigate(`/teacher/courses/${response.data._id}`);
    } catch (error) {
      console.error('Create course error:', error);
      alert(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-course">
      <div className="page-header">
        <h1>Create Course</h1>
      </div>

      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-section">
          <h2>Course Information</h2>
          <div className="form-group">
            <label>Course Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter course title"
              required
            />
          </div>
          <div className="form-group">
            <label>
              Description
              {generatingDescription && (
                <span className="ai-generating">
                  <FiZap className="ai-icon spinning" /> AI Generating...
                </span>
              )}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder={generatingDescription ? "Generating description from day topics..." : "Course description (will be auto-generated based on day topics)"}
              disabled={generatingDescription}
            />
            <p className="form-hint">
              💡 Add section headings for each day below, then click "Generate Course Description" to auto-generate based on all topics.
            </p>
          </div>
          <div className="form-group">
            <label>Start Date *</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Number of Days *</label>
            <select
              name="totalDays"
              value={formData.totalDays}
              onChange={handleChange}
              required
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day} {day === 1 ? 'Day' : 'Days'}</option>
              ))}
            </select>
            <p className="form-hint">Dates will be automatically calculated from start date</p>
          </div>
        </div>

        <div className="form-section">
          <h2>Course Structure</h2>
          <p className="section-info">
            For each day, add sections (headings) and sub-sections under each section.
          </p>
          <div className="days-list">
            {formData.sections.map((day, dayIndex) => (
              <div key={dayIndex} className="day-item">
                <div className="day-header" onClick={() => toggleDay(dayIndex)}>
                  <div>
                    <h3>Day {day.dayNumber}</h3>
                    <span className="day-date-display">
                      {day.date ? new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 'Date not set'}
                    </span>
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
                            <button
                              type="button"
                              className="btn-remove"
                              onClick={() => removeSection(dayIndex, sectionIndex)}
                            >
                              <FiTrash2 /> Remove
                            </button>
                          </div>

                          <div className="form-group">
                            <label>Section Heading *</label>
                            <input
                              type="text"
                              value={section.heading}
                              onChange={(e) => updateSection(dayIndex, sectionIndex, 'heading', e.target.value)}
                              placeholder="e.g., Introduction to Machine Learning"
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label>
                              Section Description
                              {generatingSectionDesc[`${dayIndex}-${sectionIndex}`] ? (
                                <span className="ai-generating">
                                  <FiZap className="ai-icon spinning" /> Generating...
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="ai-generate-btn-small"
                                  onClick={() => generateSectionDescription(dayIndex, sectionIndex, section.heading)}
                                  disabled={!section.heading}
                                >
                                  <FiZap /> Generate
                                </button>
                              )}
                            </label>
                            <textarea
                              value={section.description}
                              onChange={(e) => updateSection(dayIndex, sectionIndex, 'description', e.target.value)}
                              rows="2"
                              placeholder="Brief description (click Generate after entering heading)"
                              disabled={generatingSectionDesc[`${dayIndex}-${sectionIndex}`]}
                            />
                          </div>

                          <div className="sub-sections">
                            <div className="sub-sections-header">
                              <label>Sub-Sections</label>
                              <button
                                type="button"
                                className="btn-add-small"
                                onClick={() => addSubSection(dayIndex, sectionIndex)}
                              >
                                <FiPlus /> Add Sub-Section
                              </button>
                            </div>

                            {section.subSections.map((subSection, subSectionIndex) => (
                              <div key={subSectionIndex} className="sub-section-item">
                                <div className="sub-section-header">
                                  <span>Sub-Section {subSectionIndex + 1}</span>
                                  <button
                                    type="button"
                                    className="btn-remove-small"
                                    onClick={() => removeSubSection(dayIndex, sectionIndex, subSectionIndex)}
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                                <div className="form-group">
                                  <input
                                    type="text"
                                    value={subSection.title}
                                    onChange={(e) => updateSubSection(dayIndex, sectionIndex, subSectionIndex, 'title', e.target.value)}
                                    placeholder="Sub-section title"
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <textarea
                                    value={subSection.description}
                                    onChange={(e) => updateSubSection(dayIndex, sectionIndex, subSectionIndex, 'description', e.target.value)}
                                    rows="2"
                                    placeholder="Sub-section description"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn-add-section"
                      onClick={() => addSection(dayIndex)}
                    >
                      <FiPlus /> Add Section
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Generate Course Description Button */}
        {formData.sections.length > 0 && (
          <div className="ai-generate-section">
            <div className="ai-generate-info">
              <FiZap className="ai-info-icon" />
              <div>
                <h4>Generate Course Description with AI</h4>
                <p>Based on all the section headings you've added, AI will create a comprehensive course description.</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-generate-description"
              onClick={generateCourseDescription}
              disabled={generatingDescription || !hasAllDayTitles()}
            >
              {generatingDescription ? (
                <>
                  <FiZap className="spinning" /> Generating...
                </>
              ) : (
                <>
                  <FiZap /> Generate Course Description
                </>
              )}
            </button>
            {!hasAllDayTitles() && (
              <p className="ai-hint">Add at least one section heading to each day to enable this feature.</p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/teacher/courses')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;
