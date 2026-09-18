import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { executeRequest, RequestPayload } from './httpService'
import { StorageService } from './storage'

let storage: StorageService

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Relay - API Client',
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const isDev = !app.isPackaged
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.relay.app')
  }

  storage = new StorageService()

  // IPC Handlers
  ipcMain.handle('relay:send-request', async (_, payload: RequestPayload) => {
    return await executeRequest(payload)
  })

  ipcMain.handle('relay:get-data', () => {
    return storage.getData()
  })

  ipcMain.handle('relay:save-data', (_, data) => {
    return storage.saveData(data)
  })

  ipcMain.handle('relay:open-external', async (_, url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      return await shell.openExternal(url)
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})