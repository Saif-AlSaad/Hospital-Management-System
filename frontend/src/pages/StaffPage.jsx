// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Staff Directory & RBAC User Management Page
// Administrator Exclusive Module: HR Records & Role Provisioning
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Filter, Shield, 
  Mail, Phone, Calendar, CheckCircle2, UserCheck,
  Building2, Key, RefreshCw, AlertCircle, ShieldAlert,
  Award, Lock
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchStaff, createStaff, fetchDepartments } from '../services/api';

export default function StaffPage({ user, onNavigate }) {
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male',
    dateOfBirth: '1992-05-15',
    phone: '01711000000',
    email: '',
    departmentId: '',
    roleId: '4', // Default Receptionist
    createAccount: true,
    username: '',
    password: 'password123'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    loadDepartments();
    loadStaff();
  }, [selectedDept]);

  const loadDepartments = async () => {
    try {
      const res = await fetchDepartments();
      const depts = res.data || [];
      setDepartments(depts);
      if (depts.length > 0 && !staffForm.departmentId) {
        setStaffForm(prev => ({ ...prev, departmentId: depts[0].department_id }));
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetchStaff({
        departmentId: selectedDept || undefined
      });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to load staff directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddStaff = () => {
    setFormError(null);
    setStaffForm({
      firstName: '',
      lastName: '',
      gender: 'Male',
      dateOfBirth: '1992-05-15',
      phone: `0171${Math.floor(1000000 + Math.random() * 8999999)}`,
      email: '',
      departmentId: departments[0]?.department_id || 1,
      roleId: '4',
      createAccount: true,
      username: '',
      password: 'password123'
    });
    setShowAddModal(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!staffForm.firstName || !staffForm.lastName || !staffForm.email) {
      setFormError('First name, last name, and email are mandatory.');
      return;
    }

    if (staffForm.createAccount && (!staffForm.username || !staffForm.password)) {
      setFormError('Username and password are required to provision an active user account.');
      return;
    }

    setSubmitting(true);
    try {
      await createStaff({
        firstName: staffForm.firstName.trim(),
        lastName: staffForm.lastName.trim(),
        gender: staffForm.gender,
        dateOfBirth: staffForm.dateOfBirth,
        phone: staffForm.phone.trim(),
        email: staffForm.email.trim(),
        departmentId: parseInt(staffForm.departmentId),
        roleId: staffForm.createAccount ? parseInt(staffForm.roleId) : null,
        username: staffForm.createAccount ? staffForm.username.trim() : null,
        password: staffForm.createAccount ? staffForm.password : null
      });

      setToastMessage(`Staff member "${staffForm.firstName} ${staffForm.lastName}" registered successfully!`);
      setTimeout(() => setToastMessage(null), 5000);
      setShowAddModal(false);
      loadStaff();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to register staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter staff locally by search query and role filter
  const filteredStaff = staffList.filter((s) => {
    if (selectedRole) {
      const hasRole = Array.isArray(s.roles) && s.roles.includes(selectedRole);
      if (!hasRole) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (s.full_name || '').toLowerCase().includes(q);
      const matchUsername = (s.username || '').toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchPhone = (s.phone || '').toLowerCase().includes(q);
      const matchDept = (s.department_name || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchEmail || matchPhone || matchDept;
    }
    return true;
  });

  // Telemetry Metrics
  const totalStaffCount = staffList.length;
  const userAccountCount = staffList.filter(s => !!s.username).length;
  const doctorCount = staffList.filter(s => Array.isArray(s.roles) && s.roles.includes('Doctor')).length;
  const adminCount = staffList.filter(s => Array.isArray(s.roles) && s.roles.includes('Admin')).length;

  const getRoleBadgeStyle = (roleName) => {
    switch (roleName) {
      case 'Admin':
        return { bg: 'rgba(5, 102, 141, 0.22)', text: '#00A896', border: 'rgba(0, 168, 150, 0.45)' };
      case 'Doctor':
        return { bg: 'rgba(2, 128, 144, 0.18)', text: '#028090', border: 'rgba(2, 128, 144, 0.45)' };
      case 'Receptionist':
        return { bg: 'rgba(2, 195, 154, 0.16)', text: '#02C39A', border: 'rgba(2, 195, 154, 0.45)' };
      case 'Accountant':
        return { bg: 'rgba(240, 243, 189, 0.14)', text: '#F0F3BD', border: 'rgba(240, 243, 189, 0.4)' };
      default:
        return { bg: 'rgba(138, 170, 187, 0.12)', text: '#cbd5e1', border: 'rgba(138, 170, 187, 0.25)' };
    }
  };

  const columns = [
    { 
      header: 'Staff Member', 
      key: 'full_name',
      render: row => (
        <div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>{row.full_name}</div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            {row.gender} • Born {new Date(row.date_of_birth).toLocaleDateString()}
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
      header: 'RBAC Roles', 
      key: 'roles',
      render: row => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {Array.isArray(row.roles) && row.roles.filter(Boolean).length > 0 ? (
            row.roles.filter(Boolean).map((r, i) => {
              const badgeStyle = getRoleBadgeStyle(r);
              return (
                <span key={i} style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.text,
                  border: `1px solid ${badgeStyle.border}`,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                }}>
                  {r}
                </span>
              );
            })
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>Staff Only</span>
          )}
        </div>
      ) 
    },
    { 
      header: 'User Account', 
      key: 'username',
      render: row => row.username ? (
        <span style={{
          fontSize: '0.76rem',
          fontFamily: 'monospace',
          color: '#00A896',
          fontWeight: 700,
          backgroundColor: 'rgba(0, 168, 150, 0.14)',
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid rgba(0, 168, 150, 0.35)',
        }}>
          @{row.username}
        </span>
      ) : (
        <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>No User Account</span>
      ) 
    },
    { 
      header: 'Contact Information', 
      key: 'phone',
      render: row => (
        <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Phone size={12} color="#00A896" />
            <span>{row.phone}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#8aaabb', fontSize: '0.74rem' }}>
            <Mail size={12} color="#5c7e91" />
            <span>{row.email}</span>
          </div>
        </div>
      ) 
    },
    { 
      header: 'Status', 
      key: 'employment_status',
      render: row => (
        <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
          {row.employment_status || 'Active'}
        </span>
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
            <Users size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Hospital Staff Directory & RBAC Security
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
                <Shield size={12} />
                Administrator Governance
              </span>
            </div>
            <p style={{ color: '#8aaabb', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Management of clinical and administrative personnel, PostgreSQL user credentials, and multi-stakeholder role allocation.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadStaff}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddStaff}>
            <Plus size={15} />
            <span>Register New Staff</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          backgroundColor: 'rgba(2, 195, 154, 0.15)',
          border: '1px solid rgba(2, 195, 154, 0.35)',
          color: '#02C39A',
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

      {/* Staff Telemetry KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#05668D' }}>
          <div className="stat-info">
            <h3>Total Staff Personnel</h3>
            <div className="stat-value">{totalStaffCount}</div>
            <div className="stat-subtext">Across {departments.length} departments</div>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#028090' }}>
          <div className="stat-info">
            <h3>Active Physicians</h3>
            <div className="stat-value">{doctorCount}</div>
            <div className="stat-subtext">BMDC verified doctors</div>
          </div>
          <div className="stat-icon-wrapper">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#00A896' }}>
          <div className="stat-info">
            <h3>Provisioned Accounts</h3>
            <div className="stat-value">{userAccountCount}</div>
            <div className="stat-subtext">Active login credentials</div>
          </div>
          <div className="stat-icon-wrapper">
            <Key size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#02C39A' }}>
          <div className="stat-info">
            <h3>Root Administrators</h3>
            <div className="stat-value">{adminCount}</div>
            <div className="stat-subtext">Superuser privileges</div>
          </div>
          <div className="stat-icon-wrapper">
            <Shield size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              placeholder="Search by staff name, username, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select 
            className="form-control" 
            style={{ width: '220px', fontSize: '0.85rem' }}
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">All Hospital Departments</option>
            {departments.map(d => (
              <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
            ))}
          </select>

          <select 
            className="form-control" 
            style={{ width: '180px', fontSize: '0.85rem' }}
            value={selectedRole} 
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">All RBAC Roles</option>
            <option value="Admin">Administrator</option>
            <option value="Doctor">Doctor</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Accountant">Accountant</option>
          </select>

          {(searchQuery || selectedDept || selectedRole) && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearchQuery(''); setSelectedDept(''); setSelectedRole(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Staff Data Table */}
      <DataTable 
        columns={columns}
        data={filteredStaff}
        loading={loading}
      />

      {/* Register Staff Modal */}
      <Modal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Staff Member & Provision User Account"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveStaff} disabled={submitting}>
              {submitting ? 'Registering in PostgreSQL...' : 'Register Staff & Account'}
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

        <form onSubmit={handleSaveStaff}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            1. Personal & Employment Information
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input 
                type="text" 
                className="form-control"
                value={staffForm.firstName}
                onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                placeholder="e.g. Mahbubur"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input 
                type="text" 
                className="form-control"
                value={staffForm.lastName}
                onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                placeholder="e.g. Rahman"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select 
                className="form-control"
                value={staffForm.gender}
                onChange={(e) => setStaffForm({ ...staffForm, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input 
                type="date" 
                className="form-control"
                value={staffForm.dateOfBirth}
                onChange={(e) => setStaffForm({ ...staffForm, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hospital Department *</label>
              <select 
                className="form-control"
                value={staffForm.departmentId}
                onChange={(e) => setStaffForm({ ...staffForm, departmentId: e.target.value })}
                required
              >
                {departments.map(d => (
                  <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input 
                type="tel" 
                className="form-control"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="017xxxxxxxx"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input 
                type="email" 
                className="form-control"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="staff@hospital.bd"
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00A896', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. User Account & RBAC Privileges
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={staffForm.createAccount}
                  onChange={(e) => setStaffForm({ ...staffForm, createAccount: e.target.checked })}
                  style={{ accentColor: '#00A896' }}
                />
                <span>Provision Login Account</span>
              </label>
            </div>

            {staffForm.createAccount && (
              <div style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '1rem',
              }}>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Login Username *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={staffForm.username}
                      onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value.toLowerCase() })}
                      placeholder="e.g. mrahman"
                      required={staffForm.createAccount}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Initial Password *</label>
                    <input 
                      type="password" 
                      className="form-control"
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                      placeholder="password123"
                      required={staffForm.createAccount}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Assigned Stakeholder Role *</label>
                    <select 
                      className="form-control"
                      value={staffForm.roleId}
                      onChange={(e) => setStaffForm({ ...staffForm, roleId: e.target.value })}
                      required={staffForm.createAccount}
                    >
                      <option value="1">Administrator (Full Access)</option>
                      <option value="2">Doctor (Clinical Hub)</option>
                      <option value="4">Receptionist (Front Desk)</option>
                      <option value="5">Accountant (Treasury & Invoicing)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
