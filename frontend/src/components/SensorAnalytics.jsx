import React, { useEffect, useState } from 'react';
import { getSensors } from '../services/api';

const LIMIT = 10;

const SensorAnalytics = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getSensors({ limit: LIMIT, offset });
        if (response && response.data) {
          setData(response.data);
          setTotal(response.total || 0);
        } else {
          setData([]);
          setTotal(0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [offset]);

  const handlePrev = () => setOffset(prev => Math.max(0, prev - LIMIT));
  const handleNext = () => setOffset(prev => prev + LIMIT);

  if (loading && data.length === 0) return <div className="card state-container">Loading sensor data...</div>;
  if (error) return <div className="card state-container error">Error: {error}</div>;

  return (
    <div className="card">
      <div className="chart-header">
        <h3 className="chart-title">Sensor Analytics</h3>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sensor ID</th>
              <th>Total Predictions</th>
              <th>Low</th>
              <th>Medium</th>
              <th>High</th>
              <th>High Congestion %</th>
            </tr>
          </thead>
          <tbody>
            {data.map(sensor => (
              <tr key={sensor.sensor_id}>
                <td style={{ fontWeight: 600 }}>{sensor.sensor_id}</td>
                <td>{sensor.total_predictions.toLocaleString()}</td>
                <td style={{ color: 'var(--color-low)' }}>{sensor.low_count.toLocaleString()}</td>
                <td style={{ color: 'var(--color-medium)' }}>{sensor.medium_count.toLocaleString()}</td>
                <td style={{ color: 'var(--color-high)' }}>{sensor.high_count.toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, backgroundColor: 'var(--color-low-bg)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${sensor.high_congestion_percentage}%`, 
                          backgroundColor: 'var(--color-high)', 
                          height: '100%' 
                        }} 
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>
                      {sensor.high_congestion_percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No sensor data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span className="pagination-info">
          Showing {offset + 1} to {Math.min(offset + LIMIT, total)} of {total} sensors
        </span>
        <button 
          className="pagination-btn" 
          onClick={handlePrev} 
          disabled={offset === 0 || loading}
        >
          Previous
        </button>
        <button 
          className="pagination-btn" 
          onClick={handleNext} 
          disabled={offset + LIMIT >= total || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SensorAnalytics;
