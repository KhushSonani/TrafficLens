import React, { useState, useEffect } from 'react';
import { getPredictions, getSensors } from '../services/api';

const PAGE_LIMIT = 50; // Let's use 50 records per page

const CongestionBadge = ({ level }) => {
  let colorClass = 'status-badge ';
  if (level === 'LOW') colorClass += 'connected';
  else if (level === 'MEDIUM') colorClass += 'status-badge-medium';
  else if (level === 'HIGH') colorClass += 'disconnected';
  else colorClass += 'status-badge-unknown';

  return (
    <span className={colorClass} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
      {level}
    </span>
  );
};

const PredictionExplorer = ({ refreshTrigger }) => {
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sensors, setSensors] = useState([]);
  
  // Filters
  const [sensorId, setSensorId] = useState('all');
  const [congestionFilter, setCongestionFilter] = useState('all');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Pagination
  const [offset, setOffset] = useState(0);
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch sensors for dropdown once
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const response = await getSensors({ limit: 1000 });
        if (response && response.data) {
          setSensors(response.data.map(s => s.sensor_id).sort());
        }
      } catch (err) {
        console.error("Failed to load sensors", err);
      }
    };
    fetchSensors();
  }, []);

  // Fetch predictions whenever filters or pagination changes
  const fetchPredictionsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: PAGE_LIMIT,
        offset
      };
      if (sensorId !== 'all') params.sensorId = sensorId;
      if (congestionFilter !== 'all') params.congestionClass = congestionFilter;
      if (startTime) params.startTime = new Date(startTime).toISOString();
      if (endTime) params.endTime = new Date(endTime).toISOString();

      const response = await getPredictions(params);
      if (response && response.data) {
        setRecords(response.data);
        setTotalRecords(response.total);
      } else {
        setRecords([]);
        setTotalRecords(0);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch predictions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictionsData();
  }, [sensorId, congestionFilter, startTime, endTime, offset, refreshTrigger]);

  // Handle filter changes that require resetting to page 1
  const handleSensorChange = (e) => { setSensorId(e.target.value); setOffset(0); };
  const handleCongestionChange = (e) => { setCongestionFilter(e.target.value); setOffset(0); };
  const handleStartTimeChange = (e) => { setStartTime(e.target.value); setOffset(0); };
  const handleEndTimeChange = (e) => { setEndTime(e.target.value); setOffset(0); };
  
  // Reset all filters
  const handleClearFilters = () => {
    setSensorId('all');
    setCongestionFilter('all');
    setStartTime('');
    setEndTime('');
    setOffset(0);
  };

  const formatProb = (prob) => (prob !== undefined ? (prob * 100).toFixed(2) + '%' : 'N/A');

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div className="chart-header">
        <h2 className="chart-title" style={{ fontSize: '1.5rem' }}>Prediction Explorer</h2>
      </div>

      {/* Filters Section */}
      <div className="summary-grid" style={{ marginBottom: '1.5rem', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sensor ID</label>
          <select className="filter-select" value={sensorId} onChange={handleSensorChange}>
            <option value="all">All Sensors</option>
            {sensors.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Congestion Class</label>
          <select className="filter-select" value={congestionFilter} onChange={handleCongestionChange}>
            <option value="all">All</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Time</label>
          <input type="datetime-local" className="filter-select" value={startTime} onChange={handleStartTimeChange} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Time</label>
          <input type="datetime-local" className="filter-select" value={endTime} onChange={handleEndTimeChange} />
        </div>
      </div>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="pagination-btn" onClick={handleClearFilters}>Clear Filters</button>
      </div>

      {/* State Handling */}
      {error && (
        <div className="state-container error" style={{ minHeight: '150px' }}>
          <div>
            <p style={{ marginBottom: '1rem' }}>{error}</p>
            <button className="pagination-btn" onClick={fetchPredictionsData}>Retry</button>
          </div>
        </div>
      )}

      {loading && !error && (
        <div className="state-container" style={{ minHeight: '150px' }}>Loading predictions...</div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="state-container" style={{ minHeight: '150px' }}>No predictions found for the selected filters.</div>
      )}

      {/* Table */}
      {!loading && !error && records.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Sensor ID</th>
                <th>Actual Congestion</th>
                <th>Predicted Congestion</th>
                <th>Prob (High)</th>
                <th>Prob (Medium)</th>
                <th>Prob (Low)</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={`${r.sensor_id}-${r.timestamp}-${i}`}>
                  <td>{new Date(r.timestamp).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{r.sensor_id}</td>
                  <td><CongestionBadge level={r.actual_congestion} /></td>
                  <td><CongestionBadge level={r.predicted_congestion} /></td>
                  <td style={{ color: 'var(--color-high)' }}>{formatProb(r.probability_high)}</td>
                  <td style={{ color: 'var(--color-medium)' }}>{formatProb(r.probability_medium)}</td>
                  <td style={{ color: 'var(--color-low)' }}>{formatProb(r.probability_low)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination">
        <span className="pagination-info">
          {totalRecords > 0 ? `Showing ${offset + 1} to ${Math.min(offset + PAGE_LIMIT, totalRecords)} of ${totalRecords.toLocaleString()} records` : ''}
        </span>
        <button 
          className="pagination-btn" 
          onClick={() => setOffset(prev => Math.max(0, prev - PAGE_LIMIT))} 
          disabled={offset === 0 || loading}
        >
          Previous
        </button>
        <button 
          className="pagination-btn" 
          onClick={() => setOffset(prev => prev + PAGE_LIMIT)} 
          disabled={offset + PAGE_LIMIT >= totalRecords || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PredictionExplorer;
