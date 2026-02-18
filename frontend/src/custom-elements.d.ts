import type * as React from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'theme-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}

export {}
