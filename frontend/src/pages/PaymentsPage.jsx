import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Filter, Plus, DollarSign, 
  Receipt, CheckCircle2, User, FileText
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { fetchPayments, fetchInvoices, processPayment } from '../services/api';

export default function PaymentsPage({ user }) {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [methodFilter, setMethodFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // New Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payForm, setPayForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'Cash',
    transactionReference: '',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    loadPayments(1);
  }, [methodFilter]);

  const loadPayments = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchPayments({
        page,
        limit: 10,
        paymentMethod: methodFilter || undefined,
        search: searchQuery || undefined
      });
      setPayments(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewPaymentModal = async () => {
    setShowPayModal(true);
    try {
      // Fetch unpaid or partially paid invoices
      const res = await fetchInvoices({ status: 'Unpaid', limit: 50 });
      setUnpaidInvoices(res.data || []);
      if (res.data?.length > 0) {
        setSelectedInvoice(res.data[0]);
        setPayForm({
          invoiceId: res.data[0].invoice_id,
          amount: parseFloat(res.data[0].balance_due).toFixed(2),
          paymentMethod: 'Cash',
          transactionReference: `TXN-${Date.now().toString().slice(-6)}`,
          notes: 'Standard cashier settlement'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvoiceChange = (invId) => {
    const inv = unpaidInvoices.find(i => i.invoice_id === parseInt(invId));
    setSelectedInvoice(inv);
    setPayForm({
      ...payForm,
      invoiceId: invId,
      amount: inv ? parseFloat(inv.balance_due).toFixed(2) : ''
    });
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!payForm.invoiceId || !payForm.amount) {
      alert('Invoice and valid payment amount are required.');
      return;
    }
    setSubmittingPayment(true);
    try {
      await processPayment({
        invoiceId: parseInt(payForm.invoiceId),
        amount: parseFloat(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        transactionReference: payForm.transactionReference,
        notes: payForm.notes
      });

      alert('Payment confirmed via stored procedure sp_process_payment!');
      setShowPayModal(false);
      loadPayments(1);
    } catch (err) {
      alert('Payment processing failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const columns = [
    { header: 'Receipt #', accessor: 'payment_number', render: row => <span className="font-semibold text-primary">{row.payment_number}</span> },
    { 
      header: 'Payment Date', 
      accessor: 'payment_date', 
      render: row => new Date(row.payment_date).toLocaleDateString() + ' ' + new Date(row.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    },
    { header: 'Invoice #', accessor: 'invoice_number', render: row => <span className="font-mono text-xs">{row.invoice_number}</span> },
    { 
      header: 'Patient', 
      render: row => (
        <div>
          <span className="font-semibold text-foreground">{row.patient_name}</span>
          <span className="text-xs text-muted block">{row.patient_code}</span>
        </div>
      ) 
    },
    { 
      header: 'Method', 
      render: row => {
        const colors = {
          Cash: 'badge-success',
          'Credit Card': 'badge-info',
          'Debit Card': 'badge-info',
          'MFS (bKash/Nagad)': 'badge-warning',
          Insurance: 'badge-neutral'
        };
        return <span className={`badge ${colors[row.payment_method] || 'badge-neutral'}`}>{row.payment_method}</span>;
      } 
    },
    { 
      header: 'Amount Paid', 
      render: row => (
        <span className="font-mono font-bold text-emerald-600 text-sm">
          ${parseFloat(row.amount).toFixed(2)}
        </span>
      ) 
    },
    { header: 'Reference', render: row => <span className="font-mono text-xs text-muted">{row.transaction_reference || 'N/A'}</span> },
    { header: 'Cashier', accessor: 'cashier_username', render: row => <span className="text-xs">{row.cashier_username || 'System'}</span> }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CreditCard className="text-primary" /> Hospital Payment Receipts
          </h1>
          <p className="page-subtitle">Track hospital revenue, simulated payment transactions, and invoice receipts</p>
        </div>
        <div>
          {['Admin', 'Accountant', 'Receptionist'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={openNewPaymentModal}>
              <Plus size={16} /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-2.5 text-muted" size={16} />
            <input 
              type="text" 
              className="input pl-9 text-sm" 
              placeholder="Search receipt #, invoice #, patient code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPayments(1)}
            />
          </div>
          <select 
            className="input text-sm w-52" 
            value={methodFilter} 
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="">All Payment Channels</option>
            <option value="Cash">Cash</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="MFS (bKash/Nagad)">Mobile Financial Services</option>
            <option value="Insurance">Insurance</option>
          </select>
          {(searchQuery || methodFilter) && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearchQuery(''); setMethodFilter(''); loadPayments(1); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <DataTable 
        columns={columns}
        data={payments}
        loading={loading}
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        onPageChange={loadPayments}
      />

      {/* Record Payment Modal */}
      <Modal 
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Record Payment via sp_process_payment"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div>
            <label className="label">Select Outstanding Invoice *</label>
            <select 
              className="input text-xs font-mono"
              value={payForm.invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              required
            >
              {unpaidInvoices.map(inv => (
                <option key={inv.invoice_id} value={inv.invoice_id}>
                  {inv.invoice_number} - {inv.patient_name} (${parseFloat(inv.balance_due).toFixed(2)} due)
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="p-3 bg-slate-50 border border-border rounded text-xs flex justify-between">
              <div>
                <span className="text-muted block">Patient</span>
                <span className="font-semibold">{selectedInvoice.patient_name}</span>
              </div>
              <div className="text-right">
                <span className="text-muted block">Remaining Due</span>
                <span className="font-bold text-danger font-mono">${parseFloat(selectedInvoice.balance_due).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="label">Payment Amount ($) *</label>
            <input 
              type="number" 
              step="0.01" 
              min="0.01"
              max={selectedInvoice ? parseFloat(selectedInvoice.balance_due) : undefined}
              className="input font-mono font-bold text-lg" 
              value={payForm.amount} 
              onChange={(e) => setPayForm({...payForm, amount: e.target.value})}
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Method *</label>
              <select 
                className="input" 
                value={payForm.paymentMethod} 
                onChange={(e) => setPayForm({...payForm, paymentMethod: e.target.value})}
                required
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="MFS (bKash/Nagad)">Mobile Financial Services</option>
                <option value="Insurance">Insurance</option>
              </select>
            </div>
            <div>
              <label className="label">Transaction Reference</label>
              <input 
                type="text" 
                className="input font-mono" 
                value={payForm.transactionReference} 
                onChange={(e) => setPayForm({...payForm, transactionReference: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="label">Remarks</label>
            <input 
              type="text" 
              className="input" 
              value={payForm.notes} 
              onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submittingPayment}>
              {submittingPayment ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
