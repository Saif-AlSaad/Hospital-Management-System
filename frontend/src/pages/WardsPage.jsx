// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Wards, Rooms & Interactive Bed Status Grid
// Powered by View v_bed_occupancy_by_ward & Function fn_get_available_beds
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Hotel,
  BedDouble,
  CheckCircle2,
  AlertCircle,
  Wrench,
  RefreshCw,
  Users
} from 'lucide-react';
import { api } from '../services/api';

export default function WardsPage() {
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [beds, setBeds] = useState([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [loadingBeds, setLoadingBeds] = useState(false);

  const fetchWards = async () => {
    setLoadingWards(true);
    try {
      const res = await api.getWards();
      setWards(res.data);
      if (res.data.length > 0 && !selectedWardId) {
        setSelectedWardId(res.data[0].ward_id);
      }
    } catch (err) {
      console.error('Failed to load wards:', err);
    } finally {
      setLoadingWards(false);
    }
  };

  const fetchWardBeds = async (wardId) => {
    if (!wardId) return;
    setLoadingBeds(true);
    try {
      const res = await api.getWardBeds(wardId);
      setBeds(res.data);
    } catch (err) {
      console.error('Failed to load ward beds:', err);
    } finally {
      setLoadingBeds(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  useEffect(() => {
    if (selectedWardId) {
      fetchWardBeds(selectedWardId);
    }
  }, [selectedWardId]);

  const handleToggleMaintenance = async (bedId, currentStatus) => {
    const nextStatus = currentStatus === 'Maintenance' ? 'Available' : 'Maintenance';
    try {
      await api.updateBedStatus(bedId, nextStatus);
      fetchWardBeds(selectedWardId);
      fetchWards();
    } catch (err) {
      alert('Error updating bed status: ' + err.message);
    }
  };

  const selectedWard = wards.find((w) => w.ward_id === selectedWardId);

  // Group beds by room
  const bedsByRoom = {};
  beds.forEach((bed) => {
    const roomKey = `Room ${bed.room_number} (${bed.room_type})`;
    if (!bedsByRoom[roomKey]) bedsByRoom[roomKey] = [];
    bedsByRoom[roomKey].push(bed);
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Wards &amp; Bed Occupancy Grid</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Interactive ward facility maps and live bed availability backed by PostgreSQL view <code style={{ color: '#38bdf8' }}>v_bed_occupancy_by_ward</code>.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => { fetchWards(); fetchWardBeds(selectedWardId); }}>
          <RefreshCw size={14} className={loadingWards ? 'spin' : ''} />
          <span>Refresh Occupancy</span>
        </button>
      </div>

      {/* Ward Cards Selector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {wards.map((w) => {
          const isSelected = w.ward_id === selectedWardId;
          const occPct = parseFloat(w.occupancy_percentage || 0);
          return (
            <div
              key={w.ward_id}
              onClick={() => setSelectedWardId(w.ward_id)}
              style={{
                backgroundColor: isSelected ? '#15233e' : '#111b2f',
                border: isSelected ? '2px solid #0284c7' : '1px solid #1e293b',
                borderRadius: '12px',
                padding: '1.15rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 0 15px rgba(2, 132, 199, 0.25)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ color: isSelected ? '#38bdf8' : '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                  {w.ward_name}
                </h4>
                <span className="badge badge-blue">{w.ward_type}</span>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                Department: {w.department_name}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <span>Occupancy:</span>
                <strong>{w.occupied_beds} / {w.total_beds} beds ({occPct}%)</strong>
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: '#0b1120', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, occPct)}%`,
                  height: '100%',
                  backgroundColor: occPct > 80 ? '#f43f5e' : (occPct > 50 ? '#f59e0b' : '#10b981'),
                  borderRadius: '3px',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Ward Visual Bed Matrix */}
      {selectedWard && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                {selectedWard.ward_name} — Visual Bed Layout
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Total: {selectedWard.total_beds} beds • Available: <span style={{ color: '#34d399', fontWeight: 600 }}>{selectedWard.available_beds}</span> • Occupied: <span style={{ color: '#fb7185', fontWeight: 600 }}>{selectedWard.occupied_beds}</span> • Maintenance: <span style={{ color: '#fbbf24', fontWeight: 600 }}>{selectedWard.maintenance_beds}</span>
              </p>
            </div>

            {/* Status Legend */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f43f5e' }} />
                <span>Occupied</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <span>Maintenance</span>
              </div>
            </div>
          </div>

          {loadingBeds ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading bed grid...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {Object.entries(bedsByRoom).map(([roomLabel, roomBeds], idx) => (
                <div key={idx} style={{
                  padding: '1.25rem',
                  backgroundColor: '#0b1120',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.92rem', marginBottom: '1rem' }}>
                    {roomLabel}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {roomBeds.map((bed) => {
                      const isOccupied = bed.status === 'Occupied';
                      const isAvail = bed.status === 'Available';
                      const isMaint = bed.status === 'Maintenance';

                      const borderColor = isOccupied ? '#f43f5e' : (isAvail ? '#10b981' : '#f59e0b');
                      const bgStatus = isOccupied ? 'rgba(244, 63, 94, 0.08)' : (isAvail ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)');

                      return (
                        <div
                          key={bed.bed_id}
                          style={{
                            padding: '1rem',
                            backgroundColor: bgStatus,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{bed.bed_number}</strong>
                              <span className={`badge ${isOccupied ? 'badge-rose' : (isAvail ? 'badge-green' : 'badge-amber')}`}>
                                {bed.status}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                              Rate: ৳{bed.daily_rate}/day
                            </div>

                            {isOccupied && bed.current_patient_name && (
                              <div style={{ padding: '0.45rem', backgroundColor: '#0e172a', borderRadius: '6px', fontSize: '0.76rem', marginBottom: '0.5rem' }}>
                                <div style={{ color: '#fb7185', fontWeight: 600 }}>{bed.current_patient_name}</div>
                                <div style={{ color: '#64748b' }}>{bed.patient_code} • {bed.admission_number}</div>
                              </div>
                            )}
                          </div>

                          {!isOccupied && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleToggleMaintenance(bed.bed_id, bed.status)}
                            >
                              <Wrench size={12} />
                              <span>{isMaint ? 'Set Available' : 'Set Maintenance'}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
