import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Search, Filter, Eye, Database, 
  Clock, User, ArrowRight
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchAuditLogs } from '../services/api';

export default function AuditLogsPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Diff Modal
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadLogs(1);
  }, [tableFilter, actionFilter]);

  const loadLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        page,
        limit: 15,
        tableName: tableFilter || undefined,
        action: actionFilter || undefined
      });
      setLogs(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDiff = (log) => {
    setSelectedLog(log);
    setShowDiffModal(true);
  };

  const columns = [
    { header: 'Log ID', accessor: 'log_id', render: row => <span className="font-mono text-xs text-muted">#{row.log_id}</span> },
    { 
      header: 'Timestamp', 
      accessor: 'changed_at', 
      render: row => new Date(row.changed_at).toLocaleString() 
    },
    { 
      header: 'Action', 
      render: row => {
        const colors = {
          INSERT: 'badge-success',
          UPDATE: 'badge-warning',
          DELETE: 'badge-danger'
        };
        return <span className={`badge ${colors[row.action] || 'badge-neutral'} font-mono text-xs`}>{row.action}</span>;
      } 
    },
    { 
      header: 'Target Table', 
      accessor: 'table_name', 
      render: row => <span className="font-mono font-semibold text-primary">{row.table_name}</span> 
    },
    { 
      header: 'Record ID', 
      accessor: 'record_id', 
      render: row => <span className="font-mono text-xs">PK: {row.record_id}</span> 
    },
    { 
      header: 'Executed By', 
      accessor: 'changed_by_user', 
      render: row => (
        <span className="text-xs">
          {row.changed_by_user ? `@${row.changed_by_user}` : <span className="text-muted italic">System Trigger</span>}
        </span>
      ) 
    },
    {
      header: 'Audit Snapshot',
      render: row => (
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => openDiff(row)}
        >
          <Eye size={14} /> View JSON Diff
        </button>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldAlert className="text-primary" /> System Audit Trail & Triggers
          </h1>
          <p className="page-subtitle">Historical change data capture recorded autonomously by PostgreSQL database AFTER UPDATE triggers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <span className="text-sm font-medium">Filter Audit Log:</span>
          </div>
          <select 
            className="input text-sm w-52" 
            value={tableFilter} 
            onChange={(e) => setTableFilter(e.target.value)}
          >
            <option value="">All Audited Tables</option>
            <option value="patients">patients</option>
            <option value="appointments">appointments</option>
            <option value="admissions">admissions</option>
            <option value="prescriptions">prescriptions</option>
            <option value="invoices">invoices</option>
          </select>
          <select 
            className="input text-sm w-44" 
            value={actionFilter} 
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All DML Actions</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          {(tableFilter || actionFilter) && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => { setTableFilter(''); setActionFilter(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Audit Table */}
      <DataTable 
        columns={columns}
        data={logs}
        loading={loading}
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        onPageChange={loadLogs}
      />

      {/* JSON Diff Snapshot Modal */}
      {selectedLog && (
        <Modal 
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          title={`Audit Snapshot: Log #${selectedLog.log_id} (${selectedLog.table_name})`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-border rounded text-xs flex justify-between">
              <div>
                <span className="text-muted block">Table & Record</span>
                <span className="font-mono font-bold">{selectedLog.table_name} (ID: {selectedLog.record_id})</span>
              </div>
              <div>
                <span className="text-muted block">DML Operation</span>
                <span className="badge badge-warning">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-muted block">Recorded At</span>
                <span className="font-mono">{new Date(selectedLog.changed_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-xs text-danger mb-1">Prior State (old_values JSONB)</h4>
                <div className="bg-slate-900 text-slate-200 p-3 rounded text-xs font-mono max-h-80 overflow-y-auto border border-slate-800">
                  <pre className="whitespace-pre-wrap">
                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '(NULL on INSERT)'}
                  </pre>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-xs text-emerald-600 mb-1">New Committed State (new_values JSONB)</h4>
                <div className="bg-slate-900 text-slate-200 p-3 rounded text-xs font-mono max-h-80 overflow-y-auto border border-slate-800">
                  <pre className="whitespace-pre-wrap">
                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '(NULL on DELETE)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button className="btn btn-secondary" onClick={() => setShowDiffModal(false)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
