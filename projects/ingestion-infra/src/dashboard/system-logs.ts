import { gcpProject } from '../config'

export function systemLogsTiles(x: number, y: number): object[] {
  return [
    {
      yPos: y,
      xPos: x,
      height: 4,
      width: 48,
      widget: {
        title: 'System Logs',
        sectionHeader: {
          dividerBelow: true,
          subtitle: 'Raw log output from all pipeline components',
        },
      },
    },
    {
      yPos: y + 4,
      xPos: x,
      height: 26,
      width: 48,
      widget: {
        title: 'Pipeline Logs',
        logsPanel: {
          filter:
            'jsonPayload.serviceContext.service=~"^@fact-check-database/"',
          resourceNames: [
            `projects/${gcpProject}/locations/global/logScopes/_Default`,
          ],
        },
      },
    },
  ]
}
