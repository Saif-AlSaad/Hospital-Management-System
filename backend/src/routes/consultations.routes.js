// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Outpatient Consultation & Clinical Encounter Routes
// Multi-Table Transactions (Encounter + Diagnoses + Prescription + Appointment Status)
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/consultations/diagnoses-catalog - ICD-10 diagnoses list for dropdowns
router.get('/diagnoses-catalog', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT diagnosis_id, icd_code, diagnosis_name, description
      FROM diagnoses
      WHERE is_active = TRUE
      ORDER BY icd_code;
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/consultations - List consultations with filters
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const patientId = req.query.patientId ? parseInt(req.query.patientId) : null;
    const doctorId = req.query.doctorId ? parseInt(req.query.doctorId) : null;
    const date = req.query.date || null;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (patientId) {
      params.push(patientId);
      whereClause += ` AND c.patient_id = $${params.length}`;
    }
    if (doctorId) {
      params.push(doctorId);
      whereClause += ` AND c.doctor_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      whereClause += ` AND c.consultation_date::DATE = $${params.length}`;
    }

    const countSql = `SELECT COUNT(*) FROM consultations c ${whereClause};`;

    const dataSql = `
      SELECT 
        c.consultation_id,
        c.consultation_number,
        c.consultation_date,
        c.symptoms,
        c.clinical_notes,
        c.treatment_plan,
        c.follow_up_date,
        c.vitals,
        p.patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.gender AS patient_gender,
        p.blood_group,
        d.doctor_id,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        d.specialization,
        dept.department_name,
        STRING_AGG(CONCAT(diag.diagnosis_name, ' (', cd.diagnosis_type, ')'), '; ') AS diagnoses_summary
      FROM consultations c
      JOIN patients p ON c.patient_id = p.patient_id
      JOIN doctors d ON c.doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      JOIN departments dept ON d.department_id = dept.department_id
      LEFT JOIN consultation_diagnoses cd ON c.consultation_id = cd.consultation_id
      LEFT JOIN diagnoses diag ON cd.diagnosis_id = diag.diagnosis_id
      ${whereClause}
      GROUP BY 
        c.consultation_id, p.patient_id, p.patient_code, p.first_name, p.last_name,
        p.gender, p.blood_group, d.doctor_id, s.first_name, s.last_name, d.specialization,
        dept.department_name
      ORDER BY c.consultation_date DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
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

// GET /api/consultations/:id - Full Consultation Details with Diagnoses and Prescriptions
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const consultationId = parseInt(req.params.id);

    const conSql = `
      SELECT 
        c.*,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.gender,
        p.date_of_birth,
        p.phone,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        d.specialization,
        dept.department_name,
        a.appointment_number
      FROM consultations c
      JOIN patients p ON c.patient_id = p.patient_id
      JOIN doctors d ON c.doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      JOIN departments dept ON d.department_id = dept.department_id
      LEFT JOIN appointments a ON c.appointment_id = a.appointment_id
      WHERE c.consultation_id = $1;
    `;

    const diagSql = `
      SELECT cd.diagnosis_type, cd.notes, d.diagnosis_id, d.icd_code, d.diagnosis_name
      FROM consultation_diagnoses cd
      JOIN diagnoses d ON cd.diagnosis_id = d.diagnosis_id
      WHERE cd.consultation_id = $1;
    `;

    const rxSql = `
      SELECT pr.*, 
             json_agg(json_build_object(
               'item_id', pi.item_id,
               'medicine_id', m.medicine_id,
               'brand_name', m.brand_name,
               'generic_name', m.generic_name,
               'dosage', pi.dosage,
               'frequency', pi.frequency,
               'duration_days', pi.duration_days,
               'prescribed_quantity', pi.prescribed_quantity,
               'instructions', pi.instructions
             )) AS items
      FROM prescriptions pr
      LEFT JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
      LEFT JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pr.consultation_id = $1
      GROUP BY pr.prescription_id;
    `;

    const [conRes, diagRes, rxRes] = await Promise.all([
      query(conSql, [consultationId]),
      query(diagSql, [consultationId]),
      query(rxSql, [consultationId]),
    ]);

    if (conRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consultation encounter not found.' });
    }

    res.json({
      success: true,
      consultation: conRes.rows[0],
      diagnoses: diagRes.rows,
      prescriptions: rxRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/consultations - Create Clinical Encounter (Multi-Table Atomic Transaction)
// Modifies 4 related tables atomically:
// 1. consultations
// 2. consultation_diagnoses
// 3. appointments (updates status to 'Completed')
// 4. prescriptions & prescription_items (if prescribed)
router.post('/', authenticateToken, requireRoles('Admin', 'Doctor'), async (req, res, next) => {
  try {
    const {
      appointmentId, patientId, doctorId, symptoms, clinicalNotes,
      treatmentPlan, followUpDate, vitals, diagnoses, prescriptionItems
    } = req.body;

    if (!patientId || !doctorId || !symptoms || !clinicalNotes) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Doctor, Symptoms, and Clinical Notes are mandatory.',
      });
    }

    const encounterResult = await withTransaction(async (client) => {
      // 1. Generate unique consultation number
      const seqRes = await client.query("SELECT nextval('consultations_consultation_id_seq') AS next_id;");
      const nextId = seqRes.rows[0].next_id;
      const conNumber = `CON-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

      // 2. Insert into consultations
      const conRes = await client.query(`
        INSERT INTO consultations (
          consultation_id, consultation_number, appointment_id, patient_id, doctor_id,
          consultation_date, symptoms, clinical_notes, treatment_plan, follow_up_date, vitals
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10::jsonb)
        RETURNING *;
      `, [
        nextId, conNumber, appointmentId || null, patientId, doctorId,
        symptoms, clinicalNotes, treatmentPlan || null, followUpDate || null,
        vitals ? JSON.stringify(vitals) : null
      ]);

      const con = conRes.rows[0];

      // 3. Link Diagnoses (Junction table consultation_diagnoses)
      if (Array.isArray(diagnoses) && diagnoses.length > 0) {
        for (const d of diagnoses) {
          await client.query(`
            INSERT INTO consultation_diagnoses (consultation_id, diagnosis_id, diagnosis_type, notes)
            VALUES ($1, $2, $3, $4);
          `, [nextId, d.diagnosisId, d.diagnosisType || 'Primary', d.notes || null]);
        }
      }

      // 4. Update linked appointment if present
      if (appointmentId) {
        await client.query(`
          UPDATE appointments
          SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
          WHERE appointment_id = $1;
        `, [appointmentId]);
      }

      // 5. Create Prescription if medicine items provided
      let createdPrescriptionId = null;
      if (Array.isArray(prescriptionItems) && prescriptionItems.length > 0) {
        const rxSeq = await client.query("SELECT nextval('prescriptions_prescription_id_seq') AS next_id;");
        const rxNextId = rxSeq.rows[0].next_id;
        const rxNum = `RX-${new Date().getFullYear()}-${String(rxNextId).padStart(5, '0')}`;

        const rxRes = await client.query(`
          INSERT INTO prescriptions (
            prescription_id, prescription_number, consultation_id, patient_id,
            doctor_id, issue_date, status, notes
          )
          VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'Active', 'Outpatient consultation prescription')
          RETURNING prescription_id;
        `, [rxNextId, rxNum, nextId, patientId, doctorId]);

        createdPrescriptionId = rxRes.rows[0].prescription_id;

        for (const item of prescriptionItems) {
          await client.query(`
            INSERT INTO prescription_items (
              prescription_id, medicine_id, dosage, frequency,
              duration_days, prescribed_quantity, instructions
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7);
          `, [
            createdPrescriptionId, item.medicineId, item.dosage, item.frequency,
            item.durationDays || 7, item.prescribedQuantity, item.instructions || null
          ]);
        }
      }

      return {
        consultation: con,
        prescriptionId: createdPrescriptionId,
      };
    });

    res.status(201).json({
      success: true,
      message: `Consultation ${encounterResult.consultation.consultation_number} documented successfully.`,
      data: encounterResult,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
