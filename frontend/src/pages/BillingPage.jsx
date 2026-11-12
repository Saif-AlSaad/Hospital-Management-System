import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Filter, CreditCard, DollarSign, 
  CheckCircle2, Clock, AlertTriangle, Eye, Printer, User, Trash2
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { 
  fetchInvoices, fetchInvoiceDetails, createInvoice, 
  fetchBillingServices, processPayment, searchPatients, getPatientBalance 
} from '../services/api';

export default function BillingPage({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Create Invoice Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientBalance, setPatientBalance] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([
    { description: 'General Physician Consultation', serviceId: 1, quantity: 1, unitPrice: 50.00, discount: 0.00 }
  ]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Quick Pay Form State
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 'Cash',
    transactionReference: '',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    loadInvoices(1);
    loadServices();
  }, [statusFilter]);

  const loadInvoices = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchInvoices({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: searchQuery || undefined
      });
      setInvoices(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetchBillingServices();
      setServices(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePatientSearch = async (term) => {
    setPatientSearch(term);
    if (term.trim().length >= 2) {
      try {
        const res = await searchPatients(term);
        setPatientSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setPatientSearchResults([]);
    }
  };

  const selectPatientForInvoice = async (p) => {
    setSelectedPatient(p);
    setPatientSearchResults([]);
    try {
      const balRes = await getPatientBalance(p.patient_id);
      setPatientBalance(balRes.outstandingBalance);
    } catch (err) {
      console.error(err);
    }
  };

  const openNewInvoiceModal = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientBalance(null);
    setInvoiceItems([
      { description: 'Outpatient Doctor Consultation', serviceId: 1, quantity: 1, unitPrice: 50.00, discount: 0.00 }
    ]);
    setInvoiceNotes('Standard outpatient billing');
    setShowCreateModal(true);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { description: 'Hospital Service', serviceId: services[0]?.service_id || null, quantity: 1, unitPrice: services[0]?.standard_price || 25.00, discount: 0.00 }
    ]);
  };

  const updateInvoiceItem = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index][field] = value;

    if (field === 'serviceId') {
      const s = services.find(srv => srv.service_id === parseInt(value));
      if (s) {
        updated[index].description = s.service_name;
        updated[index].unitPrice = parseFloat(s.standard_price);
      }
    }

    setInvoiceItems(updated);
  };

  const removeInvoiceItem = (index) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  // Computations
  const subtotal = invoiceItems.reduce((sum, item) => sum + (parseInt(item.quantity || 1) * parseFloat(item.unitPrice || 0)), 0);
  const totalDiscount = invoiceItems.reduce((sum, item) => sum + parseFloat(item.discount || 0), 0);
  const taxable = Math.max(0, subtotal - totalDiscount);
  const tax = taxable * 0.05;
  const grandTotal = taxable + tax;

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Please select a patient to bill.');
      return;
    }
    setSubmittingInvoice(true);
    try {
      await createInvoice({
        patientId: selectedPatient.patient_id,
        items: invoiceItems.map(i => ({
          serviceId: i.serviceId ? parseInt(i.serviceId) : null,
          description: i.description,
          quantity: parseInt(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          discount: parseFloat(i.discount)
        })),
        notes: invoiceNotes
      });

      alert('Invoice created successfully!');
      setShowCreateModal(false);
      loadInvoices(1);
    } catch (err) {
      alert('Failed to generate invoice: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const openInvoiceDetails = async (invoiceId) => {
    try {
      const res = await fetchInvoiceDetails(invoiceId);
      setSelectedInvoice(res);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load invoice: ' + (err.response?.data?.message || err.message));
    }
  };

  const openPayInvoice = (inv) => {
    setSelectedInvoice({ invoice: inv, items: [], payments: [] });
    setPayForm({
      amount: parseFloat(inv.balance_due).toFixed(2),
      paymentMethod: 'Cash',
      transactionReference: `PAY-TXN-${Date.now().toString().slice(-6)}`,
      notes: 'Settlement of balance'
    });
    setShowPayModal(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const inv = selectedInvoice.invoice;
    if (parseFloat(payForm.amount) <= 0 || parseFloat(payForm.amount) > parseFloat(inv.balance_due)) {
      alert(`Payment amount must be between $0.01 and the remaining balance of $${parseFloat(inv.balance_due).toFixed(2)}.`);
      return;
    }

    setSubmittingPayment(true);
    try {
      await processPayment({
        invoiceId: inv.invoice_id,
        amount: parseFloat(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        transactionReference: payForm.transactionReference,
        notes: payForm.notes
      });

      alert(`Payment processed via stored procedure sp_process_payment! Invoice status updated.`);
      setShowPayModal(false);
      if (showDetailModal) {
        const refreshed = await fetchInvoiceDetails(inv.invoice_id);
        setSelectedInvoice(refreshed);
      }
      loadInvoices(pagination.page);
    } catch (err) {
      alert('Payment execution failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const columns = [
    { header: 'Invoice #', accessor: 'invoice_number', render: row => <span className="font-semibold text-primary">{row.invoice_number}</span> },
    { 
      header: 'Issue Date', 
      accessor: 'issue_date', 
      render: row => new Date(row.issue_date).toLocaleDateString() 
    },
    { 
      header: 'Patient', 
      render: row => (
        <div>
          <span className="font-semibold text-foreground">{row.patient_name}</span>
          <span className="text-xs text-muted block">{row.patient_code} • {row.patient_phone}</span>
        </div>
      ) 
    },
    { 
      header: 'Total Amount', 
      render: row => (
        <span className="font-mono font-bold text-foreground">
          ${parseFloat(row.total_amount).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Paid Amount', 
      render: row => (
        <span className="font-mono text-emerald-600 font-semibold">
          ${parseFloat(row.paid_amount).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Balance Due', 
      render: row => (
        <span className={`font-mono font-bold ${parseFloat(row.balance_due) > 0 ? 'text-danger' : 'text-muted'}`}>
          ${parseFloat(row.balance_due).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Status', 
      render: row => {
        const colors = {
          Unpaid: 'badge-danger',
          'Partially Paid': 'badge-warning',
          Paid: 'badge-success',
          Cancelled: 'badge-neutral'
        };
        return <span className={`badge ${colors[row.status] || 'badge-neutral'}`}>{row.status}</span>;
      } 
    },
    {
      header: 'Actions',
      render: row => (
        <div className="flex gap-2">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => openInvoiceDetails(row.invoice_id)}
          >
            <Eye size={14} /> View
          </button>
          {['Admin', 'Accountant', 'Receptionist'].includes(user?.role) && parseFloat(row.balance_due) > 0 && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => openPayInvoice(row)}
            >
              <CreditCard size={14} /> Pay
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Receipt className="text-primary" /> Billing & Invoices
          </h1>
          <p className="page-subtitle">Itemized invoices, automatic fee schedules, tax calculation, and payment reconciliation</p>
        </div>
        <div>
          {['Admin', 'Accountant', 'Receptionist'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={openNewInvoiceModal}>
              <Plus size={16} /> Create New Invoice
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
              placeholder="Search invoice number, patient code, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInvoices(1)}
            />
          </div>
          <select 
            className="input text-sm w-48" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Fully Paid</option>
          </select>
          {(searchQuery || statusFilter) && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearchQuery(''); setStatusFilter(''); loadInvoices(1); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <DataTable 
        columns={columns}
        data={invoices}
        loading={loading}
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        onPageChange={loadInvoices}
      />

      {/* Create Invoice Modal */}
      <Modal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate Itemized Patient Invoice"
        size="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-5">
          {/* Patient Selection */}
          <div>
            <label className="label">1. Select Patient *</label>
            {!selectedPatient ? (
              <div>
                <input 
                  type="text" 
                  className="input mb-2" 
                  placeholder="Type patient name, code, or phone number..."
                  value={patientSearch}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                />
                {patientSearchResults.length > 0 && (
                  <div className="border border-border rounded max-h-40 overflow-y-auto divide-y divide-border">
                    {patientSearchResults.map(p => (
                      <div 
                        key={p.patient_id}
                        className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-sm"
                        onClick={() => selectPatientForInvoice(p)}
                      >
                        <div>
                          <span className="font-semibold">{p.first_name} {p.last_name}</span> ({p.patient_code})
                          <span className="text-xs text-muted ml-2">{p.phone}</span>
                        </div>
                        <span className="text-xs badge badge-info">{p.gender}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex justify-between items-center">
                <div>
                  <span className="font-semibold text-emerald-900">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                  <span className="text-xs text-emerald-700 ml-2">ID: {selectedPatient.patient_code} | Phone: {selectedPatient.phone}</span>
                  {patientBalance !== null && (
                    <div className="text-xs font-semibold text-danger mt-1">
                      Function fn_calculate_patient_balance: Outstanding Due: ${parseFloat(patientBalance).toFixed(2)}
                    </div>
                  )}
                </div>
                <button 
                  type="button" 
                  className="text-xs text-red-600 underline"
                  onClick={() => setSelectedPatient(null)}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">2. Billable Hospital Services & Items *</label>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={addInvoiceItem}
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-border text-xs text-muted uppercase">
                  <tr>
                    <th className="p-2 text-left">Service / Catalog</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right w-20">Qty</th>
                    <th className="p-2 text-right w-24">Price ($)</th>
                    <th className="p-2 text-right w-24">Disc ($)</th>
                    <th className="p-2 text-right w-24">Total ($)</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoiceItems.map((item, idx) => {
                    const lineTotal = (parseInt(item.quantity || 1) * parseFloat(item.unitPrice || 0)) - parseFloat(item.discount || 0);
                    return (
                      <tr key={idx}>
                        <td className="p-2">
                          <select 
                            className="input text-xs py-1"
                            value={item.serviceId || ''}
                            onChange={(e) => updateInvoiceItem(idx, 'serviceId', e.target.value)}
                          >
                            <option value="">-- Custom Line --</option>
                            {services.map(s => (
                              <option key={s.service_id} value={s.service_id}>
                                {s.service_name} (${parseFloat(s.standard_price).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            className="input text-xs py-1"
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(idx, 'description', e.target.value)}
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            min="1"
                            className="input text-xs py-1 font-mono text-right"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(idx, 'quantity', e.target.value)}
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            step="0.01"
                            className="input text-xs py-1 font-mono text-right"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(idx, 'unitPrice', e.target.value)}
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            step="0.01"
                            className="input text-xs py-1 font-mono text-right"
                            value={item.discount}
                            onChange={(e) => updateInvoiceItem(idx, 'discount', e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-semibold">
                          ${lineTotal.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          {invoiceItems.length > 1 && (
                            <button 
                              type="button" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => removeInvoiceItem(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-50 border border-border rounded p-4 flex justify-between items-center text-sm">
            <div className="text-xs text-muted">
              Standard 5% medical tax calculated on taxable subtotal.
            </div>
            <div className="w-64 space-y-1 text-right font-mono">
              <div className="flex justify-between text-muted">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Discount:</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Tax (5%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-foreground pt-1 border-t border-border">
                <span>Total Amount:</span>
                <span className="text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Billing Notes</label>
            <input 
              type="text" 
              className="input" 
              value={invoiceNotes} 
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submittingInvoice}>
              {submittingInvoice ? 'Generating Invoice...' : 'Generate & Commit Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Details / Printable Receipt Modal */}
      {selectedInvoice && showDetailModal && (
        <Modal 
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Hospital Invoice: ${selectedInvoice.invoice.invoice_number}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-start p-4 bg-slate-50 border border-border rounded">
              <div>
                <h3 className="font-bold text-lg text-primary">City General Hospital</h3>
                <p className="text-xs text-muted">123 Health Ave, Medical District • Tel: +1 (555) 0199</p>
                <div className="mt-3 text-xs">
                  <span className="text-muted">Billed To: </span>
                  <span className="font-bold">{selectedInvoice.invoice.patient_name}</span> ({selectedInvoice.invoice.patient_code})
                  <div className="text-muted">{selectedInvoice.invoice.phone} • {selectedInvoice.invoice.address}</div>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-bold text-base text-foreground">{selectedInvoice.invoice.invoice_number}</div>
                <div className="text-muted">Issue Date: {new Date(selectedInvoice.invoice.issue_date).toLocaleDateString()}</div>
                <div className="text-muted">Due Date: {new Date(selectedInvoice.invoice.due_date).toLocaleDateString()}</div>
                <div className="mt-2">
                  <span className={`badge ${selectedInvoice.invoice.status === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                    {selectedInvoice.invoice.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-border text-xs text-muted uppercase">
                  <tr>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Discount</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedInvoice.items.map(item => (
                    <tr key={item.item_id}>
                      <td className="p-3 font-medium">{item.item_description}</td>
                      <td className="p-3 text-right font-mono">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">${parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-muted">${parseFloat(item.discount).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-semibold">${parseFloat(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Reconciliation */}
            <div className="flex justify-end">
              <div className="w-72 space-y-1.5 text-sm font-mono">
                <div className="flex justify-between text-muted">
                  <span>Subtotal:</span>
                  <span>${parseFloat(selectedInvoice.invoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Discount:</span>
                  <span>-${parseFloat(selectedInvoice.invoice.discount_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Tax (5%):</span>
                  <span>+${parseFloat(selectedInvoice.invoice.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground border-t border-border pt-1">
                  <span>Total Amount:</span>
                  <span>${parseFloat(selectedInvoice.invoice.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Total Paid:</span>
                  <span>${parseFloat(selectedInvoice.invoice.paid_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-danger border-t border-border pt-1">
                  <span>Balance Due:</span>
                  <span>${parseFloat(selectedInvoice.invoice.balance_due).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {selectedInvoice.payments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Payment Receipts</h4>
                <div className="border border-border rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-border text-muted">
                      <tr>
                        <th className="p-2 text-left">Receipt #</th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Method</th>
                        <th className="p-2 text-left">Reference</th>
                        <th className="p-2 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedInvoice.payments.map(p => (
                        <tr key={p.payment_id}>
                          <td className="p-2 font-mono font-semibold text-primary">{p.payment_number}</td>
                          <td className="p-2">{new Date(p.payment_date).toLocaleString()}</td>
                          <td className="p-2"><span className="badge badge-info">{p.payment_method}</span></td>
                          <td className="p-2 font-mono text-muted">{p.transaction_reference || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600">${parseFloat(p.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              {['Admin', 'Accountant', 'Receptionist'].includes(user?.role) && parseFloat(selectedInvoice.invoice.balance_due) > 0 ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => { setShowDetailModal(false); openPayInvoice(selectedInvoice.invoice); }}
                >
                  <CreditCard size={16} /> Record Payment
                </button>
              ) : <div />}
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {selectedInvoice && showPayModal && (
        <Modal 
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          title={`Process Payment: ${selectedInvoice.invoice.invoice_number}`}
        >
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-border rounded text-sm flex justify-between">
              <div>
                <span className="text-xs text-muted block">Total Invoiced</span>
                <span className="font-mono font-semibold">${parseFloat(selectedInvoice.invoice.total_amount).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Remaining Balance</span>
                <span className="font-mono font-bold text-danger">${parseFloat(selectedInvoice.invoice.balance_due).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="label">Payment Amount ($) *</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"
                max={parseFloat(selectedInvoice.invoice.balance_due)}
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
                  <option value="MFS (bKash/Nagad)">MFS (Mobile Financial Services)</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Bank Transfer">Bank Transfer</option>
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
              <label className="label">Cashier Remarks</label>
              <input 
                type="text" 
                className="input" 
                value={payForm.notes} 
                onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
              ⚡ <strong>PostgreSQL Stored Routine:</strong> Executes <code>CALL sp_process_payment(invoice_id, amount, method, ref, user_id, payment_id)</code> and triggers <code>trg_recalculate_invoice_balance</code> to automatically adjust invoice status.
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submittingPayment}>
                {submittingPayment ? 'Processing...' : 'Execute Payment Transaction'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
