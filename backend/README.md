# TrafficLens Backend API (MERN)

This directory contains the Express/Node.js backend for the TrafficLens project (Student 3 deliverable).

## Prerequisites
- Node.js (v14+)
- npm
- MongoDB Service (Running locally or via Docker)

## Installation
From the `backend` directory, install dependencies:
```bash
cd backend
npm install
```

## Environment Setup
Copy the example configuration:
```bash
cp .env.example .env
```
Ensure `MONGODB_URI` accurately points to your MongoDB instance.

## Data Ingestion
To populate the MongoDB predictions collection using the Student 2 output:
```bash
npm run import-predictions
```
*Note: This script safely upserts documents. Running it multiple times will not duplicate prediction records.*

## Running the Server
Start the Express API:
```bash
npm run dev
```

## Health Check
Verify the server and MongoDB connections are functional natively:
```bash
curl http://localhost:5000/api/health
```
