// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Database Identity Resolution Service
// Resolves database credentials, mapped roles, and stakeholder operational context
// ============================================================================

const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const {
  STAKEHOLDER_ROLES,
  STAKEHOLDER_PROFILES,
  resolvePrimaryRole,
} = require('../config/roles.config');

const BASE_IDENTITY_SQL = `
  SELECT 
    u.user_id,
    u.username,
    u.email,
    u.password_hash,
    u.is_active,
    u.created_at AS user_created_at,
    u.updated_at AS user_updated_at,
    s.staff_id,
    s.first_name,
    s.last_name,
    s.gender,
    s.phone,
    s.hire_date,
    s.employment_status,
    s.department_id,
    dept.department_name,
    dept.code AS department_code,
    d.doctor_id,
    d.specialization,
    d.license_number,
    d.consultation_fee,
    d.bio AS doctor_bio,
    ARRAY_AGG(DISTINCT r.role_name) AS roles
  FROM users u
  LEFT JOIN user_roles ur ON u.user_id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.role_id
  LEFT JOIN staff s ON u.user_id = s.user_id
  LEFT JOIN departments dept ON s.department_id = dept.department_id
  LEFT JOIN doctors d ON s.staff_id = d.staff_id
`;

const BASE_GROUP_BY_SQL = `
  GROUP BY 
    u.user_id, u.username, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at,
    s.staff_id, s.first_name, s.last_name, s.gender, s.phone, s.hire_date, s.employment_status,
    s.department_id, dept.department_name, dept.code,
    d.doctor_id, d.specialization, d.license_number, d.consultation_fee, d.bio
`;

/**
 * Resolves a full user record by username or email.
 */
async function resolveUserIdentityByCredential(usernameOrEmail) {
  const sql = `
    ${BASE_IDENTITY_SQL}
    WHERE (LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1))
    ${BASE_GROUP_BY_SQL}
    LIMIT 1;
  `;
  const result = await query(sql, [usernameOrEmail.trim()]);
  return result.rows[0] || null;
}

/**
 * Resolves a fresh user record by user_id.
 */
async function resolveUserIdentityById(userId) {
  const sql = `
    ${BASE_IDENTITY_SQL}
    WHERE u.user_id = $1
    ${BASE_GROUP_BY_SQL}
    LIMIT 1;
  `;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
}

/**
 * Verifies a plain-text password against a bcrypt password hash.
 */
async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Builds the canonical stakeholder session payload.
 */
function buildStakeholderSession(userRecord) {
  const rawRoles = (userRecord.roles || []).filter(Boolean);
  const primaryRole = resolvePrimaryRole(rawRoles);
  const profileConfig = STAKEHOLDER_PROFILES[primaryRole] || STAKEHOLDER_PROFILES[STAKEHOLDER_ROLES.RECEPTIONIST];

  const fullName = userRecord.first_name && userRecord.last_name
    ? `${userRecord.first_name} ${userRecord.last_name}`
    : userRecord.username;

  return {
    userId: userRecord.user_id,
    username: userRecord.username,
    email: userRecord.email,
    role: primaryRole,
    roles: rawRoles,
    stakeholderTitle: profileConfig.title,
    stakeholderDescription: profileConfig.description,
    defaultRoute: profileConfig.defaultRoute,
    accessibleModules: profileConfig.accessibleModules,
    permissions: profileConfig.permissions,
    staffId: userRecord.staff_id || null,
    doctorId: userRecord.doctor_id || null,
    fullName,
    firstName: userRecord.first_name || '',
    lastName: userRecord.last_name || '',
    gender: userRecord.gender || null,
    phone: userRecord.phone || null,
    employmentStatus: userRecord.employment_status || 'Active',
    department: userRecord.department_id ? {
      id: userRecord.department_id,
      name: userRecord.department_name,
      code: userRecord.department_code,
    } : null,
    doctorProfile: userRecord.doctor_id ? {
      doctorId: userRecord.doctor_id,
      licenseNumber: userRecord.license_number,
      specialization: userRecord.specialization,
      consultationFee: parseFloat(userRecord.consultation_fee || 0),
      bio: userRecord.doctor_bio,
    } : null,
  };
}

/**
 * Logs an authentication event in audit_logs for compliance.
 */
async function recordAuthAudit(userId, action, ipAddress, details = {}) {
  try {
    const insertSql = `
      INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by, ip_address)
      VALUES ('users', $1, $2, NULL, $3::jsonb, $4, $5);
    `;
    await query(insertSql, [
      String(userId || '0'),
      action, // 'INSERT', 'UPDATE'
      JSON.stringify(details),
      userId || null,
      ipAddress || '127.0.0.1',
    ]);
  } catch (err) {
    // Non-blocking audit write failure
    console.warn('⚠️ Warning: Failed to record auth audit log:', err.message);
  }
}

module.exports = {
  resolveUserIdentityByCredential,
  resolveUserIdentityById,
  verifyPassword,
  buildStakeholderSession,
  recordAuthAudit,
};

