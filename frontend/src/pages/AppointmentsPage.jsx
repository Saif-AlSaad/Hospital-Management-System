// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Outpatient Appointment Management & Receptionist Landing Workspace
// Database Trigger Enforced Conflict Prevention & Dynamic Slot Availability
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  UserPlus,
  Building2,
  BedDouble,
  ShieldCheck,
  Check,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function AppointmentsPage({ user, onNavigate }) {
  const isDoctor = user?.role === 'Doctor';
  const isReceptionist = user?.role === 'Receptionist';
  const doctorId = user?.doctorId || '';

  // Main Data States
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

  // Doctor & Ward Lookups for Front Desk Telemetry
  const [doctors, setDoctors] = useState([]);
  const [wards, setWards] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);
  const [showBedStatusModal, setShowBedStatusModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Booking Form State
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: doctorId ? String(doctorId) : '',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '10:00:00',
    endTime: '10:30:00',
    appointmentType: 'Routine',
    notes: '',
  });
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Fast-Track Patient Registration Form State
  const [fastTrackData, setFastTrackData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '1995-01-01',
    gender: 'Male',
    bloodGroup: 'B+',
    phone: '01711',
    email: '',
    address: 'Dhaka, Bangladesh',
    emergencyContactName: 'Next of Kin',
    emergencyContactPhone: '01811000000',
  });
  const [fastTrackSubmitting, setFastTrackSubmitting] = useState(false);
  const [fastTrackError, setFastTrackError] = useState(null);

  // Reschedule Form State
  const [rescheduleData, setRescheduleData] = useState({
    appointmentDate: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.getAppointments({
        page,
        limit: 15,
        search: search.trim(),
        status: statusFilter || undefined,
      });
      setAppointments(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 15, totalRecords: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFrontDeskLookups = async () => {
    setTelemetryLoading(true);
    try {
      const [docRes, wardsRes] = await Promise.all([
        api.getDoctors().catch(() => ({ data: [] })),
        api.getWards().catch(() => ({ data: [] })),
      ]);
      setDoctors(docRes.data || []);
      setWards(wardsRes.data || []);
    } catch (err) {
      console.error('Failed to load front-desk telemetry:', err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchFrontDeskLookups();
  }, []);

  // Compute Front Desk Telemetry
  const totalAvailableBeds = wards.reduce((acc, w) => acc + parseInt(w.available_beds || 0), 0);
  const totalBeds = wards.reduce((acc, w) => acc + parseInt(w.total_beds || 0), 0);
  const totalDoctorsOnDuty = doctors.length;
  const scheduledCount = appointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;

  const handleCheckAvailability = async () => {
    if (!formData.doctorId || !formData.appointmentDate || !formData.startTime || !formData.endTime) {
      alert('Please select Doctor, Date, and Slot times first.');
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityStatus(null);
    try {
      const res = await api.checkDoctorAvailability({
        doctorId: formData.doctorId,
        date: formData.appointmentDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
      });
      setAvailabilityStatus(res.isAvailable ? 'AVAILABLE' : 'CONFLICT');
    } catch (err) {
      alert('Availability check failed: ' + err.message);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      await api.createAppointment(formData);
      setShowAddModal(false);
      setToastMessage(`Appointment booked successfully! Trigger trg_check_appointment_conflict validated.`);
      setTimeout(() => setToastMessage(null), 5000);

      setFormData({
        patientId: '', doctorId: doctorId ? String(doctorId) : '',
        appointmentDate: new Date().toISOString().split('T')[0],
        startTime: '10:00:00', endTime: '10:30:00',
        appointmentType: 'Routine', notes: ''
      });
      setAvailabilityStatus(null);
      fetchAppointments();
    } catch (err) {
      setFormError(err.message || 'Failed to schedule appointment.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Fast-track Register Patient and chain directly into Appointment Booking
  const handleFastTrackPatient = async (e) => {
    e.preventDefault();
    setFastTrackSubmitting(true);
    setFastTrackError(null);

    try {
      const res = await api.createPatient(fastTrackData);
      const newPatient = res.patient;
      setShowFastTrackModal(false);

      setToastMessage(`Patient ${newPatient.first_name} ${newPatient.last_name} (${newPatient.patient_code}) registered!`);
      setTimeout(() => setToastMessage(null), 5000);

      // Reset Fast-Track form
      setFastTrackData({
        firstName: '', lastName: '', dateOfBirth: '1995-01-01', gender: 'Male', bloodGroup: 'B+',
        phone: '01711', email: '', address: 'Dhaka, Bangladesh', emergencyContactName: 'Next of Kin', emergencyContactPhone: '01811000000',
      });

      // Automatically chain into appointment booking with new patient pre-selected
      setFormData(prev => ({
        ...prev,
        patientId: String(newPatient.patient_id),
      }));
      setShowAddModal(true);
    } catch (err) {
      setFastTrackError(err.message || 'Failed to register patient.');
    } finally {
      setFastTrackSubmitting(false);
    }
  };

  const handleOpenReschedule = (appt) => {
    setSelectedAppt(appt);
    setRescheduleData({
      appointmentDate: appt.appointment_date,
      startTime: appt.start_time,
      endTime: appt.end_time,
      notes: appt.notes || '',
    });
    setShowRescheduleModal(true);
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.rescheduleAppointment(selectedAppt.appointment_id, rescheduleData);
      setShowRescheduleModal(false);
      setToastMessage(`Appointment ${selectedAppt.appointment_number} rescheduled successfully.`);
      setTimeout(() => setToastMessage(null), 4000);
      fetchAppointments();
    } catch (err) {
      alert('Reschedule error: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await api.updateAppointmentStatus(appointmentId, newStatus);
      fetchAppointments();
    } catch (err) {
      alert('Status update error: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return 'badge-green';
      case 'Confirmed': return 'badge-blue';
      case 'Scheduled': return 'badge-purple';
      case 'Cancelled': return 'badge-rose';
      case 'No-Show': return 'badge-amber';
      default: return 'badge-blue';
    }
  };

  const columns = [
    {
      header: 'Appt #',
      key: 'appointment_number',
      render: (row) => <strong style={{ color: 'var(--theme-teal)' }}>{row.appointment_number}</strong>,
    },
    {
      header: 'Date & Time',
      key: 'appointment_date',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.appointment_date}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />
            {row.start_time} - {row.end_time}
          </div>
        </div>
      ),
    },
    {
      header: 'Patient',
      key: 'patient_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.patient_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.patient_code} • {row.patient_phone}</div>
        </div>
      ),
    },
    {
      header: 'Doctor & Department',
      key: 'doctor_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.doctor_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--theme-teal)' }}>{row.department_name} ({row.specialization})</div>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'appointment_type',
      render: (row) => <span className="badge badge-blue">{row.appointment_type}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <span className={`badge ${getStatusBadge(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Front Desk Actions',
      key: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {row.status !== 'Completed' && row.status !== 'Cancelled' && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                title="Reschedule Appointment"
                onClick={() => handleOpenReschedule(row)}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                Reschedule
              </button>
              <select
                className="form-control"
                style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: 'auto' }}
                value={row.status}
                onChange={(e) => handleStatusChange(row.appointment_id, e.target.value)}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No-Show">No-Show</option>
              </select>
            </>
          )}
          {row.status === 'Completed' && (
            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              <Check size={13} /> Completed
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Front Desk Identity & Operations Banner */}
      <div style={{
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border-card)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
          }}>
            <Calendar size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {isReceptionist ? 'Front Desk & Patient Registrar Hub' : 'Outpatient Appointment Scheduling'}
              </h2>
              {isReceptionist && (
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(2, 195, 154, 0.16)',
                  color: 'var(--text-mint)',
                  border: '1px solid rgba(2, 195, 154, 0.4)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  <ShieldCheck size={13} />
                  Desk Attendant: {user?.fullName || 'Receptionist'}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Real-time slot availability, walk-in patient triage, and database trigger conflict enforcement (trg_check_appointment_conflict).
            </p>
          </div>
        </div>

        {/* Front Desk Action Toolbar */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowBedStatusModal(true)}
            title="Inspect Ward Bed Capacity"
          >
            <BedDouble size={14} color="#06b6d4" />
            <span>Ward Beds ({totalAvailableBeds} Free)</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFastTrackModal(true)}
            title="Register Walk-in Patient"
            style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
          >
            <UserPlus size={14} />
            <span>Fast-Track Patient Intake</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setAvailabilityStatus(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={15} />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem',
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Front Desk Telemetry KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#0284c7' }}>
          <div className="stat-info">
            <h3>Active Appointments</h3>
            <div className="stat-value">{scheduledCount}</div>
            <div className="stat-subtext">Scheduled & Confirmed slots</div>
          </div>
          <div className="stat-icon-wrapper">
            <Calendar size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#06b6d4' }}>
          <div className="stat-info">
            <h3>Available Inpatient Beds</h3>
            <div className="stat-value">{totalAvailableBeds}</div>
            <div className="stat-subtext">Out of {totalBeds} total hospital beds</div>
          </div>
          <div className="stat-icon-wrapper">
            <BedDouble size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-info">
            <h3>Doctors on Duty</h3>
            <div className="stat-value">{totalDoctorsOnDuty}</div>
            <div className="stat-subtext">Registered hospital physicians</div>
          </div>
          <div className="stat-icon-wrapper">
            <User size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-info">
            <h3>Completed Consultations</h3>
            <div className="stat-value">{completedCount}</div>
            <div className="stat-subtext">Finished OPD encounters</div>
          </div>
          <div className="stat-icon-wrapper">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '170px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Appointment Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-Show">No-Show</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={fetchAppointments} title="Refresh Table">
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {onNavigate && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('patients')}>
              <span>Patients Directory</span>
              <ChevronRight size={13} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('admissions')}>
              <span>Bed Admissions</span>
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Appointments Data Table */}
      <DataTable
        columns={columns}
        data={appointments}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Appt #, Patient Name, or Code..."
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* Book Appointment Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Book Outpatient Appointment"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateAppointment} disabled={formSubmitting}>
              {formSubmitting ? 'Checking Conflict Trigger & Booking...' : 'Confirm Appointment'}
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

        <form onSubmit={handleCreateAppointment}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Patient ID *</label>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowFastTrackModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#34d399',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                + Register New Patient
              </button>
            </div>
            <input
              type="number"
              className="form-control"
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              placeholder="e.g. 1 (from Patients Directory)"
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
                  Dr. {d.full_name} ({d.specialization} • ৳{d.consultation_fee})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Appointment Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Appointment Type</label>
              <select
                className="form-control"
                value={formData.appointmentType}
                onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
              >
                <option value="Routine">Routine Consultation</option>
                <option value="New">New Patient Intake</option>
                <option value="Follow-up">Follow-Up Review</option>
                <option value="Emergency">Urgent / Emergency</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="time"
                className="form-control"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input
                type="time"
                className="form-control"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Database Availability Check Button */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCheckAvailability}
              disabled={checkingAvailability}
            >
              <Clock size={14} />
              <span>{checkingAvailability ? 'Checking PL/pgSQL Function...' : 'Test Availability (fn_check_doctor_availability)'}</span>
            </button>

            {availabilityStatus === 'AVAILABLE' && (
              <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                ✓ Doctor is Free during this slot
              </span>
            )}
            {availabilityStatus === 'CONFLICT' && (
              <span style={{ fontSize: '0.8rem', color: '#fb7185', fontWeight: 600 }}>
                ✕ Conflict! Slot is already booked or outside hours
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Chief Complaint / Notes</label>
            <textarea
              className="form-control"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Patient presents with high fever and cough."
            />
          </div>
        </form>
      </Modal>

      {/* Fast-Track Patient Registration Modal */}
      <Modal
        isOpen={showFastTrackModal}
        onClose={() => setShowFastTrackModal(false)}
        title="Fast-Track Patient Intake & Triage"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFastTrackModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleFastTrackPatient} disabled={fastTrackSubmitting}>
              {fastTrackSubmitting ? 'Registering in PostgreSQL...' : 'Register Patient & Continue to Booking'}
            </button>
          </>
        }
      >
        {fastTrackError && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
            {fastTrackError}
          </div>
        )}

        <form onSubmit={handleFastTrackPatient}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-control"
                value={fastTrackData.firstName}
                onChange={(e) => setFastTrackData({ ...fastTrackData, firstName: e.target.value })}
                placeholder="e.g. Rafiqul"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-control"
                value={fastTrackData.lastName}
                onChange={(e) => setFastTrackData({ ...fastTrackData, lastName: e.target.value })}
                placeholder="e.g. Islam"
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
                value={fastTrackData.dateOfBirth}
                onChange={(e) => setFastTrackData({ ...fastTrackData, dateOfBirth: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                className="form-control"
                value={fastTrackData.gender}
                onChange={(e) => setFastTrackData({ ...fastTrackData, gender: e.target.value })}
                required
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
                value={fastTrackData.bloodGroup}
                onChange={(e) => setFastTrackData({ ...fastTrackData, bloodGroup: e.target.value })}
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
                type="tel"
                className="form-control"
                value={fastTrackData.phone}
                onChange={(e) => setFastTrackData({ ...fastTrackData, phone: e.target.value })}
                placeholder="017xxxxxxxx"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email (Optional)</label>
              <input
                type="email"
                className="form-control"
                value={fastTrackData.email}
                onChange={(e) => setFastTrackData({ ...fastTrackData, email: e.target.value })}
                placeholder="patient@gmail.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address / District</label>
            <input
              type="text"
              className="form-control"
              value={fastTrackData.address}
              onChange={(e) => setFastTrackData({ ...fastTrackData, address: e.target.value })}
              placeholder="e.g. Dhanmondi, Dhaka"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Emergency Contact Name *</label>
              <input
                type="text"
                className="form-control"
                value={fastTrackData.emergencyContactName}
                onChange={(e) => setFastTrackData({ ...fastTrackData, emergencyContactName: e.target.value })}
                placeholder="e.g. Salma Begum (Spouse)"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Contact Phone *</label>
              <input
                type="tel"
                className="form-control"
                value={fastTrackData.emergencyContactPhone}
                onChange={(e) => setFastTrackData({ ...fastTrackData, emergencyContactPhone: e.target.value })}
                placeholder="018xxxxxxxx"
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Ward Bed Capacity Modal */}
      <Modal
        isOpen={showBedStatusModal}
        onClose={() => setShowBedStatusModal(false)}
        title="Live Hospital Ward Bed Occupancy"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Enforced by PostgreSQL Trigger <code>trg_enforce_ward_bed_capacity</code>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {onNavigate && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowBedStatusModal(false);
                    onNavigate('admissions');
                  }}
                >
                  <BedDouble size={14} />
                  <span>Go to Bed Admissions</span>
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBedStatusModal(false)}>Close</button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {wards.map((w) => {
              const occPct = parseFloat(w.occupancy_percentage || 0);
              const isFull = w.available_beds <= 0;
              return (
                <div
                  key={w.ward_id}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{w.ward_name}</div>
                    <span className={`badge ${isFull ? 'badge-rose' : 'badge-green'}`} style={{ fontSize: '0.7rem' }}>
                      {isFull ? 'Ward Full' : `${w.available_beds} Free`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Type: <strong style={{ color: 'var(--text-main)' }}>{w.ward_type}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    <span>Occupied: {w.occupied_beds} / {w.total_beds} beds</span>
                    <span>{occPct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-card-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, occPct)}%`,
                      height: '100%',
                      backgroundColor: occPct > 80 ? '#f43f5e' : (occPct > 50 ? '#f59e0b' : '#10b981'),
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      {selectedAppt && (
        <Modal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          title={`Reschedule Appointment ${selectedAppt.appointment_number}`}
          size="md"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReschedule} disabled={formSubmitting}>
                Save Rescheduled Slot
              </button>
            </>
          }
        >
          <form onSubmit={handleReschedule}>
            <div className="form-group">
              <label className="form-label">New Appointment Date *</label>
              <input
                type="date"
                className="form-control"
                value={rescheduleData.appointmentDate}
                onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentDate: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">New Start Time *</label>
                <input
                  type="time"
                  className="form-control"
                  value={rescheduleData.startTime}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New End Time *</label>
                <input
                  type="time"
                  className="form-control"
                  value={rescheduleData.endTime}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Rescheduling Reason / Notes</label>
              <input
                type="text"
                className="form-control"
                value={rescheduleData.notes}
                onChange={(e) => setRescheduleData({ ...rescheduleData, notes: e.target.value })}
                placeholder="e.g. Patient requested schedule shift."
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
