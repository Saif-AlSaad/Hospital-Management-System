// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Navigation Sidebar Component
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
  Hospital
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

export default function Sidebar({ activeTab, onSelectTab, onLogout, user }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Hospital size={22} />
        </div>
        <div>
          <div className="sidebar-title">Apex HMS</div>
          <div className="sidebar-subtitle">Hospital System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx}>
            <div className="nav-section-label">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTab(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

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
