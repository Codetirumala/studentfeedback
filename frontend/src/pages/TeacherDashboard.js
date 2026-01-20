import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TeacherDashboardHome from '../components/teacher/TeacherDashboardHome';
import MyCourses from '../components/teacher/MyCourses';
import CreateCourse from '../components/teacher/CreateCourse';
import EditCourse from '../components/teacher/EditCourse';
import CourseDetails from '../components/teacher/CourseDetails';
import Enrollments from '../components/teacher/Enrollments';
import AttendanceManagement from '../components/teacher/AttendanceManagement';
import ProgramAnalytics from '../components/teacher/ProgramAnalytics';
import Timetable from '../components/teacher/Timetable';
import Reports from '../components/teacher/Reports';
import Profile from './Profile';
import './Dashboard.css';

const TeacherDashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar isTeacher={true} />
      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboardHome />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="courses/create" element={<CreateCourse />} />
          <Route path="courses/:id/edit" element={<EditCourse />} />
          <Route path="courses/:id" element={<CourseDetails />} />
          <Route path="enrollments" element={<Enrollments />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="analytics" element={<ProgramAnalytics />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
};

export default TeacherDashboard;

