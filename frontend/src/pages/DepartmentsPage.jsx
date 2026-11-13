// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Hospital Departments & Clinical Units Directory
// Administrator Exclusive Management: Organizational Structure & Leadership
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Users, BedDouble, Layers, Stethoscope, 
  ShieldCheck, CheckCircle2, Search, Filter, AlertCircle,
  Award, Hotel, Shield
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchDepartments, createDepartment, fetchDoctors } from '../services/api';

export default function DepartmentsPage({ user }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);
  const [deptForm, setDeptForm] = useState({
    departmentName: '',
    code: '',
    description: '',
    headDoctorId: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetchDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddDept = async () => {
    setFormError(null);
    setDeptForm({
      departmentName: '',
      code: '',
      description: '',
      headDoctorId: ''
    });
    setShowAddModal(true);
    try {
      const docRes = await fetchDoctors({ active: true });
      setDoctorsList(docRes.data || []);
    } catch (err) {
      console.error('Failed to fetch physicians for head doctor selection:', err);
    }
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!deptForm.departmentName.trim() || !deptForm.code.trim()) {
      setFormError('Department Name and unique Code are required.');
      return;
    }

    setSubmitting(true);
    try {
      await createDepartment({
        departmentName: deptForm.departmentName.trim(),
        code: deptForm.code.toUpperCase().trim(),
        description: deptForm.description.trim() || null,
        headDoctorId: deptForm.headDoctorId ? parseInt(deptForm.headDoctorId) : null
      });

      setToastMessage(`Department "${deptForm.departmentName}" created successfully!`);
      setTimeout(() => setToastMessage(null), 5000);
      setShowAddModal(false);
      loadDepartments();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter departments locally by search query
  const filteredDepartments = departments.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = (d.department_name || '').toLowerCase().includes(q);
    const matchCode = (d.code || '').toLowerCase().includes(q);
    const matchHead = (d.head_doctor_name || '').toLowerCase().includes(q);
    const matchDesc = (d.description || '').toLowerCase().includes(q);
    return matchName || matchCode || matchHead || matchDesc;
  });

  // Telemetry Aggregates
  const totalDepartments = departments.length;
  const totalDoctors = departments.reduce((acc, d) => acc + parseInt(d.total_doctors || 0), 0);
  const totalWards = departments.reduce((acc, d) => acc + parseInt(d.total_wards || 0), 0);
  const totalBeds = departments.reduce((acc, d) => acc + parseInt(d.total_allocated_beds || 0), 0);

  const columns = [
    { 
      header: 'Code', 
      key: 'code',
      width: '110px',
      render: row => (
        <span style={{
          fontFamily: 'monospace',
          fontWeight: 700,
          color: '#38bdf8',
          backgroundColor: 'rgba(2, 132, 199, 0.15)',
          border: '1px solid rgba(2, 132, 199, 0.35)',
          padding: '0.25rem 0.55rem',
          borderRadius: '6px',
          fontSize: '0.82rem',
        }}>
          {row.code}
        </span>
      ) 
    },
    { 
      header: 'Department & Clinical Scope', 
      key: 'department_name',
      render: row => (
        <div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
            {row.department_name}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem' }}>
            {row.description || 'Clinical inpatient and outpatient services'}
          </div>
        </div>
      ) 
    },
    { 
      header: 'Head of Department (Lead Physician)', 
      key: 'head_doctor_name',
      render: row => row.head_doctor_name ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            fontSize: '0.78rem',
            fontWeight: 700,
          }}>
            Dr
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.84rem' }}>
              Dr. {row.head_doctor_name}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {row.head_doctor_specialization || 'Consultant Specialist'}
            </div>
          </div>
        </div>
      ) : (
        <span style={{ color: '#64748b', fontSize: '0.78rem', fontStyle: 'italic' }}>
          Unassigned
        </span>
      ) 
    },
    { 
      header: 'Clinical Doctors', 
      key: 'total_doctors',
      render: row => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#e2e8f0',
        }}>
          <Stethoscope size={14} color="#38bdf8" />
          <span>{row.total_doctors} Physicians</span>
        </span>
      ) 
    },
    { 
      header: 'Wards & Beds Allocated', 
      key: 'total_allocated_beds',
      render: row => (
        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
          <div style={{ fontWeight: 600 }}>{row.total_allocated_beds} Beds</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{row.total_wards} Wards Allocated</div>
        </div>
      ) 
    },
    { 
      header: 'Status', 
      key: 'is_active',
      width: '100px',
      render: row => (
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#34d399',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '0.2rem 0.55rem',
          borderRadius: '6px',
        }}>
          ACTIVE
        </span>
      ) 
    }
  ];

  return (
    <div>
      {/* Executive Header Banner */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
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
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc',
          }}>
            <Building2 size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Hospital Departments & Clinical Units
              </h2>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <ShieldCheck size={12} />
                Organizational Governance
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Manage clinical mandates, departmental leadership assignments, inpatient ward allocations, and physician staffing.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openAddDept}>
            <Plus size={15} />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Toast Notification */}
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

      {/* Telemetry Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Departments</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{totalDepartments}</div>
              <div style={{ fontSize: '0.72rem', color: '#c084fc', marginTop: '0.2rem' }}>All Specialized Divisions</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Clinical Doctors</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{totalDoctors}</div>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.2rem' }}>Active Medical Specialists</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
              <Stethoscope size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Inpatient Wards</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{totalWards}</div>
              <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.2rem' }}>General, ICU & CCU Units</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Hotel size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Allocated Beds</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{totalBeds}</div>
              <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.2rem' }}>Hospital Bed Infrastructure</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <BedDouble size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Departments Table with Search Toolbar */}
      <DataTable 
        columns={columns}
        data={filteredDepartments}
        loading={loading}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search departments by name, code, or head physician..."
        emptyMessage="No departments found matching your criteria."
      />

      {/* Add Department Modal */}
      <Modal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Hospital Department"
      >
        <form onSubmit={handleSaveDept} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {formError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              color: '#fb7185',
              fontSize: '0.82rem',
            }}>
              <AlertCircle size={16} flexShrink={0} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Department Name *
              </label>
              <input 
                type="text" 
                placeholder="e.g. Cardiology"
                value={deptForm.departmentName} 
                onChange={(e) => setDeptForm({...deptForm, departmentName: e.target.value})}
                required 
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: '#0a101d',
                  border: '1px solid #1e2c45',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Unique Code (3-5 letters) *
              </label>
              <input 
                type="text" 
                placeholder="e.g. CARD"
                value={deptForm.code} 
                onChange={(e) => setDeptForm({...deptForm, code: e.target.value})}
                required 
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: '#0a101d',
                  border: '1px solid #1e2c45',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  outline: 'none',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Head of Department (Lead Physician)
            </label>
            <select 
              value={deptForm.headDoctorId} 
              onChange={(e) => setDeptForm({...deptForm, headDoctorId: e.target.value})}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                backgroundColor: '#0a101d',
                border: '1px solid #1e2c45',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.86rem',
                outline: 'none',
              }}
            >
              <option value="">-- Select Lead Physician (Optional) --</option>
              {doctorsList.map(doc => (
                <option key={doc.doctor_id} value={doc.doctor_id}>
                  Dr. {doc.full_name} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Description & Clinical Scope
            </label>
            <textarea 
              rows="3" 
              placeholder="Clinical specialty, medical mandate, and scope of patient care..."
              value={deptForm.description} 
              onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                backgroundColor: '#0a101d',
                border: '1px solid #1e2c45',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.86rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid #1e293b',
          }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
