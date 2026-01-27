/// <reference types="vite/client" />

import { Buffer } from 'buffer'
import { ProcessType } from 'process'

declare global {
  interface Window {
    Buffer: typeof Buffer
    process: ProcessType
  }

  var Buffer: typeof Buffer
  var process: ProcessType
}

export {}
