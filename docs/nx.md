### Generating a new node app

`nx g @nx/node:app apps/ingestor --linter=eslint --unitTestRunner=none --e2eTestRunner=none --framework=none --docker --dryRun`

### Publishing a release

`nx release --dockerVersionScheme=production --yes --firstRelease`

### Scaffold a new node lib

`nx g @nx/node:lib packages/cloud-storage --linter=eslint --unitTestRunner=none --publishable=false`
