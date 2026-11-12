// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Patient Management Routes
// Parameterized SQL, Soft Deletion, and History Aggregations
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/patients - Paginated search and list
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const status = req.query.status !== undefined ? (req.query.status === 'true') : true;

    let countSql = 'SELECT COUNT(*) FROM patients WHERE is_active = $1';
    let dataSql = `
      SELECT 
        p.patient_id,
        p.patient_code,
        p.first_name,
        p.last_name,
        CONCAT(p.first_name, ' ', p.last_name) AS full_name,
        p.date_of_birth,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INT AS age,
        p.gender,
        p.blood_group,
        p.phone,
        p.email,
        p.address,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        p.is_active,
        p.created_at,
        fn_calculate_patient_balance(p.patient_id) AS outstanding_balance
      FROM patients p
      WHERE p.is_active = $1
    `;

    const countParams = [status];
    const dataParams = [status];

    if (search) {
      countSql += ` AND (patient_code ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2 OR phone ILIKE $2)`;
      countParams.push(search);

      dataSql += ` AND (patient_code ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2 OR phone ILIKE $2)`;
      dataParams.push(search);
    }

    dataSql += ` ORDER BY p.patient_id DESC LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
    dataParams.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      query(countSql, countParams),
      query(dataSql, dataParams),
    ]);

    const totalRecords = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: dataResult.rows,
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

// GET /api/patients/:id - Patient 360 Comprehensive Profile
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);

    const patientSql = `
      SELECT 
        p.*,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INT AS age,
        fn_calculate_patient_balance(p.patient_id) AS outstanding_balance
      FROM patients p
      WHERE p.patient_id = $1;
    `;
    const patientRes = await query(patientSql, [patientId]);

    if (patientRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Parallel fetch of clinical history tabs
    const [apptsRes, admitsRes, rxsRes, labsRes, invsRes] = await Promise.all([
      query(`
        SELECT a.*, dept.department_name, CONCAT(s.first_name, ' ', s.last_name) AS doctor_name
        FROM appointments a
        JOIN departments dept ON a.department_id = dept.department_id
        JOIN doctors d ON a.doctor_id = d.doctor_id
        JOIN staff s ON d.staff_id = s.staff_id
        WHERE a.patient_id = $1
        ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 10;
      `, [patientId]),

      query(`
        SELECT adm.*, CONCAT(s.first_name, ' ', s.last_name) AS doctor_name, b.bed_number, w.ward_name
        FROM admissions adm
        JOIN doctors d ON adm.admitting_doctor_id = d.doctor_id
        JOIN staff s ON d.staff_id = s.staff_id
        LEFT JOIN bed_assignments ba ON adm.admission_id = ba.admission_id AND ba.is_current = TRUE
        LEFT JOIN beds b ON ba.bed_id = b.bed_id
        LEFT JOIN rooms r ON b.room_id = r.room_id
        LEFT JOIN wards w ON r.ward_id = w.ward_id
        WHERE adm.patient_id = $1
        ORDER BY adm.admission_date DESC LIMIT 10;
      `, [patientId]),

      query(`
        SELECT pr.*, CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
               COUNT(pi.item_id) AS item_count
        FROM prescriptions pr
        JOIN doctors d ON pr.doctor_id = d.doctor_id
        JOIN staff s ON d.staff_id = s.staff_id
        LEFT JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
        WHERE pr.patient_id = $1
        GROUP BY pr.prescription_id, s.first_name, s.last_name
        ORDER BY pr.issue_date DESC LIMIT 10;
      `, [patientId]),

      query(`
        SELECT lo.*, CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
               COUNT(loi.order_item_id) AS test_count
        FROM lab_orders lo
        JOIN doctors d ON lo.doctor_id = d.doctor_id
        JOIN staff s ON d.staff_id = s.staff_id
        LEFT JOIN lab_order_items loi ON lo.order_id = loi.order_id
        WHERE lo.patient_id = $1
        GROUP BY lo.order_id, s.first_name, s.last_name
        ORDER BY lo.order_date DESC LIMIT 10;
      `, [patientId]),

      query(`
        SELECT inv.* 
        FROM invoices inv
        WHERE inv.patient_id = $1
        ORDER BY inv.issue_date DESC LIMIT 10;
      `, [patientId])
    ]);

    res.json({
      success: true,
      patient: patientRes.rows[0],
      appointments: apptsRes.rows,
      admissions: admitsRes.rows,
      prescriptions: rxsRes.rows,
      labOrders: labsRes.rows,
      invoices: invsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients - Register New Patient
router.post('/', authenticateToken, requireRoles('Admin', 'Receptionist', 'Doctor'), async (req, res, next) => {
  try {
    const {
      firstName, lastName, dateOfBirth, gender, bloodGroup,
      phone, email, address, emergencyContactName, emergencyContactPhone
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !gender || !phone || !emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory fields (First name, Last name, DOB, Gender, Phone, Emergency contact details).',
      });
    }

    // Generate unique patient code (P-XXXXX)
    const seqRes = await query("SELECT nextval('patients_patient_id_seq') AS next_id;");
    const nextId = seqRes.rows[0].next_id;
    const patientCode = `P-${10000 + parseInt(nextId)}`;

    const insertSql = `
      INSERT INTO patients (
        patient_id, patient_code, first_name, last_name, date_of_birth, gender,
        blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone,
        is_active, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    const result = await query(insertSql, [
      nextId, patientCode, firstName.trim(), lastName.trim(), dateOfBirth, gender,
      bloodGroup || null, phone.trim(), email ? email.trim() : null, address || null,
      emergencyContactName.trim(), emergencyContactPhone.trim()
    ]);

    res.status(201).json({
      success: true,
      message: `Patient ${patientCode} registered successfully.`,
      patient: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/:id - Update Patient Information
router.put('/:id', authenticateToken, requireRoles('Admin', 'Receptionist'), async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);
    const {
      firstName, lastName, dateOfBirth, gender, bloodGroup,
      phone, email, address, emergencyContactName, emergencyContactPhone
    } = req.body;

    const updateSql = `
      UPDATE patients
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          date_of_birth = COALESCE($3, date_of_birth),
          gender = COALESCE($4, gender),
          blood_group = COALESCE($5, blood_group),
          phone = COALESCE($6, phone),
          email = COALESCE($7, email),
          address = COALESCE($8, address),
          emergency_contact_name = COALESCE($9, emergency_contact_name),
          emergency_contact_phone = COALESCE($10, emergency_contact_phone),
          updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $11
      RETURNING *;
    `;

    const result = await query(updateSql, [
      firstName, lastName, dateOfBirth, gender, bloodGroup,
      phone, email, address, emergencyContactName, emergencyContactPhone, patientId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    res.json({
      success: true,
      message: 'Patient details updated successfully.',
      patient: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/patients/:id - Soft Deactivation
router.delete('/:id', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);
    const deleteSql = `
      UPDATE patients
      SET is_active = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $1
      RETURNING patient_id, patient_code, is_active;
    `;
    const result = await query(deleteSql, [patientId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    res.json({
      success: true,
      message: `Patient ${result.rows[0].patient_code} deactivated successfully.`,
      patient: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id/medical-history - Advanced Query 1 (Longitudinal Clinical History)
router.get('/:id/medical-history', authenticateToken, async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);

    const historySql = `
      SELECT 
        p.patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.gender,
        p.blood_group,
        c.consultation_id,
        c.consultation_number,
        c.consultation_date,
        CONCAT(s.first_name, ' ', s.last_name) AS attending_physician,
        doc.specialization,
        a.appointment_number,
        a.appointment_type,
        c.symptoms,
        c.clinical_notes,
        c.treatment_plan,
        c.vitals,
        STRING_AGG(CONCAT(d.diagnosis_name, ' (', cd.diagnosis_type, ')'), '; ') AS diagnoses_list
      FROM patients p
      JOIN consultations c ON p.patient_id = c.patient_id
      LEFT JOIN appointments a ON c.appointment_id = a.appointment_id
      JOIN doctors doc ON c.doctor_id = doc.doctor_id
      JOIN staff s ON doc.staff_id = s.staff_id
      LEFT JOIN consultation_diagnoses cd ON c.consultation_id = cd.consultation_id
      LEFT JOIN diagnoses d ON cd.diagnosis_id = d.diagnosis_id
      WHERE p.patient_id = $1
      GROUP BY 
        p.patient_id, p.patient_code, p.first_name, p.last_name, p.gender, p.blood_group,
        c.consultation_id, c.consultation_number, c.consultation_date, s.first_name, s.last_name,
        doc.specialization, a.appointment_number, a.appointment_type, c.symptoms, c.clinical_notes,
        c.treatment_plan, c.vitals
      ORDER BY c.consultation_date DESC;
    `;

    const result = await query(historySql, [patientId]);

    res.json({
      success: true,
      history: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
