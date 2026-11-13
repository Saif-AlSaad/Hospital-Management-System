// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Top Navigation Header Component - Turquoise Harmony Edition
// Stakeholder Status, Live DB Indicators, Theme Mode Switcher & Context Breadcrumbs
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Database, LogOut, Award, Sun, Moon, Palette } from 'lucide-react';

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
  Admin: { text: '#05668D', bg: 'rgba(5, 102, 141, 0.12)', border: '#00A896' },
  Doctor: { text: '#028090', bg: 'rgba(2, 128, 144, 0.12)', border: '#028090' },
  Receptionist: { text: '#008767', bg: 'rgba(2, 195, 154, 0.14)', border: '#02C39A' },
  Accountant: { text: '#bfa829', bg: 'rgba(240, 243, 189, 0.65)', border: '#c8b74b' },
};

export default function Navbar({ activeTab, user, onLogout }) {
  const [themeMode, setThemeMode] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('hms-theme') || 'light';
    setThemeMode(saved);
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    localStorage.setItem('hms-theme', next);
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const pageTitle = PAGE_TITLES[activeTab] || 'Hospital Management System';
  const roleName = user?.role || (user?.roles && user?.roles[0]) || 'Staff';
  const colors = ROLE_COLORS[roleName] || ROLE_COLORS.Admin;

  return (
    <header className="top-navbar">
      <div className="navbar-page-info">
        <h1 className="navbar-page-title">{pageTitle}</h1>
      </div>

      <div className="navbar-right">
        {/* Turquoise Harmony Palette Tag */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.74rem',
          color: '#05668D',
          fontWeight: 700,
          backgroundColor: '#eaf4f3',
          padding: '0.28rem 0.65rem',
          borderRadius: '20px',
          border: '1px solid #d0e8e5',
        }}>
          <Palette size={13} color="#00A896" />
          <span>Turquoise Harmony</span>
        </div>

        {/* Live Database Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.78rem',
          color: '#008767',
          fontWeight: 700,
          backgroundColor: 'rgba(2, 195, 154, 0.15)',
          padding: '0.35rem 0.65rem',
          borderRadius: '20px',
          border: '1px solid rgba(2, 195, 154, 0.4)',
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
            color: '#028090',
            backgroundColor: 'rgba(2, 128, 144, 0.12)',
            padding: '0.35rem 0.65rem',
            borderRadius: '20px',
            border: '1px solid rgba(2, 128, 144, 0.35)',
            fontWeight: 700,
          }}>
            <Award size={14} />
            <span>{user.doctorProfile.licenseNumber}</span>
          </div>
        )}

        {/* Theme Switcher Toggle (Fresh Light vs Oceanic Night) */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '20px',
            border: '1px solid var(--border-card)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            transition: 'all 0.15s ease',
          }}
          title={themeMode === 'light' ? 'Switch to Oceanic Dark Mode' : 'Switch to Fresh Turquoise Harmony Light Mode'}
        >
          {themeMode === 'light' ? (
            <>
              <Moon size={14} color="#05668D" />
              <span>Oceanic</span>
            </>
          ) : (
            <>
              <Sun size={14} color="#F0F3BD" />
              <span>Fresh</span>
            </>
          )}
        </button>

        {/* Stakeholder Identity Chip */}
        <div className="user-badge" style={{ border: `1.5px solid ${colors.border}` }}>
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
                fontWeight: 800,
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
