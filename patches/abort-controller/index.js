// Allows for the following import styles in Node 18+ environments with native AbortController support:
// require("abort-controller")
// require("abort-controller").AbortController
// import AbortController from "abort-controller"

const AbortControllerCtor = globalThis.AbortController
const AbortSignalCtor = globalThis.AbortSignal

if (!AbortControllerCtor || !AbortSignalCtor) {
  throw new Error(
    'Native AbortController/AbortSignal not found. Ensure Node 18+.'
  )
}

// IMPORTANT: CommonJS default export should be the constructor itself
module.exports = AbortControllerCtor

// Also provide named exports (many libs do require('abort-controller').AbortController)
module.exports.AbortController = AbortControllerCtor
module.exports.AbortSignal = AbortSignalCtor

// And provide an explicit `.default` for ESM interop edge cases
module.exports.default = AbortControllerCtor
