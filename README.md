# TrafficLens Big Data Project

Welcome to the **TrafficLens** project! This repository contains the code and documentation for analyzing the METR-LA traffic dataset using Big Data and Machine Learning technologies.

## Directory Structure
- `dataset/`: Contains the raw and partitioned METR-LA dataset files.
- `src/ingestion/`: Scripts to format, partition, and prepare data.
- `src/processing/`: MapReduce jobs (Hadoop) to process the data.
- `src/analytics/`: Machine learning models and feature engineering scripts (Scikit-learn).
- `scripts/`: Utility scripts (e.g., cluster startup, data movement).
- `config/`: Configuration files for Hadoop, Docker, etc.
- `output/`: Processed data and model predictions (CSV format).
- `screenshots/`: Evidence of cluster execution and node configuration.
- `docs/`: Project documentation, ML evaluation reports, and architecture diagrams.
- `pipeline/`: End-to-end execution pipeline scripts.

## Setup Instructions
1. Clone the repository.
2. Follow the documentation in the `docs/` folder for setting up the Hadoop cluster.
