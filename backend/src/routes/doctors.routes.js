// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Doctor Management Routes
// Parameterized SQL, Workload Statistics & Multi-Table Registration
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/doctors - List of all doctors with department & specialization
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId) : null;
    const activeOnly = req.query.active !== undefined ? (req.query.active === 'true') : true;

    let sql = `
      SELECT 
        d.doctor_id,
        d.specialization,
        d.license_number,
        d.consultation_fee,
        d.bio,
        d.is_active,
        s.staff_id,
        s.first_name,
        s.last_name,
        CONCAT(s.first_name, ' ', s.last_name) AS full_name,
        s.gender,
        s.phone,
        s.email,
        dept.department_id,
        dept.department_name,
        COUNT(DISTINCT a.appointment_id) AS total_appointments_handled,
        COUNT(DISTINCT a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed_appointments
      FROM doctors d
      JOIN staff s ON d.staff_id = s.staff_id
      JOIN departments dept ON d.department_id = dept.department_id
      LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
      WHERE ($1::INT IS NULL OR d.department_id = $1)
        AND ($2::BOOLEAN IS NULL OR d.is_active = $2)
      GROUP BY 
        d.doctor_id, d.specialization, d.license_number, d.consultation_fee,
        d.bio, d.is_active, s.staff_id, s.first_name, s.last_name, s.gender,
        s.phone, s.email, dept.department_id, dept.department_name
      ORDER BY dept.department_name, s.first_name;
    `;

    const result = await query(sql, [departmentId, activeOnly]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id - Doctor Profile & Schedule
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const doctorId = parseInt(req.params.id);

    const docSql = `
      SELECT 
        d.*,
        s.first_name,
        s.last_name,
        CONCAT(s.first_name, ' ', s.last_name) AS full_name,
        s.phone,
        s.email,
        s.gender,
        s.hire_date,
        dept.department_name,
        dept.code AS department_code
      FROM doctors d
      JOIN staff s ON d.staff_id = s.staff_id
      JOIN departments dept ON d.department_id = dept.department_id
      WHERE d.doctor_id = $1;
    `;

    const schedSql = `
      SELECT * FROM doctor_schedules
      WHERE doctor_id = $1 AND is_active = TRUE
      ORDER BY day_of_week, start_time;
    `;

    const [docRes, schedRes] = await Promise.all([
      query(docSql, [doctorId]),
      query(schedSql, [doctorId]),
    ]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    res.json({
      success: true,
      doctor: docRes.rows[0],
      schedules: schedRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors - Add Doctor (Multi-Table Transaction: staff + doctor profile)
router.post('/', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const {
      firstName, lastName, gender, dateOfBirth, phone, email,
      departmentId, specialization, licenseNumber, consultationFee, bio
    } = req.body;

    if (!firstName || !lastName || !departmentId || !specialization || !licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, department, specialization, and license number are required.',
      });
    }

    const createdDoctor = await withTransaction(async (client) => {
      // 1. Insert into staff
      const staffRes = await client.query(`
        INSERT INTO staff (
          department_id, first_name, last_name, gender, date_of_birth,
          phone, email, hire_date, employment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'Active')
        RETURNING staff_id;
      `, [departmentId, firstName, lastName, gender || 'Male', dateOfBirth || '1980-01-01', phone, email]);

      const staffId = staffRes.rows[0].staff_id;

      // 2. Insert into doctors
      const docRes = await client.query(`
        INSERT INTO doctors (
          staff_id, department_id, specialization, license_number, consultation_fee, bio, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING *;
      `, [staffId, departmentId, specialization, licenseNumber, consultationFee || 50.00, bio || null]);

      return docRes.rows[0];
    });

    res.status(201).json({
      success: true,
      message: 'Doctor profile registered successfully.',
      doctor: createdDoctor,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/doctors/:id - Update Doctor Credentials
router.put('/:id', authenticateToken, requireRoles('Admin', 'Doctor'), async (req, res, next) => {
  try {
    const doctorId = parseInt(req.params.id);
    const { specialization, consultationFee, bio, departmentId } = req.body;

    const updateSql = `
      UPDATE doctors
      SET specialization = COALESCE($1, specialization),
          consultation_fee = COALESCE($2, consultation_fee),
          bio = COALESCE($3, bio),
          department_id = COALESCE($4, department_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE doctor_id = $5
      RETURNING *;
    `;

    const result = await query(updateSql, [specialization, consultationFee, bio, departmentId, doctorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    res.json({
      success: true,
      message: 'Doctor profile updated successfully.',
      doctor: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/doctors/:id - Soft Deactivate Doctor
router.delete('/:id', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const doctorId = parseInt(req.params.id);

    const result = await query(`
      UPDATE doctors
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE doctor_id = $1
      RETURNING doctor_id, is_active;
    `, [doctorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    res.json({
      success: true,
      message: 'Doctor deactivated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
