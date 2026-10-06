const Prediction = require('../models/Prediction');
const { parseLimit, parseOffset, parseDate, parseSensorId } = require('../utils/validation');

/**
 * GET /api/analytics/summary
 * Returns global summary statistics from the predictions database.
 */
const getSummary = async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: null,
          total_predictions: { $sum: 1 },
          unique_sensors: { $addToSet: '$sensor_id' },
          low: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'LOW'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'MEDIUM'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'HIGH'] }, 1, 0] } },
          correct: { $sum: { $cond: [{ $eq: ['$actual_congestion', '$predicted_congestion'] }, 1, 0] } },
        }
      }
    ];

    const result = await Prediction.aggregate(pipeline);
    if (!result || result.length === 0) {
      return res.status(200).json({
        total_predictions: 0,
        total_sensors: 0,
        congestion_distribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        prediction_accuracy: 0
      });
    }

    const data = result[0];
    const accuracy = data.total_predictions > 0 
      ? (data.correct / data.total_predictions) 
      : 0;

    return res.status(200).json({
      total_predictions: data.total_predictions,
      total_sensors: data.unique_sensors.length,
      congestion_distribution: {
        LOW: data.low,
        MEDIUM: data.medium,
        HIGH: data.high
      },
      prediction_accuracy: accuracy
    });
  } catch (err) {
    console.error('[analytics.controller getSummary] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/analytics/congestion-distribution
 * Returns the distribution of predicted congestion classes.
 */
const getCongestionDistribution = async (req, res) => {
  try {
    const totalCount = await Prediction.countDocuments();
    
    const pipeline = [
      {
        $group: {
          _id: '$predicted_congestion',
          count: { $sum: 1 }
        }
      }
    ];
    
    const result = await Prediction.aggregate(pipeline);
    
    const data = ['LOW', 'MEDIUM', 'HIGH'].map(cls => {
      const found = result.find(r => r._id === cls);
      const count = found ? found.count : 0;
      const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
      return { class: cls, count, percentage };
    });

    return res.status(200).json({ data });
  } catch (err) {
    console.error('[analytics.controller getCongestionDistribution] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/analytics/sensors
 * Returns aggregated statistics per sensor with pagination.
 */
const getSensors = async (req, res) => {
  try {
    const validationErrors = [];
    const limitResult = parseLimit(req.query.limit);
    if (limitResult.error) validationErrors.push(limitResult.error);
    const offsetResult = parseOffset(req.query.offset);
    if (offsetResult.error) validationErrors.push(offsetResult.error);

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Invalid query parameters', details: validationErrors });
    }

    const limit = limitResult.value;
    const offset = offsetResult.value;

    const pipeline = [
      {
        $group: {
          _id: '$sensor_id',
          total_predictions: { $sum: 1 },
          low_count: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'LOW'] }, 1, 0] } },
          medium_count: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'MEDIUM'] }, 1, 0] } },
          high_count: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'HIGH'] }, 1, 0] } },
        }
      },
      { $sort: { _id: 1 } },
      { $skip: offset },
      { $limit: limit }
    ];

    const [totalSensors, data] = await Promise.all([
      Prediction.distinct('sensor_id').then(arr => arr.length),
      Prediction.aggregate(pipeline)
    ]);

    const formattedData = data.map(sensor => {
      const highPct = sensor.total_predictions > 0 
        ? (sensor.high_count / sensor.total_predictions) * 100 
        : 0;
      return {
        sensor_id: sensor._id,
        total_predictions: sensor.total_predictions,
        low_count: sensor.low_count,
        medium_count: sensor.medium_count,
        high_count: sensor.high_count,
        high_congestion_percentage: highPct
      };
    });

    return res.status(200).json({
      count: formattedData.length,
      total: totalSensors,
      limit,
      offset,
      data: formattedData
    });
  } catch (err) {
    console.error('[analytics.controller getSensors] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/analytics/timeseries
 * Returns aggregated predictions grouped by timestamp (5-min buckets).
 */
const getTimeseries = async (req, res) => {
  try {
    const validationErrors = [];
    const limitResult = parseLimit(req.query.limit);
    if (limitResult.error) validationErrors.push(limitResult.error);
    const offsetResult = parseOffset(req.query.offset);
    if (offsetResult.error) validationErrors.push(offsetResult.error);
    const sensorResult = parseSensorId(req.query.sensor_id);
    if (sensorResult.error) validationErrors.push(sensorResult.error);
    const startResult = parseDate(req.query.start_time, 'start_time');
    if (startResult.error) validationErrors.push(startResult.error);
    const endResult = parseDate(req.query.end_time, 'end_time');
    if (endResult.error) validationErrors.push(endResult.error);

    if (!startResult.error && !endResult.error && startResult.value && endResult.value && startResult.value > endResult.value) {
      validationErrors.push(`start_time must not be after end_time`);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Invalid query parameters', details: validationErrors });
    }

    const filter = {};
    if (sensorResult.value !== null) filter.sensor_id = sensorResult.value;
    if (startResult.value || endResult.value) {
      filter.timestamp = {};
      if (startResult.value) filter.timestamp.$gte = startResult.value;
      if (endResult.value) filter.timestamp.$lte = endResult.value;
    }

    const limit = limitResult.value;
    const offset = offsetResult.value;

    const countPipeline = [
      { $match: filter },
      { $group: { _id: '$timestamp' } },
      { $count: 'total' }
    ];

    const dataPipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$timestamp',
          total_predictions: { $sum: 1 },
          low_count: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'LOW'] }, 1, 0] } },
          medium_count: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'MEDIUM'] }, 1, 0] } },
          high_count: { $sum: { $cond: [{ $eq: ['$predicted_congestion', 'HIGH'] }, 1, 0] } },
        }
      },
      { $sort: { _id: 1 } },
      { $skip: offset },
      { $limit: limit }
    ];

    const [countResult, rawData] = await Promise.all([
      Prediction.aggregate(countPipeline),
      Prediction.aggregate(dataPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    const formattedData = rawData.map(bucket => {
      const highPct = bucket.total_predictions > 0 
        ? (bucket.high_count / bucket.total_predictions) * 100 
        : 0;
      return {
        timestamp: bucket._id,
        total_predictions: bucket.total_predictions,
        low_count: bucket.low_count,
        medium_count: bucket.medium_count,
        high_count: bucket.high_count,
        high_congestion_percentage: highPct
      };
    });

    return res.status(200).json({
      count: formattedData.length,
      total,
      limit,
      offset,
      data: formattedData
    });
  } catch (err) {
    console.error('[analytics.controller getTimeseries] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getSummary,
  getCongestionDistribution,
  getSensors,
  getTimeseries
};
