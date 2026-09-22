import { app, shell, BrowserWindow, ipcMain, dialog, screen } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { executeRequest, RequestPayload } from './httpService'
import { executeTranslation, TranslateParams } from './translateService'
import { StorageService } from './storage'

let storage: StorageService
let mainWindow: BrowserWindow | null = null
let devToysWindow: BrowserWindow | null = null
const popoutDataMap = new Map<number, any>()

const getAppIcon = (): string => {
  // In development, resources is at project root; in packaged app, resources is at process.resourcesPath
  const isDev = !app.isPackaged
  const devIconPath = join(__dirname, '../../resources/icon.png')
  const prodIconPath = join(process.resourcesPath, 'resources/icon.png')
  const fallbackRendererIcon = join(__dirname, '../renderer/icon.png')

  if (fs.existsSync(devIconPath)) return devIconPath
  if (fs.existsSync(prodIconPath)) return prodIconPath
  if (fs.existsSync(fallbackRendererIcon)) return fallbackRendererIcon
  return devIconPath
}

function createWindow(): void {
  const savedBounds = storage?.getData()?.windowBounds
  const isMaximized = savedBounds?.isMaximized || false

  let x = savedBounds?.x
  let y = savedBounds?.y
  const width = savedBounds?.width && savedBounds.width >= 900 ? savedBounds.width : 1200
  const height = savedBounds?.height && savedBounds.height >= 600 ? savedBounds.height : 800

  // Verify bounds are within visible displays if x, y are provided
  if (typeof x === 'number' && typeof y === 'number') {
    const displays = screen.getAllDisplays()
    const isVisible = displays.some((display) => {
      const { bounds } = display
      return (
        x! >= bounds.x - 50 &&
        x! <= bounds.x + bounds.width - 50 &&
        y! >= bounds.y - 50 &&
        y! <= bounds.y + bounds.height - 50
      )
    })
    if (!isVisible) {
      x = undefined
      y = undefined
    }
  }

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 900,
    minHeight: 600,
    title: 'Relay - Lightweight API Client',
    icon: getAppIcon(),
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (isMaximized) {
    mainWindow.maximize()
  }

  // Save window bounds changes
  const saveWindowBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const max = mainWindow.isMaximized()
    if (!max) {
      const b = mainWindow.getBounds()
      storage.saveData({
        windowBounds: {
          width: b.width,
          height: b.height,
          x: b.x,
          y: b.y,
          isMaximized: false
        }
      })
    } else {
      const current = storage.getData()?.windowBounds
      storage.saveData({
        windowBounds: {
          width: current?.width || 1200,
          height: current?.height || 800,
          x: current?.x,
          y: current?.y,
          isMaximized: true
        }
      })
    }
  }

  let boundsTimer: NodeJS.Timeout | null = null
  const debouncedSaveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(saveWindowBounds, 400)
  }

  mainWindow.on('resize', debouncedSaveBounds)
  mainWindow.on('move', debouncedSaveBounds)
  mainWindow.on('close', saveWindowBounds)

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
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

  ipcMain.handle('relay:get-response-blob', (_, blobId: string) => {
    return storage.getResponseBlob(blobId)
  })

  ipcMain.handle('relay:save-data', (_, data) => {
    return storage.saveData(data)
  })

  ipcMain.handle('relay:open-external', async (_, url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      return await shell.openExternal(url)
    }
  })

  ipcMain.handle('relay:translate', async (_, params: TranslateParams) => {
    return await executeTranslation(params)
  })

  ipcMain.handle('relay:open-response-window', async (_, responsePayload: any) => {
    const popWindow = new BrowserWindow({
      width: 1000,
      height: 750,
      minWidth: 500,
      minHeight: 400,
      title: `Response: ${responsePayload.method || 'GET'} ${responsePayload.url || ''} (${responsePayload.response?.status || 0})`,
      icon: getAppIcon(),
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

  ipcMain.handle('relay:open-history-window', async () => {
    const histWindow = new BrowserWindow({
      width: 1100,
      height: 720,
      minWidth: 700,
      minHeight: 500,
      title: 'Relay - Request History',
      icon: getAppIcon(),
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    const isDev = !app.isPackaged
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      histWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?view=history-popout`)
    } else {
      histWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { view: 'history-popout' }
      })
    }
    return true
  })

  ipcMain.handle('relay:open-help-window', async () => {
    const helpWindow = new BrowserWindow({
      width: 1150,
      height: 780,
      minWidth: 800,
      minHeight: 550,
      title: 'Relay - 用户使用指南与帮助中心',
      icon: getAppIcon(),
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    const isDev = !app.isPackaged
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      helpWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?view=help-window`)
    } else {
      helpWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { view: 'help-window' }
      })
    }
    return true
  })

  ipcMain.handle('relay:open-devtoys-window', async () => {
    if (devToysWindow && !devToysWindow.isDestroyed()) {
      if (devToysWindow.isMinimized()) {
        devToysWindow.restore()
      }
      devToysWindow.focus()
      return true
    }

    devToysWindow = new BrowserWindow({
      width: 1150,
      height: 780,
      minWidth: 800,
      minHeight: 550,
      title: 'Relay - 开发者工具箱 & 便签',
      icon: getAppIcon(),
      autoHideMenuBar: true,
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    devToysWindow.on('closed', () => {
      devToysWindow = null
    })

    const isDev = !app.isPackaged
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      devToysWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?view=devtoys`)
    } else {
      devToysWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        query: { view: 'devtoys' }
      })
    }
    return true
  })

  ipcMain.handle('relay:open-request-in-main', (_, req: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('relay:load-request-from-history', req)
      mainWindow.focus()
      return true
    }
    return false
  })

  ipcMain.handle('relay:notify-history-updated', (_, hist: any[]) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('relay:history-updated', hist)
    }
    return true
  })

  ipcMain.handle('relay:get-popout-data', (event) => {
    return popoutDataMap.get(event.sender.id) || null
  })

  ipcMain.handle('relay:save-file-dialog', async (event, { defaultPath, content, filters }: { defaultPath?: string; content: string | { encoding: 'base64'; data: string }; filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { canceled: true }
    
    let computedFilters: Electron.FileFilter[] | undefined = filters && filters.length > 0 ? filters : undefined
    if (!computedFilters) {
      const ext = defaultPath ? path.extname(defaultPath).toLowerCase().replace('.', '') : ''
      if (ext === 'html' || ext === 'htm') {
        computedFilters = [
          { name: 'HTML Document', extensions: ['html', 'htm'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (ext === 'md' || ext === 'markdown') {
        computedFilters = [
          { name: 'Markdown Document', extensions: ['md', 'markdown'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (ext === 'json') {
        computedFilters = [
          { name: 'JSON Document', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'].includes(ext)) {
        computedFilters = [
          { name: `${ext.toUpperCase()} Video`, extensions: [ext] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
        computedFilters = [
          { name: `${ext.toUpperCase()} Image`, extensions: [ext] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
        computedFilters = [
          { name: `${ext.toUpperCase()} Audio`, extensions: [ext] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (ext === 'pdf') {
        computedFilters = [
          { name: 'PDF Document', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (ext === 'txt' || ext === 'log') {
        computedFilters = [
          { name: 'Text Document', extensions: ['txt', 'log'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else if (ext) {
        computedFilters = [
          { name: `${ext.toUpperCase()} File`, extensions: [ext] },
          { name: 'All Files', extensions: ['*'] }
        ]
      } else {
        computedFilters = [
          { name: 'All Files', extensions: ['*'] }
        ]
      }
    }

    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultPath || 'export.json',
      filters: computedFilters
    })
    if (!result.canceled && result.filePath) {
      if (typeof content === 'object' && content.encoding === 'base64') {
        fs.writeFileSync(result.filePath, Buffer.from(content.data, 'base64'))
      } else {
        fs.writeFileSync(result.filePath, content, 'utf-8')
      }
      return { success: true, filePath: result.filePath }
    }
    return { canceled: true }
  })

  ipcMain.handle('relay:open-file-dialog', async (event, opts?: { filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { canceled: true }
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: opts?.filters || [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      const content = fs.readFileSync(filePath, 'utf-8')
      return { success: true, filePath, content }
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
