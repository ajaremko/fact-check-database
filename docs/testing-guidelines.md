# Testing Guidelines

How tests in this repository should be written. These guidelines apply to new and edited tests in
every project. Existing tests are brought in line when they are next changed.

This document is short on purpose. New guidelines are added as they come up in review.

## Principles

- **Write tests that read like documentation examples.** A reader should understand what a test
  checks from the test alone, the same way they would read a code sample in a README. They should
  not have to scroll up to find what a name refers to.

  - Declare inputs and expected values inline, at the call site. Do not hoist them into shared
    constants at the top of the file or the `describe` block.
  - Write expected values as literals. Never derive an expected value with the same logic the code
    under test performs. A derived value repeats the implementation, so it repeats the
    implementation's bugs. A short inline expression is fine when it makes the link to an input
    plain to see (`1790253296 * 1000`).
  - Prefer few local variables. When the call under test spans several lines, bind its output to
    a single `result` and assert on that. When the call and the assertion fit on one line, skip
    the variable. Another variable is fine when it clearly makes the test easier to read, but
    don't reach for one by default. Never use a variable to hide a value the reader needs, or to
    chain intermediate results.
  - A variable that holds the function under test is fine, because it is not a value. For
    example, `const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)`.
  - Build the data a test double works with inline. A reusable in-memory implementation is fine,
    but what it is seeded with, such as a `storage` object, is written in the test.
  - To show that a function is deterministic, comparing two inline calls is fine. Also assert one
    of them against a literal value, so the test shows what the output is.
  - Accept repetition across tests. Each test should stand on its own, even if that means writing
    the same value several times.

  Before, with shared values that the reader has to trace back to the top of the file:

  ```ts
  const expected = new Date('2026-09-24T12:34:56.789Z')
  const seconds = Math.floor(expected.getTime() / 1000)
  const nanos = 789_000_000

  it('accepts string seconds', () => {
    expect(timestampToDate({ seconds: String(seconds), nanos })).toStrictEqual(
      expected
    )
  })
  ```

  After, with everything the test needs in place:

  ```ts
  it('accepts string seconds', () => {
    const result = timestampToDate({
      seconds: '1790253296',
      nanos: 789_000_000,
    })
    expect(result).toStrictEqual(new Date('2026-09-24T12:34:56.789Z'))
  })
  ```

  See [timestampToDate.spec.ts](../projects/core-io/src/internal/timestampToDate.spec.ts) for the
  full example.

- **Keep tests independent.** A test must pass when run alone or in any order. Don't let one
  test read state, such as a shared log file, that another test wrote.

## Choosing the right test double

A test double stands in for a real dependency during a test. Pick the simplest double that lets
the test check the behavior it cares about. The names below follow Gerard Meszaros's _xUnit Test
Patterns_, as summarised in Martin Fowler's
[TestDouble](https://martinfowler.com/bliki/TestDouble.html).

### Start from the dependency, not the tool

Two questions decide most cases.

1. **Does the code under test reach the dependency through one of our own service interfaces?**
   These are `Context.Tag` services defined in this repository, such as `StorageWriter` in
   `core-io`. If so, provide an in-memory implementation (a fake) or a stub layer. Assert on the
   outcome: the returned value, or what ended up in the fake's store. Don't spy on the service. How
   the code talks to it is an implementation detail.
2. **Is the code under test tightly coupled to a vendor SDK client?** This is code that calls
   `core-vendor` wrappers directly, or a module whose whole job is to drive an SDK. If so, spy on
   a real client instance. Here the interaction with the SDK _is_ the behavior under test: which
   calls are made, with which arguments, and how the code handles the SDK's errors.

### Varieties of test doubles

- **Dummy.** A value passed only to satisfy a signature, which the tested path never reads. Use
  `null as never` and say in a comment why it's unused. Example: `record: null as never` in
  [RssExtractor.spec.ts](../projects/ingestion-extractor/src/integration/extraction-strategy/RssExtractor.spec.ts).
- **Stub.** Returns canned answers and records nothing. Use one when the dependency only supplies
  input to the code under test. Examples: `InMemoryFetcher.layer(FetchSuccessSchema.make({...}))`
  in [ingestFromSource.spec.ts](../projects/ingestion-ingestor/src/app/ingestFromSource.spec.ts),
  and `FileSystem.layerNoop({ readDirectory: ... })` in
  [logAnnotationScope.spec.ts](../projects/core-io/src/adapters/logAnnotationScope.spec.ts).
- **Fake.** A working but simplified implementation, such as an in-memory store. Use one when the
  code writes and later reads, or when the test asserts on the resulting state. Example:
  `InMemoryStorageReader` and `InMemoryStorageWriter` share one `storage` object in
  [sanitizeObservation.spec.ts](../projects/ingestion-sanitizer/src/app/sanitizeObservation.spec.ts),
  and the test checks what landed in it. Fakes live beside the real implementations as reusable
  modules. They implement _our_ interfaces, so they are small and cheap to keep accurate.
- **Spy.** A real object with selected methods wrapped, so the test can check how they were
  called. Methods that would reach the network are also given a canned result. Use a spy when the
  code under test is tightly coupled to a vendor SDK.
- **Mock.** A double loaded with expectations before the call, which fails the test if they aren't
  met. Avoid mocks. Checking a spy or the resulting state after the call reads in the same order
  as the test itself.

### Example: spying on the BigQuery client

`loadBatch` in `analysis-loader` is built directly on the BigQuery SDK. It calls `createJob` with
a deterministic job id, waits for the returned `Job` to complete, and on a `409 Already Exists`
fetches the existing job to decide whether to retry under a new id. What matters is the exact
calls it makes, so its test spies on a real client:

```ts
it.effect('creates a load job with the deterministic id', () =>
  Effect.gen(function* () {
    const client = new BigQuery({ projectId: 'project' })
    vi.spyOn(client, 'createJob').mockImplementation(((options: {
      jobId: string
    }) => Promise.resolve([client.job(options.jobId)])) as never)
    vi.spyOn(Job.prototype, 'getMetadata').mockImplementation(function (
      this: Job,
      callback?: unknown
    ) {
      this.metadata = { status: { state: 'DONE' } }
      if (typeof callback === 'function') {
        return callback(null, this.metadata)
      }
      return Promise.resolve([this.metadata])
    } as never)

    yield* loadBatch({
      projectId: 'project',
      pointer: { bucket: 'staging', object: 'v1/type=fact_checks/a.ndjson' },
      generation: '123',
      table: { dataset: 'staging', table: 'fact_checks' },
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      schema: {},
    }).pipe(Effect.provide(Layer.succeed(BigQueryClient, { client })))

    expect(client.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId:
          'load_5176467b42b1a2b0b49ac1b6d9ccc443e017e40c5a3b74f6cfb72eacde881911',
      })
    )
  })
)
```

Only the two methods that would reach the network are stubbed. The SDK's own `Job` polling and
the `getJob` wrapper still run for real. Spies on a prototype outlive a single test, so the file
calls `vi.restoreAllMocks()` in `afterEach`. See
[loadBatch.spec.ts](../projects/analysis-loader/src/app/loadBatch.spec.ts) for the retry and
already-loaded cases.

### Don't hand-write fakes of vendor clients

This test used to build a `fakeClient` that reimplemented BigQuery's job registry and its 409
behavior. A hand-written fake of an SDK is a second implementation of someone else's API. It
drifts silently from the real client, its behavior is whatever we guessed, and it hides which
calls the code actually makes. Write fakes for our own interfaces, and spy on vendor SDKs.

### Quick reference

| Situation                                       | Double | Example                                                                                                               |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| An argument the tested path never reads         | Dummy  | `RssExtractor.spec.ts`                                                                                                |
| The dependency only supplies input              | Stub   | `ingestFromSource.spec.ts`                                                                                            |
| The code writes then reads, or you assert state | Fake   | `sanitizeObservation.spec.ts`                                                                                         |
| The code drives a vendor SDK client             | Spy    | `loadBatch.spec.ts`                                                                                                   |
| You want expectations set before the call       | Mock   | An imported module has side effects. Consider a spy or check state if importing the module does not have side-effects |
