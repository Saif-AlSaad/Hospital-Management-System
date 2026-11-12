// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Pharmacy & Inventory Management Routes
// Controlled Stock Movements, Batch Tracking & Low Stock Warnings
// ============================================================================

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/pharmacy/categories - Drug Categories
router.get('/categories', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM medicine_categories WHERE is_active = TRUE ORDER BY category_name;');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/pharmacy/medicines - Formulary with Stock Aggregations
router.get('/medicines', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const isClean = (v) => v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null' && v !== 'All' && v !== 'all';

    const categoryId = isClean(req.query.categoryId) ? parseInt(req.query.categoryId) : null;
    const search = isClean(req.query.search) && req.query.search.trim() ? `%${req.query.search.trim()}%` : null;

    let whereClause = 'WHERE m.is_active = TRUE';
    const params = [];

    if (categoryId) {
      params.push(categoryId);
      whereClause += ` AND m.category_id = $${params.length}`;
    }
    if (search) {
      params.push(search);
      whereClause += ` AND (m.brand_name ILIKE $${params.length} OR m.generic_name ILIKE $${params.length} OR m.manufacturer ILIKE $${params.length})`;
    }

    const countSql = `SELECT COUNT(*) FROM medicines m ${whereClause};`;

    const dataSql = `
      SELECT 
        m.medicine_id,
        m.brand_name,
        m.generic_name,
        m.dosage_form,
        m.strength,
        m.manufacturer,
        m.unit_price,
        m.reorder_level,
        m.is_prescription_required,
        mc.category_id,
        mc.category_name,
        COALESCE(SUM(mb.current_quantity), 0) AS total_stock,
        COUNT(mb.batch_id) FILTER (WHERE mb.expiry_date <= CURRENT_DATE) AS expired_batches_count,
        CASE 
          WHEN COALESCE(SUM(mb.current_quantity), 0) = 0 THEN 'OUT_OF_STOCK'
          WHEN COALESCE(SUM(mb.current_quantity), 0) <= m.reorder_level THEN 'LOW_STOCK'
          ELSE 'OPTIMAL'
        END AS stock_status
      FROM medicines m
      JOIN medicine_categories mc ON m.category_id = mc.category_id
      LEFT JOIN medicine_batches mb ON m.medicine_id = mb.medicine_id AND mb.is_active = TRUE
      ${whereClause}
      GROUP BY 
        m.medicine_id, m.brand_name, m.generic_name, m.dosage_form, m.strength,
        m.manufacturer, m.unit_price, m.reorder_level, m.is_prescription_required,
        mc.category_id, mc.category_name
      ORDER BY m.brand_name
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

// GET /api/pharmacy/low-stock - View v_low_stock_medicines
router.get('/low-stock', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT * FROM v_low_stock_medicines 
      WHERE stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')
      ORDER BY total_available_stock ASC, reorder_level DESC;
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/pharmacy/batches - Inventory Batches with Expiry Information
router.get('/batches', authenticateToken, async (req, res, next) => {
  try {
    const medicineId = req.query.medicineId ? parseInt(req.query.medicineId) : null;
    const inStockOnly = req.query.inStockOnly !== 'false';

    let sql = `
      SELECT 
        mb.*,
        m.brand_name,
        m.generic_name,
        m.dosage_form,
        m.strength,
        mc.category_name,
        CASE 
          WHEN mb.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
          WHEN mb.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'NEAR_EXPIRY'
          ELSE 'VALID'
        END AS expiry_status
      FROM medicine_batches mb
      JOIN medicines m ON mb.medicine_id = m.medicine_id
      JOIN medicine_categories mc ON m.category_id = mc.category_id
      WHERE mb.is_active = TRUE
    `;
    const params = [];

    if (medicineId) {
      params.push(medicineId);
      sql += ` AND mb.medicine_id = $${params.length}`;
    }
    if (inStockOnly) {
      sql += ` AND mb.current_quantity > 0`;
    }

    sql += ` ORDER BY mb.expiry_date ASC, mb.batch_id DESC;`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/pharmacy/batches - Add Stock Batch & Record Purchase Transaction
router.post('/batches', authenticateToken, requireRoles('Admin', 'Doctor', 'Nurse'), async (req, res, next) => {
  try {
    const {
      medicineId, batchNumber, manufactureDate, expiryDate,
      costPrice, sellingPrice, initialQuantity, notes
    } = req.body;

    if (!medicineId || !batchNumber || !manufactureDate || !expiryDate || !initialQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Medicine ID, Batch number, Manufacture date, Expiry date, and Quantity are mandatory.',
      });
    }

    const userId = req.user?.userId || 1;
    const cost = parseFloat(costPrice) || 1.00;
    const sell = parseFloat(sellingPrice) || cost * 1.5;
    const qty = parseInt(initialQuantity);

    const batch = await withTransaction(async (client) => {
      // 1. Insert into medicine_batches
      const bRes = await client.query(`
        INSERT INTO medicine_batches (
          medicine_id, batch_number, manufacture_date, expiry_date,
          cost_price, selling_price, initial_quantity, current_quantity, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, TRUE)
        RETURNING *;
      `, [medicineId, batchNumber.trim(), manufactureDate, expiryDate, cost, sell, qty]);

      const createdBatch = bRes.rows[0];

      // 2. Insert double-entry inventory ledger
      const totalAmt = qty * cost;
      await client.query(`
        INSERT INTO inventory_transactions (
          batch_id, medicine_id, transaction_type, quantity, unit_price,
          total_amount, reference_type, performed_by, notes
        )
        VALUES ($1, $2, 'Purchase', $3, $4, $5, 'PurchaseOrder', $6, $7);
      `, [createdBatch.batch_id, medicineId, qty, cost, totalAmt, userId, notes || 'Initial batch receipt']);

      return createdBatch;
    });

    res.status(201).json({
      success: true,
      message: `Batch ${batch.batch_number} added with ${qty} units.`,
      batch,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
