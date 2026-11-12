import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Users, Bed, Layers, Stethoscope, 
  ShieldCheck, CheckCircle2
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchDepartments, createDepartment, fetchDoctors } from '../services/api';

export default function DepartmentsPage({ user }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetchDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddDept = async () => {
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
      console.error(err);
    }
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptForm.departmentName || !deptForm.code) {
      alert('Department Name and unique Code are required.');
      return;
    }
    setSubmitting(true);
    try {
      await createDepartment({
        departmentName: deptForm.departmentName,
        code: deptForm.code,
        description: deptForm.description,
        headDoctorId: deptForm.headDoctorId ? parseInt(deptForm.headDoctorId) : null
      });

      alert('Department created successfully!');
      setShowAddModal(false);
      loadDepartments();
    } catch (err) {
      alert('Failed to create department: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { 
      header: 'Department Code', 
      accessor: 'code', 
      render: row => <span className="badge badge-info font-mono">{row.code}</span> 
    },
    { 
      header: 'Department Name', 
      render: row => (
        <div>
          <span className="font-semibold text-foreground">{row.department_name}</span>
          <span className="text-xs text-muted block">{row.description}</span>
        </div>
      ) 
    },
    { 
      header: 'Head of Department', 
      render: row => row.head_doctor_name ? (
        <div>
          <span className="font-medium">Dr. {row.head_doctor_name}</span>
          <span className="text-xs text-muted block">{row.head_doctor_specialization}</span>
        </div>
      ) : <span className="text-muted text-xs italic">Unassigned</span> 
    },
    { 
      header: 'Active Doctors', 
      accessor: 'total_doctors', 
      render: row => (
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <Stethoscope size={14} className="text-primary" /> {row.total_doctors} Doctors
        </span>
      ) 
    },
    { 
      header: 'Wards & Beds Allocated', 
      render: row => (
        <span className="text-xs font-mono font-medium">
          {row.total_wards} wards • {row.total_allocated_beds} beds
        </span>
      ) 
    },
    { 
      header: 'Status', 
      render: row => <span className="badge badge-success">Active</span> 
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="text-primary" /> Hospital Departments
          </h1>
          <p className="page-subtitle">Organizational clinical units, ward allocations, and departmental head physician leadership</p>
        </div>
        <div>
          {user?.role === 'Admin' && (
            <button className="btn btn-primary" onClick={openAddDept}>
              <Plus size={16} /> Add Department
            </button>
          )}
        </div>
      </div>

      {/* Departments Table */}
      <DataTable 
        columns={columns}
        data={departments}
        loading={loading}
        showPagination={false}
      />

      {/* Add Department Modal */}
      <Modal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Hospital Department"
      >
        <form onSubmit={handleSaveDept} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department Name *</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Cardiology"
                value={deptForm.departmentName} 
                onChange={(e) => setDeptForm({...deptForm, departmentName: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label">Unique Code (3-5 letters) *</label>
              <input 
                type="text" 
                className="input font-mono uppercase" 
                placeholder="e.g. CARD"
                value={deptForm.code} 
                onChange={(e) => setDeptForm({...deptForm, code: e.target.value})}
                required 
              />
            </div>
          </div>

          <div>
            <label className="label">Head of Department (Lead Physician)</label>
            <select 
              className="input" 
              value={deptForm.headDoctorId} 
              onChange={(e) => setDeptForm({...deptForm, headDoctorId: e.target.value})}
            >
              <option value="">-- Select Doctor (Optional) --</option>
              {doctorsList.map(doc => (
                <option key={doc.doctor_id} value={doc.doctor_id}>
                  Dr. {doc.full_name} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description / Scope of Care</label>
            <textarea 
              className="input" 
              rows="3" 
              placeholder="Clinical specialty, medical mandate, and scope..."
              value={deptForm.description} 
              onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Register Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
