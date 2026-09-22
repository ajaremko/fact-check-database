//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  compiler: {
    // For other options, see https://styled-components.com/docs/tooling#babel-plugin
    styledComponents: true,
  },
  output: 'standalone',
  distDir: 'dist',
  // // GCP SDK packages use native gRPC bindings (google-gax) that cannot be
  // // bundled by webpack. Mark them external so Next.js resolves them from
  // // node_modules at runtime instead of attempting to bundle them.
  // serverExternalPackages: [
  //   '@google-cloud/pubsub',
  //   '@google-cloud/recaptcha-enterprise',
  //   '@fact-check-database/core-vendor',
  //   '@fact-check-database/ingestion-messaging',
  // ],
}

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
]

module.exports = composePlugins(...plugins)(nextConfig)
