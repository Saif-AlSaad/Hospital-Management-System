// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Outpatient Clinical Consultations & Doctor Landing Workspace
// Multi-Table Atomic Transaction: Encounters + ICD-10 Diagnoses + Vitals JSONB
// Turquoise Harmony Clinical Edition: Baltic Blue, Teal, Verdigris, Mint Leaf & Cream
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
  Pill,
  Clock,
  Calendar,
  CheckCircle2,
  Users,
  Award,
  FlaskConical,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  User,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function ConsultationsPage({ user, onNavigate }) {
  const isDoctor = user?.role === 'Doctor';
  const doctorId = user?.doctorId || '';

  // Active view tab: doctors default to their live patient queue
  const [activeTab, setActiveTab] = useState(isDoctor ? 'queue' : 'history');

  // Consultations State
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

  // OPD Appointment Queue State
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState('');
  const [queueSearch, setQueueSearch] = useState('');

  // Lookups
  const [diagnosesCatalog, setDiagnosesCatalog] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCon, setSelectedCon] = useState(null);
  const [selectedQueuePatient, setSelectedQueuePatient] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: doctorId ? String(doctorId) : '',
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

  // Load Consultations
  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const res = await api.getConsultations({ page, limit: 15 });
      setConsultations(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, totalRecords: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load OPD Queue (Appointments for this physician or hospital-wide)
  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const params = { limit: 50 };
      if (queueFilter) params.status = queueFilter;
      if (isDoctor && doctorId) params.doctorId = doctorId;
      if (queueSearch) params.search = queueSearch.trim();

      const res = await api.getAppointments(params);
      setQueue(res.data || []);
    } catch (err) {
      console.error('Failed to load appointment queue:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  // Load Catalogs
  const fetchCatalogs = async () => {
    try {
      const [diagRes, docRes] = await Promise.all([
        api.getDiagnosesCatalog().catch(() => ({ data: [] })),
        api.getDoctors().catch(() => ({ data: [] })),
      ]);
      setDiagnosesCatalog(diagRes.data || []);
      setDoctors(docRes.data || []);
    } catch (err) {
      console.error('Failed to load lookup catalogs:', err);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [page]);

  useEffect(() => {
    fetchQueue();
  }, [queueFilter]);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const handleOpenView = async (conId) => {
    try {
      const res = await api.getConsultationById(conId);
      setSelectedCon(res);
      setShowViewModal(true);
    } catch (err) {
      alert('Failed to load consultation encounter: ' + err.message);
    }
  };

  // Fast-track opening consultation modal directly from the OPD Queue
  const handleStartConsultationFromQueue = (appt) => {
    setSelectedQueuePatient(appt);
    setFormData({
      patientId: String(appt.patient_id),
      doctorId: String(appt.doctor_id || doctorId),
      appointmentId: String(appt.appointment_id),
      symptoms: appt.notes || '',
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
    setFormError(null);
    setShowAddModal(true);
  };

  const handleUpdateQueueStatus = async (apptId, newStatus) => {
    try {
      await api.updateAppointmentStatus(apptId, newStatus);
      fetchQueue();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
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
        doctorId: parseInt(formData.doctorId || doctorId),
        appointmentId: formData.appointmentId ? parseInt(formData.appointmentId) : null,
        symptoms: formData.symptoms,
        clinicalNotes: formData.clinicalNotes,
        treatmentPlan: formData.treatmentPlan,
        followUpDate: formData.followUpDate || null,
        vitals: formData.vitals,
        diagnoses,
      });

      // If tied to an appointment, mark it completed
      if (formData.appointmentId) {
        try {
          await api.updateAppointmentStatus(parseInt(formData.appointmentId), 'Completed');
        } catch {
          // Non-critical if already marked
        }
      }

      setShowAddModal(false);
      setSuccessToast(`Encounter for Patient #${formData.patientId} recorded successfully in database.`);
      setTimeout(() => setSuccessToast(null), 6000);

      // Reset form
      setFormData({
        patientId: '', doctorId: doctorId ? String(doctorId) : '', appointmentId: '',
        symptoms: '', clinicalNotes: '', treatmentPlan: '', followUpDate: '',
        vitals: { bp_systolic: 120, bp_diastolic: 80, pulse: 72, temperature_f: 98.6, weight_kg: 70, spo2: 98 },
        primaryDiagnosisId: '', secondaryDiagnosisId: '',
      });
      setSelectedQueuePatient(null);

      fetchConsultations();
      fetchQueue();
    } catch (err) {
      setFormError(err.message || 'Failed to record consultation encounter.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Telemetry Metrics
  const queueWaitingCount = queue.filter(q => q.status === 'Scheduled' || q.status === 'Confirmed').length;
  const queueInProgressCount = queue.filter(q => q.status === 'In-Progress').length;
  const queueCompletedCount = queue.filter(q => q.status === 'Completed').length;
  const totalEncountersCount = pagination.totalRecords || consultations.length;

  // History Table Columns
  const consultationColumns = [
    {
      header: 'Encounter #',
      key: 'consultation_number',
      render: (row) => (
        <strong style={{ color: 'var(--theme-baltic)', fontFamily: 'var(--font-mono)' }}>
          {row.consultation_number}
        </strong>
      ),
    },
    {
      header: 'Date & Time',
      key: 'consultation_date',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            {new Date(row.consultation_date).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.patient_name}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.patient_code}</span> • {row.patient_gender}
          </div>
        </div>
      ),
    },
    {
      header: 'Attending Physician',
      key: 'doctor_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.doctor_name}</div>
          <div style={{ fontSize: '0.74rem', color: '#008778', fontWeight: 600 }}>{row.department_name}</div>
        </div>
      ),
    },
    {
      header: 'Diagnoses Summary',
      key: 'diagnoses_summary',
      render: (row) => (
        <span style={{
          fontSize: '0.80rem',
          color: 'var(--theme-baltic)',
          backgroundColor: 'rgba(2, 128, 144, 0.1)',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          fontWeight: 600,
          border: '1px solid var(--border-card)',
        }}>
          {row.diagnoses_summary || 'Clinical Review'}
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
          <Eye size={13} color="#028090" />
          <span>Review Notes</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Doctor Identity & Workspace Header */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #05668D 0%, #028090 100%)',
            border: '1.5px solid #00A896',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(5, 102, 141, 0.25)',
          }}>
            <Stethoscope size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {isDoctor ? `Dr. ${user?.fullName || 'Physician'} — Clinical Hub` : 'Clinical Consultations & OPD Hub'}
              </h2>
              {isDoctor && (
                <span style={{
                  fontSize: '0.74rem',
                  backgroundColor: 'rgba(2, 195, 154, 0.15)',
                  color: '#008767',
                  border: '1px solid rgba(2, 195, 154, 0.4)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  <Award size={13} color="#008767" />
                  BMDC: {user?.doctorProfile?.licenseNumber || 'Verified Physician'}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {isDoctor
                ? `${user?.doctorProfile?.specialization || 'Clinical Specialist'} • Consultation Fee: ৳${user?.doctorProfile?.consultationFee || '1,200'} • Scoped to Outpatient Encounters`
                : 'Hospital-wide outpatient encounter documentation, ICD-10 diagnostic classifications, and physiological vitals.'}
            </p>
          </div>
        </div>

        {/* Quick Clinical Navigation Shortcuts */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {onNavigate && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('prescriptions')}
                title="Write Electronic Prescription"
              >
                <Pill size={14} color="#00A896" />
                <span>Prescriptions</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('laboratory')}
                title="Requisition Diagnostic Tests"
              >
                <FlaskConical size={14} color="#028090" />
                <span>Lab Orders</span>
              </button>
            </>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setSelectedQueuePatient(null);
              setFormData({
                patientId: '',
                doctorId: doctorId ? String(doctorId) : '',
                appointmentId: '',
                symptoms: '',
                clinicalNotes: '',
                treatmentPlan: '',
                followUpDate: '',
                vitals: { bp_systolic: 120, bp_diastolic: 80, pulse: 72, temperature_f: 98.6, weight_kg: 70, spo2: 98 },
                primaryDiagnosisId: '',
                secondaryDiagnosisId: '',
              });
              setShowAddModal(true);
            }}
          >
            <Plus size={15} />
            <span>New Encounter</span>
          </button>
        </div>
      </div>

      {/* Success Toast Alert */}
      {successToast && (
        <div style={{
          backgroundColor: 'rgba(2, 195, 154, 0.15)',
          border: '1px solid rgba(2, 195, 154, 0.4)',
          color: '#008767',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.88rem',
          fontWeight: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{successToast}</span>
          </div>
          {onNavigate && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => onNavigate('prescriptions')}
              >
                <Pill size={12} />
                <span>Write Prescription</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => onNavigate('laboratory')}
              >
                <FlaskConical size={12} />
                <span>Order Lab Tests</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Doctor Clinical Telemetry KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#028090' }}>
          <div className="stat-info">
            <h3>Waiting in OPD Queue</h3>
            <div className="stat-value">{queueWaitingCount}</div>
            <div className="stat-subtext">Scheduled for consultation</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#028090', backgroundColor: 'rgba(2, 128, 144, 0.12)', borderColor: 'rgba(2, 128, 144, 0.25)' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#05668D' }}>
          <div className="stat-info">
            <h3>In-Progress Visits</h3>
            <div className="stat-value">{queueInProgressCount}</div>
            <div className="stat-subtext">Currently in examination</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#05668D', backgroundColor: 'rgba(5, 102, 141, 0.12)', borderColor: 'rgba(5, 102, 141, 0.25)' }}>
            <Activity size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#02C39A' }}>
          <div className="stat-info">
            <h3>Completed Today</h3>
            <div className="stat-value">{queueCompletedCount}</div>
            <div className="stat-subtext" style={{ color: '#008767', fontWeight: 600 }}>Encounters finished</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#008767', backgroundColor: 'rgba(2, 195, 154, 0.12)', borderColor: 'rgba(2, 195, 154, 0.25)' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#00A896' }}>
          <div className="stat-info">
            <h3>Total Clinical Encounters</h3>
            <div className="stat-value">{totalEncountersCount}</div>
            <div className="stat-subtext">Documented records</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#00A896', backgroundColor: 'rgba(0, 168, 150, 0.12)', borderColor: 'rgba(0, 168, 150, 0.25)' }}>
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* Dual Workspace Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid var(--border-card)',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('queue')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 800,
              fontSize: '0.90rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'queue' ? '3px solid #00A896' : '3px solid transparent',
              color: activeTab === 'queue' ? '#008778' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={16} />
            <span>Today's OPD Patient Queue</span>
            <span style={{
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'queue' ? '#028090' : 'rgba(2, 128, 144, 0.12)',
              color: activeTab === 'queue' ? '#ffffff' : 'var(--text-main)',
              padding: '0.15rem 0.55rem',
              borderRadius: '10px',
              fontWeight: 800,
            }}>
              {queue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 800,
              fontSize: '0.90rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #00A896' : '3px solid transparent',
              color: activeTab === 'history' ? '#008778' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={16} />
            <span>Documented Encounters History</span>
            <span style={{
              fontSize: '0.72rem',
              backgroundColor: activeTab === 'history' ? '#028090' : 'rgba(2, 128, 144, 0.12)',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-main)',
              padding: '0.15rem 0.55rem',
              borderRadius: '10px',
              fontWeight: 800,
            }}>
              {totalEncountersCount}
            </span>
          </button>
        </div>

        {activeTab === 'queue' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className="form-control"
              style={{ width: '160px', padding: '0.35rem 0.65rem', fontSize: '0.82rem', fontWeight: 600 }}
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value)}
            >
              <option value="">All Queue Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchQueue} title="Refresh OPD Queue">
              <RefreshCw size={13} className={queueLoading ? 'spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: OPD PATIENT QUEUE */}
      {activeTab === 'queue' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {queueLoading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid #00A896',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                margin: '0 auto 0.75rem auto',
                animation: 'spin 1s linear infinite',
              }}></div>
              <span style={{ fontWeight: 600 }}>Loading Physician Outpatient Queue...</span>
            </div>
          ) : queue.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={40} color="#7093a2" style={{ margin: '0 auto 0.75rem auto', opacity: 0.6 }} />
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>No Patients in OPD Queue</div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {queueFilter ? `No appointments matching "${queueFilter}" filter.` : 'No scheduled outpatient appointments currently queued for this physician.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.86rem' }}>
                <thead>
                  <tr>
                    <th>Appt #</th>
                    <th>Slot Time</th>
                    <th>Patient Name & Code</th>
                    <th>Contact</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Chief Complaint / Notes</th>
                    <th style={{ textAlign: 'right' }}>Clinical Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => {
                    const isCompleted = item.status === 'Completed';
                    const isCancelled = item.status === 'Cancelled';
                    return (
                      <tr key={item.appointment_id} style={{ opacity: isCancelled ? 0.6 : 1 }}>
                        <td style={{ fontWeight: 800, color: 'var(--theme-baltic)', fontFamily: 'var(--font-mono)' }}>
                          {item.appointment_number}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.start_time} - {item.end_time}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.appointment_date}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.patient_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{item.patient_code}</span> • {item.patient_gender}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.80rem' }}>{item.patient_phone || 'N/A'}</td>
                        <td>
                          <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                            {item.appointment_type}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            item.status === 'Completed' ? 'badge-green' :
                            item.status === 'In-Progress' ? 'badge-amber' :
                            item.status === 'Cancelled' ? 'badge-rose' : 'badge-blue'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: '240px', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                          {item.notes || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>None specified</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                            {!isCompleted && !isCancelled && (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleStartConsultationFromQueue(item)}
                                  title="Document Clinical Encounter"
                                  style={{ padding: '0.35rem 0.70rem', fontSize: '0.78rem' }}
                                >
                                  <Stethoscope size={13} />
                                  <span>Start Encounter</span>
                                </button>
                                <select
                                  className="form-control"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.74rem', width: 'auto', fontWeight: 600 }}
                                  value={item.status}
                                  onChange={(e) => handleUpdateQueueStatus(item.appointment_id, e.target.value)}
                                >
                                  <option value="Scheduled">Scheduled</option>
                                  <option value="In-Progress">In-Progress</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </>
                            )}
                            {isCompleted && (
                              <span style={{ fontSize: '0.78rem', color: '#008767', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Check size={14} strokeWidth={3} /> Encounter Recorded
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONSULTATION HISTORY */}
      {activeTab === 'history' && (
        <DataTable
          columns={consultationColumns}
          data={consultations}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
        />
      )}

      {/* Document Consultation Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={selectedQueuePatient ? `Document Encounter: ${selectedQueuePatient.patient_name} (${selectedQueuePatient.patient_code})` : 'Document Outpatient Clinical Encounter'}
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
          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
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
              {selectedQueuePatient && (
                <div style={{ fontSize: '0.74rem', color: '#008767', fontWeight: 600, marginTop: '0.25rem' }}>
                  Linked: {selectedQueuePatient.patient_name}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Attending Doctor *</label>
              {isDoctor ? (
                <input
                  type="text"
                  className="form-control"
                  value={`Dr. ${user?.fullName || 'Self'} (${user?.doctorProfile?.specialization || 'Consultant'})`}
                  disabled
                  style={{ backgroundColor: 'var(--bg-card-hover)', color: '#028090', fontWeight: 700 }}
                />
              ) : (
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
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Linked Appointment ID</label>
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
            padding: '1.15rem',
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border-card)',
            borderRadius: '10px',
            marginBottom: '1.25rem',
          }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--theme-baltic)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Activity size={16} color="#00A896" />
              <span>Patient Physiological Vitals (Stored as JSONB in PostgreSQL):</span>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>BP Systolic (mmHg)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.bp_systolic}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp_systolic: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>BP Diastolic (mmHg)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.bp_diastolic}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp_diastolic: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Pulse (bpm)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.pulse}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, pulse: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={formData.vitals.temperature_f}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, temperature_f: parseFloat(e.target.value) || 0 } })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>SpO2 (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.vitals.spo2}
                  onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: parseInt(e.target.value) || 0 } })}
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
              placeholder="e.g. Lungs clear to auscultation bilaterally. Heart sounds normal S1/S2. Advised ECG."
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '1.1rem 1.25rem',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '10px',
              border: '1px solid var(--border-card)',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', fontWeight: 700 }}>Patient:</span>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                  {selectedCon.consultation.patient_name} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>({selectedCon.consultation.patient_code})</span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', fontWeight: 700 }}>Physician:</span>
                <div style={{ fontWeight: 800, color: '#028090', fontSize: '1.05rem' }}>
                  {selectedCon.consultation.doctor_name} <span style={{ fontSize: '0.82rem', color: '#008778' }}>({selectedCon.consultation.specialization})</span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', fontWeight: 700 }}>Encounter Date:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {new Date(selectedCon.consultation.consultation_date).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Vitals Summary Strip */}
            {selectedCon.consultation.vitals && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.65rem',
              }}>
                <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-card)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'block' }}>BP</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    {selectedCon.consultation.vitals.bp_systolic}/{selectedCon.consultation.vitals.bp_diastolic}
                  </span>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-card)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'block' }}>Pulse</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    {selectedCon.consultation.vitals.pulse} bpm
                  </span>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-card)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'block' }}>Temp</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    {selectedCon.consultation.vitals.temperature_f}°F
                  </span>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-card)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'block' }}>SpO2</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#008767', fontFamily: 'var(--font-mono)' }}>
                    {selectedCon.consultation.vitals.spo2}%
                  </span>
                </div>
                <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-card)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'block' }}>Weight</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    {selectedCon.consultation.vitals.weight_kg} kg
                  </span>
                </div>
              </div>
            )}

            <div>
              <h4 style={{ color: 'var(--theme-baltic)', fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.45rem' }}>
                Clinical Diagnoses:
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedCon.diagnoses.map((d, i) => (
                  <span key={i} className="badge badge-blue">
                    [{d.icd_code}] {d.diagnosis_name} ({d.diagnosis_type})
                  </span>
                ))}
              </div>
            </div>

            <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Symptoms:</h4>
              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0 }}>{selectedCon.consultation.symptoms}</p>
            </div>

            <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Physician Examination Notes:</h4>
              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', margin: 0 }}>{selectedCon.consultation.clinical_notes}</p>
            </div>

            {selectedCon.consultation.treatment_plan && (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(2, 195, 154, 0.1)', borderRadius: '8px', border: '1px solid rgba(2, 195, 154, 0.3)' }}>
                <h4 style={{ color: '#008767', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem' }}>Treatment Plan:</h4>
                <p style={{ color: '#072a38', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{selectedCon.consultation.treatment_plan}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
