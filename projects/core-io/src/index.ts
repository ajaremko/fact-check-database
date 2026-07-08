/**
 * Barrel export for core-io's ports only. Adapters are intentionally not
 * re-exported here — import them via their own subpath, e.g.
 * `@news-research/core-io/adapters/FileSystemPublisher`, so consumers only
 * pull in the transport dependencies they actually use.
 */
export * from './ports/FilePointer'
export * from './ports/MessageBatch'
export * from './ports/MessageBody'
export * from './ports/MessageQueue'
export * from './ports/Publisher'
export * from './ports/StorageReader'
export * from './ports/StorageWriter'
