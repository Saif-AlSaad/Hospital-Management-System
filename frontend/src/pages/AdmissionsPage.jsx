// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Inpatient Admissions & Bed Management Page
// Integrated with Stored Procedures sp_admit_patient and sp_discharge_patient
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Plus,
  LogOut,
  ArrowRightLeft,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Hotel
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Admitted');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

  // Lookups
  const [availableBeds, setAvailableBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Modals
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  // Forms
  const [admitForm, setAdmitForm] = useState({
    patientId: '',
    doctorId: '',
    bedId: '',
    admissionReason: '',
  });

  const [dischargeForm, setDischargeForm] = useState({
    dischargeSummary: '',
  });

  const [transferForm, setTransferForm] = useState({
    newBedId: '',
    transferNotes: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const res = await api.getAdmissions({
        page,
        limit: 15,
        status: statusFilter || undefined,
      });
      setAdmissions(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load admissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBeds = async () => {
    try {
      const res = await api.getAvailableBeds();
      setAvailableBeds(res.data);
    } catch (err) {
      console.error('Failed to load available beds:', err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.getDoctors();
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAvailableBeds();
    fetchDoctors();
  }, []);

  const handleAdmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      await api.admitPatient({
        patientId: parseInt(admitForm.patientId),
        doctorId: parseInt(admitForm.doctorId),
        bedId: parseInt(admitForm.bedId),
        admissionReason: admitForm.admissionReason,
      });

      setShowAdmitModal(false);
      setAdmitForm({ patientId: '', doctorId: '', bedId: '', admissionReason: '' });
      fetchAdmissions();
      fetchAvailableBeds();
    } catch (err) {
      setFormError(err.message || 'Admission failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDischarge = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      await api.dischargePatient(selectedAdmission.admission_id, {
        dischargeSummary: dischargeForm.dischargeSummary,
      });

      setShowDischargeModal(false);
      setDischargeForm({ dischargeSummary: '' });
      fetchAdmissions();
      fetchAvailableBeds();
    } catch (err) {
      alert('Discharge error: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      await api.transferBed(selectedAdmission.admission_id, {
        newBedId: parseInt(transferForm.newBedId),
        transferNotes: transferForm.transferNotes,
      });

      setShowTransferModal(false);
      setTransferForm({ newBedId: '', transferNotes: '' });
      fetchAdmissions();
      fetchAvailableBeds();
    } catch (err) {
      alert('Bed transfer error: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Admission #',
      key: 'admission_number',
      render: (row) => <strong style={{ color: '#38bdf8' }}>{row.admission_number}</strong>,
    },
    {
      header: 'Patient Info',
      key: 'patient_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.patient_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.patient_code} • {row.patient_gender}</div>
        </div>
      ),
    },
    {
      header: 'Ward / Bed Allocation',
      key: 'bed_number',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#fbbf24' }}>
            {row.ward_name || 'Ward Assigned'} • Bed {row.bed_number || 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Room {row.room_number || '-'} ({row.room_type || 'Standard'}) • ৳{row.daily_rate}/day
          </div>
        </div>
      ),
    },
    {
      header: 'Admitting Physician',
      key: 'doctor_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{row.doctor_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.specialization}</div>
        </div>
      ),
    },
    {
      header: 'Admission Dates',
      key: 'admission_date',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.82rem' }}>In: {new Date(row.admission_date).toLocaleDateString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Stay: <strong style={{ color: '#38bdf8' }}>{row.days_stayed} days</strong>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <span className={`badge ${row.status === 'Admitted' ? 'badge-amber' : 'badge-green'}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Inpatient Actions',
      key: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {row.status === 'Admitted' && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                title="Transfer to Another Bed"
                onClick={() => { setSelectedAdmission(row); setShowTransferModal(true); }}
              >
                <ArrowRightLeft size={13} />
                <span>Transfer</span>
              </button>
              <button
                className="btn btn-danger btn-sm"
                title="Discharge & Finalize Billing via sp_discharge_patient"
                onClick={() => { setSelectedAdmission(row); setShowDischargeModal(true); }}
              >
                <LogOut size={13} />
                <span>Discharge</span>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Inpatient Admissions & Discharges</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Multi-table workflows orchestrated by PostgreSQL stored procedures <code style={{ color: '#38bdf8' }}>sp_admit_patient</code> and <code style={{ color: '#38bdf8' }}>sp_discharge_patient</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Admitted">Active Inpatients</option>
            <option value="Discharged">Discharged History</option>
            <option value="">All Admissions</option>
          </select>

          <button className="btn btn-primary" onClick={() => setShowAdmitModal(true)}>
            <Plus size={16} />
            <span>Admit Patient</span>
          </button>
        </div>
      </div>

      {/* Admissions Table */}
      <DataTable
        columns={columns}
        data={admissions}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* Admit Patient Modal (Calls Stored Procedure sp_admit_patient) */}
      <Modal
        isOpen={showAdmitModal}
        onClose={() => setShowAdmitModal(false)}
        title="Inpatient Admission (Executes sp_admit_patient)"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdmitModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdmit} disabled={formSubmitting}>
              {formSubmitting ? 'Invoking Stored Procedure...' : 'Admit & Allocate Bed'}
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

        <form onSubmit={handleAdmit}>
          <div className="form-group">
            <label className="form-label">Patient ID *</label>
            <input
              type="number"
              className="form-control"
              value={admitForm.patientId}
              onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })}
              placeholder="e.g. 1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Admitting Physician *</label>
            <select
              className="form-control"
              value={admitForm.doctorId}
              onChange={(e) => setAdmitForm({ ...admitForm, doctorId: e.target.value })}
              required
            >
              <option value="">-- Select Attending Doctor --</option>
              {doctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  Dr. {d.full_name} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Available Bed (from fn_get_available_beds) *</label>
            <select
              className="form-control"
              value={admitForm.bedId}
              onChange={(e) => setAdmitForm({ ...admitForm, bedId: e.target.value })}
              required
            >
              <option value="">-- Select Available Hospital Bed --</option>
              {availableBeds.map((b) => (
                <option key={b.bed_id} value={b.bed_id}>
                  {b.ward_name} ({b.ward_type}) • Room {b.room_number} • Bed {b.bed_number} (৳{b.daily_rate}/day)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Admission Clinical Reason *</label>
            <textarea
              className="form-control"
              rows={3}
              value={admitForm.admissionReason}
              onChange={(e) => setAdmitForm({ ...admitForm, admissionReason: e.target.value })}
              placeholder="e.g. Acute exacerbation of COPD requiring IV medication and oxygen therapy."
              required
            />
          </div>
        </form>
      </Modal>

      {/* Discharge Patient Modal (Calls Stored Procedure sp_discharge_patient) */}
      {selectedAdmission && (
        <Modal
          isOpen={showDischargeModal}
          onClose={() => setShowDischargeModal(false)}
          title={`Discharge Patient: ${selectedAdmission.patient_name} (${selectedAdmission.admission_number})`}
          size="md"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowDischargeModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDischarge} disabled={formSubmitting}>
                {formSubmitting ? 'Finalizing Discharge & Invoice...' : 'Discharge & Finalize Bill'}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem', backgroundColor: '#0b1120', borderRadius: '8px', fontSize: '0.85rem' }}>
            <div>Admission Stay: <strong>{selectedAdmission.days_stayed} days</strong> in {selectedAdmission.ward_name} (Bed {selectedAdmission.bed_number})</div>
            <div style={{ color: '#38bdf8', marginTop: '0.25rem' }}>
              ℹ️ Executing <code style={{ color: '#fbbf24' }}>sp_discharge_patient</code> will atomically release Bed {selectedAdmission.bed_number} back to 'Available' and auto-generate the inpatient bill.
            </div>
          </div>

          <form onSubmit={handleDischarge}>
            <div className="form-group">
              <label className="form-label">Clinical Discharge Summary *</label>
              <textarea
                className="form-control"
                rows={4}
                value={dischargeForm.dischargeSummary}
                onChange={(e) => setDischargeForm({ dischargeSummary: e.target.value })}
                placeholder="e.g. Patient showed significant clinical improvement. Hemodynamically stable, discharged on oral maintenance medication."
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Bed Transfer Modal */}
      {selectedAdmission && (
        <Modal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          title={`Transfer Bed: ${selectedAdmission.patient_name} (Current: Bed ${selectedAdmission.bed_number})`}
          size="md"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleTransfer} disabled={formSubmitting}>
                Execute Bed Transfer
              </button>
            </>
          }
        >
          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label className="form-label">Target New Bed *</label>
              <select
                className="form-control"
                value={transferForm.newBedId}
                onChange={(e) => setTransferForm({ ...transferForm, newBedId: e.target.value })}
                required
              >
                <option value="">-- Select Destination Bed --</option>
                {availableBeds.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.ward_name} • Room {b.room_number} • Bed {b.bed_number} (৳{b.daily_rate}/day)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Transfer Justification Notes</label>
              <input
                type="text"
                className="form-control"
                value={transferForm.transferNotes}
                onChange={(e) => setTransferForm({ ...transferForm, transferNotes: e.target.value })}
                placeholder="e.g. Patient stepped down from ICU to General Ward."
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
