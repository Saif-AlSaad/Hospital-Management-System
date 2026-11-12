// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Express.js Application Server
// Plain PostgreSQL Database Operations ('pg' Pool)
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { pool } = require('./db/pool');
const { errorHandler } = require('./middleware/error.middleware');

// Route Handlers
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patients.routes');
const doctorRoutes = require('./routes/doctors.routes');
const departmentRoutes = require('./routes/departments.routes');
const appointmentRoutes = require('./routes/appointments.routes');
const consultationRoutes = require('./routes/consultations.routes');
const admissionRoutes = require('./routes/admissions.routes');
const wardRoutes = require('./routes/wards.routes');
const labRoutes = require('./routes/laboratory.routes');
const pharmacyRoutes = require('./routes/pharmacy.routes');
const prescriptionRoutes = require('./routes/prescriptions.routes');
const billingRoutes = require('./routes/billing.routes');
const reportRoutes = require('./routes/reports.routes');
const staffRoutes = require('./routes/staff.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check & Database Diagnostic Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT current_database(), version(), CURRENT_TIMESTAMP;');
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: dbCheck.rows[0].current_database,
      version: dbCheck.rows[0].version,
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      error: err.message,
    });
  }
});

// Mount Module APIs
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/laboratory', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/audit-logs', auditRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n====================================================`);
    console.log(`🏥 Hospital Management System API Server running on port ${PORT}`);
    console.log(`🔗 Database: PostgreSQL (hospital_db) on localhost:5432`);
    console.log(`🌐 Base URL: http://localhost:${PORT}`);
    console.log(`====================================================\n`);
  });
}

module.exports = app;
