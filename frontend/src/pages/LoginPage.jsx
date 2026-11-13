// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Stakeholder Authentication Gateway - Turquoise Harmony Edition
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
    workspace: 'Full Control & Audits',
    accentColor: '#05668D',
    accentGlow: 'rgba(5, 102, 141, 0.25)',
    bgActive: '#e6f3f8',
    borderActive: '#05668D',
    icon: ShieldCheck,
  },
  {
    role: 'Doctor',
    roleTag: 'DOCTOR',
    username: 'doctor1',
    workspace: 'OPD Queue & Rx',
    accentColor: '#028090',
    accentGlow: 'rgba(2, 128, 144, 0.25)',
    bgActive: '#e5f6f8',
    borderActive: '#028090',
    icon: Stethoscope,
  },
  {
    role: 'Receptionist',
    roleTag: 'RECEPTION',
    username: 'receptionist1',
    workspace: 'Appointments & Beds',
    accentColor: '#008767',
    accentGlow: 'rgba(2, 195, 154, 0.25)',
    bgActive: '#e5f8f3',
    borderActive: '#02C39A',
    icon: Calendar,
  },
  {
    role: 'Accountant',
    roleTag: 'FINANCE',
    username: 'accountant1',
    workspace: 'Invoicing & MFS',
    accentColor: '#8a791a',
    accentGlow: 'rgba(240, 243, 189, 0.4)',
    bgActive: '#fcfdeb',
    borderActive: '#c8b74b',
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
      background: 'linear-gradient(135deg, #eaf5f4 0%, #d8ece7 50%, #cde5df 100%)',
      padding: '1.5rem 1rem',
      overflowX: 'hidden',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '430px',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #cce5e0',
        boxShadow: '0 20px 45px -10px rgba(5, 102, 141, 0.18), 0 0 20px rgba(0, 168, 150, 0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Signature 5-Band Turquoise Harmony Color Strip */}
        <div style={{
          height: '6px',
          width: '100%',
          background: 'linear-gradient(90deg, #05668D 0%, #028090 25%, #00A896 50%, #02C39A 75%, #F0F3BD 100%)',
        }} />

        {/* Compact Clean Header */}
        <div style={{
          padding: '1.75rem 1.75rem 0.5rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #05668D 0%, #00A896 50%, #02C39A 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '0.65rem',
            boxShadow: '0 8px 18px -3px rgba(0, 168, 150, 0.4)',
          }}>
            <Hospital size={26} strokeWidth={2.2} />
          </div>

          <h1 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#072a38',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            Apex Hospital Management
          </h1>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            color: '#028090',
            fontWeight: 700,
            backgroundColor: '#e6f5f4',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            marginTop: '0.4rem',
          }}>
            <span>Turquoise Harmony • Multi-Stakeholder RBAC</span>
          </div>
        </div>

        {/* Compact Form Body */}
        <div style={{ padding: '0.75rem 1.75rem 1.75rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
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
                fontWeight: 700,
                color: '#4a7282',
                marginBottom: '0.35rem',
              }}>
                Username or Email
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  left: '0.85rem',
                  color: '#7093a2',
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
                    padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                    backgroundColor: '#f8fcfb',
                    border: '1px solid #cbe4e0',
                    borderRadius: '8px',
                    color: '#072a38',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#00A896';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 150, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbe4e0';
                    e.target.style.backgroundColor = '#f8fcfb';
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
                fontWeight: 700,
                color: '#4a7282',
                marginBottom: '0.35rem',
              }}>
                Password
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  left: '0.85rem',
                  color: '#7093a2',
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
                    padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                    backgroundColor: '#f8fcfb',
                    border: '1px solid #cbe4e0',
                    borderRadius: '8px',
                    color: '#072a38',
                    fontSize: '0.88rem',
                    outline: 'none',
                    letterSpacing: showPassword ? 'normal' : '0.1em',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#00A896';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 168, 150, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbe4e0';
                    e.target.style.backgroundColor = '#f8fcfb';
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
                    color: '#7093a2',
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
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: selectedStakeholder
                  ? `linear-gradient(135deg, ${selectedStakeholder.accentColor}, #028090)`
                  : 'linear-gradient(135deg, #028090, #05668D)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.90rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(2, 128, 144, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span>Verifying in PostgreSQL...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedStakeholder
                      ? `Sign In as ${selectedStakeholder.role}`
                      : 'Sign In to Portal'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Compact Quick Stakeholder Switcher */}
          <div style={{
            marginTop: '1.25rem',
            paddingTop: '1.1rem',
            borderTop: '1px solid #e2f0ee',
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
                fontSize: '0.70rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#4a7282',
                fontWeight: 800,
              }}>
                <Sparkles size={12} color="#008767" />
                <span>Viva Evaluator One-Click Profiles:</span>
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
                    title={s.workspace}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? s.bgActive : '#fbfdfd',
                      border: `1.5px solid ${isSelected ? s.borderActive : '#d9ede9'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 2px 10px ${s.accentGlow}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <Icon size={16} color={s.accentColor} />
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: isSelected ? s.accentColor : '#072a38',
                        letterSpacing: '0.04em',
                      }}>
                        {s.roleTag}
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={14} color={s.accentColor} strokeWidth={3} />
                    )}
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
