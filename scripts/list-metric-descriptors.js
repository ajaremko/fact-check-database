const monitoring = require('@google-cloud/monitoring')

const client = new monitoring.MetricServiceClient()

async function listMetricDescriptors(projectId, startsWith) {
  try {
    const [descriptors] = await client.listMetricDescriptors({
      name: client.projectPath(projectId),
      filter: startsWith
        ? `metric.type = starts_with("${startsWith}")`
        : undefined,
    })
    descriptors.forEach((descriptor) => console.info(descriptor.type))
  } catch (err) {
    console.error('Error listing metric descriptors:', err)
    process.exit(1)
  }
}

const options = {
  projectId: { type: 'string' },
  startsWith: { type: 'string' },
}

const { parseArgs } = require('node:util')

const { values } = parseArgs({ options, allowPositionals: false })

if (!values.projectId) {
  console.error('Please provide --projectId')
  process.exit(1)
}

listMetricDescriptors(values.projectId, values.startsWith)
