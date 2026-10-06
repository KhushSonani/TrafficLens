require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const connectDB = require('../src/config/db');
const Prediction = require('../src/models/Prediction');

const CSV_PATH = process.env.PREDICTIONS_CSV_PATH || '../output/predictions.csv';

const importData = async () => {
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.error("MongoDB is unavailable. Ingestion script requires an active MongoDB connection.");
    console.error("Cannot proceed with data ingestion.");
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing predictions file at: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`Starting ingestion from: ${CSV_PATH}`);
  
  const results = [];
  let rowCount = 0;
  
  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (data) => {
      // Validate schema row by row
      if (!data.timestamp || !data.sensor_id || !data.predicted_congestion) {
        console.error("Row validation failed. Missing required columns.");
        process.exit(1);
      }
      results.push({
        timestamp: new Date(data.timestamp),
        sensor_id: parseInt(data.sensor_id, 10),
        actual_congestion: data.actual_congestion,
        predicted_congestion: data.predicted_congestion,
        probability_high: parseFloat(data.probability_high),
        probability_low: parseFloat(data.probability_low),
        probability_medium: parseFloat(data.probability_medium)
      });
      rowCount++;
    })
    .on('end', async () => {
      console.log(`Successfully parsed ${rowCount} rows from CSV.`);
      console.log("Beginning MongoDB upsert operation...");
      
      let inserted = 0;
      let updated = 0;
      
      try {
        for (const record of results) {
          const filter = { sensor_id: record.sensor_id, timestamp: record.timestamp };
          const update = { $set: record };
          
          const res = await Prediction.updateOne(filter, update, { upsert: true });
          
          if (res.upsertedCount > 0) inserted++;
          else if (res.modifiedCount > 0 || res.matchedCount > 0) updated++;
        }
        
        console.log(`Ingestion Complete!`);
        console.log(`Inserted: ${inserted}`);
        console.log(`Updated: ${updated}`);
        
        const finalCount = await Prediction.countDocuments();
        console.log(`Total documents in Prediction collection: ${finalCount}`);
        
        process.exit(0);
      } catch (error) {
        console.error(`MongoDB Ingestion Error: ${error.message}`);
        process.exit(1);
      }
    });
};

importData();
