import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Filter, Shield, 
  Mail, Phone, Calendar, CheckCircle2, UserCheck
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchStaff, createStaff, fetchDepartments } from '../services/api';

export default function StaffPage({ user }) {
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(false);

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male',
    dateOfBirth: '1990-05-15',
    phone: '+1-555-0100',
    email: '',
    departmentId: '',
    roleId: '4', // Default Receptionist
    createAccount: true,
    username: '',
    password: 'password123'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadStaff();
  }, [selectedDept]);

  const loadDepartments = async () => {
    try {
      const res = await fetchDepartments();
      setDepartments(res.data || []);
      if (res.data?.length > 0 && !staffForm.departmentId) {
        setStaffForm(prev => ({ ...prev, departmentId: res.data[0].department_id }));
      }
    } catch (err) {
      console.error(err);
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddStaff = () => {
    setStaffForm({
      firstName: '',
      lastName: '',
      gender: 'Male',
      dateOfBirth: '1990-05-15',
      phone: `+1-555-0${Math.floor(100 + Math.random() * 899)}`,
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
    if (!staffForm.firstName || !staffForm.lastName || !staffForm.email) {
      alert('First name, last name, and email are mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      await createStaff({
        firstName: staffForm.firstName,
        lastName: staffForm.lastName,
        gender: staffForm.gender,
        dateOfBirth: staffForm.dateOfBirth,
        phone: staffForm.phone,
        email: staffForm.email,
        departmentId: parseInt(staffForm.departmentId),
        roleId: staffForm.createAccount ? parseInt(staffForm.roleId) : null,
        username: staffForm.createAccount ? staffForm.username : null,
        password: staffForm.createAccount ? staffForm.password : null
      });

      alert('Staff member and user credentials registered successfully!');
      setShowAddModal(false);
      loadStaff();
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { 
      header: 'Staff Member', 
      render: row => (
        <div>
          <span className="font-semibold text-foreground">{row.full_name}</span>
          <span className="text-xs text-muted block">{row.gender} • Born {new Date(row.date_of_birth).toLocaleDateString()}</span>
        </div>
      ) 
    },
    { header: 'Department', accessor: 'department_name' },
    { 
      header: 'Assigned Roles', 
      render: row => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.filter(Boolean).length > 0 ? (
            row.roles.filter(Boolean).map((r, i) => (
              <span key={i} className="badge badge-info text-xs">{r}</span>
            ))
          ) : (
            <span className="badge badge-neutral text-xs">Staff Only</span>
          )}
        </div>
      ) 
    },
    { 
      header: 'User Account', 
      render: row => row.username ? (
        <span className="text-xs font-mono text-primary font-semibold">@{row.username}</span>
      ) : <span className="text-xs text-muted italic">No Login</span> 
    },
    { 
      header: 'Contact', 
      render: row => (
        <div className="text-xs text-muted">
          <div>{row.phone}</div>
          <div>{row.email}</div>
        </div>
      ) 
    },
    { 
      header: 'Status', 
      render: row => <span className="badge badge-success">{row.employment_status}</span> 
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="text-primary" /> Hospital Staff & Administration
          </h1>
          <p className="page-subtitle">Manage clinical and administrative personnel, login accounts, and role-based permissions</p>
        </div>
        <div>
          {user?.role === 'Admin' && (
            <button className="btn btn-primary" onClick={openAddStaff}>
              <Plus size={16} /> Register New Staff
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <span className="text-sm font-medium">Department:</span>
          </div>
          <select 
            className="input text-sm w-64" 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
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
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <DataTable 
        columns={columns}
        data={staffList}
        loading={loading}
        showPagination={false}
      />

      {/* Register Staff Modal */}
      <Modal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Hospital Personnel & User Account"
        size="md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input 
                type="text" 
                className="input" 
                value={staffForm.firstName} 
                onChange={(e) => setStaffForm({...staffForm, firstName: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input 
                type="text" 
                className="input" 
                value={staffForm.lastName} 
                onChange={(e) => setStaffForm({...staffForm, lastName: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department *</label>
              <select 
                className="input" 
                value={staffForm.departmentId} 
                onChange={(e) => setStaffForm({...staffForm, departmentId: e.target.value})}
                required
              >
                {departments.map(d => (
                  <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Gender</label>
              <select 
                className="input" 
                value={staffForm.gender} 
                onChange={(e) => setStaffForm({...staffForm, gender: e.target.value})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email Address *</label>
              <input 
                type="email" 
                className="input" 
                value={staffForm.email} 
                onChange={(e) => {
                  const val = e.target.value;
                  setStaffForm(prev => ({
                    ...prev,
                    email: val,
                    username: prev.username || val.split('@')[0].toLowerCase()
                  }));
                }}
                required 
              />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input 
                type="text" 
                className="input" 
                value={staffForm.phone} 
                onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                required 
              />
            </div>
          </div>

          {/* Account Login Option */}
          <div className="p-3 bg-slate-50 border border-border rounded space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={staffForm.createAccount}
                onChange={(e) => setStaffForm({...staffForm, createAccount: e.target.checked})}
              />
              <span className="text-sm font-semibold text-foreground">Create System Login Account</span>
            </label>

            {staffForm.createAccount && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Assigned Role</label>
                    <select 
                      className="input text-xs" 
                      value={staffForm.roleId} 
                      onChange={(e) => setStaffForm({...staffForm, roleId: e.target.value})}
                    >
                      <option value="1">Administrator</option>
                      <option value="2">Doctor</option>
                      <option value="4">Receptionist</option>
                      <option value="7">Accountant</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Username</label>
                    <input 
                      type="text" 
                      className="input text-xs font-mono" 
                      value={staffForm.username} 
                      onChange={(e) => setStaffForm({...staffForm, username: e.target.value})}
                      required={staffForm.createAccount}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Initial Password</label>
                  <input 
                    type="password" 
                    className="input text-xs font-mono" 
                    value={staffForm.password} 
                    onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                    required={staffForm.createAccount}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
