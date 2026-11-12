// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Outpatient Clinical Consultations & Encounters Page
// Multi-Table Atomic Transaction: Encounters + ICD-10 Diagnoses + Vitals JSONB
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Plus,
  Eye,
  Activity,
  Heart,
  Thermometer,
  Weight,
  AlertCircle,
  FileText,
  Pill
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

  // Lookups
  const [diagnosesCatalog, setDiagnosesCatalog] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCon, setSelectedCon] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    appointmentId: '',
    symptoms: '',
    clinicalNotes: '',
    treatmentPlan: '',
    followUpDate: '',
    vitals: {
      bp_systolic: 120,
      bp_diastolic: 80,
      pulse: 72,
      temperature_f: 98.6,
      weight_kg: 70,
      spo2: 98,
    },
    primaryDiagnosisId: '',
    secondaryDiagnosisId: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const res = await api.getConsultations({ page, limit: 15 });
      setConsultations(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const [diagRes, docRes] = await Promise.all([
        api.getDiagnosesCatalog(),
        api.getDoctors(),
      ]);
      setDiagnosesCatalog(diagRes.data);
      setDoctors(docRes.data);
    } catch (err) {
      console.error('Failed to load lookup catalogs:', err);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [page]);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const handleOpenView = async (conId) => {
    try {
      const res = await api.getConsultationById(conId);
      setSelectedCon(res);
      setShowViewModal(true);
    } catch (err) {
      alert('Failed to load consultation: ' + err.message);
    }
  };

  const handleCreateConsultation = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const diagnoses = [];
    if (formData.primaryDiagnosisId) {
      diagnoses.push({ diagnosisId: parseInt(formData.primaryDiagnosisId), diagnosisType: 'Primary' });
    }
    if (formData.secondaryDiagnosisId && formData.secondaryDiagnosisId !== formData.primaryDiagnosisId) {
      diagnoses.push({ diagnosisId: parseInt(formData.secondaryDiagnosisId), diagnosisType: 'Secondary' });
    }

    try {
      await api.createConsultation({
        patientId: parseInt(formData.patientId),
        doctorId: parseInt(formData.doctorId),
        appointmentId: formData.appointmentId ? parseInt(formData.appointmentId) : null,
        symptoms: formData.symptoms,
        clinicalNotes: formData.clinicalNotes,
        treatmentPlan: formData.treatmentPlan,
        followUpDate: formData.followUpDate || null,
        vitals: formData.vitals,
        diagnoses,
      });

      setShowAddModal(false);
      setFormData({
        patientId: '', doctorId: '', appointmentId: '',
        symptoms: '', clinicalNotes: '', treatmentPlan: '', followUpDate: '',
        vitals: { bp_systolic: 120, bp_diastolic: 80, pulse: 72, temperature_f: 98.6, weight_kg: 70, spo2: 98 },
        primaryDiagnosisId: '', secondaryDiagnosisId: '',
      });
      fetchConsultations();
    } catch (err) {
      setFormError(err.message || 'Failed to record consultation encounter.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Encounter #',
      key: 'consultation_number',
      render: (row) => <strong style={{ color: '#38bdf8' }}>{row.consultation_number}</strong>,
    },
    {
      header: 'Date & Time',
      key: 'consultation_date',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#fff' }}>{new Date(row.consultation_date).toLocaleDateString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {new Date(row.consultation_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      header: 'Patient',
      key: 'patient_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.patient_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.patient_code} • {row.patient_gender}</div>
        </div>
      ),
    },
    {
      header: 'Attending Physician',
      key: 'doctor_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{row.doctor_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{row.department_name}</div>
        </div>
      ),
    },
    {
      header: 'Diagnoses Summary',
      key: 'diagnoses_summary',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
          {row.diagnoses_summary || 'Unspecified Clinical Review'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => handleOpenView(row.consultation_id)}
        >
          <Eye size={14} />
          <span>Review Notes</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Clinical Consultations</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Outpatient physician encounter documentation, ICD-10 diagnostic classifications, and physiological vitals.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>New Consultation Encounter</span>
        </button>
      </div>

      {/* Consultations Data Table */}
      <DataTable
        columns={columns}
        data={consultations}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* Document Consultation Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Document Outpatient Clinical Encounter"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateConsultation} disabled={formSubmitting}>
              {formSubmitting ? 'Writing to 4 Tables in Transaction...' : 'Save Encounter in Database'}
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

        <form onSubmit={handleCreateConsultation}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Patient ID *</label>
              <input
                type="number"
                className="form-control"
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                placeholder="e.g. 1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Attending Doctor *</label>
              <select
                className="form-control"
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                required
              >
                <option value="">-- Select Attending Physician --</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    Dr. {d.full_name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Linked Appointment ID (Optional)</label>
              <input
                type="number"
                className="form-control"
                value={formData.appointmentId}
                onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
                placeholder="e.g. 15"
              />
            </div>
          </div>

          {/* Vitals Box */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#0b1120',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            marginBottom: '1.25rem',
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem' }}>
              Patient Physiological Vitals (Stored as JSONB in PostgreSQL):
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>BP Systolic (mmHg)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.bp_systolic}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp_systolic: parseInt(e.target.value) } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>BP Diastolic (mmHg)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.bp_diastolic}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp_diastolic: parseInt(e.target.value) } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Pulse (bpm)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.pulse}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, pulse: parseInt(e.target.value) } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={formData.vitals.temperature_f}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, temperature_f: parseFloat(e.target.value) } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>SpO2 (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.spo2}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: parseInt(e.target.value) } })}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Primary ICD-10 Diagnosis</label>
              <select
                className="form-control"
                value={formData.primaryDiagnosisId}
                onChange={(e) => setFormData({ ...formData, primaryDiagnosisId: e.target.value })}
              >
                <option value="">-- Select ICD-10 Diagnosis --</option>
                {diagnosesCatalog.map((diag) => (
                  <option key={diag.diagnosis_id} value={diag.diagnosis_id}>
                    [{diag.icd_code}] {diag.diagnosis_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Secondary Diagnosis (Optional)</label>
              <select
                className="form-control"
                value={formData.secondaryDiagnosisId}
                onChange={(e) => setFormData({ ...formData, secondaryDiagnosisId: e.target.value })}
              >
                <option value="">-- None --</option>
                {diagnosesCatalog.map((diag) => (
                  <option key={diag.diagnosis_id} value={diag.diagnosis_id}>
                    [{diag.icd_code}] {diag.diagnosis_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Presenting Symptoms *</label>
            <textarea
              className="form-control"
              rows={2}
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="e.g. Mild shortness of breath and chest pressure after walking."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinical Examination & Assessment Notes *</label>
            <textarea
              className="form-control"
              rows={3}
              value={formData.clinicalNotes}
              onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
              placeholder="e.g. Lungs clear to auscultation bilaterally. Heart sounds normal S1/S2."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Treatment Plan / Instructions</label>
              <input
                type="text"
                className="form-control"
                value={formData.treatmentPlan}
                onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                placeholder="e.g. Continue anti-hypertensives, avoid heavy sodium intake."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Recommended Follow-up Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Review Consultation Details Modal */}
      {selectedCon && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Encounter File: ${selectedCon.consultation.consultation_number}`}
          size="lg"
          footer={<button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close Encounter</button>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#0b1120', borderRadius: '8px' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Patient:</span>
                <div style={{ fontWeight: 700, color: '#fff' }}>{selectedCon.consultation.patient_name} ({selectedCon.consultation.patient_code})</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Physician:</span>
                <div style={{ fontWeight: 700, color: '#38bdf8' }}>{selectedCon.consultation.doctor_name} ({selectedCon.consultation.specialization})</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Encounter Date:</span>
                <div style={{ fontWeight: 600, color: '#fff' }}>{new Date(selectedCon.consultation.consultation_date).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Clinical Diagnoses:</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedCon.diagnoses.map((d, i) => (
                  <span key={i} className="badge badge-amber">
                    [{d.icd_code}] {d.diagnosis_name} ({d.diagnosis_type})
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Symptoms:</h4>
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{selectedCon.consultation.symptoms}</p>
            </div>

            <div>
              <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Physician Examination Notes:</h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{selectedCon.consultation.clinical_notes}</p>
            </div>

            {selectedCon.consultation.treatment_plan && (
              <div>
                <h4 style={{ color: '#34d399', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Treatment Plan:</h4>
                <p style={{ color: '#34d399', fontSize: '0.9rem' }}>{selectedCon.consultation.treatment_plan}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
