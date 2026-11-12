import React, { useState, useEffect } from 'react';
import { 
  BarChart3, RefreshCw, Zap, TrendingUp, Users, 
  DollarSign, Activity, Terminal, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import DataTable from '../components/DataTable';
import { 
  fetchMonthlyPerformance, refreshMaterializedView, 
  fetchDoctorWorkload, fetchRevenueBreakdown, fetchDebtAging, 
  explainQuery 
} from '../services/api';

export default function ReportsPage({ user }) {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly', 'workload', 'aging', 'revenue', 'explain'
  const [loading, setLoading] = useState(false);

  // Tab 1: Materialized View
  const [monthlyData, setMonthlyData] = useState([]);
  const [refreshingMV, setRefreshingMV] = useState(false);

  // Tab 2: Doctor Workload
  const [workloadData, setWorkloadData] = useState([]);
  const [minAppointments, setMinAppointments] = useState(5);

  // Tab 3: Accounts Receivable Aging
  const [agingData, setAgingData] = useState([]);

  // Tab 4: Revenue Breakdown
  const [revenueData, setRevenueData] = useState([]);

  // Tab 5: EXPLAIN ANALYZE
  const [selectedExplainQuery, setSelectedExplainQuery] = useState('patient_search');
  const [explainResult, setExplainResult] = useState(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    if (activeTab === 'monthly') loadMonthly();
    else if (activeTab === 'workload') loadWorkload();
    else if (activeTab === 'aging') loadAging();
    else if (activeTab === 'revenue') loadRevenue();
    else if (activeTab === 'explain') runExplain();
  }, [activeTab]);

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const res = await fetchMonthlyPerformance();
      setMonthlyData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMV = async () => {
    setRefreshingMV(true);
    try {
      const res = await refreshMaterializedView();
      setMonthlyData(res.data || []);
      alert('Stored procedure sp_generate_monthly_hospital_report executed and Materialized View refreshed successfully!');
    } catch (err) {
      alert('Failed to refresh materialized view: ' + (err.response?.data?.message || err.message));
    } finally {
      setRefreshingMV(false);
    }
  };

  const loadWorkload = async () => {
    setLoading(true);
    try {
      const res = await fetchDoctorWorkload({ minAppointments });
      setWorkloadData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAging = async () => {
    setLoading(true);
    try {
      const res = await fetchDebtAging();
      setAgingData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenue = async () => {
    setLoading(true);
    try {
      const res = await fetchRevenueBreakdown();
      setRevenueData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runExplain = async (type = selectedExplainQuery) => {
    setExplaining(true);
    try {
      const res = await explainQuery(type);
      setExplainResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  };

  const monthlyColumns = [
    { 
      header: 'Month', 
      accessor: 'month_date', 
      render: row => (
        <span className="font-semibold text-primary">
          {new Date(row.month_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
        </span>
      ) 
    },
    { header: 'Inpatient Admissions', accessor: 'total_admissions', render: row => <span className="font-mono font-medium">{row.total_admissions}</span> },
    { header: 'Appointments Completed', accessor: 'completed_appointments', render: row => <span className="font-mono font-medium">{row.completed_appointments}</span> },
    { header: 'Total Invoiced', accessor: 'total_invoiced', render: row => <span className="font-mono font-semibold">৳{parseFloat(row.total_invoiced).toFixed(2)}</span> },
    { header: 'Revenue Collected', accessor: 'total_revenue_collected', render: row => <span className="font-mono text-emerald-600 font-bold">৳{parseFloat(row.total_revenue_collected).toFixed(2)}</span> },
    { header: 'Outstanding Balance', accessor: 'outstanding_balance', render: row => <span className="font-mono text-danger font-semibold">৳{parseFloat(row.outstanding_balance).toFixed(2)}</span> },
    { 
      header: 'Bed Utilization', 
      accessor: 'bed_utilization_rate_pct', 
      render: row => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, parseFloat(row.bed_utilization_rate_pct || 0))}%` }}></div>
          </div>
          <span className="font-mono text-xs">{parseFloat(row.bed_utilization_rate_pct || 0).toFixed(1)}%</span>
        </div>
      ) 
    }
  ];

  const workloadColumns = [
    { header: 'Physician', accessor: 'doctor_name', render: row => <span className="font-semibold">{row.doctor_name}</span> },
    { header: 'Department', accessor: 'department_name' },
    { header: 'Specialization', accessor: 'specialization' },
    { header: 'Fee', accessor: 'consultation_fee', render: row => <span className="font-mono">৳{parseFloat(row.consultation_fee).toFixed(2)}</span> },
    { header: 'Total Appointments', accessor: 'total_appointments', render: row => <span className="font-mono font-semibold">{row.total_appointments}</span> },
    { header: 'Completed', accessor: 'completed_appointments', render: row => <span className="font-mono text-emerald-600 font-semibold">{row.completed_appointments}</span> },
    { 
      header: 'Completion %', 
      accessor: 'completion_rate_percentage', 
      render: row => <span className="font-mono font-bold text-xs">{row.completion_rate_percentage}%</span> 
    },
    { 
      header: 'Est. Revenue', 
      accessor: 'estimated_revenue_generated', 
      render: row => <span className="font-mono font-bold text-primary">৳{parseFloat(row.estimated_revenue_generated).toFixed(2)}</span> 
    }
  ];

  const agingColumns = [
    { 
      header: 'Debtor Patient', 
      render: row => (
        <div>
          <span className="font-semibold">{row.patient_name}</span>
          <span className="text-xs text-muted block">{row.patient_code} • {row.phone}</span>
        </div>
      ) 
    },
    { header: 'Unpaid Invoices', accessor: 'unpaid_invoices_count', render: row => <span className="badge badge-warning">{row.unpaid_invoices_count}</span> },
    { header: 'Total Balance Due', accessor: 'total_debt_due', render: row => <span className="font-mono font-bold text-danger text-sm">৳{parseFloat(row.total_debt_due).toFixed(2)}</span> },
    { header: '0 - 30 Days', accessor: 'aging_0_to_30_days', render: row => <span className="font-mono text-xs">৳{parseFloat(row.aging_0_to_30_days).toFixed(2)}</span> },
    { header: '31 - 60 Days', accessor: 'aging_31_to_60_days', render: row => <span className="font-mono text-xs">৳{parseFloat(row.aging_31_to_60_days).toFixed(2)}</span> },
    { header: '61 - 90 Days', accessor: 'aging_61_to_90_days', render: row => <span className="font-mono text-xs font-semibold text-amber-600">৳{parseFloat(row.aging_61_to_90_days).toFixed(2)}</span> },
    { header: '> 90 Days (Delinquent)', accessor: 'aging_over_90_days', render: row => <span className="font-mono text-xs font-bold text-danger">৳{parseFloat(row.aging_over_90_days).toFixed(2)}</span> }
  ];

  const revenueColumns = [
    { header: 'Date', accessor: 'payment_day', render: row => new Date(row.payment_day).toLocaleDateString() },
    { header: 'Payment Channel', accessor: 'payment_method', render: row => <span className="badge badge-info">{row.payment_method}</span> },
    { header: 'Transactions', accessor: 'total_transactions', render: row => <span className="font-mono font-semibold">{row.total_transactions}</span> },
    { header: 'Avg Ticket Size', accessor: 'average_ticket_size', render: row => <span className="font-mono text-xs">৳{parseFloat(row.average_ticket_size).toFixed(2)}</span> },
    { header: 'Revenue Collected', accessor: 'total_revenue_collected', render: row => <span className="font-mono font-bold text-emerald-600">৳{parseFloat(row.total_revenue_collected).toFixed(2)}</span> }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="text-primary" /> Reports & Query Analytics
          </h1>
          <p className="page-subtitle">Advanced SQL joins, aggregations with HAVING, materialized views, and live execution plans</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'monthly' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('monthly')}
        >
          <TrendingUp size={16} /> Materialized View Performance
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'workload' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('workload')}
        >
          <Users size={16} /> Doctor Workload (HAVING)
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'aging' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('aging')}
        >
          <DollarSign size={16} /> Accounts Receivable Aging
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'revenue' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('revenue')}
        >
          <Activity size={16} /> Daily Revenue Channels
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'explain' ? 'border-purple-600 text-purple-600' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('explain')}
        >
          <Terminal size={16} /> EXPLAIN ANALYZE Inspector
        </button>
      </div>

      {/* Tab 1: Materialized View */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <div className="card flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-semibold text-sm">PostgreSQL Materialized View: <code>mv_monthly_hospital_performance</code></h3>
              <p className="text-xs text-muted">Aggregates admissions, completed encounters, invoiced totals, and payments across the entire database.</p>
            </div>
            {user?.role === 'Admin' && (
              <button 
                className="btn btn-primary btn-sm flex items-center gap-2"
                onClick={handleRefreshMV}
                disabled={refreshingMV}
              >
                <RefreshCw size={14} className={refreshingMV ? 'animate-spin' : ''} />
                {refreshingMV ? 'Executing sp_generate_monthly_hospital_report...' : 'Refresh Materialized View (sp_generate_monthly_hospital_report)'}
              </button>
            )}
          </div>
          <DataTable 
            columns={monthlyColumns}
            data={monthlyData}
            loading={loading}
            showPagination={false}
          />
        </div>
      )}

      {/* Tab 2: Doctor Workload */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          <div className="card flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-semibold text-sm">Advanced Query 2: Physician Productivity & Revenue Contribution</h3>
              <p className="text-xs text-muted">Multi-table JOIN across <code>doctors</code>, <code>staff</code>, <code>departments</code>, and <code>appointments</code> with <code>GROUP BY</code> and <code>HAVING</code>.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-muted font-mono">HAVING COUNT(a.appointment_id) &gt;=</span>
              <input 
                type="number" 
                min="0" 
                max="500" 
                className="input text-xs w-20 font-mono text-center" 
                value={minAppointments}
                onChange={(e) => setMinAppointments(e.target.value)}
              />
              <button className="btn btn-secondary btn-sm" onClick={loadWorkload}>Apply Filter</button>
            </div>
          </div>
          <DataTable 
            columns={workloadColumns}
            data={workloadData}
            loading={loading}
            showPagination={false}
          />
        </div>
      )}

      {/* Tab 3: Accounts Receivable Aging */}
      {activeTab === 'aging' && (
        <div className="space-y-4">
          <div className="card bg-slate-50">
            <h3 className="font-semibold text-sm">Financial Aging Analysis (SQL Conditional CASE Aggregation)</h3>
            <p className="text-xs text-muted">Breaks outstanding patient balances into 30, 60, 90, and delinquent brackets using <code>CASE WHEN CURRENT_DATE - inv.issue_date ...</code></p>
          </div>
          <DataTable 
            columns={agingColumns}
            data={agingData}
            loading={loading}
            showPagination={false}
          />
        </div>
      )}

      {/* Tab 4: Revenue Channels */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="card bg-slate-50">
            <h3 className="font-semibold text-sm">Daily Collections Grouped by Payment Method</h3>
            <p className="text-xs text-muted">Aggregates transactions across Cash, Credit/Debit cards, MFS (bKash/Nagad), and Insurance.</p>
          </div>
          <DataTable 
            columns={revenueColumns}
            data={revenueData}
            loading={loading}
            showPagination={false}
          />
        </div>
      )}

      {/* Tab 5: EXPLAIN ANALYZE */}
      {activeTab === 'explain' && (
        <div className="space-y-4">
          <div className="card bg-slate-900 text-slate-100 border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-sm text-purple-400 flex items-center gap-2">
                  <Terminal size={18} /> Live PostgreSQL Execution Plan Visualizer (EXPLAIN ANALYZE BUFFERS)
                </h3>
                <p className="text-xs text-slate-400">Demonstrate query optimizer behavior, B-tree indexes, buffer cache hits, and execution cost during university viva defense.</p>
              </div>
              <div className="flex gap-2">
                <select 
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-3 py-1.5 font-mono"
                  value={selectedExplainQuery}
                  onChange={(e) => {
                    setSelectedExplainQuery(e.target.value);
                    runExplain(e.target.value);
                  }}
                >
                  <option value="patient_search">Patient Name & Phone B-Tree Index</option>
                  <option value="bed_occupancy">Bed Status Partial Index (Available)</option>
                  <option value="doctor_workload">Doctor Workload Aggregation (GROUP BY & HAVING)</option>
                  <option value="revenue_aggregate">Invoice Revenue Status Breakdown</option>
                </select>
                <button 
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                  onClick={() => runExplain(selectedExplainQuery)}
                  disabled={explaining}
                >
                  <Zap size={14} /> {explaining ? 'Running...' : 'Execute EXPLAIN'}
                </button>
              </div>
            </div>

            {explainResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 p-3 bg-slate-800/80 rounded border border-slate-700 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block">Target Query</span>
                    <span className="text-purple-300 font-bold">{explainResult.target}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Execution Time</span>
                    <span className="text-emerald-400 font-bold">{explainResult.plan[0]['Execution Time']} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Planning Time</span>
                    <span className="text-blue-400 font-bold">{explainResult.plan[0]['Planning Time']} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Scan Node Type</span>
                    <span className="badge badge-success text-xs">{explainResult.plan[0]['Plan']['Node Type']}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded border border-slate-800 overflow-x-auto">
                  <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(explainResult.plan, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
