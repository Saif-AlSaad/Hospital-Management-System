// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Administrative Executive Governance & Operations Hub
// Real-time SQL Aggregates, Materialized View Refresh, Bed Occupancy & Telemetry
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  BedDouble,
  DollarSign,
  AlertTriangle,
  FlaskConical,
  Activity,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Plus,
  Stethoscope,
  Receipt,
  Award,
  ShieldCheck,
  Database,
  CheckCircle2,
  Lock,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardPage({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [wards, setWards] = useState([]);
  const [monthlyPerf, setMonthlyPerf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingMv, setRefreshingMv] = useState(false);
  const [mvMessage, setMvMessage] = useState(null);
  const [error, setError] = useState(null);

  const roleKey = user?.role || 'Admin';
  const isAdmin = roleKey === 'Admin';
  const isFinanceUser = roleKey === 'Admin' || roleKey === 'Accountant';

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = [
        api.getDashboardStats(),
        api.getWards(),
      ];

      // Only fetch monthly performance if stakeholder has financial/admin reporting permission
      if (isFinanceUser) {
        promises.push(api.getMonthlyPerformance().catch(() => ({ data: [] })));
      }

      const [statsRes, wardsRes, perfRes] = await Promise.all(promises);

      setStats(statsRes.stats);
      setWards(wardsRes.data || []);
      if (perfRes) {
        setMonthlyPerf(perfRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError(err.message || 'Failed to load statistics from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefreshMaterializedView = async () => {
    setRefreshingMv(true);
    setMvMessage(null);
    try {
      const res = await api.refreshMaterializedView();
      setMvMessage(`Materialized View mv_monthly_hospital_performance refreshed concurrently in PostgreSQL!`);
      setTimeout(() => setMvMessage(null), 5000);
      // Reload monthly performance
      const perfRes = await api.getMonthlyPerformance();
      setMonthlyPerf(perfRes.data || []);
    } catch (err) {
      alert('Materialized View Refresh Failed: ' + err.message);
    } finally {
      setRefreshingMv(false);
    }
  };

  const totalBeds = wards.reduce((acc, w) => acc + parseInt(w.total_beds || 0), 0);
  const occupiedBeds = wards.reduce((acc, w) => acc + parseInt(w.occupied_beds || 0), 0);
  const overallOccupancyPct = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

  // Stakeholder tailored greeting and primary action
  const getRoleHeader = () => {
    switch (roleKey) {
      case 'Doctor':
        return {
          title: `Dr. ${user?.fullName || 'Doctor'}'s Clinical Telemetry`,
          subtitle: `Cardiology & Outpatient Care Overview • BMDC: ${user?.doctorProfile?.licenseNumber || 'Verified Physician'}`,
          actionLabel: 'Clinical Queue',
          actionIcon: Stethoscope,
          actionTarget: 'consultations',
        };
      case 'Receptionist':
        return {
          title: 'Front Desk & Patient Registrar Overview',
          subtitle: 'Real-time patient bookings, room occupancies, and physician scheduling availability.',
          actionLabel: 'Front Desk Hub',
          actionIcon: Calendar,
          actionTarget: 'appointments',
        };
      case 'Accountant':
        return {
          title: 'Hospital Financial & Treasury Dashboard',
          subtitle: 'Billing ledgers, cash collection telemetry, MFS receipts, and accounts receivable.',
          actionLabel: 'Billing Counter',
          actionIcon: Receipt,
          actionTarget: 'billing',
        };
      default:
        return {
          title: 'Executive Hospital Governance & Operations Hub',
          subtitle: 'Superuser Telemetry, Database Trigger Audit Trails, Departmental Allocations & Materialized Performance Analytics.',
          actionLabel: 'Staff Management',
          actionIcon: Users,
          actionTarget: 'staff',
        };
    }
  };

  const roleHeader = getRoleHeader();
  const ActionIcon = roleHeader.actionIcon;

  return (
    <div>
      {/* Header Banner */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
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
            backgroundColor: isAdmin ? 'rgba(244, 63, 94, 0.15)' : 'rgba(2, 132, 199, 0.15)',
            border: `1px solid ${isAdmin ? 'rgba(244, 63, 94, 0.35)' : 'rgba(2, 132, 199, 0.35)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isAdmin ? '#fb7185' : '#38bdf8',
          }}>
            {isAdmin ? <ShieldCheck size={28} /> : <Activity size={28} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {roleHeader.title}
              </h2>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: isAdmin ? 'rgba(244, 63, 94, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                color: isAdmin ? '#fb7185' : '#38bdf8',
                border: `1px solid ${isAdmin ? 'rgba(244, 63, 94, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`,
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <Lock size={12} />
                {isAdmin ? 'System Administrator (Root)' : roleKey}
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {roleHeader.subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Stats</span>
          </button>
          {onNavigate && (
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate(roleHeader.actionTarget)}>
              <ActionIcon size={14} />
              <span>{roleHeader.actionLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Alert Toast */}
      {mvMessage && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem',
        }}>
          <CheckCircle2 size={18} />
          <span>{mvMessage}</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#f87171',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>Retry</button>
        </div>
      )}

      {/* Administrator Governance Quick Navigation Bar */}
      {isAdmin && onNavigate && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.5rem',
        }}>
          <button
            onClick={() => onNavigate('audit-logs')}
            className="card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: '1px solid #1e293b',
              backgroundColor: '#0b1120',
              textAlign: 'left',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>Trigger Audit Logs</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Inspect SQL Diffs & Rollbacks</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('staff')}
            className="card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: '1px solid #1e293b',
              backgroundColor: '#0b1120',
              textAlign: 'left',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>Staff & RBAC Accounts</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Manage System Users & Roles</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('wards')}
            className="card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: '1px solid #1e293b',
              backgroundColor: '#0b1120',
              textAlign: 'left',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <BedDouble size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>Wards & Bed Capacity</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Infrastructure Allocations</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: '1px solid #1e293b',
              backgroundColor: '#0b1120',
              textAlign: 'left',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>EXPLAIN Analytics</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Database Query Benchmark</div>
            </div>
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#0284c7' }}>
          <div className="stat-info">
            <h3>Registered Patients</h3>
            <div className="stat-value">{stats?.totalPatients || 0}</div>
            <div className="stat-subtext">Active Medical Records</div>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#0ea5e9' }}>
          <div className="stat-info">
            <h3>Today's Outpatient Queue</h3>
            <div className="stat-value">{stats?.appointmentsToday || 0}</div>
            <div className="stat-subtext">{stats?.appointmentsCompletedToday || 0} completed encounters</div>
          </div>
          <div className="stat-icon-wrapper">
            <Calendar size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#06b6d4' }}>
          <div className="stat-info">
            <h3>Current Inpatients</h3>
            <div className="stat-value">{stats?.currentInpatients || 0}</div>
            <div className="stat-subtext">{stats?.availableBeds || 0} beds available for admission</div>
          </div>
          <div className="stat-icon-wrapper">
            <BedDouble size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-info">
            <h3>Today's Collected Revenue</h3>
            <div className="stat-value">৳{stats?.revenueToday ? stats.revenueToday.toLocaleString() : '0.00'}</div>
            <div className="stat-subtext">Outstanding Debt: ৳{stats?.totalOutstandingDebt ? stats.totalOutstandingDebt.toLocaleString() : '0.00'}</div>
          </div>
          <div className="stat-icon-wrapper">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Middle Grid: Ward Occupancy & Materialized View Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Ward Bed Occupancy Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Ward Bed Utilization</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Overall Facility Occupancy: {overallOccupancyPct}% ({occupiedBeds}/{totalBeds} beds)</p>
            </div>
            {onNavigate && (
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('wards')}>
                <span>View Wards</span>
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {wards.slice(0, 6).map((w) => {
              const occPct = parseFloat(w.occupancy_percentage || 0);
              const barColor = occPct > 80 ? '#f43f5e' : (occPct > 50 ? '#f59e0b' : '#10b981');
              return (
                <div key={w.ward_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{w.ward_name} ({w.ward_type})</span>
                    <span style={{ color: '#94a3b8' }}>{w.occupied_beds} / {w.total_beds} beds ({occPct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, occPct)}%`, height: '100%', backgroundColor: barColor, borderRadius: '4px', transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Card: Materialized View for Finance/Admin OR Clinical/Reception Quick Links */}
        {isFinanceUser ? (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Monthly Performance (Materialized View)</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Fast Aggregation from mv_monthly_hospital_performance</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isAdmin && (
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleRefreshMaterializedView}
                    disabled={refreshingMv}
                    title="Execute REFRESH MATERIALIZED VIEW CONCURRENTLY"
                  >
                    <RefreshCw size={13} className={refreshingMv ? 'spin' : ''} />
                    <span>{refreshingMv ? 'Refreshing...' : 'Refresh MV'}</span>
                  </button>
                )}
                {onNavigate && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reports')}>
                    <span>Analytics</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Appts</th>
                    <th>Admits</th>
                    <th>Invoiced</th>
                    <th>Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPerf.slice(-5).map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#38bdf8' }}>{m.report_month}</td>
                      <td>{m.total_appointments}</td>
                      <td>{m.total_admissions}</td>
                      <td style={{ color: '#f59e0b' }}>৳{parseFloat(m.gross_invoiced || 0).toLocaleString()}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>৳{parseFloat(m.total_collected || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                {roleKey === 'Doctor' ? 'Clinical Workspace Shortcuts' : 'Front Desk Quick Navigation'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Quick access to your authorized hospital workflows</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
              {roleKey === 'Doctor' ? (
                <>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('consultations')}>
                    <Stethoscope size={20} color="#0284c7" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Consultations</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Outpatient Queue & Notes</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('prescriptions')}>
                    <Receipt size={20} color="#06b6d4" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Prescriptions</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Digital Drug Orders</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('admissions')}>
                    <BedDouble size={20} color="#10b981" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Inpatients</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Admitted Patient Care</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('laboratory')}>
                    <FlaskConical size={20} color="#f59e0b" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Laboratory</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Diagnostic Requisitions</span>
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('patients')}>
                    <Users size={20} color="#10b981" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Patient Directory</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Register & Search Patients</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('appointments')}>
                    <Calendar size={20} color="#0284c7" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Appointments</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Schedule OPD Visits</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('admissions')}>
                    <BedDouble size={20} color="#06b6d4" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Bed Admissions</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Allocate Available Beds</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('doctors')}>
                    <UserCheck size={20} color="#f59e0b" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: '#fff' }}>Doctor Schedules</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Check Availability</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Database Trigger Integrity Status Chip */}
      <div style={{
        padding: '0.9rem 1.25rem',
        backgroundColor: '#0b1120',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Database size={16} color="#38bdf8" />
          <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>
            PostgreSQL 18 Trigger Enforcement:
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            trg_audit_patients • trg_check_appointment_conflict • trg_recalculate_invoice_balance • trg_enforce_ward_bed_capacity
          </span>
        </div>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#34d399',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
        }}>
          ACTIVE & AUDITING
        </span>
      </div>
    </div>
  );
}
