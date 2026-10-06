/**
 * importPredictions.js
 *
 * CSV ingestion script for TrafficLens predictions.
 * Reads output/predictions.csv (Student 2 output), validates every record,
 * and bulk-upserts into MongoDB using the Prediction model.
 *
 * Usage:
 *   node scripts/importPredictions.js
 *   npm run import-predictions
 *
 * Environment:
 *   MONGODB_URI         - MongoDB connection string (default: mongodb://localhost:27017/trafficlens)
 *   PREDICTIONS_CSV_PATH - Path to CSV file (default: ../output/predictions.csv)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const connectDB = require('../src/config/db');
const Prediction = require('../src/models/Prediction');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CSV_PATH = process.env.PREDICTIONS_CSV_PATH
  ? path.resolve(__dirname, process.env.PREDICTIONS_CSV_PATH)
  : path.resolve(__dirname, '../../output/predictions.csv');

const BATCH_SIZE = 5000; // Number of documents per bulkWrite batch
const PROB_SUM_TOLERANCE = 0.02; // Floating-point tolerance for probability sum check
const VALID_CONGESTION = new Set(['LOW', 'MEDIUM', 'HIGH']);

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate a single parsed CSV row.
 * Returns { valid: true, record } or { valid: false, reason }
 */
function validateRow(row, rowIndex) {
  const errors = [];

  // --- timestamp ---
  const tsRaw = (row.timestamp || '').trim();
  if (!tsRaw) {
    errors.push('missing timestamp');
  } else {
    const ts = new Date(tsRaw);
    if (isNaN(ts.getTime())) {
      errors.push(`invalid timestamp: "${tsRaw}"`);
    }
  }

  // --- sensor_id ---
  const sensorRaw = (row.sensor_id || '').trim();
  if (!sensorRaw) {
    errors.push('missing sensor_id');
  } else {
    const sensorId = Number(sensorRaw);
    if (!Number.isInteger(sensorId) || isNaN(sensorId)) {
      errors.push(`invalid sensor_id (must be integer): "${sensorRaw}"`);
    }
  }

  // --- actual_congestion ---
  const actualCong = (row.actual_congestion || '').trim().toUpperCase();
  if (!actualCong) {
    errors.push('missing actual_congestion');
  } else if (!VALID_CONGESTION.has(actualCong)) {
    errors.push(`invalid actual_congestion: "${actualCong}" (must be LOW/MEDIUM/HIGH)`);
  }

  // --- predicted_congestion ---
  const predCong = (row.predicted_congestion || '').trim().toUpperCase();
  if (!predCong) {
    errors.push('missing predicted_congestion');
  } else if (!VALID_CONGESTION.has(predCong)) {
    errors.push(`invalid predicted_congestion: "${predCong}" (must be LOW/MEDIUM/HIGH)`);
  }

  // --- probability_high ---
  const probHighRaw = (row.probability_high || '').trim();
  let probHigh = NaN;
  if (!probHighRaw) {
    errors.push('missing probability_high');
  } else {
    probHigh = parseFloat(probHighRaw);
    if (isNaN(probHigh) || probHigh < 0 || probHigh > 1) {
      errors.push(`invalid probability_high: "${probHighRaw}" (must be 0–1)`);
    }
  }

  // --- probability_low ---
  const probLowRaw = (row.probability_low || '').trim();
  let probLow = NaN;
  if (!probLowRaw) {
    errors.push('missing probability_low');
  } else {
    probLow = parseFloat(probLowRaw);
    if (isNaN(probLow) || probLow < 0 || probLow > 1) {
      errors.push(`invalid probability_low: "${probLowRaw}" (must be 0–1)`);
    }
  }

  // --- probability_medium ---
  const probMedRaw = (row.probability_medium || '').trim();
  let probMed = NaN;
  if (!probMedRaw) {
    errors.push('missing probability_medium');
  } else {
    probMed = parseFloat(probMedRaw);
    if (isNaN(probMed) || probMed < 0 || probMed > 1) {
      errors.push(`invalid probability_medium: "${probMedRaw}" (must be 0–1)`);
    }
  }

  // --- probability sum ---
  if (!isNaN(probHigh) && !isNaN(probLow) && !isNaN(probMed)) {
    const sum = probHigh + probLow + probMed;
    if (Math.abs(sum - 1.0) > PROB_SUM_TOLERANCE) {
      errors.push(
        `probability sum out of tolerance: ${probHigh} + ${probLow} + ${probMed} = ${sum.toFixed(6)} (expected ~1.0 ± ${PROB_SUM_TOLERANCE})`
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, reason: errors.join('; '), rowIndex };
  }

  return {
    valid: true,
    record: {
      timestamp: new Date(tsRaw),
      sensor_id: parseInt(sensorRaw, 10),
      actual_congestion: actualCong,
      predicted_congestion: predCong,
      probability_high: probHigh,
      probability_low: probLow,
      probability_medium: probMed,
    },
  };
}

// ---------------------------------------------------------------------------
// Bulk upsert helper
// ---------------------------------------------------------------------------

/**
 * Execute a bulkWrite upsert for a batch of validated records.
 * Returns { upsertedCount, modifiedCount, matchedCount }
 */
async function flushBatch(batch) {
  const operations = batch.map((record) => ({
    updateOne: {
      filter: { sensor_id: record.sensor_id, timestamp: record.timestamp },
      update: { $set: record },
      upsert: true,
    },
  }));

  const result = await Prediction.bulkWrite(operations, { ordered: false });
  return {
    upsertedCount: result.upsertedCount || 0,
    modifiedCount: result.modifiedCount || 0,
    matchedCount: result.matchedCount || 0,
  };
}

// ---------------------------------------------------------------------------
// Main ingestion
// ---------------------------------------------------------------------------

const importData = async () => {
  // 1. Connect to MongoDB
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('MongoDB is unavailable. Ingestion requires an active MongoDB connection.');
    console.error('Start MongoDB and retry.');
    process.exit(1);
  }

  // 2. Verify CSV exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found at: ${CSV_PATH}`);
    console.error('Set PREDICTIONS_CSV_PATH environment variable or ensure the file is at ../../output/predictions.csv');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('TrafficLens — Prediction CSV Ingestion');
  console.log('='.repeat(60));
  console.log(`Source CSV  : ${CSV_PATH}`);
  console.log(`Batch size  : ${BATCH_SIZE}`);
  console.log(`Prob tolerance: ±${PROB_SUM_TOLERANCE}`);
  console.log('');

  // 3. Parse and validate
  let totalRows = 0;
  let validRows = 0;
  let invalidRows = 0;
  const malformedRecords = []; // { rowIndex, reason }

  let totalUpserted = 0;
  let totalModified = 0;
  let totalMatched = 0;

  let currentBatch = [];
  let batchNumber = 0;

  const processBatch = async () => {
    batchNumber++;
    process.stdout.write(`  Flushing batch ${batchNumber} (${currentBatch.length} records)...`);
    const { upsertedCount, modifiedCount, matchedCount } = await flushBatch(currentBatch);
    totalUpserted += upsertedCount;
    totalModified += modifiedCount;
    totalMatched += matchedCount;
    process.stdout.write(` upserted=${upsertedCount}, updated=${modifiedCount}\n`);
    currentBatch = [];
  };

  // Wrap the streaming in a Promise so we can await completion
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        totalRows++;
        const result = validateRow(row, totalRows);

        if (!result.valid) {
          invalidRows++;
          malformedRecords.push({ rowIndex: totalRows, reason: result.reason });
          // Report first 20 malformed records immediately
          if (malformedRecords.length <= 20) {
            console.warn(`  [ROW ${totalRows}] INVALID: ${result.reason}`);
          }
          return;
        }

        validRows++;
        currentBatch.push(result.record);
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve();
      });
  });

  console.log(`\nCSV parsing complete.`);
  console.log(`  Total rows parsed : ${totalRows}`);
  console.log(`  Valid rows        : ${validRows}`);
  console.log(`  Invalid rows      : ${invalidRows}`);

  if (invalidRows > 0 && malformedRecords.length > 20) {
    console.warn(`  (Showing first 20 of ${invalidRows} malformed records above)`);
  }

  if (invalidRows > 0) {
    console.warn('\n--- Malformed Record Summary ---');
    // Print all if <= 50, else just count
    if (malformedRecords.length <= 50) {
      malformedRecords.forEach(({ rowIndex, reason }) => {
        console.warn(`  Row ${rowIndex}: ${reason}`);
      });
    } else {
      console.warn(`  ${invalidRows} malformed records found. First 20 shown above.`);
      console.warn('  Sample of malformed reasons:');
      const reasons = {};
      malformedRecords.forEach(({ reason }) => {
        const key = reason.split(':')[0];
        reasons[key] = (reasons[key] || 0) + 1;
      });
      Object.entries(reasons).forEach(([k, v]) => {
        console.warn(`    "${k}": ${v} occurrences`);
      });
    }
  }

  if (validRows === 0) {
    console.error('\nNo valid records to insert. Exiting.');
    process.exit(1);
  }

  // 4. Flush remaining batch
  console.log(`\nStarting bulk upsert into MongoDB...`);
  if (currentBatch.length > 0) {
    await processBatch();
  }

  // 5. Final count
  const finalCount = await Prediction.countDocuments();

  console.log('');
  console.log('='.repeat(60));
  console.log('Ingestion Complete');
  console.log('='.repeat(60));
  console.log(`CSV rows parsed        : ${totalRows}`);
  console.log(`Valid records          : ${validRows}`);
  console.log(`Invalid/skipped records: ${invalidRows}`);
  console.log(`Inserted (upserted)    : ${totalUpserted}`);
  console.log(`Updated (matched)      : ${totalModified + totalMatched}`);
  console.log(`MongoDB collection count: ${finalCount}`);

  if (finalCount !== validRows) {
    console.warn(`\nWARNING: MongoDB count (${finalCount}) differs from valid CSV rows (${validRows}).`);
    console.warn('This may indicate duplicate (sensor_id, timestamp) pairs in the CSV,');
    console.warn('or records from a previous ingestion run that were updated rather than inserted.');
  } else {
    console.log('\nData integrity check: MongoDB count matches valid CSV rows. ✓');
  }

  process.exit(0);
};

importData().catch((err) => {
  console.error('Unexpected error during ingestion:', err.message);
  process.exit(1);
});
