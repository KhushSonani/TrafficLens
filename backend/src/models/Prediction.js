const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
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
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    required: true,
  },
  predicted_congestion: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
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
  }
});

// Compound unique index as specified by Student 2 documentation
predictionSchema.index({ sensor_id: 1, timestamp: 1 }, { unique: true });

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction;
