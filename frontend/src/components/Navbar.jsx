// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Top Navigation Header Component
// Stakeholder Status, Live DB Indicators, and Context Breadcrumbs
// ============================================================================

import React from 'react';
import { Database, LogOut, Shield, Award, Stethoscope } from 'lucide-react';

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

const ROLE_COLORS = {
  Admin: { text: '#fb7185', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)' },
  Doctor: { text: '#38bdf8', bg: 'rgba(2, 132, 199, 0.15)', border: 'rgba(2, 132, 199, 0.35)' },
  Receptionist: { text: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' },
  Accountant: { text: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
};

export default function Navbar({ activeTab, user, onLogout }) {
  const pageTitle = PAGE_TITLES[activeTab] || 'Hospital Management System';
  const roleName = user?.role || (user?.roles && user?.roles[0]) || 'Staff';
  const colors = ROLE_COLORS[roleName] || ROLE_COLORS.Admin;

  return (
    <header className="top-navbar">
      <div className="navbar-page-info">
        <h1 className="navbar-page-title">{pageTitle}</h1>
      </div>

      <div className="navbar-right">
        {/* Live Database Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.78rem',
          color: '#10b981',
          fontWeight: 600,
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          padding: '0.35rem 0.65rem',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
        }}>
          <Database size={14} />
          <span>PostgreSQL 18 Connected</span>
        </div>

        {/* Doctor BMDC Credential Tag if Doctor */}
        {roleName === 'Doctor' && user?.doctorProfile?.licenseNumber && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.76rem',
            color: '#38bdf8',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            padding: '0.35rem 0.65rem',
            borderRadius: '20px',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            fontWeight: 600,
          }}>
            <Award size={14} />
            <span>{user.doctorProfile.licenseNumber}</span>
          </div>
        )}

        {/* Stakeholder Identity Chip */}
        <div className="user-badge" style={{ border: `1px solid ${colors.border}` }}>
          <div className="user-avatar" style={{ backgroundColor: colors.bg, color: colors.text }}>
            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.fullName || user?.username}</span>
            <span
              className="user-role-tag"
              style={{
                color: colors.text,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            >
              {roleName}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
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
