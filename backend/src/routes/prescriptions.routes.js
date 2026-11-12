// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Prescription & Pharmacy Dispensing Routes
// Atomic Inventory Reductions, Controlled Dispensing & Ledger Integration
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/prescriptions - List Prescriptions
router.get('/', authenticateToken, requireRoles('Doctor', 'Admin', 'Accountant', 'Receptionist'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const isClean = (v) => v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null' && v !== 'All' && v !== 'all';

    const patientId = isClean(req.query.patientId) ? parseInt(req.query.patientId) : null;
    let doctorId = isClean(req.query.doctorId) ? parseInt(req.query.doctorId) : null;
    let status = isClean(req.query.status) ? req.query.status : null; // 'Active', 'Partially Dispensed', 'Dispensed'
    if (status === 'Pending') status = 'Active';

    // Doctor Data Isolation: Doctors can only view prescriptions they authored
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

    if (patientId) {
      params.push(patientId);
      whereClause += ` AND pr.patient_id = $${params.length}`;
    }
    if (doctorId) {
      params.push(doctorId);
      whereClause += ` AND pr.doctor_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND pr.status = $${params.length}`;
    }

    const countSql = `SELECT COUNT(*) FROM prescriptions pr ${whereClause};`;

    const dataSql = `
      SELECT 
        pr.prescription_id,
        pr.prescription_number,
        pr.issue_date,
        pr.status,
        pr.notes,
        p.patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.phone AS patient_phone,
        d.doctor_id,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        d.specialization,
        COUNT(pi.item_id) AS total_medicines,
        COALESCE(SUM(pi.prescribed_quantity), 0) AS total_prescribed_qty,
        COALESCE(SUM(pi.dispensed_quantity), 0) AS total_dispensed_qty
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.patient_id
      JOIN doctors d ON pr.doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      LEFT JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
      ${whereClause}
      GROUP BY 
        pr.prescription_id, pr.prescription_number, pr.issue_date, pr.status, pr.notes,
        p.patient_id, p.patient_code, p.first_name, p.last_name, p.phone,
        d.doctor_id, s.first_name, s.last_name, d.specialization
      ORDER BY pr.issue_date DESC
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

// GET /api/prescriptions/:id - Prescription Details with Items & Available Batches
router.get('/:id', authenticateToken, requireRoles('Doctor', 'Admin', 'Accountant', 'Receptionist'), async (req, res, next) => {
  try {
    const prescriptionId = parseInt(req.params.id);

    const rxSql = `
      SELECT 
        pr.*,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.gender,
        p.date_of_birth,
        p.phone,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        d.specialization
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.patient_id
      JOIN doctors d ON pr.doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      WHERE pr.prescription_id = $1;
    `;

    const itemsSql = `
      SELECT 
        pi.*,
        m.brand_name,
        m.generic_name,
        m.dosage_form,
        m.strength,
        m.unit_price,
        (pi.prescribed_quantity - pi.dispensed_quantity) AS remaining_to_dispense,
        COALESCE(
          (SELECT SUM(current_quantity) FROM medicine_batches mb WHERE mb.medicine_id = m.medicine_id AND mb.is_active = TRUE AND mb.current_quantity > 0),
          0
        ) AS current_total_stock
      FROM prescription_items pi
      JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pi.prescription_id = $1;
    `;

    const [rxRes, itemsRes] = await Promise.all([
      query(rxSql, [prescriptionId]),
      query(itemsSql, [prescriptionId]),
    ]);

    if (rxRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found.' });
    }

    // Doctor Data Scoping
    if (req.user.role === 'Doctor' && rxRes.rows[0].doctor_id !== req.user.doctorId) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_RESOURCE',
        message: 'Access denied. Doctors can only view prescriptions they authored.',
      });
    }

    res.json({
      success: true,
      prescription: rxRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/prescriptions - Create Standalone Prescription
router.post('/', authenticateToken, requireRoles('Doctor', 'Admin'), async (req, res, next) => {
  try {
    const { patientId, doctorId, consultationId, notes, items } = req.body;

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

    if (!patientId || !effectiveDoctorId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Doctor, and at least one medicine item are mandatory.',
      });
    }

    const prescription = await withTransaction(async (client) => {
      const rxSeq = await client.query("SELECT nextval('prescriptions_prescription_id_seq') AS next_id;");
      const rxNextId = rxSeq.rows[0].next_id;
      const rxNum = `RX-${new Date().getFullYear()}-${String(rxNextId).padStart(5, '0')}`;

      const rxRes = await client.query(`
        INSERT INTO prescriptions (
          prescription_id, prescription_number, consultation_id, patient_id,
          doctor_id, issue_date, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'Active', $6)
        RETURNING *;
      `, [rxNextId, rxNum, consultationId || null, patientId, effectiveDoctorId, notes || 'Direct prescription']);

      for (const item of items) {
        await client.query(`
          INSERT INTO prescription_items (
            prescription_id, medicine_id, dosage, frequency,
            duration_days, prescribed_quantity, instructions
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [
          rxNextId, item.medicineId, item.dosage, item.frequency,
          item.durationDays || 7, item.prescribedQuantity, item.instructions || null
        ]);
      }

      return rxRes.rows[0];
    });

    res.status(201).json({
      success: true,
      message: `Prescription ${prescription.prescription_number} generated successfully.`,
      prescription,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/prescriptions/:id/dispense - Multi-Table Dispensing Workflow
// Atomically deducts inventory, records dispensing, updates prescription items and status
router.post('/:id/dispense', authenticateToken, requireRoles('Admin', 'Accountant', 'Doctor'), async (req, res, next) => {
  try {
    const prescriptionId = parseInt(req.params.id);
    const { items, notes } = req.body; // Array of { prescriptionItemId, batchId, quantity }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine item with selected batch and quantity is required for dispensing.',
      });
    }

    const pharmacistId = req.user?.staffId || 1;
    const userId = req.user?.userId || 1;

    const dispensingResult = await withTransaction(async (client) => {
      // 1. Fetch prescription header
      const rxRes = await client.query('SELECT patient_id, status FROM prescriptions WHERE prescription_id = $1 FOR UPDATE;', [prescriptionId]);
      if (rxRes.rows.length === 0) {
        throw new Error('Prescription not found.');
      }
      const patientId = rxRes.rows[0].patient_id;

      // 2. Generate unique dispensing number
      const seqRes = await client.query("SELECT nextval('medicine_dispensing_dispensing_id_seq') AS next_id;");
      const nextId = seqRes.rows[0].next_id;
      const dispNumber = `DSP-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

      // 3. Create dispensing header
      const dispRes = await client.query(`
        INSERT INTO medicine_dispensing (
          dispensing_id, dispensing_number, prescription_id, patient_id,
          pharmacist_id, dispensing_date, total_amount, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 0.00, 'Completed', $6)
        RETURNING *;
      `, [nextId, dispNumber, prescriptionId, patientId, pharmacistId, notes || 'Prescription fulfillment']);

      let grandTotal = 0.00;

      // 4. Process each item
      for (const item of items) {
        const { prescriptionItemId, batchId, quantity } = item;
        const qtyToDispense = parseInt(quantity);

        if (qtyToDispense <= 0) continue;

        // Fetch prescription item info
        const piRes = await client.query(`
          SELECT medicine_id, prescribed_quantity, dispensed_quantity 
          FROM prescription_items 
          WHERE item_id = $1 AND prescription_id = $2
          FOR UPDATE;
        `, [prescriptionItemId, prescriptionId]);

        if (piRes.rows.length === 0) {
          throw new Error(`Prescription item ID ${prescriptionItemId} not found.`);
        }

        const pi = piRes.rows[0];
        const remaining = pi.prescribed_quantity - pi.dispensed_quantity;

        if (qtyToDispense > remaining) {
          throw new Error(`Dispensing quantity (${qtyToDispense}) exceeds remaining prescribed quantity (${remaining}).`);
        }

        // Fetch batch and verify stock
        const batchRes = await client.query(`
          SELECT selling_price, current_quantity 
          FROM medicine_batches 
          WHERE batch_id = $1 FOR UPDATE;
        `, [batchId]);

        if (batchRes.rows.length === 0) {
          throw new Error(`Batch ID ${batchId} not found.`);
        }

        const batch = batchRes.rows[0];
        if (batch.current_quantity < qtyToDispense) {
          throw new Error(`Insufficient batch stock: Requested ${qtyToDispense}, but batch only has ${batch.current_quantity}.`);
        }

        const unitPrice = parseFloat(batch.selling_price);
        const subtotal = parseFloat((qtyToDispense * unitPrice).toFixed(2));
        grandTotal += subtotal;

        // Insert dispensing line item
        await client.query(`
          INSERT INTO medicine_dispensing_items (
            dispensing_id, prescription_item_id, batch_id, medicine_id, quantity, unit_price, subtotal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [nextId, prescriptionItemId, batchId, pi.medicine_id, qtyToDispense, unitPrice, subtotal]);

        // Record inventory ledger (Trigger trg_inventory_stock_control will deduct batch quantity)
        await client.query(`
          INSERT INTO inventory_transactions (
            batch_id, medicine_id, transaction_type, quantity, unit_price,
            total_amount, reference_type, reference_id, performed_by, notes
          )
          VALUES ($1, $2, 'Dispense', $3, $4, $5, 'Prescription', $6, $7, 'Prescription fulfillment');
        `, [batchId, pi.medicine_id, qtyToDispense, unitPrice, subtotal, prescriptionId, userId]);

        // Update dispensed quantity on prescription item
        await client.query(`
          UPDATE prescription_items
          SET dispensed_quantity = dispensed_quantity + $1
          WHERE item_id = $2;
        `, [qtyToDispense, prescriptionItemId]);
      }

      // Update dispensing total
      await client.query(`
        UPDATE medicine_dispensing SET total_amount = $1 WHERE dispensing_id = $2;
      `, [grandTotal, nextId]);

      // Check if all items on prescription are fulfilled
      const remainingCheck = await client.query(`
        SELECT COUNT(*) 
        FROM prescription_items 
        WHERE prescription_id = $1 AND dispensed_quantity < prescribed_quantity;
      `, [prescriptionId]);

      const allFulfilled = (parseInt(remainingCheck.rows[0].count) === 0);
      await client.query(`
        UPDATE prescriptions 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE prescription_id = $2;
      `, [allFulfilled ? 'Dispensed' : 'Partially Dispensed', prescriptionId]);

      return {
        dispensingId: nextId,
        dispensingNumber: dispNumber,
        totalAmount: grandTotal,
        prescriptionStatus: allFulfilled ? 'Dispensed' : 'Partially Dispensed',
      };
    });

    res.status(201).json({
      success: true,
      message: `Dispensing ${dispensingResult.dispensingNumber} processed successfully. Total: $${dispensingResult.totalAmount.toFixed(2)}`,
      data: dispensingResult,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
