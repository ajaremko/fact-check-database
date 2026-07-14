rm -rf tmp

nx run-script ingestion-ingestor
nx run-script ingestion-sanitizer
nx run-script ingestion-extractor
