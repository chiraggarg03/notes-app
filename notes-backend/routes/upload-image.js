const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const multerS3 = require('multer-s3');

const express = require('express');
const multer = require('multer');
const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    // acl: 'public-read', // or leave out for private
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = file.originalname.split('.').pop();
      cb(null, Date.now() + '-' + Math.round(Math.random()*1E9) + '.' + ext);
    }
  })
});


// POST /api/upload-image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: req.file.location }); // S3 file URL
});

// DELETE /api/delete-image
router.delete('/delete-image', express.json(), async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'No image URL provided' });
  try {
    // Extract key from URL
    const key = imageUrl.split('/').pop();
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }));
    res.json({ message: 'Image deleted from S3 successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete image from S3' });
  }
});

module.exports = router;
