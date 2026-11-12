// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Outpatient Appointment Management & Scheduling Page
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
  Building2
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

  // Doctor list for filter & schedule form
  const [doctors, setDoctors] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
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

  // Reschedule Form
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
      setAppointments(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorList = async () => {
    try {
      const res = await api.getDoctors();
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchDoctorList();
  }, []);

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
      setFormData({
        patientId: '', doctorId: '',
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
      render: (row) => <strong style={{ color: '#38bdf8' }}>{row.appointment_number}</strong>,
    },
    {
      header: 'Date & Time',
      key: 'appointment_date',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#fff' }}>{row.appointment_date}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
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
          <div style={{ fontWeight: 600 }}>{row.patient_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.patient_code} • {row.patient_phone}</div>
        </div>
      ),
    },
    {
      header: 'Doctor & Department',
      key: 'doctor_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{row.doctor_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{row.department_name} ({row.specialization})</div>
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
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {row.status !== 'Completed' && row.status !== 'Cancelled' && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                title="Reschedule Appointment"
                onClick={() => handleOpenReschedule(row)}
              >
                Reschedule
              </button>
              <select
                className="form-control"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
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
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Outpatient Appointments</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Schedule management protected by PostgreSQL trigger <code style={{ color: '#38bdf8' }}>trg_check_appointment_conflict</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-Show">No-Show</option>
          </select>

          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Appointments Data Table */}
      <DataTable
        columns={columns}
        data={appointments}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by Appt #, Patient Name, or Code..."
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
              {formSubmitting ? 'Booking & Checking Conflicts...' : 'Confirm Appointment'}
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
            <label className="form-label">Patient ID *</label>
            <input
              type="number"
              className="form-control"
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              placeholder="e.g. 1"
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Enter the numerical Patient ID (from Patients directory)</span>
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
                  Dr. {d.full_name} ({d.specialization} • ${d.consultation_fee})
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
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              placeholder="e.g. Follow-up for blood pressure monitoring."
            />
          </div>
        </form>
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
