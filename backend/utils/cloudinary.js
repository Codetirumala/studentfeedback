const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('Warning: Cloudinary credentials not fully configured');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (file) => {
  try {
    // Check if file exists
    if (!file || !file.path) {
      throw new Error('No file provided');
    }

    if (!fs.existsSync(file.path)) {
      throw new Error('File does not exist at path: ' + file.path);
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'student-feedback',
      use_filename: true,
      unique_filename: true
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Image upload failed: ' + error.message);
  }
};

module.exports = { uploadImage };

