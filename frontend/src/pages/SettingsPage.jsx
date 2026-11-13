// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Database Engine Configuration & System Settings Console
// Turquoise Harmony Theme: Baltic Blue, Teal, Verdigris, Mint Leaf & Cream
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Settings, Database, ShieldCheck, Server, 
  CheckCircle2, AlertCircle, Info, RefreshCw, Key,
  Shield, Cpu, Lock, FileCode2, Layers, Check, Terminal
} from 'lucide-react';
import { checkHealth } from '../services/api';

export default function SettingsPage({ user, onNavigate }) {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [pingLatency, setPingLatency] = useState(null);

  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setChecking(true);
    const start = performance.now();
    try {
      const res = await checkHealth();
      const end = performance.now();
      setHealth(res);
      setPingLatency((end - start).toFixed(1));
    } catch (err) {
      console.error('Database connection test failed:', err);
      setHealth({ status: 'DOWN', error: err.message });
      setPingLatency(null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      {/* Executive Header Banner */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: 'rgba(5, 102, 141, 0.22)',
            border: '1px solid rgba(0, 168, 150, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00A896',
          }}>
            <Settings size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                System Settings & Database Architecture
              </h2>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: health?.status === 'UP' ? 'rgba(2, 195, 154, 0.16)' : 'rgba(244, 63, 94, 0.15)',
                color: health?.status === 'UP' ? '#02C39A' : '#fb7185',
                border: `1px solid ${health?.status === 'UP' ? 'rgba(2, 195, 154, 0.4)' : 'rgba(244, 63, 94, 0.35)'}`,
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <CheckCircle2 size={12} />
                {health?.status === 'UP' ? `PostgreSQL 18 (${pingLatency ? `${pingLatency}ms` : 'Connected'})` : 'DBMS Disconnected'}
              </span>
            </div>
            <p style={{ color: '#8aaabb', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Relational engine specifications, connection pooling, trigger audit telemetry, and PostgreSQL RBAC permissions matrix.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={runHealthCheck}
            disabled={checking}
          >
            <RefreshCw size={14} className={checking ? 'spin' : ''} />
            <span>{checking ? 'Pinging PostgreSQL...' : 'Test Database Ping'}</span>
          </button>
        </div>
      </div>

      {/* Database Telemetry KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#05668D' }}>
          <div className="stat-info">
            <h3>Relational DBMS</h3>
            <div className="stat-value" style={{ fontSize: '1.45rem' }}>PostgreSQL 18</div>
            <div className="stat-subtext">64-bit Engine • hospital_db</div>
          </div>
          <div className="stat-icon-wrapper">
            <Database size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#028090' }}>
          <div className="stat-info">
            <h3>Schema Normalization</h3>
            <div className="stat-value">3NF</div>
            <div className="stat-subtext">37 Relational Tables</div>
          </div>
          <div className="stat-icon-wrapper">
            <Layers size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#00A896' }}>
          <div className="stat-info">
            <h3>Connection Pool</h3>
            <div className="stat-value">20 Clients</div>
            <div className="stat-subtext">Plain node-postgres driver</div>
          </div>
          <div className="stat-icon-wrapper">
            <Server size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#02C39A' }}>
          <div className="stat-info">
            <h3>ORM / Middleware</h3>
            <div className="stat-value">Zero ORMs</div>
            <div className="stat-subtext">100% Parameterized SQL</div>
          </div>
          <div className="stat-icon-wrapper">
            <Cpu size={22} />
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Database Connectivity Parameters Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-card)' }}>
            <Database size={18} color="#00A896" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Relational Database Engine Parameters
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-card)' }}>
              <span style={{ color: '#8aaabb' }}>DBMS Version:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#02C39A' }}>PostgreSQL 18.6 (64-bit)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-card)' }}>
              <span style={{ color: '#8aaabb' }}>Target Database:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff' }}>hospital_db</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-card)' }}>
              <span style={{ color: '#8aaabb' }}>Database Port:</span>
              <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>5432 (Localhost)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-card)' }}>
              <span style={{ color: '#8aaabb' }}>Connection Driver:</span>
              <span style={{ fontFamily: 'monospace', color: '#00A896', fontWeight: 600 }}>pg (node-postgres)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-card)' }}>
              <span style={{ color: '#8aaabb' }}>Query Execution Style:</span>
              <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Raw Parameterized SQL ($1, $2)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-card)' }}>
              <span style={{ color: '#8aaabb' }}>Max Pool Connections:</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>20 Active Connections</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8aaabb' }}>Health Status:</span>
              {health?.status === 'UP' ? (
                <span className="badge badge-green" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={11} /> HEALTHY (hospital_db)
                </span>
              ) : (
                <span className="badge badge-rose" style={{ fontSize: '0.72rem' }}>
                  {health?.status || 'CHECKING'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Autonomous Triggers & Stored Procedures Console */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-card)' }}>
            <Cpu size={18} color="#02C39A" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Active PostgreSQL Database Triggers & Routines
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00A896' }}>trg_audit_patients</span>
                <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#8aaabb', marginTop: '0.2rem' }}>
                Autonomous Change Data Capture (CDC) logging row-level JSONB diffs into audit_logs.
              </div>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00A896' }}>trg_check_appointment_conflict</span>
                <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#8aaabb', marginTop: '0.2rem' }}>
                Intercepts overlapping appointment bookings per doctor using fn_check_doctor_availability.
              </div>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00A896' }}>trg_recalculate_invoice_balance</span>
                <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#8aaabb', marginTop: '0.2rem' }}>
                Automatically recalibrates invoice balances and flips status to Paid / Partially Paid.
              </div>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00A896' }}>trg_enforce_ward_bed_capacity</span>
                <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#8aaabb', marginTop: '0.2rem' }}>
                Guards physical bed limits per ward to prevent over-allocation during patient admissions.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PostgreSQL RBAC Roles & Privileges Matrix */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Key size={18} color="#F0F3BD" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              PostgreSQL Stakeholder Roles & Granted SQL Privileges Matrix
            </h3>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#8aaabb' }}>
            Strict RBAC Security Specification
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>PostgreSQL Role</th>
                <th>Granted Privileges</th>
                <th>Accessible Relations Scope</th>
                <th>Authorized Stored Procedures & Functions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00A896' }}>hms_admin</td>
                <td><span className="badge badge-blue">ALL PRIVILEGES</span></td>
                <td style={{ color: '#fff' }}>All 37 Tables + Database Sequences</td>
                <td style={{ fontFamily: 'monospace', color: '#02C39A' }}>ALL FUNCTIONS &amp; PROCEDURES</td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#028090' }}>hms_doctor</td>
                <td><span className="badge badge-blue">SELECT, INSERT, UPDATE</span></td>
                <td style={{ color: '#cbd5e1' }}>patients, appointments, consultations, prescriptions, lab_orders, admissions</td>
                <td style={{ fontFamily: 'monospace', color: '#00A896' }}>fn_check_doctor_availability</td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#02C39A' }}>hms_receptionist</td>
                <td><span className="badge badge-green">SELECT, INSERT, UPDATE</span></td>
                <td style={{ color: '#cbd5e1' }}>patients, appointments, wards, beds, admissions</td>
                <td style={{ fontFamily: 'monospace', color: '#02C39A' }}>sp_admit_patient, fn_get_available_beds</td>
              </tr>
              <tr>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F0F3BD' }}>hms_accountant</td>
                <td><span className="badge badge-amber">SELECT, INSERT, UPDATE</span></td>
                <td style={{ color: '#cbd5e1' }}>invoices, invoice_items, payments, services, pharmacy</td>
                <td style={{ fontFamily: 'monospace', color: '#F0F3BD' }}>sp_process_payment, fn_calculate_patient_balance</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Academic Project Metadata Card */}
      <div className="card" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Info size={18} color="#00A896" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Academic Engineering & Relational 3NF Verification
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#8aaabb', lineHeight: 1.6, margin: 0 }}>
          This Hospital Management System was constructed to demonstrate full Third Normal Form (3NF) relational compliance, strict ACID transaction boundaries, parameterized SQL injection immunity, autonomous AFTER triggers, and fine-grained Role-Based Access Control (RBAC) in PostgreSQL 18.
        </p>
      </div>
    </div>
  );
}
