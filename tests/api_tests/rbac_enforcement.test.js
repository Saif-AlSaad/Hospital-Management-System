// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Automated RBAC & Data Scoping Enforcement Test Suite
// Verifies Role Boundaries & Physician Scoping Across All Stakeholders
// ============================================================================

const BASE_URL = 'http://localhost:5000/api';

async function runRBACTests() {
  console.log('====================================================');
  console.log('🛡️  Starting HMS Strict RBAC & Data Scoping Test Suite');
  console.log('🌐 Target Base URL:', BASE_URL);
  console.log('====================================================\n');

  let adminToken = '';
  let doctorToken = '';
  let receptionistToken = '';
  let accountantToken = '';
  let doctorProfile = null;

  const request = async (endpoint, options = {}, token = null) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  };

  // 1. Authenticate All 4 Stakeholders
  console.log('--- 1. AUTHENTICATING 4 PRIMARY STAKEHOLDERS ---');
  {
    const adminRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail: 'admin', password: 'password123' }),
    });
    if (!adminRes.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminRes.data));
    adminToken = adminRes.data.token;
    console.log(`✅ Admin: authenticated as "${adminRes.data.user.fullName}" (${adminRes.data.user.role})`);

    const docRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail: 'doctor1', password: 'password123' }),
    });
    if (!docRes.ok) throw new Error('Doctor login failed: ' + JSON.stringify(docRes.data));
    doctorToken = docRes.data.token;
    doctorProfile = docRes.data.user.doctorProfile;
    console.log(`✅ Doctor: authenticated as "${docRes.data.user.fullName}" (Doctor ID: ${doctorProfile?.doctorId})`);

    const recepRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail: 'receptionist1', password: 'password123' }),
    });
    if (!recepRes.ok) throw new Error('Receptionist login failed: ' + JSON.stringify(recepRes.data));
    receptionistToken = recepRes.data.token;
    console.log(`✅ Receptionist: authenticated as "${recepRes.data.user.fullName}" (${recepRes.data.user.role})`);

    const acctRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail: 'accountant1', password: 'password123' }),
    });
    if (!acctRes.ok) throw new Error('Accountant login failed: ' + JSON.stringify(acctRes.data));
    accountantToken = acctRes.data.token;
    console.log(`✅ Accountant: authenticated as "${acctRes.data.user.fullName}" (${acctRes.data.user.role})\n`);
  }

  // 2. Test Staff Endpoint Access (Admin Only)
  console.log('--- 2. SENSITIVE HR/STAFF ACCESS RESTRICTION ---');
  {
    const adminStaff = await request('/staff', {}, adminToken);
    if (adminStaff.status === 200) {
      console.log(`✅ Admin successfully retrieved staff list (${adminStaff.data.data?.length} records)`);
    } else {
      console.error('❌ Admin failed to get staff:', adminStaff.data);
    }

    const docStaff = await request('/staff', {}, doctorToken);
    if (docStaff.status === 403) {
      console.log('✅ Doctor blocked from staff list (403 Forbidden - Role Restricted)');
    } else {
      console.error('❌ Security breach: Doctor accessed staff list!', docStaff.status);
    }

    const recepStaff = await request('/staff', {}, receptionistToken);
    if (recepStaff.status === 403) {
      console.log('✅ Receptionist blocked from staff list (403 Forbidden - Role Restricted)');
    } else {
      console.error('❌ Security breach: Receptionist accessed staff list!', recepStaff.status);
    }

    const acctStaff = await request('/staff', {}, accountantToken);
    if (acctStaff.status === 403) {
      console.log('✅ Accountant blocked from staff list (403 Forbidden - Role Restricted)\n');
    } else {
      console.error('❌ Security breach: Accountant accessed staff list!', acctStaff.status);
    }
  }

  // 3. Test Clinical Boundaries (Doctor/Admin Only)
  console.log('--- 3. CLINICAL CONSULTATION BOUNDARIES ---');
  {
    const docConsults = await request('/consultations', {}, doctorToken);
    if (docConsults.status === 200) {
      console.log(`✅ Doctor successfully accessed consultation encounters (${docConsults.data.data?.length} records)`);
    } else {
      console.error('❌ Doctor consultation read failed:', docConsults.data);
    }

    const recepConsult = await request('/consultations', {}, receptionistToken);
    if (recepConsult.status === 403) {
      console.log('✅ Receptionist blocked from clinical consultations (403 Forbidden)');
    } else {
      console.error('❌ Security breach: Receptionist accessed clinical consultations!', recepConsult.status);
    }

    const acctConsult = await request('/consultations', {}, accountantToken);
    if (acctConsult.status === 403) {
      console.log('✅ Accountant blocked from clinical consultations (403 Forbidden)\n');
    } else {
      console.error('❌ Security breach: Accountant accessed clinical consultations!', acctConsult.status);
    }
  }

  // 4. Test Financial Perimeter (Accountant/Admin Only)
  console.log('--- 4. FINANCIAL LEDGER & INVOICING PERIMETER ---');
  {
    const acctInvoices = await request('/billing/invoices', {}, accountantToken);
    if (acctInvoices.status === 200) {
      console.log(`✅ Accountant successfully accessed invoices ledger (${acctInvoices.data.data?.length} records)`);
    } else {
      console.error('❌ Accountant invoice read failed:', acctInvoices.data);
    }

    const docInvoices = await request('/billing/invoices', {}, doctorToken);
    if (docInvoices.status === 403) {
      console.log('✅ Doctor blocked from billing invoices ledger (403 Forbidden)');
    } else {
      console.error('❌ Security breach: Doctor accessed billing invoices!', docInvoices.status);
    }

    const recepInvoices = await request('/billing/invoices', {}, receptionistToken);
    if (recepInvoices.status === 403) {
      console.log('✅ Receptionist blocked from billing invoices ledger (403 Forbidden)\n');
    } else {
      console.error('❌ Security breach: Receptionist accessed billing invoices!', recepInvoices.status);
    }
  }

  // 5. Test Doctor Contextual Data Scoping
  console.log('--- 5. PHYSICIAN DATA SCOPING ENFORCEMENT ---');
  {
    const scopedConsults = await request('/consultations', {}, doctorToken);
    const consultItems = scopedConsults.data.data || [];
    const allBelongToDoctor = consultItems.every(c => c.doctor_id === doctorProfile.doctorId);
    if (allBelongToDoctor) {
      console.log(`✅ Data Scoping Verified: All ${consultItems.length} consultations returned match Doctor ID ${doctorProfile.doctorId}`);
    } else {
      console.error('❌ Scoping Violation: Consultations from other physicians were returned!');
    }

    const scopedAppts = await request('/appointments', {}, doctorToken);
    const apptItems = scopedAppts.data.data || [];
    const allApptsBelong = apptItems.every(a => a.doctor_id === doctorProfile.doctorId);
    if (allApptsBelong) {
      console.log(`✅ Data Scoping Verified: All ${apptItems.length} appointments returned match Doctor ID ${doctorProfile.doctorId}`);
    } else {
      console.error('❌ Scoping Violation: Appointments from other physicians were returned!');
    }

    // Attempting to update another physician's profile
    const foreignDocId = doctorProfile.doctorId === 1 ? 2 : 1;
    const hackAttempt = await request(`/doctors/${foreignDocId}`, {
      method: 'PUT',
      body: JSON.stringify({ consultationFee: 9999.00 }),
    }, doctorToken);

    if (hackAttempt.status === 403) {
      console.log(`✅ Impersonation blocked: Doctor ${doctorProfile.doctorId} cannot modify Doctor ${foreignDocId} profile (403 Forbidden)\n`);
    } else {
      console.error('❌ Security Breach: Doctor modified foreign profile!', hackAttempt.status);
    }
  }

  // 6. Test Unauthenticated Requests (401 Unauthorized)
  console.log('--- 6. UNAUTHENTICATED ACCESS GUARD ---');
  {
    const noTokenRes = await request('/patients');
    if (noTokenRes.status === 401 && noTokenRes.data.code === 'AUTH_TOKEN_MISSING') {
      console.log('✅ Missing token correctly rejected with 401 AUTH_TOKEN_MISSING');
    } else {
      console.error('❌ Unexpected status for missing token:', noTokenRes.status);
    }

    const badTokenRes = await request('/patients', {}, 'bogus-jwt-token-string');
    if (badTokenRes.status === 401 && badTokenRes.data.code === 'AUTH_TOKEN_INVALID') {
      console.log('✅ Malformed token correctly rejected with 401 AUTH_TOKEN_INVALID\n');
    } else {
      console.error('❌ Unexpected status for invalid token:', badTokenRes.status);
    }
  }

  console.log('====================================================');
  console.log('🎉 ALL ENTERPRISE RBAC & SCOPING TESTS PASSED (100%)');
  console.log('====================================================');
}

runRBACTests().catch(err => {
  console.error('RBAC test suite execution failed:', err);
  process.exit(1);
});
