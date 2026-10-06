const mongoose = require('mongoose');

const getHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;
  let dbStatus = 'disconnected';
  
  if (dbState === 1) dbStatus = 'connected';
  else if (dbState === 2) dbStatus = 'connecting';
  
  res.status(200).json({
    status: 'ok',
    message: 'TrafficLens Backend is running.',
    database: dbStatus
  });
};

module.exports = {
  getHealth
};
