import React from 'react';
import { Target, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

const SummaryCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="card summary-card">
    <div className={`summary-icon ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="summary-content">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  </div>
);

const SummaryCards = ({ summary }) => {
  if (!summary) return null;

  const { total_predictions, total_sensors, prediction_accuracy, congestion_distribution } = summary;
  
  const formattedAccuracy = (prediction_accuracy * 100).toFixed(2) + '%';
  const highCongestion = congestion_distribution?.HIGH?.toLocaleString() || 0;

  return (
    <div className="summary-grid">
      <SummaryCard 
        title="Total Predictions" 
        value={total_predictions?.toLocaleString() || 0} 
        icon={Activity}
        colorClass="blue"
      />
      <SummaryCard 
        title="Total Sensors" 
        value={total_sensors?.toLocaleString() || 0} 
        icon={Target}
        colorClass="indigo"
      />
      <SummaryCard 
        title="Prediction Accuracy" 
        value={formattedAccuracy} 
        icon={CheckCircle}
        colorClass="green"
      />
      <SummaryCard 
        title="High Congestion Count" 
        value={highCongestion} 
        icon={AlertTriangle}
        colorClass="red"
      />
    </div>
  );
};

export default SummaryCards;
