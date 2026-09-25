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
  - Build test doubles inline, inside the call that uses them.
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

- **Spy on real SDK clients instead of faking them.** When a test needs a third-party client such
  as BigQuery, build a real client instance and stub only the network-facing methods with
  `vi.spyOn`. Then assert on how those methods were called. Don't write a partial fake of the
  client. A hand-written fake is a second implementation of the SDK. It drifts from the real
  one, and it hides which calls the code actually makes. See
  [loadBatch.spec.ts](../projects/analysis-loader/src/app/loadBatch.spec.ts).

- **Keep tests independent.** A test must pass when run alone or in any order. Don't let one
  test read state, such as a shared log file, that another test wrote.
