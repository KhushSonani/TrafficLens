const express = require('express');
const {
  getSummary,
  getCongestionDistribution,
  getSensors,
  getTimeseries
} = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/summary', getSummary);
router.get('/congestion-distribution', getCongestionDistribution);
router.get('/sensors', getSensors);
router.get('/timeseries', getTimeseries);

module.exports = router;
