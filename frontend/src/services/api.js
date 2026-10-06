const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper to handle fetch responses and error reporting
 */
async function fetchApi(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `API Error: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

export const getHealth = () => fetchApi('/health');

export const getSummary = () => fetchApi('/analytics/summary');

export const getCongestionDistribution = () => fetchApi('/analytics/congestion-distribution');

export const getSensors = ({ limit = 100, offset = 0 } = {}) => {
  const query = new URLSearchParams();
  query.append('limit', limit);
  query.append('offset', offset);
  return fetchApi(`/analytics/sensors?${query.toString()}`);
};

export const getTimeseries = ({ limit = 100, offset = 0, sensorId, startTime, endTime } = {}) => {
  const query = new URLSearchParams();
  query.append('limit', limit);
  query.append('offset', offset);
  if (sensorId) query.append('sensor_id', sensorId);
  if (startTime) query.append('start_time', startTime);
  if (endTime) query.append('end_time', endTime);
  return fetchApi(`/analytics/timeseries?${query.toString()}`);
};

export const getPredictions = ({ limit = 100, offset = 0, sensorId, congestionClass, startTime, endTime } = {}) => {
  const query = new URLSearchParams();
  query.append('limit', limit);
  query.append('offset', offset);
  if (sensorId) query.append('sensor_id', sensorId);
  if (congestionClass) query.append('congestion_class', congestionClass);
  if (startTime) query.append('start_time', startTime);
  if (endTime) query.append('end_time', endTime);
  return fetchApi(`/predictions?${query.toString()}`);
};
