/**
 * prediction.routes.js
 *
 * Defines routes for the predictions API resource.
 *
 * Routes:
 *   GET /api/predictions  — paginated, filtered list of prediction records
 */

const express = require('express');
const { getPredictions } = require('../controllers/prediction.controller');

const router = express.Router();

// GET /api/predictions
router.get('/', getPredictions);

module.exports = router;
