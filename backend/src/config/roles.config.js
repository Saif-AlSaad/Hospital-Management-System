// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Stakeholder Role & Permission Matrix Configuration
// Canonical definition of the 4 primary stakeholders and their access limits
// ============================================================================

const STAKEHOLDER_ROLES = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  ACCOUNTANT: 'Accountant',
};

const STAKEHOLDER_PROFILES = {
  [STAKEHOLDER_ROLES.ADMIN]: {
    role: STAKEHOLDER_ROLES.ADMIN,
    title: 'Hospital Administrator',
    description: 'Executive management, system governance, user credentials, audit trail, and hospital-wide supervision.',
    defaultRoute: 'dashboard',
    accessibleModules: [
      'dashboard',
      'patients',
      'appointments',
      'consultations',
      'admissions',
      'wards',
      'laboratory',
      'pharmacy',
      'prescriptions',
      'billing',
      'payments',
      'reports',
      'doctors',
      'departments',
      'staff',
      'audit-logs',
      'settings',
    ],
    permissions: [
      'ALL',
      'MANAGE_USERS',
      'MANAGE_STAFF',
      'MANAGE_DEPARTMENTS',
      'VIEW_AUDIT_LOGS',
      'MANAGE_SETTINGS',
      'VIEW_ANALYTICS',
      'REFRESH_MATERIALIZED_VIEWS',
    ],
  },

  [STAKEHOLDER_ROLES.DOCTOR]: {
    role: STAKEHOLDER_ROLES.DOCTOR,
    title: 'Medical Doctor / Consultant',
    description: 'Outpatient clinical encounters, diagnostic requisitions, e-prescribing, and inpatient care.',
    defaultRoute: 'consultations',
    accessibleModules: [
      'dashboard',
      'consultations',
      'prescriptions',
      'laboratory',
      'admissions',
      'wards',
      'patients',
      'appointments',
    ],
    permissions: [
      'VIEW_OPD_QUEUE',
      'CONDUCT_CONSULTATION',
      'DIAGNOSE_PATIENT',
      'WRITE_PRESCRIPTION',
      'ORDER_LAB_TESTS',
      'VERIFY_LAB_RESULTS',
      'MANAGE_INPATIENT_CARE',
      'VIEW_PATIENT_360',
    ],
  },

  [STAKEHOLDER_ROLES.RECEPTIONIST]: {
    role: STAKEHOLDER_ROLES.RECEPTIONIST,
    title: 'Front Desk & Patient Registrar',
    description: 'Patient registration, appointment booking, physician schedules, and inpatient bed admissions.',
    defaultRoute: 'appointments',
    accessibleModules: [
      'dashboard',
      'patients',
      'appointments',
      'admissions',
      'wards',
      'doctors',
    ],
    permissions: [
      'REGISTER_PATIENT',
      'EDIT_PATIENT',
      'SCHEDULE_APPOINTMENT',
      'MANAGE_APPOINTMENT_STATUS',
      'ADMIT_INPATIENT',
      'TRANSFER_BED',
      'VIEW_BED_AVAILABILITY',
      'VIEW_DOCTOR_SCHEDULES',
    ],
  },

  [STAKEHOLDER_ROLES.ACCOUNTANT]: {
    role: STAKEHOLDER_ROLES.ACCOUNTANT,
    title: 'Hospital Billing & Financial Controller',
    description: 'Invoicing, cash counter payment receipts, accounts receivable, debt aging, and pharmacy inventory valuation.',
    defaultRoute: 'billing',
    accessibleModules: [
      'dashboard',
      'billing',
      'payments',
      'reports',
      'pharmacy',
      'patients',
    ],
    permissions: [
      'GENERATE_INVOICE',
      'FINALIZE_BILL',
      'PROCESS_PAYMENT',
      'ISSUE_RECEIPT',
      'VIEW_DEBT_AGING',
      'VIEW_FINANCIAL_REPORTS',
      'AUDIT_INVENTORY_STOCK',
    ],
  },
};

/**
 * Resolves the primary stakeholder role from an array of role names.
 * Priority order: Admin > Doctor > Accountant > Receptionist.
 */
function resolvePrimaryRole(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return STAKEHOLDER_ROLES.RECEPTIONIST;

  if (roles.includes(STAKEHOLDER_ROLES.ADMIN)) return STAKEHOLDER_ROLES.ADMIN;
  if (roles.includes(STAKEHOLDER_ROLES.DOCTOR)) return STAKEHOLDER_ROLES.DOCTOR;
  if (roles.includes(STAKEHOLDER_ROLES.ACCOUNTANT)) return STAKEHOLDER_ROLES.ACCOUNTANT;
  if (roles.includes(STAKEHOLDER_ROLES.RECEPTIONIST)) return STAKEHOLDER_ROLES.RECEPTIONIST;

  return roles[0];
}

/**
 * Checks if a stakeholder role has access to a specific module.
 */
function hasModuleAccess(role, moduleId) {
  const profile = STAKEHOLDER_PROFILES[role];
  if (!profile) return false;
  if (profile.role === STAKEHOLDER_ROLES.ADMIN) return true;
  return profile.accessibleModules.includes(moduleId);
}

/**
 * Checks if a stakeholder role has a specific fine-grained permission.
 */
function hasPermission(role, permissionKey) {
  const profile = STAKEHOLDER_PROFILES[role];
  if (!profile) return false;
  if (profile.role === STAKEHOLDER_ROLES.ADMIN) return true;
  return profile.permissions.includes(permissionKey);
}

module.exports = {
  STAKEHOLDER_ROLES,
  STAKEHOLDER_PROFILES,
  resolvePrimaryRole,
  hasModuleAccess,
  hasPermission,
};
