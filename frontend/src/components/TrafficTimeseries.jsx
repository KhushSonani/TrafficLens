import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTimeseries } from '../services/api';

const COLORS = {
  LOW: '#10b981', 
  MEDIUM: '#f59e0b', 
  HIGH: '#ef4444'
};

const TrafficTimeseries = ({ selectedSensor }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getTimeseries({ 
          sensorId: selectedSensor !== 'all' ? selectedSensor : undefined,
          limit: 100 
        });
        
        if (response && response.data) {
          const formatted = response.data.map(d => ({
            ...d,
            timeLabel: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setData(formatted);
        } else {
          setData([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedSensor]);

  if (loading) return <div className="card chart-container large state-container">Loading timeseries...</div>;
  if (error) return <div className="card chart-container large state-container error">Error: {error}</div>;
  if (!data.length) return <div className="card chart-container large state-container">No traffic data available for the selected filters.</div>;

  return (
    <div className="card chart-container large">
      <div className="chart-header">
        <h3 className="chart-title">Congestion Trend Over Time</h3>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {selectedSensor === 'all' ? 'All Sensors' : `Sensor ID: ${selectedSensor}`}
        </span>
      </div>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.LOW} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.LOW} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.MEDIUM} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.MEDIUM} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.HIGH} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.HIGH} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#64748b'}} stroke="#cbd5e1" />
            <YAxis tick={{fontSize: 12, fill: '#64748b'}} stroke="#cbd5e1" />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
            />
            <Legend verticalAlign="top" height={36} />
            <Area type="monotone" dataKey="high_count" name="High Congestion" stroke={COLORS.HIGH} fillOpacity={1} fill="url(#colorHigh)" stackId="1" />
            <Area type="monotone" dataKey="medium_count" name="Medium Congestion" stroke={COLORS.MEDIUM} fillOpacity={1} fill="url(#colorMedium)" stackId="1" />
            <Area type="monotone" dataKey="low_count" name="Low Congestion" stroke={COLORS.LOW} fillOpacity={1} fill="url(#colorLow)" stackId="1" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrafficTimeseries;
