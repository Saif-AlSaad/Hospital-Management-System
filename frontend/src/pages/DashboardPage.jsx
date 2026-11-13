// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Administrative Executive Governance & Operations Hub
// Turquoise Harmony Theme: Baltic Blue, Teal, Verdigris, Mint Leaf & Cream
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
  FileSpreadsheet,
  Building2,
  Settings,
  History,
  Layers,
  Cpu,
  Clock
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
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: isAdmin ? 'rgba(5, 102, 141, 0.15)' : 'rgba(0, 168, 150, 0.15)',
            border: `1px solid ${isAdmin ? '#05668D' : '#00A896'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isAdmin ? '#05668D' : '#00A896',
          }}>
            {isAdmin ? <ShieldCheck size={28} /> : <Activity size={28} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {roleHeader.title}
              </h2>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: isAdmin ? 'rgba(5, 102, 141, 0.15)' : 'rgba(0, 168, 150, 0.15)',
                color: isAdmin ? '#05668D' : '#008778',
                border: `1px solid ${isAdmin ? 'rgba(5, 102, 141, 0.35)' : 'rgba(0, 168, 150, 0.35)'}`,
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
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

      {/* Administrator Live Telemetry Strip */}
      {isAdmin && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 168, 150, 0.15)',
              color: '#00A896',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Database size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>DBMS Engine</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>PostgreSQL 18.6</div>
              <div style={{ fontSize: '0.68rem', color: '#008767', fontWeight: 600 }}>Pure SQL • 3NF Normalized</div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(2, 128, 144, 0.15)',
              color: '#028090',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <History size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>CDC Audit Triggers</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>Autonomous Logs</div>
              <div style={{ fontSize: '0.68rem', color: '#028090', fontWeight: 600 }}>Row-Level Diffs</div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(2, 195, 154, 0.15)',
              color: '#008767',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Cpu size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Connection Pool</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>20 Client Clients</div>
              <div style={{ fontSize: '0.68rem', color: '#008767', fontWeight: 600 }}>Zero Connection Leaks</div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(240, 243, 189, 0.7)',
              color: '#05668D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DollarSign size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fiscal Currency</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>BDT (৳) Bangladesh</div>
              <div style={{ fontSize: '0.68rem', color: '#05668D', fontWeight: 600 }}>MFS & Cash Handled</div>
            </div>
          </div>
        </div>
      )}

      {/* Success / Alert Toast */}
      {mvMessage && (
        <div style={{
          backgroundColor: 'rgba(2, 195, 154, 0.15)',
          border: '1px solid rgba(2, 195, 154, 0.35)',
          color: '#02C39A',
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

      {/* Administrator Governance Quick Navigation Grid */}
      {isAdmin && onNavigate && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.75rem',
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
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(0, 168, 150, 0.15)', color: '#00A896' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>Trigger Audit Logs</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Inspect SQL Diffs & Rollbacks</div>
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
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(2, 195, 154, 0.15)', color: '#008767' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>Staff & RBAC Accounts</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Manage System Users & Roles</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('departments')}
            className="card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(5, 102, 141, 0.15)', color: '#05668D' }}>
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>Departments</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Clinical Units & Head Doctors</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('doctors')}
            className="card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(2, 128, 144, 0.15)', color: '#028090' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>Medical Physicians</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Specialists & Schedules</div>
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
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(0, 168, 150, 0.15)', color: '#00A896' }}>
              <BedDouble size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>Wards & Bed Capacity</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Interactive Bed Occupancy</div>
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
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(240, 243, 189, 0.65)', color: '#05668D' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>EXPLAIN Analytics</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SQL Benchmark & Viva Hub</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="card"
            style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              border: '1px solid var(--border-card)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(2, 128, 144, 0.12)', color: '#028090' }}>
              <Settings size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>System Settings</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DBMS Parameters & RBAC Matrix</div>
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
        <div className="card stat-card" style={{ '--stat-color': '#05668D' }}>
          <div className="stat-info">
            <h3>Registered Patients</h3>
            <div className="stat-value">{stats?.totalPatients || 0}</div>
            <div className="stat-subtext">Active Medical Records</div>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#028090' }}>
          <div className="stat-info">
            <h3>Today's Outpatient Queue</h3>
            <div className="stat-value">{stats?.appointmentsToday || 0}</div>
            <div className="stat-subtext">{stats?.appointmentsCompletedToday || 0} completed encounters</div>
          </div>
          <div className="stat-icon-wrapper">
            <Calendar size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#00A896' }}>
          <div className="stat-info">
            <h3>Current Inpatients</h3>
            <div className="stat-value">{stats?.currentInpatients || 0}</div>
            <div className="stat-subtext">{stats?.availableBeds || 0} beds available for admission</div>
          </div>
          <div className="stat-icon-wrapper">
            <BedDouble size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#02C39A' }}>
          <div className="stat-info">
            <h3>Today's Collected Revenue</h3>
            <div className="stat-value">৳{stats?.revenueToday ? stats.revenueToday.toLocaleString() : '0.00'}</div>
            <div className="stat-subtext" style={{ color: 'var(--text-muted)' }}>Outstanding Debt: ৳{stats?.totalOutstandingDebt ? stats.totalOutstandingDebt.toLocaleString() : '0.00'}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#02C39A' }}>
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Ward Bed Utilization</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overall Facility Occupancy: {overallOccupancyPct}% ({occupiedBeds}/{totalBeds} beds)</p>
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
              const barColor = occPct > 80 ? '#f43f5e' : (occPct > 50 ? '#028090' : '#02C39A');
              return (
                <div key={w.ward_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{w.ward_name} ({w.ward_type})</span>
                    <span style={{ color: 'var(--text-muted)' }}>{w.occupied_beds} / {w.total_beds} beds ({occPct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
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
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Monthly Performance (Materialized View)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fast Aggregation from mv_monthly_hospital_performance</p>
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
                      <td style={{ fontWeight: 600, color: '#008778' }}>{m.report_month}</td>
                      <td>{m.total_appointments}</td>
                      <td>{m.total_admissions}</td>
                      <td style={{ color: '#05668D', fontWeight: 700 }}>৳{parseFloat(m.gross_invoiced || 0).toLocaleString()}</td>
                      <td style={{ color: '#008767', fontWeight: 700 }}>৳{parseFloat(m.total_collected || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {roleKey === 'Doctor' ? 'Clinical Workspace Shortcuts' : 'Front Desk Quick Navigation'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quick access to your authorized hospital workflows</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
              {roleKey === 'Doctor' ? (
                <>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('consultations')}>
                    <Stethoscope size={20} color="#00A896" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Consultations</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Outpatient Queue & Notes</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('prescriptions')}>
                    <Receipt size={20} color="#028090" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Prescriptions</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Digital Drug Orders</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('admissions')}>
                    <BedDouble size={20} color="#02C39A" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Inpatients</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Admitted Patient Care</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('laboratory')}>
                    <FlaskConical size={20} color="#05668D" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Laboratory</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Diagnostic Requisitions</span>
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('patients')}>
                    <Users size={20} color="#02C39A" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Patient Directory</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Register & Search Patients</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('appointments')}>
                    <Calendar size={20} color="#00A896" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Appointments</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Schedule OPD Visits</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('admissions')}>
                    <BedDouble size={20} color="#028090" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Bed Admissions</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Allocate Available Beds</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', height: 'auto' }} onClick={() => onNavigate && onNavigate('doctors')}>
                    <UserCheck size={20} color="#05668D" />
                    <span style={{ fontWeight: 700, marginTop: '0.4rem', color: 'var(--text-main)' }}>Doctor Schedules</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Check Availability</span>
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
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Database size={16} color="#00A896" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700 }}>
            PostgreSQL 18 Trigger Enforcement:
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            trg_audit_patients • trg_check_appointment_conflict • trg_recalculate_invoice_balance • trg_enforce_ward_bed_capacity
          </span>
        </div>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#008767',
          backgroundColor: 'rgba(2, 195, 154, 0.15)',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
        }}>
          ACTIVE & AUDITING
        </span>
      </div>
    </div>
  );
}
