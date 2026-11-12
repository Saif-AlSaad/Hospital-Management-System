// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Billing & Payment Management Routes
// Powered by Stored Procedure (sp_process_payment) & Function (fn_calculate_patient_balance)
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/billing/services - Service Tariff Catalog
router.get('/services', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM services WHERE is_active = TRUE ORDER BY category, service_name;');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/patients/:id/balance - Function fn_calculate_patient_balance
router.get('/patients/:id/balance', authenticateToken, async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);
    const result = await query('SELECT fn_calculate_patient_balance($1) AS outstanding_balance;', [patientId]);
    res.json({
      success: true,
      patientId,
      outstandingBalance: parseFloat(result.rows[0].outstanding_balance),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/invoices - List Invoices with Filters
router.get('/invoices', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const isClean = (v) => v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null' && v !== 'All' && v !== 'all';

    const patientId = isClean(req.query.patientId) ? parseInt(req.query.patientId) : null;
    const status = isClean(req.query.status) ? req.query.status : null; // 'Unpaid', 'Partially Paid', 'Paid'
    const search = isClean(req.query.search) && req.query.search.trim() ? `%${req.query.search.trim()}%` : null;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (patientId) {
      params.push(patientId);
      whereClause += ` AND inv.patient_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND inv.status = $${params.length}`;
    }
    if (search) {
      params.push(search);
      whereClause += ` AND (inv.invoice_number ILIKE $${params.length} OR p.patient_code ILIKE $${params.length} OR p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length})`;
    }

    const countSql = `
      SELECT COUNT(*) 
      FROM invoices inv
      JOIN patients p ON inv.patient_id = p.patient_id
      ${whereClause};
    `;

    const dataSql = `
      SELECT 
        inv.*,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.phone AS patient_phone
      FROM invoices inv
      JOIN patients p ON inv.patient_id = p.patient_id
      ${whereClause}
      ORDER BY inv.issue_date DESC, inv.invoice_id DESC
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

// GET /api/billing/invoices/:id - Invoice Details with Items and Payment History
router.get('/invoices/:id', authenticateToken, async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);

    const invSql = `
      SELECT 
        inv.*,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.gender,
        p.phone,
        p.address,
        u.username AS billed_by_user
      FROM invoices inv
      JOIN patients p ON inv.patient_id = p.patient_id
      LEFT JOIN users u ON inv.created_by = u.user_id
      WHERE inv.invoice_id = $1;
    `;

    const itemsSql = `
      SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY item_id;
    `;

    const paymentsSql = `
      SELECT 
        pay.*,
        u.username AS cashier_username
      FROM payments pay
      LEFT JOIN users u ON pay.received_by = u.user_id
      WHERE pay.invoice_id = $1
      ORDER BY pay.payment_date DESC;
    `;

    const [invRes, itemsRes, payRes] = await Promise.all([
      query(invSql, [invoiceId]),
      query(itemsSql, [invoiceId]),
      query(paymentsSql, [invoiceId]),
    ]);

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    res.json({
      success: true,
      invoice: invRes.rows[0],
      items: itemsRes.rows,
      payments: payRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/invoices - Create Itemized Invoice (Multi-Table Transaction)
router.post('/invoices', authenticateToken, requireRoles('Admin', 'Accountant', 'Receptionist'), async (req, res, next) => {
  try {
    const { patientId, admissionId, consultationId, dueDate, items, notes } = req.body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and at least one billable line item are required.',
      });
    }

    const createdBy = req.user?.userId || 1;

    const createdInvoice = await withTransaction(async (client) => {
      // 1. Generate unique invoice number
      const seqRes = await client.query("SELECT nextval('invoices_invoice_id_seq') AS next_id;");
      const nextId = seqRes.rows[0].next_id;
      const invNumber = `INV-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

      // 2. Compute financial totals
      let subtotal = 0.00;
      let totalDiscount = 0.00;

      for (const item of items) {
        const itemQty = parseInt(item.quantity) || 1;
        const itemPrice = parseFloat(item.unitPrice) || 0.00;
        const itemDisc = parseFloat(item.discount) || 0.00;
        subtotal += (itemQty * itemPrice);
        totalDiscount += itemDisc;
      }

      const taxableAmount = Math.max(0.00, subtotal - totalDiscount);
      const taxAmount = parseFloat((taxableAmount * 0.05).toFixed(2)); // Standard 5% tax
      const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));

      // 3. Insert into invoices
      const invRes = await client.query(`
        INSERT INTO invoices (
          invoice_id, invoice_number, patient_id, admission_id, consultation_id,
          issue_date, due_date, subtotal, discount_amount, tax_amount, total_amount,
          paid_amount, balance_due, status, notes, created_by
        )
        VALUES (
          $1, $2, $3, $4, $5,
          CURRENT_DATE, COALESCE($6, CURRENT_DATE + INTERVAL '7 days'), $7, $8, $9, $10,
          0.00, $10, 'Unpaid', $11, $12
        )
        RETURNING *;
      `, [
        nextId, invNumber, patientId, admissionId || null, consultationId || null,
        dueDate || null, subtotal, totalDiscount, taxAmount, totalAmount, notes || null, createdBy
      ]);

      // 4. Insert invoice items
      for (const item of items) {
        const itemQty = parseInt(item.quantity) || 1;
        const itemPrice = parseFloat(item.unitPrice) || 0.00;
        const itemDisc = parseFloat(item.discount) || 0.00;
        const itemTotal = parseFloat(((itemQty * itemPrice) - itemDisc).toFixed(2));

        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, service_id, item_description, quantity,
            unit_price, discount, total_price, reference_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [
          nextId, item.serviceId || null, item.description, itemQty,
          itemPrice, itemDisc, itemTotal, item.referenceType || 'Service'
        ]);
      }

      return invRes.rows[0];
    });

    res.status(201).json({
      success: true,
      message: `Invoice ${createdInvoice.invoice_number} generated successfully. Total: $${createdInvoice.total_amount}`,
      invoice: createdInvoice,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/payments - List Payments with Patient and Invoice Information
router.get('/payments', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const paymentMethod = req.query.paymentMethod || null;
    const invoiceId = req.query.invoiceId ? parseInt(req.query.invoiceId) : null;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (paymentMethod) {
      params.push(paymentMethod);
      whereClause += ` AND pay.payment_method = $${params.length}`;
    }
    if (invoiceId) {
      params.push(invoiceId);
      whereClause += ` AND pay.invoice_id = $${params.length}`;
    }
    if (search) {
      params.push(search);
      whereClause += ` AND (pay.payment_number ILIKE $${params.length} OR inv.invoice_number ILIKE $${params.length} OR p.patient_code ILIKE $${params.length} OR p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length})`;
    }

    const countSql = `
      SELECT COUNT(*) 
      FROM payments pay
      JOIN invoices inv ON pay.invoice_id = inv.invoice_id
      JOIN patients p ON inv.patient_id = p.patient_id
      ${whereClause};
    `;

    const dataSql = `
      SELECT 
        pay.payment_id,
        pay.payment_number,
        pay.invoice_id,
        pay.amount,
        pay.payment_method,
        pay.transaction_reference,
        pay.payment_date,
        pay.notes,
        inv.invoice_number,
        inv.total_amount AS invoice_total,
        inv.status AS invoice_status,
        p.patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        u.username AS cashier_username
      FROM payments pay
      JOIN invoices inv ON pay.invoice_id = inv.invoice_id
      JOIN patients p ON inv.patient_id = p.patient_id
      LEFT JOIN users u ON pay.received_by = u.user_id
      ${whereClause}
      ORDER BY pay.payment_date DESC, pay.payment_id DESC
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

// POST /api/billing/payments - Record Payment via Stored Procedure sp_process_payment
router.post('/payments', authenticateToken, requireRoles('Admin', 'Accountant', 'Receptionist'), async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionReference, notes } = req.body;

    if (!invoiceId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID, Payment amount, and Payment method are mandatory.',
      });
    }

    const receivedBy = req.user?.userId || 1;

    // Call PostgreSQL Stored Procedure sp_process_payment with INOUT parameter
    const spResult = await query(
      'CALL sp_process_payment($1, $2, $3, $4, $5, NULL);',
      [parseInt(invoiceId), parseFloat(amount), paymentMethod, transactionReference || null, receivedBy]
    );

    const paymentId = spResult.rows[0]?.p_payment_id;

    // Fetch updated invoice state
    const invRes = await query('SELECT total_amount, paid_amount, balance_due, status FROM invoices WHERE invoice_id = $1;', [invoiceId]);

    res.status(201).json({
      success: true,
      message: `Payment of $${parseFloat(amount).toFixed(2)} recorded successfully via stored procedure sp_process_payment.`,
      paymentId,
      invoice: invRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
