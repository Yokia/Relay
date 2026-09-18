import { api } from './index'

declare global {
  interface Window {
    electronAPI: typeof api
  }
}
