import { contextBridge, ipcRenderer } from 'electron'

export const api = {
  sendRequest: (payload: any) => ipcRenderer.invoke('relay:send-request', payload),
  getData: () => ipcRenderer.invoke('relay:get-data'),
  saveData: (data: any) => ipcRenderer.invoke('relay:save-data', data),
  openExternal: (url: string) => ipcRenderer.invoke('relay:open-external', url)
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
