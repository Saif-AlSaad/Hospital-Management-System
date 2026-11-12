// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Appointment Management Routes
// Parameterized SQL, Conflict Checking Trigger Integration
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/appointments - Paginated search and multi-criteria filters
router.get('/', authenticateToken, requireRoles('Admin', 'Receptionist', 'Doctor'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const isClean = (v) => v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null' && v !== 'All' && v !== 'all';

    let doctorId = isClean(req.query.doctorId) ? parseInt(req.query.doctorId) : null;
    const patientId = isClean(req.query.patientId) ? parseInt(req.query.patientId) : null;
    const departmentId = isClean(req.query.departmentId) ? parseInt(req.query.departmentId) : null;
    const date = isClean(req.query.date) ? req.query.date : null;
    const status = isClean(req.query.status) ? req.query.status : null;
    const search = isClean(req.query.search) && req.query.search.trim() ? `%${req.query.search.trim()}%` : null;

    // Doctor Data Scoping: Doctors only view their own appointment schedule
    if (req.user.role === 'Doctor') {
      if (!req.user.doctorId) {
        return res.status(403).json({
          success: false,
          code: 'DOCTOR_PROFILE_UNLINKED',
          message: 'Your user account is not linked to an active doctor profile.',
        });
      }
      doctorId = req.user.doctorId;
    }

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (doctorId) {
      params.push(doctorId);
      whereClause += ` AND a.doctor_id = $${params.length}`;
    }
    if (patientId) {
      params.push(patientId);
      whereClause += ` AND a.patient_id = $${params.length}`;
    }
    if (departmentId) {
      params.push(departmentId);
      whereClause += ` AND a.department_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      whereClause += ` AND a.appointment_date = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND a.status = $${params.length}`;
    }
    if (search) {
      params.push(search);
      whereClause += ` AND (a.appointment_number ILIKE $${params.length} OR p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length} OR p.patient_code ILIKE $${params.length})`;
    }

    const countSql = `
      SELECT COUNT(*) 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      ${whereClause}
    `;

    const dataSql = `
      SELECT 
        a.appointment_id,
        a.appointment_number,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.appointment_type,
        a.status,
        a.notes,
        a.created_at,
        p.patient_id,
        p.patient_code,
        p.phone AS patient_phone,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        d.doctor_id,
        d.specialization,
        d.consultation_fee,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        dept.department_id,
        dept.department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN doctors d ON a.doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      JOIN departments dept ON a.department_id = dept.department_id
      ${whereClause}
      ORDER BY a.appointment_date DESC, a.start_time DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countParams = [...params];
    const dataParams = [...params, limit, offset];

    const [countRes, dataRes] = await Promise.all([
      query(countSql, countParams),
      query(dataSql, dataParams),
    ]);

    const totalRecords = parseInt(countRes.rows[0].count);

    res.json({
      success: true,
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/check-availability - Database Function fn_check_doctor_availability
router.get('/check-availability', authenticateToken, requireRoles('Admin', 'Receptionist', 'Doctor'), async (req, res, next) => {
  try {
    const { doctorId, date, startTime, endTime } = req.query;

    if (!doctorId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'doctorId, date, startTime, and endTime are required.',
      });
    }

    const result = await query(
      'SELECT fn_check_doctor_availability($1, $2, $3, $4) AS is_available;',
      [parseInt(doctorId), date, startTime, endTime]
    );

    res.json({
      success: true,
      isAvailable: result.rows[0].is_available,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments - Schedule Appointment
// Automatically validated by DB trigger trg_check_appointment_conflict
router.post('/', authenticateToken, requireRoles('Admin', 'Receptionist', 'Doctor'), async (req, res, next) => {
  try {
    const {
      patientId, doctorId, departmentId, appointmentDate,
      startTime, endTime, appointmentType, notes
    } = req.body;

    let effectiveDoctorId = doctorId ? parseInt(doctorId) : null;
    if (req.user.role === 'Doctor') {
      if (!req.user.doctorId) {
        return res.status(403).json({
          success: false,
          code: 'DOCTOR_PROFILE_UNLINKED',
          message: 'Your user account is not linked to an active doctor profile.',
        });
      }
      effectiveDoctorId = req.user.doctorId;
    }

    if (!patientId || !effectiveDoctorId || !appointmentDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Doctor, Appointment date, and Slot times are mandatory.',
      });
    }

    // Auto-resolve departmentId from doctor if omitted
    let deptId = departmentId;
    if (!deptId) {
      const docDeptRes = await query('SELECT department_id FROM doctors WHERE doctor_id = $1;', [effectiveDoctorId]);
      deptId = docDeptRes.rows[0]?.department_id;
    }

    // Generate appointment number
    const seqRes = await query("SELECT nextval('appointments_appointment_id_seq') AS next_id;");
    const nextId = seqRes.rows[0].next_id;
    const apptNumber = `APT-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

    const insertSql = `
      INSERT INTO appointments (
        appointment_id, appointment_number, patient_id, doctor_id, department_id,
        appointment_date, start_time, end_time, appointment_type, status, notes, created_by
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, 'Scheduled', $10, $11
      )
      RETURNING *;
    `;

    const result = await query(insertSql, [
      nextId, apptNumber, patientId, effectiveDoctorId, deptId,
      appointmentDate, startTime, endTime, appointmentType || 'Routine',
      notes || null, req.user?.userId || null
    ]);

    res.status(201).json({
      success: true,
      message: `Appointment ${apptNumber} scheduled successfully.`,
      appointment: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id/reschedule - Reschedule Appointment
router.put('/:id/reschedule', authenticateToken, requireRoles('Admin', 'Receptionist', 'Doctor'), async (req, res, next) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { appointmentDate, startTime, endTime, notes } = req.body;

    if (!appointmentDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'New appointment date and start/end times are required.',
      });
    }

    // Doctor Scoping Check
    if (req.user.role === 'Doctor') {
      const apptCheck = await query('SELECT doctor_id FROM appointments WHERE appointment_id = $1;', [appointmentId]);
      if (apptCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      }
      if (apptCheck.rows[0].doctor_id !== req.user.doctorId) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN_RESOURCE',
          message: 'Access denied. Doctors can only reschedule their own appointments.',
        });
      }
    }

    const updateSql = `
      UPDATE appointments
      SET appointment_date = $1,
          start_time = $2,
          end_time = $3,
          notes = COALESCE($4, notes),
          status = 'Scheduled',
          updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = $5
      RETURNING *;
    `;

    const result = await query(updateSql, [appointmentDate, startTime, endTime, notes, appointmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      appointment: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id/status - Update Status
router.put('/:id/status', authenticateToken, requireRoles('Admin', 'Receptionist', 'Doctor'), async (req, res, next) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: [${validStatuses.join(', ')}]`,
      });
    }

    // Doctor Scoping Check
    if (req.user.role === 'Doctor') {
      const apptCheck = await query('SELECT doctor_id FROM appointments WHERE appointment_id = $1;', [appointmentId]);
      if (apptCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      }
      if (apptCheck.rows[0].doctor_id !== req.user.doctorId) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN_RESOURCE',
          message: 'Access denied. Doctors can only update status of their own appointments.',
        });
      }
    }

    const result = await query(`
      UPDATE appointments
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = $2
      RETURNING *;
    `, [status, appointmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      appointment: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
