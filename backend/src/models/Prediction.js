/**
 * Prediction.js
 *
 * Mongoose schema and model for TrafficLens traffic predictions.
 * Represents one prediction record produced by the Student 2 ML pipeline
 * (output/predictions.csv) and stored in MongoDB.
 *
 * Indexes:
 *   1. { sensor_id: 1, timestamp: 1 } — unique compound index
 *      Guarantees exactly one document per (sensor, time) pair.
 *      Required for safe upsert-based ingestion.
 *
 *   2. { timestamp: 1 } — single-field index
 *      Optimises start_time / end_time range queries on the predictions API.
 */

const mongoose = require('mongoose');

const VALID_CONGESTION = ['LOW', 'MEDIUM', 'HIGH'];

const predictionSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
    },
    sensor_id: {
      type: Number,
      required: true,
    },
    actual_congestion: {
      type: String,
      enum: VALID_CONGESTION,
      required: true,
    },
    predicted_congestion: {
      type: String,
      enum: VALID_CONGESTION,
      required: true,
    },
    probability_high: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    probability_low: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    probability_medium: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  {
    // Disable the default __v version key to keep API responses clean
    versionKey: false,
  }
);

// Index 1: unique compound index — one record per (sensor_id, timestamp)
// Also used by the ingestion script as the upsert filter key.
predictionSchema.index({ sensor_id: 1, timestamp: 1 }, { unique: true });

// Index 2: timestamp index — supports efficient start_time / end_time range queries
predictionSchema.index({ timestamp: 1 });

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction;
