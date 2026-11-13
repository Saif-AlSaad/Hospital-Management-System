// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Medical Staff & Physician Directory Console
// Turquoise Harmony Theme: Baltic Blue, Teal, Verdigris, Mint Leaf & Cream
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Search, Filter, Plus, Calendar, 
  Award, Phone, Mail, Clock, Eye, CheckCircle2,
  DollarSign, ShieldCheck, UserCheck, Activity,
  Briefcase, Check
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchDoctors, fetchDepartments, fetchDoctorProfile } from '../services/api';

export default function DoctorsPage({ user, onNavigate }) {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [selectedDept]);

  const loadDepartments = async () => {
    try {
      const res = await fetchDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const res = await fetchDoctors({
        departmentId: selectedDept || undefined,
        active: true
      });
      setDoctors(res.data || []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async (docId) => {
    setLoadingProfile(true);
    try {
      const res = await fetchDoctorProfile(docId);
      setSelectedDoc(res);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load doctor profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingProfile(false);
    }
  };

  // Filter doctors locally by search query
  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = (doc.full_name || '').toLowerCase().includes(q);
    const matchLicense = (doc.license_number || '').toLowerCase().includes(q);
    const matchSpec = (doc.specialization || '').toLowerCase().includes(q);
    const matchDept = (doc.department_name || '').toLowerCase().includes(q);
    const matchPhone = (doc.phone || '').toLowerCase().includes(q);
    return matchName || matchLicense || matchSpec || matchDept || matchPhone;
  });

  // Telemetry Aggregates
  const totalDoctors = doctors.length;
  const uniqueSpecialties = new Set(doctors.map(d => d.specialization)).size;
  const totalAppointmentsHandled = doctors.reduce((acc, d) => acc + parseInt(d.total_appointments_handled || 0), 0);
  const avgFee = totalDoctors > 0 
    ? (doctors.reduce((acc, d) => acc + parseFloat(d.consultation_fee || 0), 0) / totalDoctors).toFixed(0) 
    : '0';

  const columns = [
    { 
      header: 'Physician & BMDC License', 
      key: 'full_name',
      render: row => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(2, 128, 144, 0.2)',
            border: '1px solid rgba(0, 168, 150, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00A896',
            fontSize: '0.8rem',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            Dr
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>
              Dr. {row.full_name}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#8aaabb', fontFamily: 'monospace' }}>
              {row.license_number}
            </div>
          </div>
        </div>
      ) 
    },
    { 
      header: 'Department', 
      key: 'department_name',
      render: row => (
        <span style={{
          fontSize: '0.78rem',
          color: '#e2e8f0',
          backgroundColor: 'var(--bg-main)',
          padding: '0.2rem 0.6rem',
          borderRadius: '6px',
          border: '1px solid var(--border-card)',
          fontWeight: 600,
        }}>
          {row.department_name}
        </span>
      )
    },
    { 
      header: 'Specialization', 
      key: 'specialization',
      render: row => (
        <span style={{ fontSize: '0.82rem', color: '#00A896', fontWeight: 600 }}>
          {row.specialization}
        </span>
      )
    },
    { 
      header: 'Consultation Fee', 
      key: 'consultation_fee', 
      render: row => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#02C39A', fontSize: '0.88rem' }}>
          ৳{parseFloat(row.consultation_fee).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Handled Appointments', 
      key: 'total_appointments_handled',
      render: row => (
        <div style={{ fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 700, color: '#00A896' }}>{row.completed_appointments}</span>
          <span style={{ color: '#8aaabb' }}> / {row.total_appointments_handled} completed</span>
        </div>
      ) 
    },
    { 
      header: 'Direct Contact', 
      key: 'phone',
      render: row => (
        <div style={{ fontSize: '0.76rem', color: '#8aaabb' }}>
          <div style={{ color: '#cbd5e1' }}>{row.phone}</div>
          <div style={{ fontSize: '0.72rem' }}>{row.email}</div>
        </div>
      ) 
    },
    { 
      header: 'Status', 
      key: 'is_active',
      width: '90px',
      render: row => row.is_active ? (
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#02C39A',
          backgroundColor: 'rgba(2, 195, 154, 0.15)',
          border: '1px solid rgba(2, 195, 154, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
        }}>
          ACTIVE
        </span>
      ) : (
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#8aaabb',
          backgroundColor: 'rgba(138, 170, 187, 0.15)',
          border: '1px solid rgba(138, 170, 187, 0.25)',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
        }}>
          INACTIVE
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: row => (
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => openProfile(row.doctor_id)}
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
        >
          <Eye size={13} />
          <span>Profile & Duty</span>
        </button>
      )
    }
  ];

  return (
    <div>
      {/* Executive Header Banner */}
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
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: 'rgba(5, 102, 141, 0.22)',
            border: '1px solid rgba(0, 168, 150, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00A896',
          }}>
            <Stethoscope size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Medical Staff & Physician Directory
              </h2>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(2, 128, 144, 0.2)',
                color: '#02C39A',
                border: '1px solid rgba(2, 195, 154, 0.4)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <ShieldCheck size={12} />
                BMDC Verified
              </span>
            </div>
            <p style={{ color: '#8aaabb', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Consultant practitioner profiles, medical council license registry, weekly clinic schedules, and outpatient consultation rates.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('staff')}>
            <Plus size={15} />
            <span>Manage Staff & Accounts</span>
          </button>
        )}
      </div>

      {/* Telemetry Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#05668D' }}>
          <div className="stat-info">
            <h3>Active Physicians</h3>
            <div className="stat-value">{totalDoctors}</div>
            <div className="stat-subtext">Registered Doctors</div>
          </div>
          <div className="stat-icon-wrapper">
            <Stethoscope size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#028090' }}>
          <div className="stat-info">
            <h3>Clinical Specialties</h3>
            <div className="stat-value">{uniqueSpecialties}</div>
            <div className="stat-subtext">Disciplines Practiced</div>
          </div>
          <div className="stat-icon-wrapper">
            <Award size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#00A896' }}>
          <div className="stat-info">
            <h3>Handled Encounters</h3>
            <div className="stat-value">{totalAppointmentsHandled}</div>
            <div className="stat-subtext">Total OPD Appointments</div>
          </div>
          <div className="stat-icon-wrapper">
            <Calendar size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#02C39A' }}>
          <div className="stat-info">
            <h3>Avg Consultation</h3>
            <div className="stat-value">৳{avgFee}</div>
            <div className="stat-subtext" style={{ color: '#F0F3BD' }}>Standard OPD Fee</div>
          </div>
          <div className="stat-icon-wrapper">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border-card)',
        borderRadius: '10px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8aaabb', fontSize: '0.82rem' }}>
            <Filter size={16} />
            <span>Filter Department:</span>
          </div>
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.84rem',
              outline: 'none',
              minWidth: '220px',
            }}
          >
            <option value="">All Hospital Departments</option>
            {departments.map(d => (
              <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
            ))}
          </select>
          {selectedDept && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedDept('')}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Doctors Table */}
      <DataTable 
        columns={columns}
        data={filteredDoctors}
        loading={loading}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search doctors by name, license number, specialty, or phone..."
        emptyMessage="No physicians found matching your search criteria."
      />

      {/* Doctor Profile & Clinic Schedule Modal */}
      {selectedDoc && (
        <Modal 
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Physician Profile: Dr. ${selectedDoc.doctor.full_name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header Identity Card */}
            <div style={{
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: '10px',
              padding: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(2, 128, 144, 0.2)',
                border: '2px solid rgba(0, 168, 150, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00A896',
                fontSize: '1.2rem',
                fontWeight: 800,
                flexShrink: 0,
              }}>
                Dr
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Dr. {selectedDoc.doctor.full_name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#00A896', fontWeight: 600, marginTop: '0.15rem' }}>
                  {selectedDoc.doctor.specialization} • {selectedDoc.doctor.department_name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#8aaabb', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                  BMDC Registration: <strong style={{ color: '#fff' }}>{selectedDoc.doctor.license_number}</strong>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
              <div style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '0.85rem',
              }}>
                <span style={{ fontSize: '0.72rem', color: '#8aaabb', textTransform: 'uppercase', display: 'block' }}>
                  Consultation Fee
                </span>
                <span style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 800, color: '#02C39A', display: 'block', marginTop: '0.2rem' }}>
                  ৳{parseFloat(selectedDoc.doctor.consultation_fee).toFixed(2)}
                </span>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '0.85rem',
              }}>
                <span style={{ fontSize: '0.72rem', color: '#8aaabb', textTransform: 'uppercase', display: 'block' }}>
                  Contact Information
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fff', display: 'block', marginTop: '0.2rem' }}>
                  {selectedDoc.doctor.phone}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8aaabb' }}>
                  {selectedDoc.doctor.email}
                </span>
              </div>
            </div>

            {/* Biography */}
            {selectedDoc.doctor.bio && (
              <div style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                lineHeight: 1.5,
              }}>
                <strong style={{ color: '#fff' }}>Physician Background: </strong>
                {selectedDoc.doctor.bio}
              </div>
            )}

            {/* Weekly Clinic Duty Schedule */}
            <div>
              <div style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                <Clock size={16} color="#00A896" />
                <span>Weekly Clinic Duty Schedule</span>
              </div>

              <div style={{
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-main)',
              }}>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#061926', borderBottom: '1px solid var(--border-card)' }}>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left', color: '#8aaabb' }}>Day of Week</th>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left', color: '#8aaabb' }}>Clinic Hours</th>
                      <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right', color: '#8aaabb' }}>Max Patient Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDoc.schedules?.length > 0 ? (
                      selectedDoc.schedules.map((s) => {
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        return (
                          <tr key={s.schedule_id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 600, color: '#fff' }}>
                              {days[s.day_of_week]}
                            </td>
                            <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'monospace', color: '#00A896' }}>
                              {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                            </td>
                            <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', color: '#02C39A', fontWeight: 700 }}>
                              {s.max_patients} patients
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: '#5c7e91', fontStyle: 'italic' }}>
                          Standard weekday clinical rounds (09:00 - 17:00)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
