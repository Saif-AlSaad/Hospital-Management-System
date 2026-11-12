import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, CheckCircle2, Clock, 
  Pill, AlertCircle, Eye, ShoppingCart, User
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { 
  fetchPrescriptions, fetchPrescriptionDetails, 
  dispensePrescription, fetchMedicineBatches 
} from '../services/api';

export default function PrescriptionsPage({ user }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);
  
  // Dispensing Form state
  // Array of { item_id, medicine_id, brand_name, remaining, batchId, quantity }
  const [dispenseItems, setDispenseItems] = useState([]);
  const [availableBatches, setAvailableBatches] = useState({}); // { medicine_id: [batches] }
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [dispensingLoading, setDispensingLoading] = useState(false);

  useEffect(() => {
    loadPrescriptions(1);
  }, [statusFilter]);

  const loadPrescriptions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchPrescriptions({
        page,
        limit: 10,
        status: statusFilter || undefined
      });
      setPrescriptions(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (rxId) => {
    try {
      const res = await fetchPrescriptionDetails(rxId);
      setSelectedRx(res);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load prescription: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDispense = async (rxId) => {
    try {
      const res = await fetchPrescriptionDetails(rxId);
      setSelectedRx(res);

      // Prepare items that need dispensing
      const eligible = res.items.filter(item => parseInt(item.remaining_to_dispense) > 0);
      if (eligible.length === 0) {
        alert('All items in this prescription have already been fully dispensed.');
        return;
      }

      // Fetch active batches for each medicine
      const batchMap = {};
      const initialDispenseRows = [];

      for (const item of eligible) {
        const batchRes = await fetchMedicineBatches({ medicineId: item.medicine_id, inStockOnly: true });
        const batches = batchRes.data || [];
        batchMap[item.medicine_id] = batches;

        initialDispenseRows.push({
          prescriptionItemId: item.item_id,
          medicineId: item.medicine_id,
          brandName: item.brand_name,
          remaining: parseInt(item.remaining_to_dispense),
          batchId: batches.length > 0 ? batches[0].batch_id : '',
          quantity: parseInt(item.remaining_to_dispense)
        });
      }

      setAvailableBatches(batchMap);
      setDispenseItems(initialDispenseRows);
      setDispenseNotes('Prescription fulfillment via hospital pharmacy');
      setShowDispenseModal(true);
    } catch (err) {
      alert('Failed to prepare dispensing: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDispenseItemChange = (index, field, value) => {
    const updated = [...dispenseItems];
    updated[index][field] = value;
    setDispenseItems(updated);
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    // Validate batches and quantities
    for (const row of dispenseItems) {
      if (!row.batchId) {
        alert(`Please select an inventory batch for ${row.brandName}.`);
        return;
      }
      if (parseInt(row.quantity) <= 0 || parseInt(row.quantity) > row.remaining) {
        alert(`Invalid quantity for ${row.brandName}. Must be between 1 and ${row.remaining}.`);
        return;
      }
    }

    setDispensingLoading(true);
    try {
      await dispensePrescription(selectedRx.prescription.prescription_id, {
        items: dispenseItems.map(i => ({
          prescriptionItemId: i.prescriptionItemId,
          batchId: parseInt(i.batchId),
          quantity: parseInt(i.quantity)
        })),
        notes: dispenseNotes
      });

      alert('Prescription successfully dispensed! Stock balances and patient records updated.');
      setShowDispenseModal(false);
      loadPrescriptions(pagination.page);
    } catch (err) {
      alert('Dispensing failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDispensingLoading(false);
    }
  };

  const columns = [
    { header: 'Rx Number', accessor: 'prescription_number', render: row => <span className="font-semibold text-primary">{row.prescription_number}</span> },
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
      header: 'Prescribing Doctor', 
      render: row => (
        <div>
          <span className="font-medium">{row.doctor_name}</span>
          <span className="text-xs text-muted block">{row.specialization}</span>
        </div>
      ) 
    },
    { 
      header: 'Items', 
      render: row => (
        <span className="text-xs font-semibold">
          {row.total_medicines} drug(s) ({row.total_dispensed_qty} / {row.total_prescribed_qty} units)
        </span>
      ) 
    },
    { 
      header: 'Status', 
      render: row => {
        const colors = {
          Pending: 'badge-warning',
          'Partially Dispensed': 'badge-info',
          Dispensed: 'badge-success',
          Cancelled: 'badge-danger'
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
            onClick={() => openDetails(row.prescription_id)}
          >
            <Eye size={14} /> View
          </button>
          {['Admin', 'Accountant', 'Doctor'].includes(user?.role) && row.status !== 'Dispensed' && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => openDispense(row.prescription_id)}
            >
              <ShoppingCart size={14} /> Dispense
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
            <Pill className="text-primary" /> Medical Prescriptions & Dispensing
          </h1>
          <p className="page-subtitle">Review physician orders, manage batch-level pharmacy fulfillment, and control drug distribution</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <span className="text-sm font-medium">Filter By:</span>
          </div>
          <select 
            className="input text-sm w-52" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="Active">Active Prescriptions</option>
            <option value="Partially Dispensed">Partially Dispensed</option>
            <option value="Dispensed">Fully Dispensed</option>
          </select>
          {statusFilter && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setStatusFilter('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Prescriptions Table */}
      <DataTable 
        columns={columns}
        data={prescriptions}
        loading={loading}
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        onPageChange={loadPrescriptions}
      />

      {/* Prescription Details Modal */}
      {selectedRx && (
        <Modal 
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Prescription: ${selectedRx.prescription.prescription_number}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded border border-border text-sm">
              <div>
                <span className="text-xs text-muted block">Patient</span>
                <span className="font-semibold">{selectedRx.prescription.patient_name}</span>
                <div className="text-xs text-muted">{selectedRx.prescription.patient_code} • {selectedRx.prescription.gender}</div>
              </div>
              <div>
                <span className="text-xs text-muted block">Prescribing Physician</span>
                <span className="font-semibold">{selectedRx.prescription.doctor_name}</span>
                <div className="text-xs text-muted">{selectedRx.prescription.specialization}</div>
              </div>
              <div>
                <span className="text-xs text-muted block">Fulfillment Status</span>
                <span className="badge badge-info">{selectedRx.prescription.status}</span>
                <span className="text-xs text-muted block mt-1">Issued: {new Date(selectedRx.prescription.issue_date).toLocaleDateString()}</span>
              </div>
            </div>

            {selectedRx.prescription.notes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                <strong>Physician Clinical Notes:</strong> {selectedRx.prescription.notes}
              </div>
            )}

            <div>
              <h4 className="font-semibold text-sm mb-3">Prescribed Medication Regimen</h4>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-border text-xs text-muted uppercase">
                    <tr>
                      <th className="p-3 text-left">Medicine</th>
                      <th className="p-3 text-left">Dosage & Frequency</th>
                      <th className="p-3 text-left">Duration</th>
                      <th className="p-3 text-right">Prescribed</th>
                      <th className="p-3 text-right">Dispensed</th>
                      <th className="p-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedRx.items.map(item => (
                      <tr key={item.item_id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-medium text-foreground">{item.brand_name}</div>
                          <div className="text-xs text-muted">{item.generic_name} ({item.dosage_form})</div>
                        </td>
                        <td className="p-3 text-xs">{item.dosage} • {item.frequency}</td>
                        <td className="p-3 text-xs">{item.duration}</td>
                        <td className="p-3 text-right font-mono font-semibold">{item.prescribed_quantity}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-semibold">{item.dispensed_quantity}</td>
                        <td className="p-3 text-right font-mono text-danger font-semibold">{item.remaining_to_dispense}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              {['Admin', 'Doctor'].includes(user?.role) && selectedRx.prescription.status !== 'Dispensed' ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => { setShowDetailModal(false); openDispense(selectedRx.prescription.prescription_id); }}
                >
                  <ShoppingCart size={16} /> Proceed to Dispense
                </button>
              ) : <div />}
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dispense Prescription Modal */}
      {selectedRx && (
        <Modal 
          isOpen={showDispenseModal}
          onClose={() => setShowDispenseModal(false)}
          title={`Dispense Medication: ${selectedRx.prescription.prescription_number}`}
          size="lg"
        >
          <form onSubmit={handleDispenseSubmit} className="space-y-6">
            <div className="p-3 bg-slate-50 border border-border rounded text-sm flex justify-between">
              <div>
                <span className="text-xs text-muted block">Patient</span>
                <span className="font-semibold">{selectedRx.prescription.patient_name}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Prescribing Doctor</span>
                <span className="font-semibold">{selectedRx.prescription.doctor_name}</span>
              </div>
            </div>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-border text-xs text-muted uppercase">
                  <tr>
                    <th className="p-3 text-left">Medicine</th>
                    <th className="p-3 text-left">Select Batch (Inventory Stock)</th>
                    <th className="p-3 text-right">Remaining</th>
                    <th className="p-3 text-right w-32">Dispense Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dispenseItems.map((item, idx) => {
                    const batches = availableBatches[item.medicineId] || [];
                    return (
                      <tr key={item.prescriptionItemId} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-medium">{item.brandName}</div>
                        </td>
                        <td className="p-3">
                          {batches.length === 0 ? (
                            <span className="text-xs text-danger font-semibold">⚠️ No stock available in pharmacy!</span>
                          ) : (
                            <select 
                              className="input text-xs" 
                              value={item.batchId} 
                              onChange={(e) => handleDispenseItemChange(idx, 'batchId', e.target.value)}
                              required
                            >
                              {batches.map(b => (
                                <option key={b.batch_id} value={b.batch_id}>
                                  Batch #{b.batch_number} (Avail: {b.current_quantity}, Exp: {new Date(b.expiry_date).toLocaleDateString()}, ${parseFloat(b.selling_price).toFixed(2)})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-danger">
                          {item.remaining}
                        </td>
                        <td className="p-3 text-right">
                          <input 
                            type="number" 
                            className="input text-xs font-mono text-right"
                            min="1"
                            max={item.remaining}
                            value={item.quantity}
                            onChange={(e) => handleDispenseItemChange(idx, 'quantity', e.target.value)}
                            required
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label className="label">Dispensing Notes</label>
              <input 
                type="text" 
                className="input" 
                value={dispenseNotes} 
                onChange={(e) => setDispenseNotes(e.target.value)}
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              ⚡ <strong>Database Trigger:</strong> Confirming this transaction fires <code>trg_inventory_stock_control</code>, verifying physical stock availability, decrementing batch inventory, and inserting double-entry audit records in <code>inventory_transactions</code> and <code>medicine_dispensing</code>.
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDispenseModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={dispensingLoading}>
                {dispensingLoading ? 'Executing Dispense...' : 'Confirm Pharmacy Dispense'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
