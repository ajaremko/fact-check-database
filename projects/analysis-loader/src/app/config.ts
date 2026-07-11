import { Config, Context, Effect } from 'effect'

export interface ServiceContext {
  projectId: string
  datasetId: string
  tableId: string
}

export const ServiceContext =
  Context.GenericTag<ServiceContext>('ServiceContext')

export const provideServiceContext = Effect.provideServiceEffect(
  ServiceContext,
  Config.all({
    projectId: Config.string('PROJECT_ID'),
    datasetId: Config.string('BIGQUERY_DATASET'),
    tableId: Config.string('BIGQUERY_TABLE'),
  })
)
