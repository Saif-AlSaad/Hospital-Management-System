// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Top Navigation Header Component
// ============================================================================

import React from 'react';
import { Database, LogOut } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Hospital Administration Dashboard',
  patients: 'Patient Directory & Medical History',
  appointments: 'Outpatient Appointments & Scheduling',
  consultations: 'Doctor Consultations & Clinical Encounters',
  admissions: 'Inpatient Admissions & Discharges',
  wards: 'Wards, Rooms & Bed Occupancy Grid',
  laboratory: 'Laboratory Diagnostics & Requisitions',
  pharmacy: 'Pharmacy Formulary & Inventory Batches',
  prescriptions: 'Clinical Prescriptions & Dispensing',
  billing: 'Hospital Invoicing & Charge Catalog',
  payments: 'Payment Receipts & Transactions',
  reports: 'Analytical Reports & EXPLAIN ANALYZE Benchmarking',
  doctors: 'Physician Directory & Schedules',
  departments: 'Hospital Departments & Specialties',
  staff: 'Staff Personnel & Access Roles',
  'audit-logs': 'Database Trigger Audit Logs (JSONB Diff)',
  settings: 'System Configuration & Academic Viva Guide',
};

export default function Navbar({ activeTab, user, onLogout }) {
  const pageTitle = PAGE_TITLES[activeTab] || 'Hospital Management System';
  const roleName = user?.roles?.[0] || 'Staff';

  return (
    <header className="top-navbar">
      <div className="navbar-page-info">
        <h1 className="navbar-page-title">{pageTitle}</h1>
      </div>

      <div className="navbar-right">
        {/* Live Database Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
          <Database size={15} />
          <span>PostgreSQL 18 Connected</span>
        </div>

        {/* User Chip */}
        <div className="user-badge">
          <div className="user-avatar">
            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.fullName || user?.username}</span>
            <span className="user-role-tag">{roleName}</span>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          title="Sign Out"
          onClick={onLogout}
          style={{ padding: '0.45rem' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
