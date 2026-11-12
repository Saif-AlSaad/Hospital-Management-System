import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Plus, Search, Filter, CheckCircle2, Clock, 
  AlertTriangle, FileText, Activity, User, Eye, Stethoscope
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { 
  fetchLabOrders, fetchLabCatalog, fetchLabOrderDetails, 
  createLabOrder, recordLabResult, searchPatients, fetchDoctors 
} from '../services/api';

export default function LaboratoryPage({ user }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'catalog'
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // New Order Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [orderPriority, setOrderPriority] = useState('Routine');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Result entry form state
  const [resultForm, setResultForm] = useState({
    parameterName: '',
    measuredValue: '',
    unit: '',
    referenceRange: '',
    isAbnormal: false,
    remarks: ''
  });
  const [submittingResult, setSubmittingResult] = useState(false);

  useEffect(() => {
    loadOrders(1);
    loadCatalog();
  }, [statusFilter, priorityFilter]);

  const loadOrders = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchLabOrders({
        page,
        limit: 10,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined
      });
      setOrders(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load lab orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await fetchLabCatalog();
      setCatalog(res.data || []);
    } catch (err) {
      console.error('Failed to load lab catalog:', err);
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

  const openNewOrderModal = async () => {
    setShowOrderModal(true);
    setSelectedPatient(null);
    setPatientSearch('');
    setSelectedTests([]);
    setOrderPriority('Routine');
    try {
      const res = await fetchDoctors({ active: true });
      setDoctorsList(res.data || []);
      if (res.data?.length > 0) setSelectedDoctorId(res.data[0].doctor_id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTestSelection = (testId) => {
    if (selectedTests.includes(testId)) {
      setSelectedTests(selectedTests.filter(id => id !== testId));
    } else {
      setSelectedTests([...selectedTests, testId]);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctorId || selectedTests.length === 0) {
      alert('Please select a patient, a referring doctor, and at least one lab test.');
      return;
    }
    setSubmittingOrder(true);
    try {
      await createLabOrder({
        patientId: selectedPatient.patient_id,
        doctorId: parseInt(selectedDoctorId),
        priority: orderPriority,
        testIds: selectedTests
      });
      setShowOrderModal(false);
      loadOrders(1);
    } catch (err) {
      alert('Error creating lab order: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingOrder(false);
    }
  };

  const openOrderDetails = async (orderId) => {
    try {
      const res = await fetchLabOrderDetails(orderId);
      setSelectedOrder(res);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load lab order details');
    }
  };

  const openResultEntryModal = (item) => {
    setSelectedItem(item);
    setResultForm({
      parameterName: item.test_name,
      measuredValue: '',
      unit: item.units || '',
      referenceRange: item.normal_range || '',
      isAbnormal: false,
      remarks: ''
    });
    setShowResultModal(true);
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!resultForm.parameterName || !resultForm.measuredValue) {
      alert('Parameter name and measured value are required.');
      return;
    }
    setSubmittingResult(true);
    try {
      await recordLabResult(selectedOrder.order.order_id, selectedItem.order_item_id, resultForm);
      setShowResultModal(false);
      // Reload order details
      const updated = await fetchLabOrderDetails(selectedOrder.order.order_id);
      setSelectedOrder(updated);
      loadOrders(pagination.page);
    } catch (err) {
      alert('Failed to record result: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingResult(false);
    }
  };

  const orderColumns = [
    { header: 'Order #', accessor: 'order_number', render: row => <span className="font-semibold text-primary">{row.order_number}</span> },
    { 
      header: 'Date', 
      accessor: 'order_date', 
      render: row => new Date(row.order_date).toLocaleDateString() + ' ' + new Date(row.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    },
    { 
      header: 'Patient', 
      render: row => (
        <div>
          <div className="font-semibold">{row.patient_name}</div>
          <div className="text-xs text-muted">{row.patient_code} • {row.patient_phone}</div>
        </div>
      ) 
    },
    { 
      header: 'Ordering Doctor', 
      render: row => (
        <div className="text-sm">
          <div>{row.doctor_name}</div>
        </div>
      ) 
    },
    { 
      header: 'Priority', 
      render: row => {
        const colors = {
          Routine: 'badge-info',
          Urgent: 'badge-warning',
          Stat: 'badge-danger'
        };
        return <span className={`badge ${colors[row.priority] || 'badge-neutral'}`}>{row.priority}</span>;
      } 
    },
    { 
      header: 'Progress', 
      render: row => (
        <div className="text-xs">
          <span className="font-medium text-primary">{row.completed_items_count || 0}</span> / {row.total_items_count || 0} Completed
        </div>
      ) 
    },
    { 
      header: 'Status', 
      render: row => {
        const colors = {
          Ordered: 'badge-warning',
          'In Progress': 'badge-info',
          Completed: 'badge-success',
          Cancelled: 'badge-danger'
        };
        return <span className={`badge ${colors[row.status] || 'badge-neutral'}`}>{row.status}</span>;
      } 
    },
    {
      header: 'Actions',
      render: row => (
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => openOrderDetails(row.order_id)}
        >
          <Eye size={14} /> View
        </button>
      )
    }
  ];

  const catalogColumns = [
    { header: 'Code', accessor: 'test_code', render: row => <span className="badge badge-info">{row.test_code}</span> },
    { header: 'Test Name', accessor: 'test_name', render: row => <span className="font-semibold">{row.test_name}</span> },
    { header: 'Category', accessor: 'category_name' },
    { header: 'Sample Type', accessor: 'sample_type' },
    { header: 'Normal Range', accessor: 'normal_range', render: row => row.normal_range ? `${row.normal_range} ${row.units || ''}` : '-' },
    { header: 'Standard Fee', accessor: 'standard_fee', render: row => <span className="font-mono text-emerald-600 font-semibold">৳{parseFloat(row.standard_fee).toFixed(2)}</span> }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FlaskConical className="text-primary" /> Laboratory & Diagnostics
          </h1>
          <p className="page-subtitle">Manage lab test orders, specimens, parameters, and diagnostic test results</p>
        </div>
        <div className="flex gap-2">
          {['Admin', 'Doctor'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={openNewOrderModal}>
              <Plus size={16} /> Order Lab Test
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('orders')}
        >
          Lab Requisitions ({pagination.totalRecords})
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'catalog' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('catalog')}
        >
          Test Catalog ({catalog.length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Filters */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted" />
                <span className="text-sm font-medium">Filter By:</span>
              </div>
              <select 
                className="input text-sm w-44" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Ordered">Ordered</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <select 
                className="input text-sm w-44" 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Stat">Stat (Emergency)</option>
              </select>
              {(statusFilter || priorityFilter) && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <DataTable 
            columns={orderColumns}
            data={orders}
            loading={loading}
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalRecords={pagination.totalRecords}
            onPageChange={loadOrders}
          />
        </>
      ) : (
        <DataTable 
          columns={catalogColumns}
          data={catalog}
          loading={false}
          showPagination={false}
        />
      )}

      {/* Order Lab Test Modal */}
      <Modal 
        isOpen={showOrderModal} 
        onClose={() => setShowOrderModal(false)}
        title="Order Laboratory Requisition"
        size="lg"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
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
                        onClick={() => { setSelectedPatient(p); setPatientSearchResults([]); }}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">2. Ordering Doctor *</label>
              <select 
                className="input" 
                value={selectedDoctorId} 
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                required
              >
                {doctorsList.map(doc => (
                  <option key={doc.doctor_id} value={doc.doctor_id}>
                    Dr. {doc.full_name} ({doc.specialization} - {doc.department_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority Level *</label>
              <select 
                className="input" 
                value={orderPriority} 
                onChange={(e) => setOrderPriority(e.target.value)}
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Stat">Stat (Emergency)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">3. Select Tests to Order ({selectedTests.length} selected) *</label>
            <div className="border border-border rounded max-h-56 overflow-y-auto p-3 grid grid-cols-2 gap-2 bg-slate-50">
              {catalog.map(test => (
                <label 
                  key={test.test_id}
                  className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-xs ${selectedTests.includes(test.test_id) ? 'bg-primary-50 border-primary' : 'bg-white border-border'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedTests.includes(test.test_id)}
                    onChange={() => toggleTestSelection(test.test_id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{test.test_name}</div>
                    <div className="text-muted">{test.category_name} • ${parseFloat(test.standard_fee).toFixed(2)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submittingOrder}>
              {submittingOrder ? 'Placing Order...' : 'Submit Lab Requisition'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lab Order Details & Results Modal */}
      {selectedOrder && (
        <Modal 
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Lab Requisition: ${selectedOrder.order.order_number}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded border border-border text-sm">
              <div>
                <span className="text-xs text-muted block">Patient</span>
                <span className="font-semibold">{selectedOrder.order.patient_name}</span>
                <div className="text-xs text-muted">{selectedOrder.order.patient_code} • {selectedOrder.order.gender}</div>
              </div>
              <div>
                <span className="text-xs text-muted block">Ordering Doctor</span>
                <span className="font-semibold">{selectedOrder.order.doctor_name}</span>
                <div className="text-xs text-muted">{selectedOrder.order.specialization}</div>
              </div>
              <div>
                <span className="text-xs text-muted block">Requisition Status</span>
                <span className="badge badge-info">{selectedOrder.order.status}</span>
                <span className="badge badge-warning ml-2">{selectedOrder.order.priority}</span>
              </div>
            </div>

            {/* Test Items Table */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Ordered Diagnostic Tests</h4>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-border text-xs text-muted uppercase">
                    <tr>
                      <th className="p-3 text-left">Test Name</th>
                      <th className="p-3 text-left">Sample Type</th>
                      <th className="p-3 text-left">Normal Range</th>
                      <th className="p-3 text-left">Result</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedOrder.items.map(item => (
                      <tr key={item.order_item_id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-medium">{item.test_name}</div>
                          <div className="text-xs text-muted">{item.test_code}</div>
                        </td>
                        <td className="p-3 text-xs">{item.sample_type}</td>
                        <td className="p-3 text-xs font-mono">{item.normal_range || '-'} {item.units}</td>
                        <td className="p-3">
                          {item.measured_value ? (
                            <div>
                              <span className={`font-mono font-semibold ${item.is_abnormal ? 'text-danger' : 'text-emerald-600'}`}>
                                {item.measured_value} {item.unit || item.units}
                              </span>
                              {item.is_abnormal && <span className="badge badge-danger text-xs ml-2">Abnormal</span>}
                              {item.remarks && <div className="text-xs text-muted italic mt-0.5">{item.remarks}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted italic">Pending specimen analysis</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`badge ${item.item_status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                            {item.item_status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {['Admin', 'Doctor'].includes(user?.role) && item.item_status !== 'Completed' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => openResultEntryModal(item)}
                            >
                              Enter Result
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Lab Result Modal */}
      {selectedItem && (
        <Modal 
          isOpen={showResultModal} 
          onClose={() => setShowResultModal(false)}
          title={`Record Diagnostic Result: ${selectedItem.test_name}`}
        >
          <form onSubmit={handleSaveResult} className="space-y-4">
            <div>
              <label className="label">Parameter Tested *</label>
              <input 
                type="text" 
                className="input" 
                value={resultForm.parameterName} 
                onChange={(e) => setResultForm({...resultForm, parameterName: e.target.value})} 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Measured Value *</label>
                <input 
                  type="text" 
                  className="input font-mono" 
                  placeholder="e.g. 13.5, Positive, 120"
                  value={resultForm.measuredValue} 
                  onChange={(e) => setResultForm({...resultForm, measuredValue: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label className="label">Unit of Measure</label>
                <input 
                  type="text" 
                  className="input font-mono" 
                  placeholder="e.g. g/dL, mg/dL, mmol/L"
                  value={resultForm.unit} 
                  onChange={(e) => setResultForm({...resultForm, unit: e.target.value})} 
                />
              </div>
            </div>
            <div>
              <label className="label">Reference Range</label>
              <input 
                type="text" 
                className="input font-mono" 
                value={resultForm.referenceRange} 
                onChange={(e) => setResultForm({...resultForm, referenceRange: e.target.value})} 
              />
            </div>
            <div className="p-3 bg-slate-50 border border-border rounded">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={resultForm.isAbnormal}
                  onChange={(e) => setResultForm({...resultForm, isAbnormal: e.target.checked})}
                />
                <span className="text-sm font-semibold text-danger">Flag as Clinically Abnormal Result</span>
              </label>
            </div>
            <div>
              <label className="label">Diagnostic Remarks</label>
              <textarea 
                className="input" 
                rows="2" 
                placeholder="Diagnostic observations, specimen quality, or clinical notes..."
                value={resultForm.remarks}
                onChange={(e) => setResultForm({...resultForm, remarks: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button type="button" className="btn btn-secondary" onClick={() => setShowResultModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submittingResult}>
                {submittingResult ? 'Saving...' : 'Commit & Finalize Result'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
