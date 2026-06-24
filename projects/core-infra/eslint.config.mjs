import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  {
    ignores: ['**/sdks', '**/docs', '**/node_modules'],
  },
]
