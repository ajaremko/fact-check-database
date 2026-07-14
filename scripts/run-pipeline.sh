#!/bin/bash

# This script is used to run the data ingestion pipeline stages in order.

# Usage: ./run-pipeline.sh 

# Clean up tmp
rm -rf tmp

# Run pipeline stages in order
nx run-script ingestion-ingestor
nx run-script ingestion-sanitizer
nx run-script ingestion-extractor
