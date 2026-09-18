import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { executeRequest, RequestPayload } from './httpService'
import { StorageService } from './storage'

let storage: StorageService
const popoutDataMap = new Map<number, any>()

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

  ipcMain.handle('relay:open-response-window', async (_, responsePayload: any) => {
    const popWindow = new BrowserWindow({
      width: 1000,
      height: 750,
      minWidth: 500,
      minHeight: 400,
      title: `Response: ${responsePayload.method || 'GET'} ${responsePayload.url || ''} (${responsePayload.response?.status || 0})`,
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    const winId = popWindow.webContents.id
    popoutDataMap.set(winId, responsePayload)

    popWindow.on('closed', () => {
      popoutDataMap.delete(winId)
    })

    const isDev = !app.isPackaged
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      popWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?view=response-popout&winId=${winId}`)
    } else {
      popWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { view: 'response-popout', winId: String(winId) }
      })
    }
    return true
  })

  ipcMain.handle('relay:get-popout-data', (event) => {
    return popoutDataMap.get(event.sender.id) || null
  })

  ipcMain.handle('relay:save-file-dialog', async (event, { defaultPath, content }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { canceled: true }
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultPath || 'response.json',
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'Text', extensions: ['txt', 'log'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    return { canceled: true }
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