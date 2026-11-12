// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Wards, Rooms & Bed Management Routes
// Utilizing Database Views (v_bed_occupancy_by_ward) and Functions (fn_get_available_beds)
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/wards - Ward List with Occupancy Metrics (from View v_bed_occupancy_by_ward)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM v_bed_occupancy_by_ward ORDER BY ward_name;');
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/wards/available-beds - Calls Database Function fn_get_available_beds
router.get('/available-beds', authenticateToken, async (req, res, next) => {
  try {
    const wardId = req.query.wardId ? parseInt(req.query.wardId) : null;
    const result = await query('SELECT * FROM fn_get_available_beds($1);', [wardId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/wards/:id/beds - All Beds in a specific Ward with Current Occupant
router.get('/:id/beds', authenticateToken, async (req, res, next) => {
  try {
    const wardId = parseInt(req.params.id);

    const sql = `
      SELECT 
        b.bed_id,
        b.bed_number,
        b.daily_rate,
        b.status,
        b.is_active,
        r.room_id,
        r.room_number,
        r.room_type,
        w.ward_id,
        w.ward_name,
        adm.admission_id,
        adm.admission_number,
        p.patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS current_patient_name
      FROM beds b
      JOIN rooms r ON b.room_id = r.room_id
      JOIN wards w ON r.ward_id = w.ward_id
      LEFT JOIN bed_assignments ba ON b.bed_id = ba.bed_id AND ba.is_current = TRUE
      LEFT JOIN admissions adm ON ba.admission_id = adm.admission_id AND adm.status = 'Admitted'
      LEFT JOIN patients p ON adm.patient_id = p.patient_id
      WHERE w.ward_id = $1
      ORDER BY r.room_number, b.bed_number;
    `;

    const result = await query(sql, [wardId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/wards/beds/:id/status - Update Bed Status (e.g. Set to Maintenance or Available)
router.put('/beds/:id/status', authenticateToken, requireRoles('Admin', 'Nurse'), async (req, res, next) => {
  try {
    const bedId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['Available', 'Occupied', 'Maintenance', 'Reserved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid bed status. Must be one of: [${validStatuses.join(', ')}]`,
      });
    }

    const result = await query(`
      UPDATE beds
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE bed_id = $2
      RETURNING *;
    `, [status, bedId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bed not found.' });
    }

    res.json({
      success: true,
      message: `Bed ${result.rows[0].bed_number} status changed to ${status}.`,
      bed: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
