// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Stakeholder Authentication Gateway (Compact & Clean Edition)
// Real-time PostgreSQL Authentication with Quick-Switch Evaluator Profiles
// ============================================================================

import React, { useState } from 'react';
import {
  Hospital,
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Stethoscope,
  Calendar,
  Receipt,
  Sparkles,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { api, setAuthToken, setStoredUser } from '../services/api';

const QUICK_STAKEHOLDERS = [
  {
    role: 'Administrator',
    roleTag: 'ADMIN',
    username: 'admin',
    name: 'Saif Al Saad',
    workspace: 'Full Control & Audits',
    accentColor: '#f43f5e',
    accentGlow: 'rgba(244, 63, 94, 0.2)',
    bgActive: 'rgba(244, 63, 94, 0.1)',
    borderActive: '#f43f5e',
    icon: ShieldCheck,
  },
  {
    role: 'Doctor',
    roleTag: 'DOCTOR',
    username: 'doctor1',
    name: 'Dr. Tanvir Ahmed',
    workspace: 'OPD Queue & Rx',
    accentColor: '#0ea5e9',
    accentGlow: 'rgba(14, 165, 233, 0.2)',
    bgActive: 'rgba(14, 165, 233, 0.1)',
    borderActive: '#0ea5e9',
    icon: Stethoscope,
  },
  {
    role: 'Receptionist',
    roleTag: 'RECEPTION',
    username: 'receptionist1',
    name: 'Nusrat Jahan',
    workspace: 'Appointments & Beds',
    accentColor: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.2)',
    bgActive: 'rgba(16, 185, 129, 0.1)',
    borderActive: '#10b981',
    icon: Calendar,
  },
  {
    role: 'Accountant',
    roleTag: 'FINANCE',
    username: 'accountant1',
    name: 'Kamrul Hasan',
    workspace: 'Invoicing & MFS',
    accentColor: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.2)',
    bgActive: 'rgba(245, 158, 11, 0.1)',
    borderActive: '#f59e0b',
    icon: Receipt,
  },
];

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Identify currently selected stakeholder preset
  const selectedStakeholder = QUICK_STAKEHOLDERS.find((s) => s.username === username);

  const handleLogin = async (e, customUsername = null) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const targetUsername = customUsername || username;

    try {
      const response = await api.login({
        usernameOrEmail: targetUsername,
        password: password || 'password123',
      });
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
      backgroundColor: '#070b14',
      backgroundImage: `
        radial-gradient(ellipse at 50% 0%, rgba(14, 165, 233, 0.12) 0%, transparent 60%),
        radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),
        radial-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 24px 24px',
      padding: '1.5rem 1rem',
      overflowX: 'hidden',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '18px',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(14, 165, 233, 0.06)',
        overflow: 'hidden',
      }}>
        {/* Compact Clean Header */}
        <div style={{
          padding: '1.75rem 1.75rem 0.75rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '0.75rem',
            boxShadow: '0 8px 20px -3px rgba(2, 132, 199, 0.45)',
          }}>
            <Hospital size={24} strokeWidth={2.2} />
          </div>

          <h1 style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            Apex Hospital Management
          </h1>
        </div>

        {/* Compact Form Body */}
        <div style={{ padding: '0.75rem 1.75rem 1.75rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              color: '#fb7185',
              fontSize: '0.8rem',
              marginBottom: '1rem',
            }}>
              <AlertCircle size={15} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Username / Email */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '0.35rem',
              }}>
                Username or Email
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  left: '0.85rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}>
                  <User size={15} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                    backgroundColor: '#0a101d',
                    border: '1px solid #1e2c45',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0284c7';
                    e.target.style.boxShadow = '0 0 0 2px rgba(2, 132, 199, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#1e2c45';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '0.35rem',
              }}>
                Password
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  left: '0.85rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}>
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.4rem 0.6rem 2.4rem',
                    backgroundColor: '#0a101d',
                    border: '1px solid #1e2c45',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    outline: 'none',
                    letterSpacing: showPassword ? 'normal' : '0.1em',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0284c7';
                    e.target.style.boxShadow = '0 0 0 2px rgba(2, 132, 199, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#1e2c45';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem',
                  }}
                  title={showPassword ? 'Hide' : 'Show'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                borderRadius: '8px',
                background: selectedStakeholder
                  ? `linear-gradient(135deg, ${selectedStakeholder.accentColor}, #0284c7)`
                  : 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: selectedStakeholder
                  ? `0 4px 15px ${selectedStakeholder.accentGlow}`
                  : '0 4px 15px rgba(2, 132, 199, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '15px',
                    height: '15px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedStakeholder
                      ? `Sign In as ${selectedStakeholder.role}`
                      : 'Sign In to Portal'}
                  </span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Compact Quick Stakeholder Switcher */}
          <div style={{
            marginTop: '1.35rem',
            paddingTop: '1.1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#94a3b8',
                fontWeight: 700,
              }}>
                <Sparkles size={11} color="#38bdf8" />
                <span>Demo Stakeholders (1-Click)</span>
              </div>
            </div>

            {/* 2x2 Grid of Compact Role Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem',
            }}>
              {QUICK_STAKEHOLDERS.map((s) => {
                const Icon = s.icon;
                const isSelected = username === s.username;

                return (
                  <button
                    key={s.username}
                    type="button"
                    onClick={() => handleSelectStakeholder(s)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? s.bgActive : 'rgba(16, 25, 45, 0.55)',
                      border: `1.5px solid ${isSelected ? s.borderActive : 'rgba(255, 255, 255, 0.07)'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 0 12px ${s.accentGlow}` : 'none',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      marginBottom: '0.2rem',
                    }}>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: s.accentColor,
                        letterSpacing: '0.05em',
                      }}>
                        {s.roleTag}
                      </span>
                      {isSelected ? (
                        <Check size={11} color={s.accentColor} strokeWidth={3} />
                      ) : (
                        <Icon size={11} color={s.accentColor} />
                      )}
                    </div>

                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: isSelected ? '#ffffff' : '#e2e8f0',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {s.name}
                    </div>

                    <div style={{
                      fontSize: '0.65rem',
                      color: isSelected ? '#cbd5e1' : '#64748b',
                      marginTop: '0.1rem',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
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
