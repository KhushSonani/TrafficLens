const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
