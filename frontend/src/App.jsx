// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Main Application Root Component
// Dynamic Tab Router, Authentication Context & Layout Wrapper
// Strict Role-Based View Guarding & Dynamic Workspace Redirection
// ============================================================================

import React, { useState, useEffect } from 'react';
import { getCurrentUser, getAuthToken, logout } from './services/api';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { ShieldAlert, ArrowRight, LayoutDashboard } from 'lucide-react';

// Page Components
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ConsultationsPage from './pages/ConsultationsPage';
import AdmissionsPage from './pages/AdmissionsPage';
import WardsPage from './pages/WardsPage';
import LaboratoryPage from './pages/LaboratoryPage';
import PharmacyPage from './pages/PharmacyPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import BillingPage from './pages/BillingPage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import DoctorsPage from './pages/DoctorsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import StaffPage from './pages/StaffPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';

// Access Denied Fallback Guard Component
function AccessDeniedView({ activeTab, user, onNavigate }) {
  const defaultTab = user?.defaultRoute || 'dashboard';
  const roleName = user?.role || 'User';
  const accessible = user?.accessibleModules || ['dashboard'];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid rgba(244, 63, 94, 0.4)',
        borderRadius: '16px',
        padding: '2.5rem',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fb7185',
          marginBottom: '1.25rem',
        }}>
          <ShieldAlert size={36} />
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
          403 - Module Access Restricted
        </h2>

        <p style={{ fontSize: '0.90rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Your current stakeholder account (<strong style={{ color: '#fff' }}>{user?.fullName || user?.username}</strong>, role:{' '}
          <span style={{ color: '#fb7185', fontWeight: 700 }}>{roleName}</span>) does not possess authorization to access the{' '}
          <strong style={{ color: '#00A896' }}>{activeTab}</strong> module in this hospital system.
        </p>

        <div style={{
          backgroundColor: 'var(--bg-main)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.75rem',
          border: '1px solid var(--border-card)',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700, marginBottom: '0.6rem' }}>
            Authorized Modules for {roleName}:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {accessible.map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => onNavigate(mod)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(2, 128, 144, 0.15)',
                  color: '#e2e8f0',
                  border: '1px solid var(--border-card)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => onNavigate(defaultTab)}
          style={{ width: '100%', padding: '0.75rem', fontSize: '0.92rem' }}
        >
          <span>Return to Default Workspace ({defaultTab})</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const savedUser = getCurrentUser();
    const token = getAuthToken();
    if (savedUser && token) {
      setUser(savedUser);
      // Ensure landing on permitted tab
      const isAllowed = savedUser.role === 'Admin' ||
        (Array.isArray(savedUser.accessibleModules) && savedUser.accessibleModules.includes(activeTab));
      if (!isAllowed) {
        setActiveTab(savedUser.defaultRoute || 'dashboard');
      }
    } else {
      logout();
      setUser(null);
    }
    setInitializing(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Land user directly on their tailored stakeholder workspace
    setActiveTab(userData.defaultRoute || 'dashboard');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #00A896',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}></div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            Initializing PostgreSQL Hospital System...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Check if current tab is authorized for this stakeholder
  const isTabAllowed = (tab) => {
    if (!user) return false;
    if (user.role === 'Admin' || (user.roles && user.roles.includes('Admin'))) return true;
    return Array.isArray(user.accessibleModules) && user.accessibleModules.includes(tab);
  };

  // Render Active Tab Content
  const renderActivePage = () => {
    if (!isTabAllowed(activeTab)) {
      return (
        <AccessDeniedView
          activeTab={activeTab}
          user={user}
          onNavigate={setActiveTab}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage user={user} onNavigate={setActiveTab} />;
      case 'patients':
        return <PatientsPage user={user} onNavigate={setActiveTab} />;
      case 'appointments':
        return <AppointmentsPage user={user} onNavigate={setActiveTab} />;
      case 'consultations':
        return <ConsultationsPage user={user} onNavigate={setActiveTab} />;
      case 'admissions':
        return <AdmissionsPage user={user} onNavigate={setActiveTab} />;
      case 'wards':
        return <WardsPage user={user} onNavigate={setActiveTab} />;
      case 'laboratory':
        return <LaboratoryPage user={user} onNavigate={setActiveTab} />;
      case 'pharmacy':
        return <PharmacyPage user={user} onNavigate={setActiveTab} />;
      case 'prescriptions':
        return <PrescriptionsPage user={user} onNavigate={setActiveTab} />;
      case 'billing':
        return <BillingPage user={user} onNavigate={setActiveTab} />;
      case 'payments':
        return <PaymentsPage user={user} />;
      case 'reports':
        return <ReportsPage user={user} />;
      case 'doctors':
        return <DoctorsPage user={user} />;
      case 'departments':
        return <DepartmentsPage user={user} />;
      case 'staff':
        return <StaffPage user={user} />;
      case 'audit-logs':
        return <AuditLogsPage user={user} />;
      case 'settings':
        return <SettingsPage user={user} />;
      default:
        return <DashboardPage user={user} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onSelectTab={setActiveTab} 
        onLogout={handleLogout} 
        user={user} 
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar 
          activeTab={activeTab} 
          user={user} 
          onLogout={handleLogout} 
        />
        <main className="page-body">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
