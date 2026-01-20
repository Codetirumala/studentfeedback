const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { uploadImage } = require('../utils/cloudinary');

// Configure multer for file uploads
const fs = require('fs');
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB' });
    }
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, upload.single('profilePicture'), handleMulterError, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, bio, rollNumber, branch, section, department, designation, phone } = req.body;

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;

    if (user.role === 'student') {
      if (rollNumber !== undefined) user.rollNumber = rollNumber;
      if (branch !== undefined) user.branch = branch;
      if (section !== undefined) user.section = section;
    } else if (user.role === 'teacher') {
      if (department !== undefined) user.department = department;
      if (designation !== undefined) user.designation = designation;
      if (phone !== undefined) user.phone = phone;
    }

    // Handle profile picture upload
    if (req.file) {
      try {
        const imageUrl = await uploadImage(req.file);
        user.profilePicture = imageUrl;
        // Clean up local file after upload
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (error) {
        console.error('Image upload error:', error);
        // Clean up local file if upload fails
        const fs = require('fs');
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'Image upload failed', error: error.message });
      }
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        bio: user.bio,
        rollNumber: user.rollNumber,
        branch: user.branch,
        section: user.section,
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        verifiedTeacher: user.verifiedTeacher
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify teacher (admin function - for testing)
router.put('/verify-teacher/:userId', auth, async (req, res) => {
  try {
    // For testing, allow any authenticated user to verify teachers
    // In production, add admin check
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }

    user.verifiedTeacher = true;
    await user.save();

    res.json({ message: 'Teacher verified successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

