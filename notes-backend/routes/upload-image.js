const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');   // Save uploads to 'uploads' folder (create if doesn't exist)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// POST /api/upload-image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Construct URL for image access, adjust host and protocol as needed
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

const fs = require('fs');

router.delete('/delete-image', express.json(), (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'No image URL provided' });
  }

  // Extract filename from URL
  try {
    const filename = imageUrl.split('/uploads/')[1];
    if (!filename) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', filename);

    // Delete file from disk
    fs.unlink(filePath, (err) => {
      if (err) {
        // File might not exist, handle as success or error as needed
        console.error('Error deleting file:', err);
        return res.status(500).json({ error: 'Failed to delete image file' });
      }
      res.json({ message: 'Image deleted successfully' });
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error processing request' });
  }
});


module.exports = router;
