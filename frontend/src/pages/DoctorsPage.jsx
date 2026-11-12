import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Search, Filter, Plus, Calendar, 
  Award, Phone, Mail, Clock, Eye, CheckCircle2
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchDoctors, fetchDepartments, fetchDoctorProfile } from '../services/api';

export default function DoctorsPage({ user }) {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    loadDepartments();
    loadDoctors();
  }, [selectedDept]);

  const loadDepartments = async () => {
    try {
      const res = await fetchDepartments();
      setDepartments(res.data || []);
    } catch (err) {
      console.error(err);
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async (docId) => {
    try {
      const res = await fetchDoctorProfile(docId);
      setSelectedDoc(res);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load doctor profile: ' + (err.response?.data?.message || err.message));
    }
  };

  const columns = [
    { 
      header: 'Doctor Name', 
      render: row => (
        <div>
          <span className="font-semibold text-foreground">Dr. {row.full_name}</span>
          <span className="text-xs text-muted block font-mono">{row.license_number}</span>
        </div>
      ) 
    },
    { header: 'Department', accessor: 'department_name' },
    { header: 'Specialization', accessor: 'specialization' },
    { 
      header: 'Consultation Fee', 
      accessor: 'consultation_fee', 
      render: row => <span className="font-mono font-semibold">৳{parseFloat(row.consultation_fee).toFixed(2)}</span> 
    },
    { 
      header: 'Appointments Handled', 
      render: row => (
        <span className="text-xs">
          <span className="font-bold text-primary">{row.completed_appointments}</span> / {row.total_appointments_handled} completed
        </span>
      ) 
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
      render: row => row.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-neutral">Inactive</span> 
    },
    {
      header: 'Actions',
      render: row => (
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => openProfile(row.doctor_id)}
        >
          <Eye size={14} /> Profile & Schedule
        </button>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Stethoscope className="text-primary" /> Medical Staff & Physicians
          </h1>
          <p className="page-subtitle">Medical practitioner directory, specialization credentials, departmental affiliations, and clinic schedules</p>
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

      {/* Doctors Table */}
      <DataTable 
        columns={columns}
        data={doctors}
        loading={loading}
        showPagination={false}
      />

      {/* Doctor Profile & Schedule Modal */}
      {selectedDoc && (
        <Modal 
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Physician Profile: Dr. ${selectedDoc.doctor.full_name}`}
          size="md"
        >
          <div className="space-y-5">
            <div className="p-4 bg-slate-50 border border-border rounded flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary flex items-center justify-center font-bold text-xl">
                Dr
              </div>
              <div>
                <h3 className="font-bold text-base">Dr. {selectedDoc.doctor.full_name}</h3>
                <p className="text-xs text-muted font-medium">{selectedDoc.doctor.specialization} • {selectedDoc.doctor.department_name}</p>
                <div className="text-xs text-muted mt-1 font-mono">License: {selectedDoc.doctor.license_number}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-border">
                <span className="text-muted block">Consultation Fee</span>
                <span className="font-mono font-bold text-base text-primary">৳{parseFloat(selectedDoc.doctor.consultation_fee).toFixed(2)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-border">
                <span className="text-muted block">Direct Contact</span>
                <span className="font-medium block">{selectedDoc.doctor.phone}</span>
                <span className="text-muted">{selectedDoc.doctor.email}</span>
              </div>
            </div>

            {selectedDoc.doctor.bio && (
              <div className="text-xs text-muted leading-relaxed">
                <strong>Biography:</strong> {selectedDoc.doctor.bio}
              </div>
            )}

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                <Clock size={16} className="text-primary" /> Weekly Clinic Duty Schedule
              </h4>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 border-b border-border text-muted">
                    <tr>
                      <th className="p-2 text-left">Day</th>
                      <th className="p-2 text-left">Clinic Hours</th>
                      <th className="p-2 text-right">Max Daily Patients</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedDoc.schedules?.length > 0 ? (
                      selectedDoc.schedules.map(s => {
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        return (
                          <tr key={s.schedule_id}>
                            <td className="p-2 font-medium">{days[s.day_of_week]}</td>
                            <td className="p-2 font-mono">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                            <td className="p-2 text-right font-mono">{s.max_patients}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-3 text-center text-muted italic">Standard weekday rounds (09:00 - 17:00)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
