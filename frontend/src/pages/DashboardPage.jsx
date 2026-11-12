// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Administrative & Clinical Dashboard
// Real-time SQL Aggregates, Bed Occupancy & Revenue Tracking
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
  Plus
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [wards, setWards] = useState([]);
  const [monthlyPerf, setMonthlyPerf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, wardsRes, perfRes] = await Promise.all([
        api.getDashboardStats(),
        api.getWards(),
        api.getMonthlyPerformance(),
      ]);
      setStats(statsRes.stats);
      setWards(wardsRes.data || []);
      setMonthlyPerf(perfRes.data || []);
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

  const totalBeds = wards.reduce((acc, w) => acc + parseInt(w.total_beds || 0), 0);
  const occupiedBeds = wards.reduce((acc, w) => acc + parseInt(w.occupied_beds || 0), 0);
  const overallOccupancyPct = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Executive Hospital Overview</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            Real-time telemetry and clinical indicators derived from live PostgreSQL SQL aggregations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Stats</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('appointments')}>
            <Plus size={14} />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Error Alert if API call failed */}
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
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span><strong>Database Query Error:</strong> {error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
            Try Again
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="stat-grid">
        <div className="card stat-card" style={{ '--stat-color': '#0284c7' }}>
          <div className="stat-info">
            <h3>Registered Patients</h3>
            <div className="stat-value">{stats?.totalPatients?.toLocaleString() || '...'}</div>
            <div className="stat-subtext">Active Master Registry</div>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-info">
            <h3>Active Doctors</h3>
            <div className="stat-value">{stats?.activeDoctors || '...'}</div>
            <div className="stat-subtext">Across 8 Medical Specialties</div>
          </div>
          <div className="stat-icon-wrapper">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#8b5cf6' }}>
          <div className="stat-info">
            <h3>Today's Appointments</h3>
            <div className="stat-value">{stats?.appointmentsToday || 0}</div>
            <div className="stat-subtext">{stats?.appointmentsCompletedToday || 0} Completed Today</div>
          </div>
          <div className="stat-icon-wrapper">
            <Calendar size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-info">
            <h3>Inpatient Admissions</h3>
            <div className="stat-value">{stats?.currentInpatients || 0}</div>
            <div className="stat-subtext">{stats?.occupiedBeds || 0} Occupied Beds</div>
          </div>
          <div className="stat-icon-wrapper">
            <BedDouble size={24} />
          </div>
        </div>
      </div>

      {/* Financial & Clinical Alerts Grid */}
      <div className="stat-grid">
        <div className="card stat-card" style={{ '--stat-color': '#06b6d4' }}>
          <div className="stat-info">
            <h3>Available Beds</h3>
            <div className="stat-value">{stats?.availableBeds || 0}</div>
            <div className="stat-subtext">Ready for Immediate Admission</div>
          </div>
          <div className="stat-icon-wrapper">
            <Activity size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#ec4899' }}>
          <div className="stat-info">
            <h3>Pending Lab Tests</h3>
            <div className="stat-value">{stats?.pendingLabTests || 0}</div>
            <div className="stat-subtext">Diagnostic Samples in Progress</div>
          </div>
          <div className="stat-icon-wrapper">
            <FlaskConical size={24} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#f43f5e' }}>
          <div className="stat-info">
            <h3>Low Stock Warnings</h3>
            <div className="stat-value">{stats?.lowStockMedicines || 0}</div>
            <div className="stat-subtext">Medicines Below Reorder Threshold</div>
          </div>
          <div className="stat-icon-wrapper">
            <AlertTriangle size={24} />
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

      {/* Middle Grid: Ward Occupancy & Quick Operational Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Ward Bed Occupancy Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Ward Bed Utilization</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Overall Facility Occupancy: {overallOccupancyPct}% ({occupiedBeds}/{totalBeds} beds)</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('wards')}>
              <span>View Wards</span>
              <ArrowUpRight size={14} />
            </button>
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

        {/* Monthly Performance Trends from Materialized View */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Monthly Performance (Materialized View)</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Aggregated from mv_monthly_hospital_performance</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reports')}>
              <span>Full Analytics</span>
              <ArrowUpRight size={14} />
            </button>
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
      </div>
    </div>
  );
}
