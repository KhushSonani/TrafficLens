import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, BarChart2, Database } from 'lucide-react';
import { getHealth, getSummary, getSensors } from '../services/api';
import SummaryCards from './SummaryCards';
import CongestionDistribution from './CongestionDistribution';
import TrafficTimeseries from './TrafficTimeseries';
import SensorAnalytics from './SensorAnalytics';
import PredictionExplorer from './PredictionExplorer';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [healthStatus, setHealthStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [summary, setSummary] = useState(null);
  const [sensorList, setSensorList] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('all');
  
  const [globalError, setGlobalError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    setGlobalError(null);
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
      const sensorsData = await getSensors({ limit: 1000 });
      if (sensorsData && sensorsData.data) {
        setSensorList(sensorsData.data.map(s => s.sensor_id).sort());
      }

    } catch (err) {
      setGlobalError('Unable to connect to TrafficLens backend. Please ensure the API server is running.');
      setHealthStatus('Disconnected');
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-title">TrafficLens</h1>
          <p className="dashboard-subtitle">Traffic Congestion Analytics & Prediction</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="pagination-btn" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={loadDashboardData}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            {healthStatus}
          </div>
        </div>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart2 size={18} />
          Analytics Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          <Database size={18} />
          Prediction Explorer
        </button>
      </div>

      {globalError ? (
        <div className="card state-container error" style={{ padding: '3rem' }}>
          <div>
            <h2 style={{ marginBottom: '1rem' }}>{globalError}</h2>
            <button className="pagination-btn" onClick={loadDashboardData}>Retry Connection</button>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="fade-in">
              <SummaryCards summary={summary} />

              <div className="charts-grid">
                <CongestionDistribution />
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="filter-container" style={{ marginBottom: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
            </div>
          )}

          {activeTab === 'explorer' && (
            <div className="fade-in">
              <PredictionExplorer refreshTrigger={isRefreshing} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
