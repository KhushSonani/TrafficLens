/**
 * app.js
 *
 * Express application configuration for TrafficLens Backend API.
 * Registers middleware and all API routes.
 *
 * Routes:
 *   GET /api/health       — liveness / database connectivity check
 *   GET /api/predictions  — paginated, filtered prediction records
 */

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const predictionRoutes = require('./routes/prediction.routes');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/health', healthRoutes);
app.use('/api/predictions', predictionRoutes);

// ---------------------------------------------------------------------------
// 404 handler — catch-all for undefined routes
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Global error-handling middleware
// Do NOT expose stack traces or internal details to clients.
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[app] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
