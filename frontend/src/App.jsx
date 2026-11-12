// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Main Application Root Component
// Dynamic Tab Router, Authentication Context & Layout Wrapper
// ============================================================================

import React, { useState, useEffect } from 'react';
import { getCurrentUser, getAuthToken, logout } from './services/api';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

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
    } else {
      logout();
      setUser(null);
    }
    setInitializing(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab('dashboard');
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
        backgroundColor: '#0b1120',
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #0284c7',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', fontFamily: 'monospace' }}>
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

  // Render Active Tab Content
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage user={user} onNavigate={setActiveTab} />;
      case 'patients':
        return <PatientsPage user={user} />;
      case 'appointments':
        return <AppointmentsPage user={user} />;
      case 'consultations':
        return <ConsultationsPage user={user} />;
      case 'admissions':
        return <AdmissionsPage user={user} />;
      case 'wards':
        return <WardsPage user={user} />;
      case 'laboratory':
        return <LaboratoryPage user={user} />;
      case 'pharmacy':
        return <PharmacyPage user={user} />;
      case 'prescriptions':
        return <PrescriptionsPage user={user} />;
      case 'billing':
        return <BillingPage user={user} />;
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
