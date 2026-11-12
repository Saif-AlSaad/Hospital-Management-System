// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Patient Management & Longitudinal Clinical History Page
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  BedDouble,
  FileText,
  FlaskConical,
  Receipt,
  HeartPulse,
  Phone,
  Mail,
  MapPin,
  AlertCircle
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPatient360, setSelectedPatient360] = useState(null);
  const [activeTab360, setActiveTab360] = useState('history');
  const [medicalHistory, setMedicalHistory] = useState([]);

  // Form states for register patient
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.getPatients({ page, limit: 15, search: search.trim() });
      setPatients(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [page, search]);

  const handleOpen360 = async (patientId) => {
    try {
      const [fullProfile, historyRes] = await Promise.all([
        api.getPatientById(patientId),
        api.getPatientMedicalHistory(patientId),
      ]);
      setSelectedPatient360(fullProfile);
      setMedicalHistory(historyRes.history || []);
      setActiveTab360('history');
      setShowViewModal(true);
    } catch (err) {
      alert('Failed to load patient profile: ' + err.message);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      await api.createPatient(formData);
      setShowAddModal(false);
      setFormData({
        firstName: '', lastName: '', dateOfBirth: '', gender: 'Male',
        bloodGroup: 'O+', phone: '', email: '', address: '',
        emergencyContactName: '', emergencyContactPhone: '',
      });
      fetchPatients();
    } catch (err) {
      setFormError(err.message || 'Failed to register patient.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivate = async (patientId) => {
    if (window.confirm('Are you sure you want to deactivate this patient record? Historical medical records will be retained.')) {
      try {
        await api.deletePatient(patientId);
        fetchPatients();
      } catch (err) {
        alert('Deactivation error: ' + err.message);
      }
    }
  };

  const columns = [
    {
      header: 'Code',
      key: 'patient_code',
      render: (row) => <strong style={{ color: '#38bdf8' }}>{row.patient_code}</strong>,
    },
    {
      header: 'Patient Name',
      key: 'full_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#fff' }}>{row.full_name}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {row.gender} • {row.age} yrs • Blood: <span style={{ color: '#fb7185' }}>{row.blood_group || 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'phone',
      render: (row) => (
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '0.84rem' }}>{row.phone}</div>
          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{row.email || 'No email provided'}</div>
        </div>
      ),
    },
    {
      header: 'Emergency Contact',
      key: 'emergency_contact_name',
      render: (row) => (
        <div style={{ fontSize: '0.84rem' }}>
          <div>{row.emergency_contact_name}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{row.emergency_contact_phone}</div>
        </div>
      ),
    },
    {
      header: 'Balance Due',
      key: 'outstanding_balance',
      render: (row) => {
        const bal = parseFloat(row.outstanding_balance || 0);
        return (
          <span style={{ fontWeight: 700, color: bal > 0 ? '#fb7185' : '#34d399' }}>
            ${bal.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (row) => (
        <span className={`badge ${row.is_active ? 'badge-green' : 'badge-rose'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            title="Patient 360 & Medical Records"
            onClick={() => handleOpen360(row.patient_id)}
          >
            <Eye size={14} />
            <span>Profile</span>
          </button>
          <button
            className="btn btn-danger btn-sm"
            title="Soft Deactivate"
            onClick={() => handleDeactivate(row.patient_id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Patient Registry & Master File</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Relational patient records integrated with appointments, clinical consultations, admissions, and billing.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={16} />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Patients Data Table */}
      <DataTable
        columns={columns}
        data={patients}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID (P-XXXX), Name, or Phone..."
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* Register Patient Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Patient Intake"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleRegisterPatient} disabled={formSubmitting}>
              {formSubmitting ? 'Inserting into PostgreSQL...' : 'Register Patient'}
            </button>
          </>
        }
      >
        {formError && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
            {formError}
          </div>
        )}

        <form onSubmit={handleRegisterPatient}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input
                type="date"
                className="form-control"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                className="form-control"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select
                className="form-control"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="text"
                className="form-control"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0199"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="patient@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Residential Address</label>
            <input
              type="text"
              className="form-control"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Health Ave, Suite 4B"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Emergency Contact Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact Phone *</label>
              <input
                type="text"
                className="form-control"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Patient 360 Overview Modal */}
      {selectedPatient360 && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Patient 360° Profile: ${selectedPatient360.patient.first_name} ${selectedPatient360.patient.last_name} (${selectedPatient360.patient.patient_code})`}
          size="lg"
          footer={<button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close Profile</button>}
        >
          {/* Quick Demographics Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#0b1120',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
          }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Age/Gender:</span>{' '}
              <strong style={{ color: '#fff' }}>{selectedPatient360.patient.age} yrs • {selectedPatient360.patient.gender}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Blood Group:</span>{' '}
              <strong style={{ color: '#fb7185' }}>{selectedPatient360.patient.blood_group || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Phone:</span>{' '}
              <strong style={{ color: '#fff' }}>{selectedPatient360.patient.phone}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Balance Due:</span>{' '}
              <strong style={{ color: parseFloat(selectedPatient360.patient.outstanding_balance) > 0 ? '#fb7185' : '#34d399' }}>
                ${parseFloat(selectedPatient360.patient.outstanding_balance || 0).toFixed(2)}
              </strong>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', marginBottom: '1.25rem', overflowX: 'auto' }}>
            {[
              { id: 'history', label: 'Longitudinal Clinical History (Adv Query 1)' },
              { id: 'appts', label: `Appointments (${selectedPatient360.appointments.length})` },
              { id: 'admits', label: `Inpatient Stays (${selectedPatient360.admissions.length})` },
              { id: 'prescriptions', label: `Prescriptions (${selectedPatient360.prescriptions.length})` },
              { id: 'labs', label: `Lab Orders (${selectedPatient360.labOrders.length})` },
              { id: 'invoices', label: `Invoices (${selectedPatient360.invoices.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab360(tab.id)}
                style={{
                  padding: '0.6rem 0.95rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: 'none',
                  background: 'transparent',
                  color: activeTab360 === tab.id ? '#38bdf8' : '#94a3b8',
                  borderBottom: activeTab360 === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Longitudinal Clinical History (Advanced Query 1) */}
          {activeTab360 === 'history' && (
            <div>
              {medicalHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No historical consultation encounters documented yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {medicalHistory.map((item) => (
                    <div key={item.consultation_id} style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '1.15rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{item.consultation_number}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.75rem' }}>
                            {new Date(item.consultation_date).toLocaleDateString()} with {item.attending_physician} ({item.specialization})
                          </span>
                        </div>
                        {item.appointment_number && (
                          <span className="badge badge-blue">{item.appointment_number}</span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#94a3b8' }}>Diagnoses:</span>{' '}
                        <strong style={{ color: '#fbbf24' }}>{item.diagnoses_list || 'None formally coded'}</strong>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                        <strong>Symptoms:</strong> {item.symptoms}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                        <strong>Assessment & Notes:</strong> {item.clinical_notes}
                      </div>

                      {item.treatment_plan && (
                        <div style={{ fontSize: '0.85rem', color: '#34d399' }}>
                          <strong>Treatment Plan:</strong> {item.treatment_plan}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Appointments */}
          {activeTab360 === 'appts' && (
            <div>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Appt #</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient360.appointments.map((a) => (
                    <tr key={a.appointment_id}>
                      <td style={{ color: '#38bdf8', fontWeight: 600 }}>{a.appointment_number}</td>
                      <td>{a.appointment_date}</td>
                      <td>{a.start_time} - {a.end_time}</td>
                      <td>{a.doctor_name}</td>
                      <td>{a.department_name}</td>
                      <td><span className="badge badge-blue">{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Admissions */}
          {activeTab360 === 'admits' && (
            <div>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Admission #</th>
                    <th>Admitted</th>
                    <th>Ward / Bed</th>
                    <th>Physician</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient360.admissions.map((adm) => (
                    <tr key={adm.admission_id}>
                      <td style={{ color: '#38bdf8', fontWeight: 600 }}>{adm.admission_number}</td>
                      <td>{new Date(adm.admission_date).toLocaleDateString()}</td>
                      <td>{adm.ward_name || 'N/A'} - {adm.bed_number || 'N/A'}</td>
                      <td>{adm.doctor_name}</td>
                      <td>{adm.admission_reason}</td>
                      <td><span className="badge badge-amber">{adm.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Prescriptions */}
          {activeTab360 === 'prescriptions' && (
            <div>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Rx #</th>
                    <th>Issue Date</th>
                    <th>Doctor</th>
                    <th>Items Count</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient360.prescriptions.map((p) => (
                    <tr key={p.prescription_id}>
                      <td style={{ color: '#38bdf8', fontWeight: 600 }}>{p.prescription_number}</td>
                      <td>{p.issue_date}</td>
                      <td>{p.doctor_name}</td>
                      <td>{p.item_count} medications</td>
                      <td><span className="badge badge-purple">{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 5: Lab Orders */}
          {activeTab360 === 'labs' && (
            <div>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Priority</th>
                    <th>Tests Count</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient360.labOrders.map((lo) => (
                    <tr key={lo.order_id}>
                      <td style={{ color: '#38bdf8', fontWeight: 600 }}>{lo.order_number}</td>
                      <td>{new Date(lo.order_date).toLocaleDateString()}</td>
                      <td>{lo.doctor_name}</td>
                      <td><span className="badge badge-blue">{lo.priority}</span></td>
                      <td>{lo.test_count} tests</td>
                      <td><span className="badge badge-green">{lo.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 6: Invoices */}
          {activeTab360 === 'invoices' && (
            <div>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPatient360.invoices.map((inv) => (
                    <tr key={inv.invoice_id}>
                      <td style={{ color: '#38bdf8', fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td>{inv.issue_date}</td>
                      <td>${parseFloat(inv.total_amount).toFixed(2)}</td>
                      <td>${parseFloat(inv.paid_amount).toFixed(2)}</td>
                      <td style={{ color: parseFloat(inv.balance_due) > 0 ? '#fb7185' : '#34d399', fontWeight: 600 }}>
                        ${parseFloat(inv.balance_due).toFixed(2)}
                      </td>
                      <td><span className="badge badge-green">{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
