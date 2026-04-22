import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

import { SanitizerOutcome } from './SanitizerOutcome'

export const SanitizerRecordPathSchema = Schema.transformOrFail(
  v1.ArchivePathSchema,
  SanitizerOutcome,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ArchivePath not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        version: 1 as const,
        collectionName: 'records',
        ext: `sanitize.yml`,
        sourceName: input.source.name,
        date: input.fetchedAt,
        ingestionId: input.ingestionId,
        observationId: input.observationId,
      }),
  }
)
