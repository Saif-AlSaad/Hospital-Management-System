// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Frontend API Client & Service Gateway
// Plain Fetch Wrapper with Token Management & Error Handling
// ============================================================================

const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('hms_token');
export const setAuthToken = (token) => localStorage.setItem('hms_token', token);
export const clearAuthToken = () => {
  localStorage.removeItem('hms_token');
  localStorage.removeItem('hms_user');
};

export const getStoredUser = () => {
  const u = localStorage.getItem('hms_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};
export const setStoredUser = (user) => localStorage.setItem('hms_user', JSON.stringify(user));
export const getCurrentUser = getStoredUser;
export const logout = clearAuthToken;

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: data.message || 'Session expired. Please sign in again.' }));
    }
    const error = new Error(data.message || data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.detail = data.detail;
    throw error;
  }

  return data;
}

// Health Check
export const checkHealth = () => apiRequest('/health');

// Auth Service
export const login = (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const getMe = () => apiRequest('/auth/me');

// Helper function to build clean, sanitized query strings
export const buildQuery = (params = {}) => {
  const clean = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== 'undefined' &&
      value !== 'null' &&
      value !== 'All' &&
      value !== 'all'
    ) {
      clean[key] = value;
    }
  }
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
};

// Patient Management Service
export const fetchPatients = (params = {}) => apiRequest(`/patients${buildQuery(params)}`);
export const searchPatients = (term) => apiRequest(`/patients${buildQuery({ search: term, limit: 10 })}`);
export const fetchPatientDetails = (id) => apiRequest(`/patients/${id}`);
export const fetchPatientMedicalHistory = (id) => apiRequest(`/patients/${id}/medical-history`);
export const createPatient = (patientData) => apiRequest('/patients', { method: 'POST', body: JSON.stringify(patientData) });
export const updatePatient = (id, data) => apiRequest(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePatient = (id) => apiRequest(`/patients/${id}`, { method: 'DELETE' });

// Doctor & Staff Directory Service
export const fetchDoctors = (params = {}) => apiRequest(`/doctors${buildQuery(params)}`);
export const fetchDoctorProfile = (id) => apiRequest(`/doctors/${id}`);
export const fetchDoctorSchedule = (id) => apiRequest(`/doctors/${id}`);
export const fetchDepartments = () => apiRequest('/departments');
export const createDepartment = (data) => apiRequest('/departments', { method: 'POST', body: JSON.stringify(data) });
export const fetchStaff = (params = {}) => apiRequest(`/staff${buildQuery(params)}`);
export const createStaff = (data) => apiRequest('/staff', { method: 'POST', body: JSON.stringify(data) });

// Appointment Service
export const fetchAppointments = (params = {}) => apiRequest(`/appointments${buildQuery(params)}`);
export const createAppointment = (data) => apiRequest('/appointments', { method: 'POST', body: JSON.stringify(data) });
export const rescheduleAppointment = (id, data) => apiRequest(`/appointments/${id}/reschedule`, { method: 'PUT', body: JSON.stringify(data) });
export const updateAppointmentStatus = (id, status) => apiRequest(`/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
export const checkDoctorAvailability = (params) => apiRequest(`/appointments/check-availability${buildQuery(params)}`);

// Consultation & Encounter Service
export const fetchConsultations = (params = {}) => apiRequest(`/consultations${buildQuery(params)}`);
export const fetchConsultationDetails = (id) => apiRequest(`/consultations/${id}`);
export const fetchDiagnosesCatalog = () => apiRequest('/consultations/diagnoses-catalog');
export const createConsultation = (data) => apiRequest('/consultations', { method: 'POST', body: JSON.stringify(data) });

// Inpatient Admission & Bed Management Service
export const fetchAdmissions = (params = {}) => apiRequest(`/admissions${buildQuery(params)}`);
export const fetchAdmissionDetails = (id) => apiRequest(`/admissions/${id}`);
export const admitPatient = (data) => apiRequest('/admissions/admit', { method: 'POST', body: JSON.stringify(data) });
export const dischargePatient = (id, data) => apiRequest(`/admissions/${id}/discharge`, { method: 'POST', body: JSON.stringify(data) });
export const transferBed = (id, data) => apiRequest(`/admissions/${id}/transfer-bed`, { method: 'POST', body: JSON.stringify(data) });
export const fetchWards = () => apiRequest('/wards');
export const fetchAvailableBeds = (wardId) => apiRequest(`/wards/available-beds${buildQuery({ wardId })}`);
export const fetchWardBeds = (wardId) => apiRequest(`/wards/${wardId}/beds`);
export const updateBedStatus = (bedId, status) => apiRequest(`/wards/beds/${bedId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

// Laboratory Diagnostics Service
export const fetchLabCatalog = () => apiRequest('/laboratory/catalog');
export const fetchLabOrders = (params = {}) => apiRequest(`/laboratory/orders${buildQuery(params)}`);
export const fetchLabOrderDetails = (id) => apiRequest(`/laboratory/orders/${id}`);
export const createLabOrder = (data) => apiRequest('/laboratory/orders', { method: 'POST', body: JSON.stringify(data) });
export const recordLabResult = (orderId, itemId, data) => apiRequest(`/laboratory/orders/${orderId}/items/${itemId}/result`, { method: 'POST', body: JSON.stringify(data) });

// Pharmacy & Inventory Service
export const fetchMedicines = (params = {}) => apiRequest(`/pharmacy/medicines${buildQuery(params)}`);
export const fetchMedicineCategories = () => apiRequest('/pharmacy/categories');
export const fetchMedicineBatches = (params = {}) => apiRequest(`/pharmacy/batches${buildQuery(params)}`);
export const addMedicineBatch = (data) => apiRequest('/pharmacy/batches', { method: 'POST', body: JSON.stringify(data) });
export const fetchLowStockMedicines = () => apiRequest('/pharmacy/low-stock');

// Prescriptions & Dispensing Service
export const fetchPrescriptions = (params = {}) => apiRequest(`/prescriptions${buildQuery(params)}`);
export const fetchPrescriptionDetails = (id) => apiRequest(`/prescriptions/${id}`);
export const dispensePrescription = (id, data) => apiRequest(`/prescriptions/${id}/dispense`, { method: 'POST', body: JSON.stringify(data) });

// Billing & Payments Service
export const fetchBillingServices = () => apiRequest('/billing/services');
export const fetchInvoices = (params = {}) => apiRequest(`/billing/invoices${buildQuery(params)}`);
export const fetchInvoiceDetails = (id) => apiRequest(`/billing/invoices/${id}`);
export const createInvoice = (data) => apiRequest('/billing/invoices', { method: 'POST', body: JSON.stringify(data) });
export const processPayment = (data) => apiRequest('/billing/payments', { method: 'POST', body: JSON.stringify(data) });
export const fetchPayments = (params = {}) => apiRequest(`/billing/payments${buildQuery(params)}`);
export const getPatientBalance = (patientId) => apiRequest(`/billing/patients/${patientId}/balance`);

// Reports, Analytics & Viva Inspection Service
export const fetchDashboardStats = () => apiRequest('/reports/dashboard-stats');
export const fetchMonthlyPerformance = () => apiRequest('/reports/monthly-performance');
export const refreshMaterializedView = () => apiRequest('/reports/refresh-materialized-view', { method: 'POST' });
export const fetchDoctorWorkload = (params = {}) => apiRequest(`/reports/doctor-workload${buildQuery(params)}`);
export const fetchRevenueBreakdown = (params = {}) => apiRequest(`/reports/revenue-breakdown${buildQuery(params)}`);
export const fetchDebtAging = () => apiRequest('/reports/debt-aging');
export const explainQuery = (type) => apiRequest(`/reports/explain-query${buildQuery({ type })}`);

// Audit Trail Service
export const fetchAuditLogs = (params = {}) => apiRequest(`/audit-logs${buildQuery(params)}`);

// Backward-compatible compound object export
export const api = {
  login,
  getMe,
  getPatients: fetchPatients,
  getPatientById: fetchPatientDetails,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientMedicalHistory: fetchPatientMedicalHistory,
  getDoctors: fetchDoctors,
  getDoctorById: fetchDoctorProfile,
  getDepartments: fetchDepartments,
  createDepartment,
  getAppointments: fetchAppointments,
  createAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  checkDoctorAvailability,
  getConsultations: fetchConsultations,
  getConsultationById: fetchConsultationDetails,
  getDiagnosesCatalog: fetchDiagnosesCatalog,
  createConsultation,
  getAdmissions: fetchAdmissions,
  admitPatient,
  dischargePatient,
  transferBed,
  getWards: fetchWards,
  getAvailableBeds: fetchAvailableBeds,
  getWardBeds: fetchWardBeds,
  updateBedStatus,
  getLabCatalog: fetchLabCatalog,
  getLabOrders: fetchLabOrders,
  getLabOrderById: fetchLabOrderDetails,
  createLabOrder,
  recordLabResult,
  getMedicines: fetchMedicines,
  getPharmacyBatches: fetchMedicineBatches,
  createBatch: addMedicineBatch,
  getLowStockMedicines: fetchLowStockMedicines,
  getPrescriptions: fetchPrescriptions,
  getPrescriptionById: fetchPrescriptionDetails,
  dispensePrescription,
  getServices: fetchBillingServices,
  getInvoices: fetchInvoices,
  getInvoiceById: fetchInvoiceDetails,
  createInvoice,
  processPayment,
  getPayments: fetchPayments,
  getPatientBalance,
  getDashboardStats: fetchDashboardStats,
  getMonthlyPerformance: fetchMonthlyPerformance,
  refreshMaterializedView,
  getDoctorWorkload: fetchDoctorWorkload,
  getRevenueBreakdown: fetchRevenueBreakdown,
  getDebtAging: fetchDebtAging,
  getExplainQuery: explainQuery,
  getStaff: fetchStaff,
  createStaff,
  getAuditLogs: fetchAuditLogs,
  checkHealth,
};

export default api;
