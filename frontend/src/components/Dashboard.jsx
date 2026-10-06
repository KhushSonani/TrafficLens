import React, { useEffect, useState } from 'react';
import { getHealth, getSummary, getSensors } from '../services/api';
import SummaryCards from './SummaryCards';
import CongestionDistribution from './CongestionDistribution';
import TrafficTimeseries from './TrafficTimeseries';
import SensorAnalytics from './SensorAnalytics';

const Dashboard = () => {
  const [healthStatus, setHealthStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);
  
  const [summary, setSummary] = useState(null);
  const [sensorList, setSensorList] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('all');
  
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // 1. Check health
        const health = await getHealth();
        if (health && health.database === 'connected') {
          setHealthStatus('Connected to Database');
          setIsConnected(true);
        } else {
          setHealthStatus('Backend API Unavailable');
          setIsConnected(false);
        }

        // 2. Fetch summary
        const summaryData = await getSummary();
        setSummary(summaryData);

        // 3. Fetch all sensors for the filter dropdown
        // The summary API returns total_sensors. We can fetch them.
        const sensorsData = await getSensors({ limit: 1000 });
        if (sensorsData && sensorsData.data) {
          setSensorList(sensorsData.data.map(s => s.sensor_id).sort());
        }

      } catch (err) {
        setGlobalError('Unable to connect to TrafficLens backend. Please ensure the API server is running.');
        setHealthStatus('Disconnected');
        setIsConnected(false);
      }
    };

    initializeDashboard();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">TrafficLens</h1>
          <p className="dashboard-subtitle">Traffic Congestion Analytics & Prediction</p>
        </div>
        
        <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          {healthStatus}
        </div>
      </header>

      {globalError ? (
        <div className="card state-container error" style={{ padding: '3rem' }}>
          <h2>{globalError}</h2>
        </div>
      ) : (
        <>
          <SummaryCards summary={summary} />

          <div className="charts-grid">
            <CongestionDistribution />
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="filter-container" style={{ marginBottom: '1rem', justifyContent: 'flex-end' }}>
                <label htmlFor="sensor-filter" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  Filter by Sensor:
                </label>
                <select 
                  id="sensor-filter"
                  className="filter-select"
                  value={selectedSensor}
                  onChange={(e) => setSelectedSensor(e.target.value)}
                >
                  <option value="all">All Sensors</option>
                  {sensorList.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              <TrafficTimeseries selectedSensor={selectedSensor} />
            </div>
          </div>

          <SensorAnalytics />
        </>
      )}
    </div>
  );
};

export default Dashboard;
