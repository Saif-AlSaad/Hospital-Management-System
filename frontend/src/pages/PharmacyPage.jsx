import React, { useState, useEffect } from 'react';
import { 
  Pill, Plus, Search, Filter, AlertTriangle, PackageCheck, 
  Calendar, Layers, ShieldAlert, DollarSign, History
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { 
  fetchMedicines, fetchMedicineCategories, fetchMedicineBatches, 
  fetchLowStockMedicines, addMedicineBatch 
} from '../services/api';

export default function PharmacyPage({ user }) {
  const [activeTab, setActiveTab] = useState('formulary'); // 'formulary', 'batches', 'low-stock'
  const [categories, setCategories] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Batch Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    medicineId: '',
    batchNumber: '',
    manufactureDate: '',
    expiryDate: '',
    costPrice: '',
    sellingPrice: '',
    initialQuantity: '',
    notes: ''
  });
  const [submittingBatch, setSubmittingBatch] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'formulary') {
      loadMedicines(1);
    } else if (activeTab === 'batches') {
      loadBatches();
    } else if (activeTab === 'low-stock') {
      loadLowStock();
    }
  }, [activeTab, selectedCategory, searchQuery]);

  const loadCategories = async () => {
    try {
      const res = await fetchMedicineCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMedicines = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchMedicines({
        page,
        limit: 10,
        categoryId: selectedCategory || undefined,
        search: searchQuery || undefined
      });
      setMedicines(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await fetchMedicineBatches({ inStockOnly: false });
      setBatches(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLowStock = async () => {
    setLoading(true);
    try {
      const res = await fetchLowStockMedicines();
      setLowStock(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddBatch = (med = null) => {
    setBatchForm({
      medicineId: med ? med.medicine_id : (medicines[0]?.medicine_id || ''),
      batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
      manufactureDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      costPrice: med ? (parseFloat(med.unit_price) * 0.7).toFixed(2) : '10.00',
      sellingPrice: med ? parseFloat(med.unit_price).toFixed(2) : '15.00',
      initialQuantity: '100',
      notes: 'Standard stock replenishment'
    });
    setShowBatchModal(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setSubmittingBatch(true);
    try {
      await addMedicineBatch(batchForm);
      setShowBatchModal(false);
      if (activeTab === 'formulary') loadMedicines(pagination.page);
      else if (activeTab === 'batches') loadBatches();
      else loadLowStock();
    } catch (err) {
      alert('Failed to add inventory batch: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingBatch(false);
    }
  };

  const formularyColumns = [
    { 
      header: 'Drug Name', 
      render: row => (
        <div>
          <span className="font-semibold text-foreground">{row.brand_name}</span>
          <span className="text-xs text-muted block">{row.generic_name}</span>
        </div>
      ) 
    },
    { header: 'Category', accessor: 'category_name' },
    { header: 'Form & Strength', render: row => `${row.dosage_form} (${row.strength})` },
    { header: 'Unit Price', accessor: 'unit_price', render: row => <span className="font-mono font-semibold">৳{parseFloat(row.unit_price).toFixed(2)}</span> },
    { 
      header: 'Total Stock', 
      render: row => (
        <span className="font-mono font-bold text-sm">
          {row.total_stock} <span className="text-xs font-normal text-muted">units</span>
        </span>
      ) 
    },
    {
      header: 'Stock Status',
      render: row => {
        if (row.stock_status === 'OUT_OF_STOCK') return <span className="badge badge-danger">Out of Stock</span>;
        if (row.stock_status === 'LOW_STOCK') return <span className="badge badge-warning">Low Stock ({row.reorder_level} min)</span>;
        return <span className="badge badge-success">Optimal</span>;
      }
    },
    {
      header: 'Actions',
      render: row => (
        ['Admin', 'Doctor'].includes(user?.role) && (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => openAddBatch(row)}
          >
            <Plus size={14} /> Add Stock
          </button>
        )
      )
    }
  ];

  const batchColumns = [
    { header: 'Batch #', accessor: 'batch_number', render: row => <span className="font-mono font-bold text-primary">{row.batch_number}</span> },
    { 
      header: 'Medicine', 
      render: row => (
        <div>
          <span className="font-semibold">{row.brand_name}</span>
          <span className="text-xs text-muted block">{row.generic_name}</span>
        </div>
      ) 
    },
    { header: 'Available Units', accessor: 'current_quantity', render: row => <span className="font-mono font-semibold">{row.current_quantity} / {row.initial_quantity}</span> },
    { header: 'Cost / Sell', render: row => <span className="text-xs font-mono">৳{parseFloat(row.cost_price).toFixed(2)} / ৳{parseFloat(row.selling_price).toFixed(2)}</span> },
    { 
      header: 'Expiry Date', 
      render: row => {
        const isExpired = new Date(row.expiry_date) <= new Date();
        return (
          <span className={`text-xs font-mono ${isExpired ? 'text-danger font-bold' : 'text-muted'}`}>
            {new Date(row.expiry_date).toLocaleDateString()}
          </span>
        );
      } 
    },
    {
      header: 'Status',
      render: row => {
        if (row.expiry_status === 'EXPIRED') return <span className="badge badge-danger">Expired</span>;
        if (row.expiry_status === 'NEAR_EXPIRY') return <span className="badge badge-warning">Near Expiry (&lt;90d)</span>;
        return <span className="badge badge-success">Valid</span>;
      }
    }
  ];

  const lowStockColumns = [
    { 
      header: 'Medicine', 
      render: row => (
        <div>
          <span className="font-semibold text-foreground">{row.brand_name}</span>
          <span className="text-xs text-muted block">{row.generic_name}</span>
        </div>
      ) 
    },
    { header: 'Category', accessor: 'category_name' },
    { header: 'Available Units', accessor: 'total_available_stock', render: row => <span className="font-mono font-bold text-danger text-sm">{row.total_available_stock}</span> },
    { header: 'Reorder Level', accessor: 'reorder_level', render: row => <span className="font-mono text-muted">{row.reorder_level}</span> },
    {
      header: 'Status',
      render: row => row.stock_status === 'OUT_OF_STOCK' ? <span className="badge badge-danger">CRITICAL: Out of Stock</span> : <span className="badge badge-warning">Low Stock Warning</span>
    },
    {
      header: 'Action',
      render: row => (
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => openAddBatch({ medicine_id: row.medicine_id, unit_price: 15.00 })}
        >
          <Plus size={14} /> Reorder Stock
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
            <Pill className="text-primary" /> Pharmacy & Inventory Management
          </h1>
          <p className="page-subtitle">Track hospital medicines, batch expiries, reorder thresholds, and controlled stock movements</p>
        </div>
        <div>
          {['Admin', 'Doctor'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={() => openAddBatch()}>
              <Plus size={16} /> Receive New Stock Batch
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'formulary' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('formulary')}
        >
          Drug Formulary ({pagination.totalRecords})
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'batches' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('batches')}
        >
          Active Batches
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'low-stock' ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted hover:text-foreground'}`}
          onClick={() => setActiveTab('low-stock')}
        >
          <AlertTriangle size={16} className="text-amber-500" />
          Low Stock Alerts ({lowStock.length})
        </button>
      </div>

      {/* Filters (For Formulary) */}
      {activeTab === 'formulary' && (
        <div className="card mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-2.5 text-muted" size={16} />
              <input 
                type="text" 
                className="input pl-9 text-sm" 
                placeholder="Search brand, generic name, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="input text-sm w-56" 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Therapeutic Classes</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
            {(searchQuery || selectedCategory) && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Data Views */}
      {activeTab === 'formulary' && (
        <DataTable 
          columns={formularyColumns}
          data={medicines}
          loading={loading}
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.totalRecords}
          onPageChange={loadMedicines}
        />
      )}

      {activeTab === 'batches' && (
        <DataTable 
          columns={batchColumns}
          data={batches}
          loading={loading}
          showPagination={false}
        />
      )}

      {activeTab === 'low-stock' && (
        <DataTable 
          columns={lowStockColumns}
          data={lowStock}
          loading={loading}
          showPagination={false}
        />
      )}

      {/* Add Stock Batch Modal */}
      <Modal 
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="Receive Inventory Batch & Post Ledger"
        size="md"
      >
        <form onSubmit={handleSaveBatch} className="space-y-4">
          <div>
            <label className="label">Medicine *</label>
            <select 
              className="input" 
              value={batchForm.medicineId} 
              onChange={(e) => setBatchForm({...batchForm, medicineId: e.target.value})}
              required
            >
              {medicines.map(m => (
                <option key={m.medicine_id} value={m.medicine_id}>
                  {m.brand_name} ({m.generic_name}) - {m.strength}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Batch Number *</label>
              <input 
                type="text" 
                className="input font-mono" 
                value={batchForm.batchNumber} 
                onChange={(e) => setBatchForm({...batchForm, batchNumber: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label">Quantity Received *</label>
              <input 
                type="number" 
                className="input font-mono" 
                min="1"
                value={batchForm.initialQuantity} 
                onChange={(e) => setBatchForm({...batchForm, initialQuantity: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Manufacture Date *</label>
              <input 
                type="date" 
                className="input" 
                value={batchForm.manufactureDate} 
                onChange={(e) => setBatchForm({...batchForm, manufactureDate: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label">Expiry Date *</label>
              <input 
                type="date" 
                className="input" 
                value={batchForm.expiryDate} 
                onChange={(e) => setBatchForm({...batchForm, expiryDate: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cost Price ($)</label>
              <input 
                type="number" 
                step="0.01"
                className="input font-mono" 
                value={batchForm.costPrice} 
                onChange={(e) => setBatchForm({...batchForm, costPrice: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label">Selling Price ($)</label>
              <input 
                type="number" 
                step="0.01"
                className="input font-mono" 
                value={batchForm.sellingPrice} 
                onChange={(e) => setBatchForm({...batchForm, sellingPrice: e.target.value})}
                required 
              />
            </div>
          </div>

          <div>
            <label className="label">Purchase Order Notes</label>
            <input 
              type="text" 
              className="input" 
              value={batchForm.notes} 
              onChange={(e) => setBatchForm({...batchForm, notes: e.target.value})}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
            ℹ️ <strong>Database Operation:</strong> Submitting this batch executes a transactional INSERT into <code>medicine_batches</code> and logs a <code>Purchase</code> entry in <code>inventory_transactions</code>.
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submittingBatch}>
              {submittingBatch ? 'Posting...' : 'Commit Inventory Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
