// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Login Page with Quick-Role Switches for Viva Demonstration
// ============================================================================

import React, { useState } from 'react';
import { Hospital, ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { api, setAuthToken, setStoredUser } from '../services/api';

const QUICK_ROLES = [
  { role: 'Admin', user: 'admin', desc: 'Full System Control' },
  { role: 'Doctor', user: 'doctor1', desc: 'Clinical & Encounters' },
  { role: 'Nurse', user: 'nurse1', desc: 'Inpatient & Wards' },
  { role: 'Receptionist', user: 'receptionist1', desc: 'Scheduling & Patients' },
  { role: 'Accountant', user: 'accountant1', desc: 'Billing & Payments' },
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

  const handleQuickLogin = (uname) => {
    setUsername(uname);
    setPassword('password123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#070d18',
      background: 'radial-gradient(circle at 50% 20%, #0f1d38 0%, #070d18 100%)',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#111b2f',
        borderRadius: '16px',
        border: '1px solid #25334d',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '2.5rem 2rem 1.75rem',
          textAlign: 'center',
          borderBottom: '1px solid #1e2c45',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '1rem',
            boxShadow: '0 0 25px rgba(2, 132, 199, 0.5)',
          }}>
            <Hospital size={30} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Apex Hospital Management System
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            University DBMS Term Project • PostgreSQL 18 Architecture
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
                placeholder="e.g. admin or dr.edward"
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
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
              disabled={loading}
            >
              <span>{loading ? 'Authenticating with PostgreSQL...' : 'Sign In to Hospital Portal'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Login Role Selector for Evaluator */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #1e2c45' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem' }}>
              Viva Role Demonstration (Quick-Select):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {QUICK_ROLES.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickLogin(r.user)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    backgroundColor: username === r.user ? '#0284c7' : '#17233d',
                    color: username === r.user ? '#fff' : '#94a3b8',
                    border: '1px solid #2b3b5c',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title={r.desc}
                >
                  {r.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
