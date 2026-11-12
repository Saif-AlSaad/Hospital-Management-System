import React, { useState, useEffect } from 'react';
import { 
  Settings, Database, ShieldCheck, Server, 
  CheckCircle2, AlertCircle, Info, RefreshCw, Key
} from 'lucide-react';
import { checkHealth } from '../services/api';

export default function SettingsPage({ user }) {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await checkHealth();
      setHealth(res);
    } catch (err) {
      console.error(err);
      setHealth({ status: 'DOWN', error: err.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="text-primary" /> System Settings & Database Configuration
          </h1>
          <p className="page-subtitle">PostgreSQL 18 connection parameters, role privileges, connection pool, and university project metadata</p>
        </div>
        <button 
          className="btn btn-secondary btn-sm flex items-center gap-2"
          onClick={runHealthCheck}
          disabled={checking}
        >
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking Pool...' : 'Test Database Connection'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Database Connectivity Card */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Database className="text-primary" size={20} />
            <h3 className="font-bold text-base">Relational Database Engine</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">DBMS Version:</span>
              <span className="font-mono font-semibold text-emerald-600">PostgreSQL 18.6 (64-bit)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Database Name:</span>
              <span className="font-mono font-bold">hospital_db</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Connection Driver:</span>
              <span className="font-mono text-primary font-semibold">Plain pg (node-postgres)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">ORM / Query Builder:</span>
              <span className="badge badge-success font-mono">None (Raw Parameterized SQL)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Connection Pool Size:</span>
              <span className="font-mono">Max 20 Connections</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">Database Health:</span>
              {health?.status === 'UP' ? (
                <span className="badge badge-success flex items-center gap-1 font-mono">
                  <CheckCircle2 size={12} /> CONNECTED ({health.database})
                </span>
              ) : (
                <span className="badge badge-danger flex items-center gap-1 font-mono">
                  <AlertCircle size={12} /> {health?.status || 'CHECKING'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Academic Project Metadata */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Info className="text-primary" size={20} />
            <h3 className="font-bold text-base">University Academic Project</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Course:</span>
              <span className="font-semibold">Database Management Systems (DBMS)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Deliverable:</span>
              <span className="font-semibold">Term Project & Viva Defense</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Normalization Level:</span>
              <span className="badge badge-info font-mono">Third Normal Form (3NF)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-muted">Total Schema Entities:</span>
              <span className="font-mono font-bold text-primary">37 Relational Tables</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">Total Seeded Records:</span>
              <span className="font-mono font-bold text-emerald-600">~14,000 Records</span>
            </div>
          </div>
        </div>

        {/* Database Security & RBAC Roles */}
        <div className="card col-span-2 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Key className="text-primary" size={20} />
            <h3 className="font-bold text-base">PostgreSQL RBAC Database Roles & Granted Privileges</h3>
          </div>

          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-border text-muted">
                <tr>
                  <th className="p-3 text-left">PostgreSQL Role</th>
                  <th className="p-3 text-left">Granted Permissions</th>
                  <th className="p-3 text-left">Table Scope</th>
                  <th className="p-3 text-left">Procedures & Functions Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-mono font-bold text-primary">hms_admin</td>
                  <td className="p-3"><span className="badge badge-success">ALL PRIVILEGES</span></td>
                  <td className="p-3">All 37 Tables + Sequences</td>
                  <td className="p-3 font-mono">ALL FUNCTIONS &amp; PROCEDURES</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-primary">hms_doctor</td>
                  <td className="p-3"><span className="badge badge-info">SELECT, INSERT, UPDATE</span></td>
                  <td className="p-3">patients, appointments, consultations, medical_records, prescriptions, lab_orders</td>
                  <td className="p-3 font-mono">EXECUTE fn_check_doctor_availability</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-primary">hms_receptionist</td>
                  <td className="p-3"><span className="badge badge-warning">SELECT, INSERT, UPDATE</span></td>
                  <td className="p-3">patients, appointments, wards, beds, admissions</td>
                  <td className="p-3 font-mono">EXECUTE sp_admit_patient, fn_get_available_beds</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-primary">hms_accountant</td>
                  <td className="p-3"><span className="badge badge-warning">SELECT, INSERT, UPDATE</span></td>
                  <td className="p-3">invoices, invoice_items, payments, services</td>
                  <td className="p-3 font-mono">EXECUTE sp_process_payment, fn_calculate_patient_balance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
