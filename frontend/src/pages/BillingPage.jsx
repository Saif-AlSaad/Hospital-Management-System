// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Billing, Treasury & Accountant Landing Workspace
// Stored Routine (sp_process_payment) + Aging Views + MFS Collections
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Filter, CreditCard, DollarSign, 
  CheckCircle2, Clock, AlertTriangle, Eye, Printer, User, Trash2,
  TrendingUp, ShieldCheck, RefreshCw, Smartphone, Wallet, Building2,
  ChevronRight, ArrowRight
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { 
  fetchInvoices, fetchInvoiceDetails, createInvoice, 
  fetchBillingServices, processPayment, searchPatients, getPatientBalance,
  fetchDebtAging, fetchPayments, fetchDashboardStats
} from '../services/api';

export default function BillingPage({ user, onNavigate }) {
  const isAccountant = user?.role === 'Accountant';
  const roleName = user?.role || 'Staff';

  // Workspace Tabs: 'invoices', 'aging', 'payments'
  const [activeTab, setActiveTab] = useState('invoices');

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Financial Telemetry State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Debt Aging State
  const [debtAging, setDebtAging] = useState([]);
  const [debtAgingLoading, setDebtAgingLoading] = useState(false);

  // Payments Ledger State
  const [payments, setPayments] = useState([]);
  const [paymentsPagination, setPaymentsPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalRecords: 0 });
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Create Invoice Form State
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientBalance, setPatientBalance] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([
    { description: 'General Physician Consultation', serviceId: 1, quantity: 1, unitPrice: 500.00, discount: 0.00 }
  ]);
  const [invoiceNotes, setInvoiceNotes] = useState('Standard outpatient billing');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Quick Pay Form State
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 'bKash',
    transactionReference: 'BK7894321',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    loadInvoices(1);
    loadServices();
    loadFinancialTelemetry();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'aging') {
      loadDebtAging();
    } else if (activeTab === 'payments') {
      loadPayments(1);
    }
  }, [activeTab]);

  const loadFinancialTelemetry = async () => {
    setStatsLoading(true);
    try {
      const res = await fetchDashboardStats();
      setStats(res.stats || null);
    } catch (err) {
      console.error('Failed to load financial telemetry:', err);
    } finally {
      setStatsLoading(false);
    }
  };

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

  const loadDebtAging = async () => {
    setDebtAgingLoading(true);
    try {
      const res = await fetchDebtAging();
      setDebtAging(res.data || []);
    } catch (err) {
      console.error('Failed to load debt aging:', err);
    } finally {
      setDebtAgingLoading(false);
    }
  };

  const loadPayments = async (page = 1) => {
    setPaymentsLoading(true);
    try {
      const res = await fetchPayments({
        page,
        limit: 15,
        paymentMethod: paymentMethodFilter || undefined,
      });
      setPayments(res.data || []);
      if (res.pagination) setPaymentsPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load payments ledger:', err);
    } finally {
      setPaymentsLoading(false);
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
      { description: 'Outpatient Doctor Consultation', serviceId: 1, quantity: 1, unitPrice: 500.00, discount: 0.00 }
    ]);
    setInvoiceNotes('Standard outpatient billing');
    setShowCreateModal(true);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { description: 'Hospital Service', serviceId: services[0]?.service_id || null, quantity: 1, unitPrice: services[0]?.standard_price || 300.00, discount: 0.00 }
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
      alert('Please select a patient from the search results.');
      return;
    }

    setSubmittingInvoice(true);
    try {
      const res = await createInvoice({
        patientId: selectedPatient.patient_id,
        items: invoiceItems.map(item => ({
          serviceId: item.serviceId ? parseInt(item.serviceId) : null,
          itemDescription: item.description,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount || 0)
        })),
        notes: invoiceNotes
      });

      setToastMessage(`Invoice #${res.invoice?.invoice_number || 'CREATED'} generated successfully!`);
      setTimeout(() => setToastMessage(null), 5000);

      setShowCreateModal(false);
      loadInvoices(1);
      loadFinancialTelemetry();
    } catch (err) {
      alert('Failed to generate invoice: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const openInvoiceDetails = async (invoiceId) => {
    try {
      const data = await fetchInvoiceDetails(invoiceId);
      setSelectedInvoice(data);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load invoice details: ' + err.message);
    }
  };

  const openPayInvoice = (inv) => {
    setSelectedInvoice({ invoice: inv, items: [], payments: [] });
    setPayForm({
      amount: inv.balance_due,
      paymentMethod: 'bKash',
      transactionReference: `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: 'Counter settlement'
    });
    setShowPayModal(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const inv = selectedInvoice.invoice;
    if (parseFloat(payForm.amount) <= 0 || parseFloat(payForm.amount) > parseFloat(inv.balance_due)) {
      alert(`Payment amount must be between ৳1.00 and remaining balance of ৳${parseFloat(inv.balance_due).toFixed(2)}.`);
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

      setToastMessage(`Payment of ৳${parseFloat(payForm.amount).toFixed(2)} settled via sp_process_payment!`);
      setTimeout(() => setToastMessage(null), 5000);

      setShowPayModal(false);
      if (showDetailModal) {
        const refreshed = await fetchInvoiceDetails(inv.invoice_id);
        setSelectedInvoice(refreshed);
      }
      loadInvoices(pagination.page);
      loadFinancialTelemetry();
      if (activeTab === 'aging') loadDebtAging();
      if (activeTab === 'payments') loadPayments(1);
    } catch (err) {
      alert('Payment execution failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Aging Summary Calculations
  const totalOverdueDebt = debtAging.reduce((acc, row) => acc + parseFloat(row.total_debt_due || 0), 0);
  const aging0to30 = debtAging.reduce((acc, row) => acc + parseFloat(row.aging_0_to_30_days || 0), 0);
  const aging31to60 = debtAging.reduce((acc, row) => acc + parseFloat(row.aging_31_to_60_days || 0), 0);
  const aging61to90 = debtAging.reduce((acc, row) => acc + parseFloat(row.aging_61_to_90_days || 0), 0);
  const agingOver90 = debtAging.reduce((acc, row) => acc + parseFloat(row.aging_over_90_days || 0), 0);

  const getMethodBadge = (method) => {
    switch (method) {
      case 'bKash': return { bg: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: 'rgba(236, 72, 153, 0.4)' };
      case 'Nagad': return { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.4)' };
      case 'Rocket': return { bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' };
      case 'Cash': return { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: 'rgba(16, 185, 129, 0.4)' };
      default: return { bg: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', border: 'rgba(2, 132, 199, 0.4)' };
    }
  };

  const invoiceColumns = [
    { 
      header: 'Invoice #', 
      accessor: 'invoice_number', 
      render: row => <span style={{ fontWeight: 700, color: '#38bdf8' }}>{row.invoice_number}</span> 
    },
    { 
      header: 'Issue Date', 
      accessor: 'issue_date', 
      render: row => new Date(row.issue_date).toLocaleDateString() 
    },
    { 
      header: 'Patient', 
      render: row => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.patient_name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{row.patient_code} • {row.patient_phone}</span>
        </div>
      ) 
    },
    { 
      header: 'Total Amount', 
      render: row => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
          ৳{parseFloat(row.total_amount).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Paid Amount', 
      render: row => (
        <span style={{ fontFamily: 'monospace', color: '#34d399', fontWeight: 600 }}>
          ৳{parseFloat(row.paid_amount).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Balance Due', 
      render: row => (
        <span style={{ 
          fontFamily: 'monospace', 
          fontWeight: 700, 
          color: parseFloat(row.balance_due) > 0 ? '#fb7185' : '#64748b' 
        }}>
          ৳{parseFloat(row.balance_due).toFixed(2)}
        </span>
      ) 
    },
    { 
      header: 'Status', 
      render: row => {
        const colors = {
          Unpaid: 'badge-rose',
          'Partially Paid': 'badge-amber',
          Paid: 'badge-green',
          Cancelled: 'badge-blue'
        };
        return <span className={`badge ${colors[row.status] || 'badge-blue'}`}>{row.status}</span>;
      } 
    },
    {
      header: 'Actions',
      render: row => (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => openInvoiceDetails(row.invoice_id)}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            <Eye size={13} /> View
          </button>
          {parseFloat(row.balance_due) > 0 && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => openPayInvoice(row)}
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            >
              <CreditCard size={13} /> Pay (৳)
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{
        backgroundColor: 'var(--bg-main)',
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
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
          }}>
            <Receipt size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {isAccountant ? 'Hospital Treasury & Billing Counter' : 'Hospital Billing & Invoices'}
              </h2>
              {isAccountant && (
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  <ShieldCheck size={13} />
                  Cashier: {user?.fullName || 'Accountant'}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Itemized billing schedules, MFS collections (bKash/Nagad/Rocket), stored routine sp_process_payment, and accounts receivable aging.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onNavigate && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('reports')}
              title="Materialized Performance Reports"
            >
              <TrendingUp size={14} color="#10b981" />
              <span>Financial Reports</span>
            </button>
          )}

          <button 
            className="btn btn-primary btn-sm" 
            onClick={openNewInvoiceModal}
          >
            <Plus size={15} />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
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
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Financial Telemetry Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div className="card stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-info">
            <h3>Revenue Collected Today</h3>
            <div className="stat-value">৳{stats?.revenueToday ? stats.revenueToday.toLocaleString() : '0.00'}</div>
            <div className="stat-subtext">Cash & MFS Settlements</div>
          </div>
          <div className="stat-icon-wrapper">
            <Wallet size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#f43f5e' }}>
          <div className="stat-info">
            <h3>Outstanding Receivables</h3>
            <div className="stat-value">৳{stats?.totalOutstandingDebt ? stats.totalOutstandingDebt.toLocaleString() : '0.00'}</div>
            <div className="stat-subtext">Active hospital debt due</div>
          </div>
          <div className="stat-icon-wrapper">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#0284c7' }}>
          <div className="stat-info">
            <h3>Active Inpatient Beds</h3>
            <div className="stat-value">{stats?.currentInpatients || 0}</div>
            <div className="stat-subtext">Current billable ward stays</div>
          </div>
          <div className="stat-icon-wrapper">
            <Building2 size={22} />
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': '#8b5cf6' }}>
          <div className="stat-info">
            <h3>MFS / Payment Methods</h3>
            <div className="stat-value">bKash / Nagad</div>
            <div className="stat-subtext">Rocket, Cards & Cash Desk</div>
          </div>
          <div className="stat-icon-wrapper">
            <Smartphone size={22} />
          </div>
        </div>
      </div>

      {/* Accountant Tri-Tab Workspace Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-card)',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'invoices' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'invoices' ? '#fbbf24' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Receipt size={16} />
            <span>Invoices Ledger & Cash Counter</span>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: activeTab === 'invoices' ? '#f59e0b' : 'var(--border-card)',
              color: '#000',
              padding: '0.1rem 0.5rem',
              borderRadius: '10px',
              fontWeight: 800,
            }}>
              {pagination.totalRecords || invoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('aging')}
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'aging' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'aging' ? '#fbbf24' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={16} />
            <span>Accounts Receivable & Debt Aging</span>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: activeTab === 'aging' ? '#f43f5e' : 'var(--border-card)',
              color: activeTab === 'aging' ? '#fff' : 'var(--text-main)',
              padding: '0.1rem 0.5rem',
              borderRadius: '10px',
              fontWeight: 800,
            }}>
              {debtAging.length} Overdue
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payments' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'payments' ? '#fbbf24' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CreditCard size={16} />
            <span>Payment Receipts Ledger</span>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: activeTab === 'payments' ? '#10b981' : 'var(--border-card)',
              color: activeTab === 'payments' ? '#fff' : 'var(--text-main)',
              padding: '0.1rem 0.5rem',
              borderRadius: '10px',
              fontWeight: 800,
            }}>
              {paymentsPagination.totalRecords || payments.length}
            </span>
          </button>
        </div>

        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => {
            if (activeTab === 'invoices') loadInvoices(1);
            if (activeTab === 'aging') loadDebtAging();
            if (activeTab === 'payments') loadPayments(1);
            loadFinancialTelemetry();
          }}
          title="Refresh Current View"
        >
          <RefreshCw size={13} className={loading || debtAgingLoading || paymentsLoading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: INVOICES LEDGER & CASH COUNTER */}
      {activeTab === 'invoices' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                  placeholder="Search invoice number, patient code, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadInvoices(1)}
                />
              </div>

              <select 
                className="form-control" 
                style={{ width: '180px', fontSize: '0.85rem' }}
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Payment Statuses</option>
                <option value="Unpaid">Unpaid Invoices</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Fully Paid Invoices</option>
              </select>

              {(searchQuery || statusFilter) && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); loadInvoices(1); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <DataTable 
            columns={invoiceColumns}
            data={invoices}
            loading={loading}
            pagination={pagination}
            onPageChange={loadInvoices}
          />
        </div>
      )}

      {/* TAB 2: ACCOUNTS RECEIVABLE & DEBT AGING */}
      {activeTab === 'aging' && (
        <div>
          {/* Aging Buckets Summary Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>0 - 30 Days (Current)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>৳{aging0to30.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Recent billing cycle</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>31 - 60 Days (Mild Overdue)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>৳{aging31to60.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Reminder notice due</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>61 - 90 Days (Late)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb923c', marginTop: '0.25rem' }}>৳{aging61to90.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Follow-up required</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#fb7185', textTransform: 'uppercase', fontWeight: 700 }}>90+ Days (Severe Overdue)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.25rem' }}>৳{agingOver90.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Escalated collection</div>
            </div>
          </div>

          {/* Aging Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Outstanding Patient Receivables Ledger</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Aggregated across all unpaid and partially paid hospital invoices</p>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#f43f5e', fontWeight: 700 }}>
                Total Cumulative Debt: ৳{totalOverdueDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {debtAgingLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #f59e0b',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  margin: '0 auto 0.75rem auto',
                  animation: 'spin 1s linear infinite',
                }}></div>
                Computing SQL Accounts Receivable Aging Breakdown...
              </div>
            ) : debtAging.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Zero Delinquent Debt</div>
                <p style={{ fontSize: '0.82rem' }}>All issued invoices are fully paid or reconciled.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.84rem' }}>
                  <thead>
                    <tr>
                      <th>Patient Code</th>
                      <th>Patient Name</th>
                      <th>Phone</th>
                      <th style={{ textAlign: 'center' }}>Unpaid Invoices</th>
                      <th style={{ textAlign: 'right' }}>0-30 Days</th>
                      <th style={{ textAlign: 'right' }}>31-60 Days</th>
                      <th style={{ textAlign: 'right' }}>61-90 Days</th>
                      <th style={{ textAlign: 'right' }}>90+ Days</th>
                      <th style={{ textAlign: 'right' }}>Total Debt (৳)</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtAging.map((row) => (
                      <tr key={row.patient_id}>
                        <td style={{ fontWeight: 700, color: 'var(--theme-teal)' }}>{row.patient_code}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.patient_name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{row.phone}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-amber">{row.unpaid_invoices_count}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>৳{parseFloat(row.aging_0_to_30_days).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#fbbf24' }}>৳{parseFloat(row.aging_31_to_60_days).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#fb923c' }}>৳{parseFloat(row.aging_61_to_90_days).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#f43f5e', fontWeight: 700 }}>৳{parseFloat(row.aging_over_90_days).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-main)' }}>৳{parseFloat(row.total_debt_due).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setSearchQuery(row.patient_code);
                              setActiveTab('invoices');
                              loadInvoices(1);
                            }}
                          >
                            <span>Settle</span>
                            <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT RECEIPTS LEDGER */}
      {activeTab === 'payments' && (
        <div>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ width: '200px', fontSize: '0.85rem' }}
                value={paymentMethodFilter}
                onChange={(e) => {
                  setPaymentMethodFilter(e.target.value);
                  loadPayments(1);
                }}
              >
                <option value="">All Payment Gateways</option>
                <option value="bKash">bKash (MFS)</option>
                <option value="Nagad">Nagad (MFS)</option>
                <option value="Rocket">Rocket (MFS)</option>
                <option value="Cash">Cash Counter</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {paymentsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #10b981',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  margin: '0 auto 0.75rem auto',
                  animation: 'spin 1s linear infinite',
                }}></div>
                Loading Real-Time Payment Receipts Ledger...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.84rem' }}>
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Invoice #</th>
                      <th>Date & Time</th>
                      <th>Patient</th>
                      <th>Payment Method</th>
                      <th>Trx Reference</th>
                      <th>Cashier</th>
                      <th style={{ textAlign: 'right' }}>Amount Paid (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const badge = getMethodBadge(p.payment_method);
                      return (
                        <tr key={p.payment_id}>
                          <td style={{ fontWeight: 700, color: '#38bdf8' }}>{p.payment_number}</td>
                          <td style={{ fontWeight: 600, color: '#fbbf24' }}>{p.invoice_number}</td>
                          <td>{new Date(p.payment_date).toLocaleString()}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.patient_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.patient_code}</div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                            }}>
                              {p.payment_method}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {p.transaction_reference || 'N/A'}
                          </td>
                          <td style={{ color: 'var(--text-main)' }}>{p.cashier_username || 'System'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#34d399', fontSize: '0.92rem' }}>
                            ৳{parseFloat(p.amount).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      <Modal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate Itemized Patient Invoice"
        size="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-5">
          {/* Patient Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">1. Select Patient *</label>
            {!selectedPatient ? (
              <div>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ marginBottom: '0.5rem' }}
                  placeholder="Type patient name, code, or phone number..."
                  value={patientSearch}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                />
                {patientSearchResults.length > 0 && (
                  <div style={{
                    border: '1px solid var(--border-card)',
                    borderRadius: '6px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-main)',
                  }}>
                    {patientSearchResults.map(p => (
                      <div 
                        key={p.patient_id}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderBottom: '1px solid var(--border-card)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.82rem',
                        }}
                        onClick={() => selectPatientForInvoice(p)}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.first_name} {p.last_name}</span> ({p.patient_code})
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{p.phone}</span>
                        </div>
                        <span className="badge badge-blue">{p.gender}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>{selectedPatient.first_name} {selectedPatient.last_name}</span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '0.5rem' }}>ID: {selectedPatient.patient_code} | Phone: {selectedPatient.phone}</span>
                  {patientBalance !== null && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fb7185', marginTop: '0.2rem' }}>
                      Existing Debt (fn_calculate_patient_balance): ৳{parseFloat(patientBalance).toFixed(2)}
                    </div>
                  )}
                </div>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => setSelectedPatient(null)}
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>2. Billable Hospital Services & Items *</label>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={addInvoiceItem}
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div style={{ border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)', color: '#94a3b8' }}>
                  <tr>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Service Catalog</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '70px' }}>Qty</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '90px' }}>Price (৳)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '80px' }}>Disc (৳)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '90px' }}>Total (৳)</th>
                    <th style={{ padding: '0.5rem', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => {
                    const lineTotal = (parseInt(item.quantity || 1) * parseFloat(item.unitPrice || 0)) - parseFloat(item.discount || 0);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-card)' }}>
                        <td style={{ padding: '0.4rem' }}>
                          <select 
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
                            value={item.serviceId || ''}
                            onChange={(e) => updateInvoiceItem(idx, 'serviceId', e.target.value)}
                          >
                            <option value="">-- Custom Line --</option>
                            {services.map(s => (
                              <option key={s.service_id} value={s.service_id}>
                                {s.service_name} (৳{parseFloat(s.standard_price).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.4rem' }}>
                          <input 
                            type="text" 
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(idx, 'description', e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ padding: '0.4rem' }}>
                          <input 
                            type="number" 
                            min="1"
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(idx, 'quantity', e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ padding: '0.4rem' }}>
                          <input 
                            type="number" 
                            step="0.01"
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(idx, 'unitPrice', e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ padding: '0.4rem' }}>
                          <input 
                            type="number" 
                            step="0.01"
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}
                            value={item.discount}
                            onChange={(e) => updateInvoiceItem(idx, 'discount', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                          ৳{lineTotal.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                          {invoiceItems.length > 1 && (
                            <button 
                              type="button" 
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
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
          <div style={{
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border-card)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Standard 5% medical tax calculated on taxable subtotal.
            </div>
            <div style={{ width: '220px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Subtotal:</span>
                <span>৳{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Discount:</span>
                <span>-৳{totalDiscount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Tax (5%):</span>
                <span>৳{tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#fbbf24', borderTop: '1px solid var(--border-card)', paddingTop: '0.25rem' }}>
                <span>Total Amount:</span>
                <span>৳{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Billing Notes</label>
            <input 
              type="text" 
              className="form-control" 
              value={invoiceNotes} 
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-card)', paddingTop: '1rem' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '1rem',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
            }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#38bdf8', margin: 0 }}>City General Hospital, Dhaka</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Plot 12, Road 4, Dhanmondi, Dhaka 1205 • Tel: +880 2 9660000</p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Billed To: </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedInvoice.invoice.patient_name}</span> ({selectedInvoice.invoice.patient_code})
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{selectedInvoice.invoice.phone} • {selectedInvoice.invoice.address}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: '#fbbf24' }}>{selectedInvoice.invoice.invoice_number}</div>
                <div style={{ color: 'var(--text-muted)' }}>Issue Date: {new Date(selectedInvoice.invoice.issue_date).toLocaleDateString()}</div>
                <div style={{ color: 'var(--text-muted)' }}>Due Date: {new Date(selectedInvoice.invoice.due_date).toLocaleDateString()}</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className={`badge ${selectedInvoice.invoice.status === 'Paid' ? 'badge-green' : 'badge-rose'}`}>
                    {selectedInvoice.invoice.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                  <tr>
                    <th style={{ padding: '0.6rem', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Discount</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map(item => (
                    <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 600, color: 'var(--text-main)' }}>{item.item_description}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>{item.quantity}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>৳{parseFloat(item.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>৳{parseFloat(item.discount).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--theme-teal)' }}>৳{parseFloat(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Reconciliation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '260px', fontSize: '0.85rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Subtotal:</span>
                  <span>৳{parseFloat(selectedInvoice.invoice.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Discount:</span>
                  <span>-৳{parseFloat(selectedInvoice.invoice.discount_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Tax (5%):</span>
                  <span>+৳{parseFloat(selectedInvoice.invoice.tax_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--text-main)', borderTop: '1px solid var(--border-card)', paddingTop: '0.25rem' }}>
                  <span>Total Amount:</span>
                  <span>৳{parseFloat(selectedInvoice.invoice.total_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontWeight: 700 }}>
                  <span>Total Paid:</span>
                  <span>৳{parseFloat(selectedInvoice.invoice.paid_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#fb7185', borderTop: '1px solid var(--border-card)', paddingTop: '0.25rem' }}>
                  <span>Balance Due:</span>
                  <span>৳{parseFloat(selectedInvoice.invoice.balance_due).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Receipts History */}
            {selectedInvoice.payments.length > 0 && (
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Payment Receipts on this Invoice</h4>
                <div style={{ border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)', color: '#94a3b8' }}>
                      <tr>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Receipt #</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Method</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Reference</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.payments.map(p => (
                        <tr key={p.payment_id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{p.payment_number}</td>
                          <td style={{ padding: '0.5rem' }}>{new Date(p.payment_date).toLocaleString()}</td>
                          <td style={{ padding: '0.5rem' }}><span className="badge badge-blue">{p.payment_method}</span></td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#94a3b8' }}>{p.transaction_reference || '-'}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#34d399' }}>৳{parseFloat(p.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
              {parseFloat(selectedInvoice.invoice.balance_due) > 0 ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => { setShowDetailModal(false); openPayInvoice(selectedInvoice.invoice); }}
                >
                  <CreditCard size={15} /> Record Payment (৳)
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
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Invoiced</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>৳{parseFloat(selectedInvoice.invoice.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Remaining Balance</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fb7185', fontSize: '1.1rem' }}>৳{parseFloat(selectedInvoice.invoice.balance_due).toFixed(2)}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Amount (৳) *</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"
                max={parseFloat(selectedInvoice.invoice.balance_due)}
                className="form-control" 
                style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#34d399' }}
                value={payForm.amount} 
                onChange={(e) => setPayForm({...payForm, amount: e.target.value})}
                required 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select 
                  className="form-control" 
                  value={payForm.paymentMethod} 
                  onChange={(e) => setPayForm({...payForm, paymentMethod: e.target.value})}
                  required
                >
                  <option value="bKash">bKash (MFS)</option>
                  <option value="Nagad">Nagad (MFS)</option>
                  <option value="Rocket">Rocket (MFS)</option>
                  <option value="Cash">Cash Counter</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">MFS / Card Trx Reference</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ fontFamily: 'monospace' }}
                  value={payForm.transactionReference} 
                  onChange={(e) => setPayForm({...payForm, transactionReference: e.target.value})}
                  placeholder="e.g. BK7894321"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cashier Remarks</label>
              <input 
                type="text" 
                className="form-control" 
                value={payForm.notes} 
                onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                placeholder="e.g. Outpatient consultation counter settlement"
              />
            </div>

            <div style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#38bdf8',
            }}>
              ⚡ <strong>PostgreSQL Stored Procedure:</strong> Executes <code>CALL sp_process_payment(...)</code> and automatically executes trigger <code>trg_recalculate_invoice_balance</code> to adjust invoice status and balance.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-card)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submittingPayment}>
                {submittingPayment ? 'Processing in DB...' : 'Execute Payment Transaction'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
