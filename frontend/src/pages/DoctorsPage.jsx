// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Medical Staff & Physician Directory Console - Turquoise Harmony Edition
// Modern Clinical Registry, BMDC Verifications & Clinic Duty Rosters
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Search, Filter, Plus, Calendar, 
  Award, Phone, Mail, Clock, Eye, CheckCircle2,
  DollarSign, ShieldCheck, UserCheck, Activity,
  Briefcase, Check, Building2, ChevronRight, User
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #05668D 0%, #028090 100%)',
            border: '1.5px solid rgba(0, 168, 150, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 800,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(5, 102, 141, 0.2)',
          }}>
            Dr
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.90rem' }}>
              Dr. {row.full_name}
            </div>
            <div style={{
              fontSize: '0.72rem',
              color: '#028090',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}>
              <Award size={11} color="#00A896" />
              <span>{row.license_number}</span>
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
          fontSize: '0.76rem',
          color: 'var(--theme-baltic)',
          backgroundColor: 'rgba(2, 128, 144, 0.1)',
          padding: '0.25rem 0.65rem',
          borderRadius: '6px',
          border: '1px solid var(--border-card)',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}>
          <Building2 size={12} color="#028090" />
          <span>{row.department_name}</span>
        </span>
      )
    },
    { 
      header: 'Specialization', 
      key: 'specialization',
      render: row => (
        <span style={{
          fontSize: '0.82rem',
          color: '#008778',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}>
          <Briefcase size={13} color="#00A896" />
          <span>{row.specialization}</span>
        </span>
      )
    },
    { 
      header: 'Consultation Fee', 
      key: 'consultation_fee', 
      render: row => (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          color: '#008767',
          fontSize: '0.90rem',
          backgroundColor: 'rgba(2, 195, 154, 0.12)',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
          border: '1px solid rgba(2, 195, 154, 0.3)',
          display: 'inline-block',
        }}>
          ৳{parseFloat(row.consultation_fee).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Handled Encounters', 
      key: 'total_appointments_handled',
      render: row => (
        <div style={{ fontSize: '0.82rem' }}>
          <span style={{ fontWeight: 800, color: 'var(--theme-baltic)' }}>{row.completed_appointments}</span>
          <span style={{ color: 'var(--text-muted)' }}> / {row.total_appointments_handled} completed</span>
        </div>
      ) 
    },
    { 
      header: 'Direct Contact', 
      key: 'phone',
      render: row => (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div style={{ color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Phone size={11} color="#028090" />
            <span>{row.phone}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
            <Mail size={11} />
            <span>{row.email}</span>
          </div>
        </div>
      ) 
    },
    { 
      header: 'Status', 
      key: 'is_active',
      width: '90px',
      render: row => row.is_active ? (
        <span className="badge badge-green">
          <Check size={11} strokeWidth={3} />
          <span>ACTIVE</span>
        </span>
      ) : (
        <span className="badge" style={{ backgroundColor: 'rgba(112, 147, 162, 0.15)', color: 'var(--text-dim)' }}>
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
          <Eye size={13} color="#028090" />
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
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: 'rgba(5, 102, 141, 0.12)',
            border: '1.5px solid #05668D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#05668D',
          }}>
            <Stethoscope size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Medical Staff & Physician Directory
              </h2>
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
                <ShieldCheck size={13} />
                BMDC Verified
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Consultant practitioner profiles, medical council license registry, weekly clinic duty schedules, and OPD rates.
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
          <div className="stat-icon-wrapper" style={{ color: '#05668D', backgroundColor: 'rgba(5, 102, 141, 0.12)', borderColor: 'rgba(5, 102, 141, 0.25)' }}>
            <Stethoscope size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#028090' }}>
          <div className="stat-info">
            <h3>Clinical Specialties</h3>
            <div className="stat-value">{uniqueSpecialties}</div>
            <div className="stat-subtext">Disciplines Practiced</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#028090', backgroundColor: 'rgba(2, 128, 144, 0.12)', borderColor: 'rgba(2, 128, 144, 0.25)' }}>
            <Award size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#00A896' }}>
          <div className="stat-info">
            <h3>Handled Encounters</h3>
            <div className="stat-value">{totalAppointmentsHandled}</div>
            <div className="stat-subtext">Total OPD Appointments</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#00A896', backgroundColor: 'rgba(0, 168, 150, 0.12)', borderColor: 'rgba(0, 168, 150, 0.25)' }}>
            <Calendar size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#02C39A' }}>
          <div className="stat-info">
            <h3>Avg Consultation</h3>
            <div className="stat-value">৳{avgFee}</div>
            <div className="stat-subtext" style={{ color: '#008767', fontWeight: 600 }}>Standard OPD Fee</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#02C39A', backgroundColor: 'rgba(2, 195, 154, 0.12)', borderColor: 'rgba(2, 195, 154, 0.25)' }}>
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '10px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            <Filter size={16} color="#028090" />
            <span>Filter Department:</span>
          </div>
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
            className="form-control"
            style={{
              padding: '0.45rem 0.85rem',
              minWidth: '240px',
              width: 'auto',
              fontWeight: 600,
            }}
          >
            <option value="">All Hospital Departments ({departments.length})</option>
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
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header Identity Card */}
            <div style={{
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #05668D 0%, #028090 100%)',
                border: '2px solid #00A896',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '1.3rem',
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(5, 102, 141, 0.25)',
              }}>
                Dr
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Dr. {selectedDoc.doctor.full_name}
                </h3>
                <div style={{ fontSize: '0.84rem', color: '#008778', fontWeight: 700, marginTop: '0.15rem' }}>
                  {selectedDoc.doctor.specialization} • {selectedDoc.doctor.department_name}
                </div>
                <div style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}>
                  <Award size={13} color="#00A896" />
                  <span>BMDC Registration: <strong style={{ color: 'var(--text-main)' }}>{selectedDoc.doctor.license_number}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
              <div style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Consultation Fee
                </span>
                <span style={{ fontSize: '1.35rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#008767', display: 'block', marginTop: '0.2rem' }}>
                  ৳{parseFloat(selectedDoc.doctor.consultation_fee).toFixed(2)}
                </span>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Contact Information
                </span>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginTop: '0.2rem' }}>
                  {selectedDoc.doctor.phone}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
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
                padding: '0.9rem 1rem',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>Physician Background: </strong>
                {selectedDoc.doctor.bio}
              </div>
            )}

            {/* Weekly Clinic Duty Schedule */}
            <div>
              <div style={{
                fontSize: '0.88rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginBottom: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}>
                <Clock size={16} color="#00A896" />
                <span>Weekly Clinic Duty Schedule</span>
              </div>

              <div style={{
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-card)',
              }}>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(2, 128, 144, 0.08)', borderBottom: '2px solid var(--border-card)' }}>
                      <th style={{ padding: '0.65rem 0.95rem', textAlign: 'left', color: 'var(--theme-baltic)', fontWeight: 800 }}>Day of Week</th>
                      <th style={{ padding: '0.65rem 0.95rem', textAlign: 'left', color: 'var(--theme-baltic)', fontWeight: 800 }}>Clinic Hours</th>
                      <th style={{ padding: '0.65rem 0.95rem', textAlign: 'right', color: 'var(--theme-baltic)', fontWeight: 800 }}>Max Patient Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDoc.schedules?.length > 0 ? (
                      selectedDoc.schedules.map((s) => {
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        return (
                          <tr key={s.schedule_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.65rem 0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {days[s.day_of_week]}
                            </td>
                            <td style={{ padding: '0.65rem 0.95rem', fontFamily: 'var(--font-mono)', color: '#028090', fontWeight: 600 }}>
                              {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                            </td>
                            <td style={{ padding: '0.65rem 0.95rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#008767', fontWeight: 700 }}>
                              {s.max_patients} patients
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>
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
