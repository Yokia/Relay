import { contextBridge, ipcRenderer } from 'electron'

export const api = {
  sendRequest: (payload: any) => ipcRenderer.invoke('relay:send-request', payload),
  getData: () => ipcRenderer.invoke('relay:get-data'),
  saveData: (data: any) => ipcRenderer.invoke('relay:save-data', data),
  openExternal: (url: string) => ipcRenderer.invoke('relay:open-external', url),
  openResponseWindow: (payload: any) => ipcRenderer.invoke('relay:open-response-window', payload),
  getPopoutData: () => ipcRenderer.invoke('relay:get-popout-data'),
  saveFileDialog: (opts: any) => ipcRenderer.invoke('relay:save-file-dialog', opts)
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
