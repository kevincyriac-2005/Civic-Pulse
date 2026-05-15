const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();   // ✅ load .env

const authRoutes = require('./route/authRoute');
// const employeeRoutes = require('./route/employeeRoute'); // Removed
const citizenRoutes = require('./route/citizenRoute');
const departmentRoutes = require('./route/departmentRoute');
const adminRoutes = require('./route/adminRoute');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Use environment variables
const PORT = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;

// MongoDB connection
mongoose.connect(mongoURI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Routes
// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', require('./route/userRoute')); // Deprecated
app.use('/api/field-workers', require('./route/fieldWorkerRoute'));
app.use('/api/officers', require('./route/officerRoute'));
app.use('/api/citizens', citizenRoutes);
app.use('/api/categories', require('./route/categoryRoute'));
app.use('/api/incidents', require('./route/incidentRoute'));
app.use('/api/complaints', require('./route/complaintRoute'));
app.use('/api/schedules', require('./route/scheduleRoute'));
app.use('/api/departments', departmentRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

// Server start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Force restart
