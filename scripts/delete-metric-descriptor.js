// Delete a Metric Descriptor
// Usage: node delete-metric-descriptor.js --projectId=your-project-id --metricName=metric.name

const monitoring = require('@google-cloud/monitoring')

const client = new monitoring.MetricServiceClient()

async function deleteMetricDescriptor(projectId, metricName) {
  try {
    const [result] = await client.deleteMetricDescriptor({
      name: client.projectMetricDescriptorPath(projectId, metricName),
    })
    console.warn(`Deleted ${metricName}`, result)
  } catch (err) {
    console.error('Error deleting metric descriptor:', err)
    process.exit(1)
  }
}

const options = {
  projectId: { type: 'string' },
  metricName: { type: 'string' },
}

const { parseArgs } = require('node:util')

const { values } = parseArgs({ options, allowPositionals: false })

if (!values.projectId || !values.metricName) {
  console.error('Please provide both --projectId and --metricName')
  process.exit(1)
}

deleteMetricDescriptor(values.projectId, values.metricName)
