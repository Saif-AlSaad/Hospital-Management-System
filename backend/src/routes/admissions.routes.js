// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Inpatient Admission & Bed Allocation Routes
// Powered by Stored Procedures (sp_admit_patient, sp_discharge_patient) & Bed Transfers
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/admissions - List Inpatient Admissions
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const isClean = (v) => v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null' && v !== 'All' && v !== 'all';

    const status = isClean(req.query.status) ? req.query.status : null; // 'Admitted', 'Discharged'
    const patientId = isClean(req.query.patientId) ? parseInt(req.query.patientId) : null;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND adm.status = $${params.length}`;
    }
    if (patientId) {
      params.push(patientId);
      whereClause += ` AND adm.patient_id = $${params.length}`;
    }

    const countSql = `SELECT COUNT(*) FROM admissions adm ${whereClause};`;

    const dataSql = `
      SELECT 
        adm.admission_id,
        adm.admission_number,
        adm.admission_date,
        adm.discharge_date,
        adm.admission_reason,
        adm.discharge_summary,
        adm.status,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(adm.discharge_date, CURRENT_TIMESTAMP) - adm.admission_date)) / 86400, 1) AS days_stayed,
        p.patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.gender AS patient_gender,
        p.phone AS patient_phone,
        d.doctor_id,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        d.specialization,
        b.bed_id,
        b.bed_number,
        b.daily_rate,
        r.room_number,
        r.room_type,
        w.ward_id,
        w.ward_name,
        w.ward_type
      FROM admissions adm
      JOIN patients p ON adm.patient_id = p.patient_id
      JOIN doctors d ON adm.admitting_doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      LEFT JOIN bed_assignments ba ON adm.admission_id = ba.admission_id AND ba.is_current = TRUE
      LEFT JOIN beds b ON ba.bed_id = b.bed_id
      LEFT JOIN rooms r ON b.room_id = r.room_id
      LEFT JOIN wards w ON r.ward_id = w.ward_id
      ${whereClause}
      ORDER BY adm.admission_date DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const [countRes, dataRes] = await Promise.all([
      query(countSql, params),
      query(dataSql, [...params, limit, offset]),
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

// POST /api/admissions/admit - Stored Procedure sp_admit_patient
// Creates admission, assigns bed, updates occupancy in an atomic database transaction.
router.post('/admit', authenticateToken, requireRoles('Admin', 'Doctor', 'Receptionist'), async (req, res, next) => {
  try {
    const { patientId, doctorId, bedId, admissionReason } = req.body;

    if (!patientId || !doctorId || !bedId || !admissionReason) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Admitting Doctor, Bed ID, and Reason for admission are required.',
      });
    }

    const assignedBy = req.user?.userId || 1;

    // Call PostgreSQL Stored Procedure sp_admit_patient with INOUT parameter
    const spResult = await query(
      'CALL sp_admit_patient($1, $2, $3, $4, $5, NULL);',
      [patientId, doctorId, bedId, admissionReason.trim(), assignedBy]
    );

    const admissionId = spResult.rows[0]?.p_admission_id;

    res.status(201).json({
      success: true,
      message: 'Patient successfully admitted and bed allocated via stored procedure sp_admit_patient.',
      admissionId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admissions/:id/discharge - Stored Procedure sp_discharge_patient
// Finalizes admission, releases bed, calculates bed charges, and generates invoice.
router.post('/:id/discharge', authenticateToken, requireRoles('Admin', 'Doctor'), async (req, res, next) => {
  try {
    const admissionId = parseInt(req.params.id);
    const { dischargeSummary } = req.body;

    if (!dischargeSummary) {
      return res.status(400).json({
        success: false,
        message: 'Discharge clinical summary is required.',
      });
    }

    const userId = req.user?.userId || 1;

    // Call PostgreSQL Stored Procedure sp_discharge_patient
    const spResult = await query(
      'CALL sp_discharge_patient($1, $2, $3, NULL);',
      [admissionId, dischargeSummary.trim(), userId]
    );

    const invoiceId = spResult.rows[0]?.p_invoice_id;

    res.json({
      success: true,
      message: 'Patient discharged and inpatient bill generated via stored procedure sp_discharge_patient.',
      invoiceId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admissions/:id/transfer-bed - Multi-Table Bed Transfer Transaction
// Atomically vacates previous bed and transfers patient to new bed
router.post('/:id/transfer-bed', authenticateToken, requireRoles('Admin', 'Doctor'), async (req, res, next) => {
  try {
    const admissionId = parseInt(req.params.id);
    const { newBedId, transferNotes } = req.body;

    if (!newBedId) {
      return res.status(400).json({
        success: false,
        message: 'Target new bed ID is required for bed transfer.',
      });
    }

    const assignedBy = req.user?.userId || 1;

    await withTransaction(async (client) => {
      // 1. Verify target bed is available
      const bedCheck = await client.query('SELECT status FROM beds WHERE bed_id = $1 FOR UPDATE;', [newBedId]);
      if (bedCheck.rows.length === 0 || bedCheck.rows[0].status !== 'Available') {
        throw new Error(`Target bed ID ${newBedId} is not available.`);
      }

      // 2. Fetch current bed assignment
      const currentBa = await client.query(`
        SELECT assignment_id, bed_id 
        FROM bed_assignments 
        WHERE admission_id = $1 AND is_current = TRUE
        FOR UPDATE;
      `, [admissionId]);

      if (currentBa.rows.length > 0) {
        const oldBedId = currentBa.rows[0].bed_id;
        // Release old assignment
        await client.query(`
          UPDATE bed_assignments
          SET is_current = FALSE,
              released_at = CURRENT_TIMESTAMP,
              notes = COALESCE(notes, '') || ' | Vacated for bed transfer'
          WHERE admission_id = $1 AND is_current = TRUE;
        `, [admissionId]);

        // Mark old bed as Available
        await client.query("UPDATE beds SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE bed_id = $1;", [oldBedId]);
      }

      // 3. Assign new bed
      await client.query(`
        INSERT INTO bed_assignments (admission_id, bed_id, assigned_at, is_current, assigned_by, notes)
        VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE, $3, $4);
      `, [admissionId, newBedId, assignedBy, transferNotes || 'Bed transfer']);

      // 4. Mark new bed Occupied
      await client.query("UPDATE beds SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE bed_id = $1;", [newBedId]);
    });

    res.json({
      success: true,
      message: 'Patient bed transfer executed successfully in atomic transaction.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
