// styled-components v5 references the global JSX namespace, but @types/react 19+
// no longer automatically populates it. This re-exports React.JSX into the global
// namespace so that styled-components' type inference resolves HTML element props.
import type React from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>
  }
}

export {}
