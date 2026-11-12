// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Stakeholder Authentication Gateway
// Real-time PostgreSQL Authentication with Quick-Switch Evaluator Profiles
// ============================================================================

import React, { useState } from 'react';
import { Hospital, ShieldCheck, Lock, User, AlertCircle, ArrowRight, Stethoscope, Calendar, Receipt, Sparkles } from 'lucide-react';
import { api, setAuthToken, setStoredUser } from '../services/api';

const QUICK_STAKEHOLDERS = [
  {
    role: 'Administrator',
    roleTag: 'ADMIN',
    username: 'admin',
    name: 'Saif Al Saad',
    designation: 'Hospital Superintendent / Administrator',
    workspace: 'Full System Control & Audit Logs',
    accentColor: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.10)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    icon: ShieldCheck,
  },
  {
    role: 'Doctor',
    roleTag: 'DOCTOR',
    username: 'doctor1',
    name: 'Dr. Tanvir Ahmed',
    designation: 'Cardiology Consultant (BMDC-A-48291)',
    workspace: 'Outpatient Encounters & E-Prescribing',
    accentColor: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.10)',
    borderColor: 'rgba(2, 132, 199, 0.35)',
    icon: Stethoscope,
  },
  {
    role: 'Receptionist',
    roleTag: 'RECEPTION',
    username: 'receptionist1',
    name: 'Nusrat Jahan',
    designation: 'Patient Registrar & Front Desk',
    workspace: 'OPD Appointments & Bed Admissions',
    accentColor: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: Calendar,
  },
  {
    role: 'Accountant',
    roleTag: 'FINANCE',
    username: 'accountant1',
    name: 'Kamrul Hasan',
    designation: 'Hospital Financial Controller',
    workspace: 'Invoicing, MFS Payments & Debt Aging',
    accentColor: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    icon: Receipt,
  },
];

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.login({ usernameOrEmail: username, password });
      setAuthToken(response.token);
      setStoredUser(response.user);
      onLoginSuccess(response.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStakeholder = (stakeholder) => {
    setUsername(stakeholder.username);
    setPassword('password123');
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#070d18',
      background: 'radial-gradient(circle at 50% 15%, #0f1d38 0%, #070d18 100%)',
      padding: '2rem 1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#111b2f',
        borderRadius: '20px',
        border: '1px solid #25334d',
        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.75)',
        overflow: 'hidden',
      }}>
        {/* Header Branding */}
        <div style={{
          padding: '2.25rem 2rem 1.5rem',
          textAlign: 'center',
          borderBottom: '1px solid #1e2c45',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '0.85rem',
            boxShadow: '0 0 25px rgba(2, 132, 199, 0.45)',
          }}>
            <Hospital size={30} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Apex Hospital Management System
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            PostgreSQL 18 RBAC Architecture • Enterprise Multi-Stakeholder Security
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              color: '#fb7185',
              fontSize: '0.84rem',
              marginBottom: '1.5rem',
            }}>
              <AlertCircle size={18} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} /> Username or Email
              </label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin, doctor1, receptionist1, accountant1"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} /> Password
              </label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
              disabled={loading}
            >
              <span>{loading ? 'Verifying Identity in PostgreSQL...' : 'Sign In to Hospital Portal'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Stakeholder Selector for Viva Evaluators */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #1e2c45' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700, marginBottom: '0.85rem' }}>
              <Sparkles size={13} color="#0ea5e9" />
              <span>Viva Demonstration Stakeholders (One-Click Select):</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
              {QUICK_STAKEHOLDERS.map((s, idx) => {
                const Icon = s.icon;
                const isSelected = username === s.username;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectStakeholder(s)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.7rem 0.8rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? s.bgColor : '#131e34',
                      border: `1px solid ${isSelected ? s.accentColor : s.borderColor}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 0 15px ${s.bgColor}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        color: s.accentColor,
                        letterSpacing: '0.05em',
                      }}>
                        {s.roleTag}
                      </span>
                      <Icon size={14} style={{ color: s.accentColor }} />
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                      {s.name}
                    </div>

                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                      {s.workspace}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
