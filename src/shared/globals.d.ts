import type { AccountingApi } from '../preload/api'

declare global {
  interface Window {
    accountingApi?: AccountingApi
  }
}

export {}
