// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Audit Trail & Logging Routes
// Captures Database Trigger-Recorded Changes with Before/After JSONB Snapshots
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/audit-logs - List System Audit Records
router.get('/', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const tableName = req.query.tableName || null;
    const action = req.query.action || null; // 'INSERT', 'UPDATE', 'DELETE'

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (tableName) {
      params.push(tableName);
      whereClause += ` AND al.table_name = $${params.length}`;
    }
    if (action) {
      params.push(action);
      whereClause += ` AND al.action = $${params.length}`;
    }

    const countSql = `SELECT COUNT(*) FROM audit_logs al ${whereClause};`;

    const dataSql = `
      SELECT 
        al.log_id,
        al.table_name,
        al.record_id,
        al.action,
        al.old_values,
        al.new_values,
        al.changed_at,
        al.ip_address,
        u.username AS changed_by_user
      FROM audit_logs al
      LEFT JOIN users u ON al.changed_by = u.user_id
      ${whereClause}
      ORDER BY al.changed_at DESC, al.log_id DESC
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

module.exports = router;
