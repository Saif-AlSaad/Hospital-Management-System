// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Laboratory & Diagnostics Management Routes
// Parameterized Queries, Multi-table Requisitions, and Result Processing
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/laboratory/catalog - All Laboratory Tests and Categories
router.get('/catalog', authenticateToken, async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        lt.test_id,
        lt.test_code,
        lt.test_name,
        lt.description,
        lt.standard_fee,
        lt.normal_range,
        lt.units,
        lt.sample_type,
        lt.is_active,
        lc.category_id,
        lc.category_name
      FROM lab_tests lt
      JOIN lab_test_categories lc ON lt.category_id = lc.category_id
      WHERE lt.is_active = TRUE
      ORDER BY lc.category_name, lt.test_name;
    `;
    const result = await query(sql);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/laboratory/orders - List Requisitions with Multi-Level Filters
router.get('/orders', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const isClean = (v) => v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null' && v !== 'All' && v !== 'all';

    const status = isClean(req.query.status) ? req.query.status : null; // 'Ordered', 'In Progress', 'Completed'
    const priority = isClean(req.query.priority) ? req.query.priority : null;
    const patientId = isClean(req.query.patientId) ? parseInt(req.query.patientId) : null;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND lo.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      whereClause += ` AND lo.priority = $${params.length}`;
    }
    if (patientId) {
      params.push(patientId);
      whereClause += ` AND lo.patient_id = $${params.length}`;
    }

    const countSql = `SELECT COUNT(*) FROM lab_orders lo ${whereClause};`;

    const dataSql = `
      SELECT 
        lo.order_id,
        lo.order_number,
        lo.order_date,
        lo.status,
        lo.priority,
        p.patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.phone AS patient_phone,
        d.doctor_id,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        COUNT(loi.order_item_id) AS total_items_count,
        COUNT(loi.order_item_id) FILTER (WHERE loi.status = 'Completed') AS completed_items_count
      FROM lab_orders lo
      JOIN patients p ON lo.patient_id = p.patient_id
      JOIN doctors d ON lo.doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      LEFT JOIN lab_order_items loi ON lo.order_id = loi.order_id
      ${whereClause}
      GROUP BY 
        lo.order_id, lo.order_number, lo.order_date, lo.status, lo.priority,
        p.patient_id, p.patient_code, p.first_name, p.last_name, p.phone,
        d.doctor_id, s.first_name, s.last_name
      ORDER BY lo.order_date DESC
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

// GET /api/laboratory/orders/:id - Order Details with Test Items and Results
router.get('/orders/:id', authenticateToken, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);

    const orderSql = `
      SELECT 
        lo.*,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.gender,
        p.date_of_birth,
        p.phone,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name,
        d.specialization
      FROM lab_orders lo
      JOIN patients p ON lo.patient_id = p.patient_id
      JOIN doctors d ON lo.doctor_id = d.doctor_id
      JOIN staff s ON d.staff_id = s.staff_id
      WHERE lo.order_id = $1;
    `;

    const itemsSql = `
      SELECT 
        loi.order_item_id,
        loi.order_id,
        loi.test_id,
        loi.item_fee,
        loi.status AS item_status,
        loi.result_summary,
        lt.test_code,
        lt.test_name,
        lt.normal_range,
        lt.units,
        lt.sample_type,
        lr.result_id,
        lr.parameter_name,
        lr.measured_value,
        lr.reference_range,
        lr.is_abnormal,
        lr.remarks,
        lr.completed_at
      FROM lab_order_items loi
      JOIN lab_tests lt ON loi.test_id = lt.test_id
      LEFT JOIN lab_results lr ON loi.order_item_id = lr.order_item_id
      WHERE loi.order_id = $1;
    `;

    const [orderRes, itemsRes] = await Promise.all([
      query(orderSql, [orderId]),
      query(itemsSql, [orderId]),
    ]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Laboratory order not found.' });
    }

    res.json({
      success: true,
      order: orderRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/laboratory/orders - Order Lab Tests (Multi-Table Transaction: order + order items)
router.post('/orders', authenticateToken, requireRoles('Admin', 'Doctor'), async (req, res, next) => {
  try {
    const { patientId, doctorId, consultationId, priority, testIds } = req.body;

    if (!patientId || !doctorId || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Doctor, and at least one Test are required to place a lab requisition.',
      });
    }

    const orderResult = await withTransaction(async (client) => {
      // 1. Generate unique order number
      const seqRes = await client.query("SELECT nextval('lab_orders_order_id_seq') AS next_id;");
      const nextId = seqRes.rows[0].next_id;
      const orderNumber = `LBO-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

      // 2. Insert into lab_orders
      const oRes = await client.query(`
        INSERT INTO lab_orders (
          order_id, order_number, patient_id, doctor_id, consultation_id,
          order_date, status, priority
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'Ordered', $6)
        RETURNING *;
      `, [nextId, orderNumber, patientId, doctorId, consultationId || null, priority || 'Routine']);

      // 3. Insert items
      for (const tId of testIds) {
        // Fetch standard fee
        const testRes = await client.query('SELECT standard_fee FROM lab_tests WHERE test_id = $1;', [tId]);
        const fee = testRes.rows[0]?.standard_fee || 25.00;

        await client.query(`
          INSERT INTO lab_order_items (order_id, test_id, item_fee, status)
          VALUES ($1, $2, $3, 'Pending');
        `, [nextId, tId, fee]);
      }

      return oRes.rows[0];
    });

    res.status(201).json({
      success: true,
      message: `Laboratory requisition ${orderResult.order_number} created successfully with ${testIds.length} test(s).`,
      order: orderResult,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/laboratory/orders/:orderId/items/:itemId/result - Record Measured Test Result
router.post('/orders/:orderId/items/:itemId/result', authenticateToken, requireRoles('Admin', 'LaboratoryTechnician'), async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);
    const { parameterName, measuredValue, unit, referenceRange, isAbnormal, remarks } = req.body;

    if (!parameterName || !measuredValue) {
      return res.status(400).json({
        success: false,
        message: 'Parameter name and measured value are required.',
      });
    }

    const techId = req.user?.staffId || 1;

    await withTransaction(async (client) => {
      // 1. Insert result record
      await client.query(`
        INSERT INTO lab_results (
          order_item_id, parameter_name, measured_value, unit,
          reference_range, is_abnormal, remarks, technician_id, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP);
      `, [
        itemId, parameterName.trim(), measuredValue.trim(), unit || null,
        referenceRange || null, Boolean(isAbnormal), remarks || null, techId
      ]);

      // 2. Mark order item completed
      await client.query(`
        UPDATE lab_order_items
        SET status = 'Completed',
            result_summary = $1,
            performed_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE order_item_id = $3;
      `, [`Result recorded: ${measuredValue}`, techId, itemId]);

      // 3. Check if all items in order are completed
      const pendingCheck = await client.query(`
        SELECT COUNT(*) FROM lab_order_items WHERE order_id = $1 AND status != 'Completed';
      `, [orderId]);

      if (parseInt(pendingCheck.rows[0].count) === 0) {
        await client.query(`
          UPDATE lab_orders
          SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
          WHERE order_id = $1;
        `, [orderId]);
      } else {
        await client.query(`
          UPDATE lab_orders
          SET status = 'In Progress', updated_at = CURRENT_TIMESTAMP
          WHERE order_id = $1 AND status = 'Ordered';
        `, [orderId]);
      }
    });

    res.json({
      success: true,
      message: 'Laboratory test result recorded and verified successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
