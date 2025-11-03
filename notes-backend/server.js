require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const uploadRoutes = require('./routes/upload-image');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/notes', notesRoutes);
app.use('/api', uploadRoutes);
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic route check
app.get('/', (req, res) => {
  res.send('Notes API running');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
