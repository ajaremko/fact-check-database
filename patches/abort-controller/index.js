// Force everyone who imports `abort-controller` to use Node's native globals
module.exports = {
  AbortController: globalThis.AbortController,
  AbortSignal: globalThis.AbortSignal,
}
