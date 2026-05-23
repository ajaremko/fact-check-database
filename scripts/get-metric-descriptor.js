// Get Metric Descriptor
// Usage: node get-metric-descriptor.js --projectId=your-project-id --metricId=your-metric-id

const monitoring = require('@google-cloud/monitoring')

const client = new monitoring.MetricServiceClient()

async function listMetricDescriptors(projectId, metricId) {
  try {
    const [descriptor] = await client.getMetricDescriptor({
      name: client.projectMetricDescriptorPath(projectId, metricId),
    })
    console.info(descriptor)
  } catch (err) {
    console.error('Error listing metric descriptors:', err)
    process.exit(1)
  }
}

const options = {
  projectId: { type: 'string' },
  metricId: { type: 'string' },
}

const { parseArgs } = require('node:util')

const { values } = parseArgs({ options, allowPositionals: false })

if (!values.projectId || !values.metricId) {
  console.error('Please provide --projectId and --metricId')
  process.exit(1)
}

listMetricDescriptors(values.projectId, values.metricId)
