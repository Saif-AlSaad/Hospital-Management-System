// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Step 5: Comprehensive Verification & Automated Audit Suite
// Validates Authentication, Role Resolution, RBAC Boundaries, Triggers,
// Stored Procedures, Financial Integrity, and Table Row Counts
// ============================================================================

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const { query } = require('../../backend/src/db/pool');

const EXPECTED_ROW_COUNTS = {
  patients: 50,
  appointments: 50,
  consultations: 50,
  consultation_diagnoses: 55,
  admissions: 10,
  bed_assignments: 15,
  prescriptions: 50,
  prescription_items: 55,
  lab_orders: 20,
  lab_order_items: 20,
  lab_results: 20,
  invoices: 100,
  invoice_items: 100,
  payments: 150,
  medicine_batches: 100,
  inventory_transactions: 100,
};

const STAKEHOLDERS = [
  { username: 'admin', expectedRole: 'Admin', expectedLanding: 'dashboard', minModules: 14 },
  { username: 'doctor1', expectedRole: 'Doctor', expectedLanding: 'consultations', minModules: 6 },
  { username: 'receptionist1', expectedRole: 'Receptionist', expectedLanding: 'appointments', minModules: 6 },
  { username: 'accountant1', expectedRole: 'Accountant', expectedLanding: 'billing', minModules: 4 },
];

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function runStep5Verification() {
  console.log('================================================================');
  console.log('🏥 HMS STEP 5: COMPREHENSIVE VERIFICATION & AUDIT SUITE');
  console.log(`🌐 Target Base URL: ${BASE_URL}`);
  console.log('================================================================\n');

  const tokens = {};

  // --------------------------------------------------------------------------
  // SECTION 1: AUTHENTICATION & STAKEHOLDER IDENTITY RESOLUTION
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: AUTHENTICATION & IDENTITY RESOLUTION ---');
  for (const s of STAKEHOLDERS) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: s.username, password: 'password123' }),
    });

    assert(res.status === 200, `Login for "${s.username}" returned HTTP 200`);
    assert(res.data.token && typeof res.data.token === 'string', `Valid JWT token issued for "${s.username}"`);
    assert(res.data.user.role === s.expectedRole, `Role resolved to "${s.expectedRole}" for "${s.username}"`);
    assert(res.data.user.defaultRoute === s.expectedLanding, `Default landing route is "${s.expectedLanding}" for "${s.username}"`);
    assert(
      Array.isArray(res.data.user.accessibleModules) && res.data.user.accessibleModules.length >= s.minModules,
      `Accessible modules configured (${res.data.user.accessibleModules?.length} modules) for "${s.username}"`
    );

    if (s.expectedRole === 'Doctor') {
      assert(res.data.user.doctorId !== undefined, 'Doctor profile linked with doctorId');
      assert(res.data.user.doctorProfile?.licenseNumber !== undefined, `Physician license BMDC verified (${res.data.user.doctorProfile?.licenseNumber})`);
    }

    tokens[s.username] = res.data.token;
  }

  // --------------------------------------------------------------------------
  // SECTION 2: STRICT RBAC BOUNDARY ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: STRICT RBAC BOUNDARY ENFORCEMENT ---');

  // Test 2.1: Sensitive Staff / HR directory (Admin only)
  const staffAdmin = await request('/staff', { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert(staffAdmin.status === 200, 'Admin can view sensitive Staff/HR directory');

  const staffDoc = await request('/staff', { headers: { Authorization: `Bearer ${tokens.doctor1}` } });
  assert(staffDoc.status === 403, 'Doctor blocked from Staff/HR directory (403 Forbidden)');

  const staffRecep = await request('/staff', { headers: { Authorization: `Bearer ${tokens.receptionist1}` } });
  assert(staffRecep.status === 403, 'Receptionist blocked from Staff/HR directory (403 Forbidden)');

  const staffAcc = await request('/staff', { headers: { Authorization: `Bearer ${tokens.accountant1}` } });
  assert(staffAcc.status === 403, 'Accountant blocked from Staff/HR directory (403 Forbidden)');

  // Test 2.2: Clinical Consultations (Doctor & Admin only)
  const conDoc = await request('/consultations', { headers: { Authorization: `Bearer ${tokens.doctor1}` } });
  assert(conDoc.status === 200, 'Doctor can access clinical consultations encounters');

  const conRecep = await request('/consultations', { headers: { Authorization: `Bearer ${tokens.receptionist1}` } });
  assert(conRecep.status === 403, 'Receptionist blocked from clinical consultations (403 Forbidden)');

  const conAcc = await request('/consultations', { headers: { Authorization: `Bearer ${tokens.accountant1}` } });
  assert(conAcc.status === 403, 'Accountant blocked from clinical consultations (403 Forbidden)');

  // Test 2.3: Invoicing Ledger (Accountant & Admin only)
  const invAcc = await request('/billing/invoices', { headers: { Authorization: `Bearer ${tokens.accountant1}` } });
  assert(invAcc.status === 200, 'Accountant can access billing invoices ledger');

  const invDoc = await request('/billing/invoices', { headers: { Authorization: `Bearer ${tokens.doctor1}` } });
  assert(invDoc.status === 403, 'Doctor blocked from billing invoices ledger (403 Forbidden)');

  const invRecep = await request('/billing/invoices', { headers: { Authorization: `Bearer ${tokens.receptionist1}` } });
  assert(invRecep.status === 403, 'Receptionist blocked from billing invoices ledger (403 Forbidden)');

  // Test 2.4: Materialized Performance View (Admin & Accountant only)
  const perfAcc = await request('/reports/monthly-performance', { headers: { Authorization: `Bearer ${tokens.accountant1}` } });
  assert(perfAcc.status === 200, 'Accountant can access monthly performance materialized view');

  const perfDoc = await request('/reports/monthly-performance', { headers: { Authorization: `Bearer ${tokens.doctor1}` } });
  assert(perfDoc.status === 403, 'Doctor blocked from monthly financial performance (403 Forbidden)');

  // Test 2.5: Unauthenticated access guard
  const unauth = await request('/consultations');
  assert(unauth.status === 401, 'Unauthenticated request correctly rejected with HTTP 401');

  // --------------------------------------------------------------------------
  // SECTION 3: PHYSICIAN DATA SCOPING ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: PHYSICIAN DATA SCOPING ENFORCEMENT ---');
  const docAppts = await request('/appointments', { headers: { Authorization: `Bearer ${tokens.doctor1}` } });
  assert(docAppts.status === 200, 'Doctor retrieved appointment schedule');
  if (docAppts.data.data && docAppts.data.data.length > 0) {
    const allScoped = docAppts.data.data.every(a => a.doctor_id === 1);
    assert(allScoped, 'All returned appointments strictly scoped to Doctor ID 1');
  }

  // --------------------------------------------------------------------------
  // SECTION 4: POSTGRESQL TRIGGERS & PROCEDURES INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: POSTGRESQL TRIGGERS & PROCEDURES INTEGRITY ---');

  // Test 4.1: Doctor slot conflict prevention trigger (trg_check_appointment_conflict)
  const conflictTest = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.receptionist1}` },
    body: JSON.stringify({
      patientId: 1,
      doctorId: 1,
      appointmentDate: '2026-10-15',
      startTime: '10:00:00',
      endTime: '10:30:00',
      appointmentType: 'Routine',
    }),
  });

  // Attempt duplicate slot
  const duplicateSlot = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.receptionist1}` },
    body: JSON.stringify({
      patientId: 2,
      doctorId: 1,
      appointmentDate: '2026-10-15',
      startTime: '10:15:00', // Overlaps!
      endTime: '10:45:00',
      appointmentType: 'Routine',
    }),
  });
  assert(duplicateSlot.status === 409 || duplicateSlot.status === 400, 'Trigger trg_check_appointment_conflict blocked overlapping booking');

  // Clean up test appointment if inserted
  if (conflictTest.data?.appointment?.appointment_id) {
    await query('DELETE FROM appointments WHERE appointment_id = $1', [conflictTest.data.appointment.appointment_id]);
  }

  // Test 4.2: Function fn_calculate_patient_balance
  const balRes = await query('SELECT fn_calculate_patient_balance(1) AS bal;');
  assert(!isNaN(parseFloat(balRes.rows[0].bal)), `fn_calculate_patient_balance evaluated: ৳${balRes.rows[0].bal}`);

  // Test 4.3: Refresh Materialized View
  const mvRes = await request('/reports/refresh-materialized-view', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.admin}` },
  });
  assert(mvRes.status === 200, 'Materialized View mv_monthly_hospital_performance refreshed concurrently');

  // --------------------------------------------------------------------------
  // SECTION 5: EXACT DATABASE TABLE ROW COUNTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: EXACT DATABASE TABLE ROW COUNTS ---');
  let countsMatch = true;

  for (const [table, expected] of Object.entries(EXPECTED_ROW_COUNTS)) {
    const res = await query(`SELECT COUNT(*) AS cnt FROM ${table}`);
    const actual = parseInt(res.rows[0].cnt);
    const matches = actual === expected;
    if (!matches) countsMatch = false;
    assert(matches, `Table "${table}": actual=${actual}, expected=${expected}`);
  }

  // --------------------------------------------------------------------------
  // FINAL SCORE & SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount === 0 && countsMatch) {
    console.log('🎉 SYSTEM VERIFICATION 100% SUCCESSFUL: ALL CHECKS PASSED PERFECTLY!');
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS.');
  }
  console.log('================================================================');

  process.exit(failCount === 0 ? 0 : 1);
}

runStep5Verification().catch((err) => {
  console.error('Test Suite encountered an uncaught error:', err);
  process.exit(1);
});

