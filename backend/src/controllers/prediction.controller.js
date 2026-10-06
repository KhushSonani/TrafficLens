/**
 * prediction.controller.js
 *
 * Handles GET /api/predictions
 *
 * Query parameters:
 *   sensor_id   - integer; filter by sensor
 *   start_time  - ISO date; timestamp >= start_time
 *   end_time    - ISO date; timestamp <= end_time
 *   limit       - positive integer, max 1000, default 100
 *   offset      - non-negative integer, default 0
 *
 * Response shape:
 *   {
 *     count  : number,   // records returned in this response
 *     total  : number,   // total matching records in DB
 *     limit  : number,
 *     offset : number,
 *     data   : [ { timestamp, sensor_id, actual_congestion, predicted_congestion,
 *                  probability_high, probability_low, probability_medium } ]
 *   }
 */

const Prediction = require('../models/Prediction');

const { parseLimit, parseOffset, parseDate, parseSensorId, parseCongestionClass } = require('../utils/validation');

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * GET /api/predictions
 *
 * Queries MongoDB directly — does NOT load the entire collection into memory.
 * Applies all filters as MongoDB query predicates and uses .skip()/.limit()
 * for pagination. Results are sorted by timestamp ascending.
 */
const getPredictions = async (req, res) => {
  try {
    // --- Parse and validate query parameters ---
    const validationErrors = [];

    const limitResult = parseLimit(req.query.limit);
    if (limitResult.error) validationErrors.push(limitResult.error);

    const offsetResult = parseOffset(req.query.offset);
    if (offsetResult.error) validationErrors.push(offsetResult.error);

    const sensorResult = parseSensorId(req.query.sensor_id);
    if (sensorResult.error) validationErrors.push(sensorResult.error);

    const congestionResult = parseCongestionClass(req.query.congestion_class);
    if (congestionResult.error) validationErrors.push(congestionResult.error);

    const startResult = parseDate(req.query.start_time, 'start_time');
    if (startResult.error) validationErrors.push(startResult.error);

    const endResult = parseDate(req.query.end_time, 'end_time');
    if (endResult.error) validationErrors.push(endResult.error);

    // Cross-parameter validation: start_time must not exceed end_time
    if (
      !startResult.error &&
      !endResult.error &&
      startResult.value &&
      endResult.value &&
      startResult.value > endResult.value
    ) {
      validationErrors.push(
        `start_time must not be after end_time; received start_time="${req.query.start_time}" end_time="${req.query.end_time}"`
      );
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationErrors,
      });
    }

    // --- Build MongoDB filter ---
    const filter = {};

    if (sensorResult.value !== null) {
      filter.sensor_id = sensorResult.value;
    }

    if (congestionResult.value !== null) {
      filter.predicted_congestion = congestionResult.value;
    }

    if (startResult.value || endResult.value) {
      filter.timestamp = {};
      if (startResult.value) filter.timestamp.$gte = startResult.value;
      if (endResult.value) filter.timestamp.$lte = endResult.value;
    }

    const limit = limitResult.value;
    const offset = offsetResult.value;

    // --- Execute queries against MongoDB ---
    // Use Promise.all to run count and data fetch in parallel
    const [total, data] = await Promise.all([
      Prediction.countDocuments(filter),
      Prediction.find(filter)
        .sort({ timestamp: 1 })
        .skip(offset)
        .limit(limit)
        .select('-_id timestamp sensor_id actual_congestion predicted_congestion probability_high probability_low probability_medium')
        .lean(), // Return plain JS objects, not Mongoose documents
    ]);

    return res.status(200).json({
      count: data.length,
      total,
      limit,
      offset,
      data,
    });
  } catch (err) {
    console.error('[prediction.controller] Database error:', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while querying the predictions database.',
    });
  }
};

module.exports = { getPredictions };
