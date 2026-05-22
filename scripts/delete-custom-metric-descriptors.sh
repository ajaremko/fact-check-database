// Lists and then deletes all custom metric descriptors in the project that start with "custom.googleapis.com/" 
// or "workload.googleapis.com/"

for prefix in "custom.googleapis.com/" "workload.googleapis.com/"; do
  for metric in $(node ./scripts/list-metric-descriptors.js --projectId $PROJECT_ID --startsWith "$prefix"); do
    echo "Deleting metric descriptor: $metric"
    node ./scripts/delete-metric-descriptor.js --projectId $PROJECT_ID --metricName "$metric"
  done
done
