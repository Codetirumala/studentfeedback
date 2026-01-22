# Backend API Documentation

## Setup

1. Install dependencies:
```bash
npm install
`jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj``

2. Create `.env` file with your credentials (already configured)

3. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile (with image upload)
- `PUT /api/users/verify-teacher/:userId` - Verify teacher (for testing)

### Courses
- `GET /api/courses` - Get all active courses (for students)
- `GET /api/courses/my-courses` - Get my courses (teacher's courses or student's enrolled)
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create course (teacher only)
- `PUT /api/courses/:id` - Update course (teacher only)
- `DELETE /api/courses/:id` - Delete course (teacher only)
- `GET /api/courses/:id/students` - Get enrolled students (teacher only)

### Enrollments
- `POST /api/enrollments` - Enroll in course (student only)
- `GET /api/enrollments/pending` - Get pending enrollments (teacher only)
- `GET /api/enrollments/approved` - Get approved enrollments (teacher only)
- `PUT /api/enrollments/:id/approve` - Approve enrollment (teacher only)
- `PUT /api/enrollments/:id/reject` - Reject enrollment (teacher only)
- `POST /api/enrollments/bulk-action` - Bulk approve/reject (teacher only)
- `GET /api/enrollments/my-enrollments` - Get my enrollments (student only)

### Attendance
- `POST /api/attendance/mark` - Mark attendance (teacher only)
- `GET /api/attendance/course/:courseId/day/:dayNumber` - Get attendance for day (teacher only)
- `GET /api/attendance/history` - Get attendance history (teacher only)
- `GET /api/attendance/my-attendance` - Get my attendance (student only)

### Feedback
- `POST /api/feedback` - Submit feedback (student only)
- `GET /api/feedback/course/:courseId` - Get course feedback (teacher only)
- `GET /api/feedback/my-feedback` - Get my feedback (student only)

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics (teacher only)
- `GET /api/analytics/student-dashboard` - Get student dashboard analytics
- `GET /api/analytics/effectiveness` - Get effectiveness metrics (teacher only)
- `GET /api/analytics/distribution` - Get distribution data (teacher only)
- `GET /api/analytics/attendance-summary` - Get attendance summary (teacher only)

## Notes

- All routes except `/api/auth/register` and `/api/auth/login` require authentication
- Teacher-only routes require `role: 'teacher'` in JWT token
- Student-only routes require `role: 'student'` in JWT token
- Image uploads use Cloudinary
- MongoDB connection string is configured in `.env`

