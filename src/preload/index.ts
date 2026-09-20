import { contextBridge, ipcRenderer } from 'electron'

export const api = {
  sendRequest: (payload: any) => ipcRenderer.invoke('relay:send-request', payload),
  getData: () => ipcRenderer.invoke('relay:get-data'),
  getResponseBlob: (blobId: string) => ipcRenderer.invoke('relay:get-response-blob', blobId),
  saveData: (data: any) => ipcRenderer.invoke('relay:save-data', data),
  openExternal: (url: string) => ipcRenderer.invoke('relay:open-external', url),
  openResponseWindow: (payload: any) => ipcRenderer.invoke('relay:open-response-window', payload),
  openHistoryWindow: () => ipcRenderer.invoke('relay:open-history-window'),
  openHelpWindow: () => ipcRenderer.invoke('relay:open-help-window'),
  openDevToysWindow: () => ipcRenderer.invoke('relay:open-devtoys-window'),
  openRequestInMain: (req: any) => ipcRenderer.invoke('relay:open-request-in-main', req),
  onLoadRequestFromHistory: (callback: (req: any) => void) => {
    const listener = (_: any, req: any) => callback(req)
    ipcRenderer.on('relay:load-request-from-history', listener)
    return () => ipcRenderer.removeListener('relay:load-request-from-history', listener)
  },
  onHistoryUpdated: (callback: (hist: any[]) => void) => {
    const listener = (_: any, hist: any[]) => callback(hist)
    ipcRenderer.on('relay:history-updated', listener)
    return () => ipcRenderer.removeListener('relay:history-updated', listener)
  },
  notifyHistoryUpdated: (hist: any[]) => ipcRenderer.invoke('relay:notify-history-updated', hist),
  getPopoutData: () => ipcRenderer.invoke('relay:get-popout-data'),
  saveFileDialog: (opts: any) => ipcRenderer.invoke('relay:save-file-dialog', opts),
  openFileDialog: (opts?: any) => ipcRenderer.invoke('relay:open-file-dialog', opts),
  translate: (params: any) => ipcRenderer.invoke('relay:translate', params)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = api
}
