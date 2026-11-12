// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Reusable Data Table Component with Search, Pagination & Filters
// ============================================================================

import React from 'react';
import { Search, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  toolbarActions,
  pagination,
  onPageChange,
  emptyMessage = 'No records found matching criteria.',
}) {
  return (
    <div className="table-container">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        {onSearchChange !== undefined && (
          <div className="search-input-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {toolbarActions && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {toolbarActions}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width || 'auto', textAlign: col.align || 'left' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                    <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Executing parameterized PostgreSQL query...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                    <Inbox size={36} strokeWidth={1.5} />
                    <span style={{ fontSize: '0.9rem' }}>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr key={row.id || row.patient_id || row.appointment_id || row.order_id || row.invoice_id || rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="pagination-bar">
          <div>
            Showing Page <strong style={{ color: '#fff' }}>{pagination.page}</strong> of{' '}
            <strong style={{ color: '#fff' }}>{pagination.totalPages || 1}</strong> (
            {pagination.totalRecords || 0} total records in database)
          </div>

          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
