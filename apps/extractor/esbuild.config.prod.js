// A plugin to support file replacements in esbuild
// https://github.com/nrwl/nx/issues/19962

const fs = require('fs')

// a simple plugin to replace environment source file based on the build environment
const fileReplacementsPlugin = {
  name: 'fileReplacements',
  setup(build) {
    build.onLoad(
      { filter: /environments\/environment.ts/, namespace: 'file' },
      async (args) => {
        console.warn('Applying file replacements for production environment')
        console.log(args.path)
        const fileReplacementPath = args.path.replace(
          'environment.ts',
          'environment.prod.ts'
        )

        const fileReplacementContent = fs.readFileSync(
          fileReplacementPath,
          'utf8'
        )

        return { contents: fileReplacementContent, loader: 'default' }
      }
    )
  },
}

module.exports = {
  plugins: [fileReplacementsPlugin],
  sourcemap: false,
  outExtension: {
    '.js': '.js',
  },
}
