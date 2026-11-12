// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Enterprise Navigation Sidebar with Role-Based Workspace Filtering
// Automatically scopes navigation items to the authenticated stakeholder
// ============================================================================

import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Calendar,
  Stethoscope,
  BedDouble,
  Hotel,
  FlaskConical,
  Pill,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  Hospital,
  ShieldAlert,
  Award
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Core Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'consultations', label: 'Consultations', icon: Stethoscope },
    ],
  },
  {
    title: 'Clinical & Inpatient',
    items: [
      { id: 'admissions', label: 'Inpatient Admissions', icon: BedDouble },
      { id: 'wards', label: 'Wards & Beds', icon: Hotel },
      { id: 'laboratory', label: 'Laboratory', icon: FlaskConical },
      { id: 'pharmacy', label: 'Pharmacy & Stock', icon: Pill },
      { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
    ],
  },
  {
    title: 'Finance & Administration',
    items: [
      { id: 'billing', label: 'Billing & Invoices', icon: Receipt },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'reports', label: 'Analytics & Viva', icon: BarChart3 },
      { id: 'doctors', label: 'Doctors', icon: UserCheck },
      { id: 'departments', label: 'Departments', icon: Building2 },
      { id: 'staff', label: 'Staff Management', icon: ShieldCheck },
      { id: 'audit-logs', label: 'Audit Logs', icon: History },
      { id: 'settings', label: 'System Settings', icon: Settings },
    ],
  },
];

const STAKEHOLDER_THEMES = {
  Admin: {
    title: 'Hospital Administrator',
    badge: 'ADMIN',
    accentColor: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    workspaceLabel: 'System Administration',
  },
  Doctor: {
    title: 'Consultant Physician',
    badge: 'DOCTOR',
    accentColor: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.12)',
    borderColor: 'rgba(2, 132, 199, 0.35)',
    workspaceLabel: 'Clinical & OPD Queue',
  },
  Receptionist: {
    title: 'Front Desk Registrar',
    badge: 'RECEPTION',
    accentColor: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    workspaceLabel: 'Front Desk & Admissions',
  },
  Accountant: {
    title: 'Financial Controller',
    badge: 'FINANCE',
    accentColor: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    workspaceLabel: 'Billing & Cash Counter',
  },
};

export default function Sidebar({ activeTab, onSelectTab, onLogout, user }) {
  const roleKey = user?.role || (user?.roles && user?.roles[0]) || 'Admin';
  const theme = STAKEHOLDER_THEMES[roleKey] || STAKEHOLDER_THEMES.Admin;

  const accessibleModules = user?.accessibleModules || [];
  const isAdmin = roleKey === 'Admin' || (user?.roles && user?.roles.includes('Admin'));

  // Dynamically filter sections and navigation items by stakeholder role
  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isAdmin || accessibleModules.includes(item.id)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Hospital size={22} />
        </div>
        <div>
          <div className="sidebar-title">Apex HMS</div>
          <div className="sidebar-subtitle">Hospital System</div>
        </div>
      </div>

      {/* Stakeholder Identity Profile Card */}
      <div style={{
        padding: '0.85rem 1rem',
        margin: '0.5rem 0.75rem 0.75rem',
        backgroundColor: theme.bgColor,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: theme.accentColor,
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            border: `1px solid ${theme.borderColor}`,
          }}>
            {theme.badge}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {theme.workspaceLabel}
          </span>
        </div>

        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user?.fullName || user?.username || 'Staff User'}
        </div>

        <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
          {theme.title}
        </div>

        {/* Doctor Clinical Credentials Pill */}
        {roleKey === 'Doctor' && user?.doctorProfile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.70rem',
            color: '#38bdf8',
            marginTop: '0.35rem',
            paddingTop: '0.35rem',
            borderTop: '1px solid rgba(2, 132, 199, 0.2)',
          }}>
            <Award size={12} flexShrink={0} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.doctorProfile.licenseNumber || 'BMDC Registered'} • {user.doctorProfile.specialization}
            </span>
          </div>
        )}
      </div>

      {/* Role-Filtered Navigation Tree */}
      <nav className="sidebar-nav">
        {filteredSections.map((section, sIdx) => (
          <div key={sIdx} style={{ marginBottom: '0.5rem' }}>
            <div className="nav-section-label">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTab(item.id)}
                  style={isActive ? { borderLeft: `3px solid ${theme.accentColor}` } : {}}
                >
                  <Icon size={18} style={isActive ? { color: theme.accentColor } : {}} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Sign Out */}
      <div className="sidebar-footer">
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start' }}
          onClick={onLogout}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
