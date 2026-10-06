require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Try to connect to DB, but don't crash if it fails
  // The health endpoint will accurately report 'disconnected'
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
