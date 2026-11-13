// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Database Trigger Audit Trail & Change Data Capture (CDC) Console
// Administrator Exclusive Module: Row-Level Triggers & Rollback Inspection
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Search, Filter, Eye, Database, 
  Clock, User, ArrowRight, RefreshCw, Shield,
  Layers, CheckCircle2, History, Code2
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchAuditLogs } from '../services/api';

export default function AuditLogsPage({ user, onNavigate }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Diff Modal
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadLogs(page);
  }, [page, tableFilter, actionFilter]);

  const loadLogs = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        page: currentPage,
        limit: 15,
        tableName: tableFilter || undefined,
        action: actionFilter || undefined
      });
      setLogs(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDiff = (log) => {
    setSelectedLog(log);
    setShowDiffModal(true);
  };

  // Local filter for search
  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchTable = (log.table_name || '').toLowerCase().includes(q);
    const matchAction = (log.action || '').toLowerCase().includes(q);
    const matchUser = (log.changed_by_user || '').toLowerCase().includes(q);
    const matchId = String(log.record_id || '').includes(q);
    const matchLogId = String(log.log_id || '').includes(q);
    return matchTable || matchAction || matchUser || matchId || matchLogId;
  });

  // Action badge colors
  const getActionBadge = (action) => {
    switch (action) {
      case 'INSERT':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)' };
      case 'UPDATE':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' };
      case 'DELETE':
        return { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.35)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.25)' };
    }
  };

  const columns = [
    { 
      header: 'Log #', 
      key: 'log_id', 
      render: row => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', fontSize: '0.82rem' }}>
          #{row.log_id}
        </span>
      )
    },
    { 
      header: 'Event Timestamp', 
      key: 'changed_at', 
      render: row => (
        <div>
          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.84rem' }}>
            {new Date(row.changed_at).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            {new Date(row.changed_at).toLocaleTimeString()}
          </div>
        </div>
      ) 
    },
    { 
      header: 'DML Action', 
      key: 'action',
      render: row => {
        const badge = getActionBadge(row.action);
        return (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            backgroundColor: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
            padding: '0.15rem 0.55rem',
            borderRadius: '6px',
            fontFamily: 'monospace',
          }}>
            {row.action}
          </span>
        );
      } 
    },
    { 
      header: 'Audited Relation', 
      key: 'table_name', 
      render: row => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Database size={13} color="#0ea5e9" />
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0', fontSize: '0.84rem' }}>
            {row.table_name}
          </span>
        </div>
      ) 
    },
    { 
      header: 'Record PK', 
      key: 'record_id', 
      render: row => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          color: '#cbd5e1',
          backgroundColor: '#0b1120',
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          border: '1px solid #1e293b',
        }}>
          PK: {row.record_id}
        </span>
      ) 
    },
    { 
      header: 'Committed By', 
      key: 'changed_by_user', 
      render: row => (
        <span style={{ fontSize: '0.78rem', color: row.changed_by_user ? '#38bdf8' : '#94a3b8' }}>
          {row.changed_by_user ? `@${row.changed_by_user}` : (
            <span style={{ fontStyle: 'italic', color: '#64748b' }}>PostgreSQL Trigger</span>
          )}
        </span>
      ) 
    },
    {
      header: 'Audit Snapshot',
      key: 'actions',
      render: row => (
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => openDiff(row)}
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
        >
          <Eye size={13} />
          <span>Inspect Diff</span>
        </button>
      )
    }
  ];

  return (
    <div>
      {/* Executive Header Banner */}
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
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fb7185',
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                System Audit Trail & Database Triggers
              </h2>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                color: '#fb7185',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <Shield size={12} />
                CDC Engine
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Autonomous Change Data Capture (CDC) recorded by PostgreSQL AFTER UPDATE / AFTER DELETE triggers into the audit_logs table.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => loadLogs(page)}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Audit Telemetry KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#0284c7' }}>
          <div className="stat-info">
            <h3>Total CDC Events</h3>
            <div className="stat-value">{pagination.totalRecords || logs.length}</div>
            <div className="stat-subtext">Recorded audit entries</div>
          </div>
          <div className="stat-icon-wrapper">
            <History size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-info">
            <h3>Monitored Relations</h3>
            <div className="stat-value">6 Tables</div>
            <div className="stat-subtext">patients, appts, billing, etc.</div>
          </div>
          <div className="stat-icon-wrapper">
            <Database size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-info">
            <h3>Audit Storage Engine</h3>
            <div className="stat-value">JSONB</div>
            <div className="stat-subtext">Binary JSON Diff snapshots</div>
          </div>
          <div className="stat-icon-wrapper">
            <Code2 size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#f43f5e' }}>
          <div className="stat-info">
            <h3>Autonomous Trigger</h3>
            <div className="stat-value">PL/pgSQL</div>
            <div className="stat-subtext">Zero ORM overhead</div>
          </div>
          <div className="stat-icon-wrapper">
            <Shield size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              placeholder="Search table, record ID, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select 
            className="form-control" 
            style={{ width: '200px', fontSize: '0.85rem' }}
            value={tableFilter} 
            onChange={(e) => {
              setTableFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Audited Tables</option>
            <option value="patients">patients</option>
            <option value="appointments">appointments</option>
            <option value="admissions">admissions</option>
            <option value="prescriptions">prescriptions</option>
            <option value="invoices">invoices</option>
            <option value="staff">staff</option>
          </select>

          <select 
            className="form-control" 
            style={{ width: '160px', fontSize: '0.85rem' }}
            value={actionFilter} 
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All DML Actions</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>

          {(tableFilter || actionFilter || searchQuery) && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => { setTableFilter(''); setActionFilter(''); setSearchQuery(''); setPage(1); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Table */}
      <DataTable 
        columns={columns}
        data={filteredLogs}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* JSON Diff Snapshot Modal */}
      {selectedLog && (
        <Modal 
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          title={`Audit Snapshot: Log #${selectedLog.log_id} (${selectedLog.table_name})`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Meta summary card */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#0b1120',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              fontSize: '0.82rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>Relation & Record PK</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                  {selectedLog.table_name} (ID: {selectedLog.record_id})
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>DML Operation</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: selectedLog.action === 'INSERT' ? '#34d399' : (selectedLog.action === 'UPDATE' ? '#fbbf24' : '#fb7185'),
                  fontFamily: 'monospace',
                }}>
                  {selectedLog.action}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>Timestamp</span>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                  {new Date(selectedLog.changed_at).toLocaleString()}
                </span>
              </div>

              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>Executor</span>
                <span style={{ color: '#38bdf8' }}>
                  {selectedLog.changed_by_user ? `@${selectedLog.changed_by_user}` : 'System Trigger'}
                </span>
              </div>
            </div>

            {/* Side-by-side JSON Diff view */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fb7185', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Prior State (old_values JSONB)</span>
                </div>
                <div style={{
                  backgroundColor: '#070d18',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  maxHeight: '320px',
                  overflowY: 'auto',
                }}>
                  <pre style={{
                    color: '#cbd5e1',
                    fontSize: '0.76rem',
                    fontFamily: 'monospace',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '(NULL on INSERT)'}
                  </pre>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>New Committed State (new_values JSONB)</span>
                </div>
                <div style={{
                  backgroundColor: '#070d18',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  maxHeight: '320px',
                  overflowY: 'auto',
                }}>
                  <pre style={{
                    color: '#cbd5e1',
                    fontSize: '0.76rem',
                    fontFamily: 'monospace',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '(NULL on DELETE)'}
                  </pre>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
              <button className="btn btn-secondary" onClick={() => setShowDiffModal(false)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
