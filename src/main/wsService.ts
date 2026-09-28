import WebSocket from 'ws'
import { BrowserWindow } from 'electron'

export interface WsConnectOptions {
  connectionId: string
  url: string
  headers?: Record<string, string>
  protocols?: string[]
  rejectUnauthorized?: boolean
  handshakeTimeout?: number
}

export interface WsEventPayload {
  connectionId: string
  type: 'open' | 'message' | 'close' | 'error' | 'ping' | 'pong'
  direction?: 'in' | 'out' | 'system'
  data?: string
  isBinary?: boolean
  size?: number
  code?: number
  reason?: string
  timestamp: number
}

class WebSocketService {
  private connections = new Map<string, WebSocket>()

  private emitEvent(event: WsEventPayload) {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('relay:ws-event', event)
      }
    })
  }

  public connect(options: WsConnectOptions): { success: boolean; error?: string } {
    const { connectionId, url, headers, protocols, rejectUnauthorized = true, handshakeTimeout = 15000 } = options

    if (!url) {
      return { success: false, error: 'URL is required' }
    }

    // Close existing connection if any
    this.disconnect(connectionId, 1000, 'Reconnecting')

    try {
      // Normalize URL (http -> ws, https -> wss)
      let targetUrl = url.trim()
      if (targetUrl.startsWith('http://')) {
        targetUrl = 'ws://' + targetUrl.slice(7)
      } else if (targetUrl.startsWith('https://')) {
        targetUrl = 'wss://' + targetUrl.slice(8)
      } else if (!targetUrl.startsWith('ws://') && !targetUrl.startsWith('wss://')) {
        targetUrl = 'ws://' + targetUrl
      }

      const wsOptions: WebSocket.ClientOptions = {
        headers: headers || {},
        rejectUnauthorized,
        handshakeTimeout
      }

      const ws = new WebSocket(targetUrl, protocols && protocols.length > 0 ? protocols : undefined, wsOptions)
      this.connections.set(connectionId, ws)

      ws.on('open', () => {
        this.emitEvent({
          connectionId,
          type: 'open',
          direction: 'system',
          data: `Connected to ${targetUrl}`,
          timestamp: Date.now()
        })
      })

      ws.on('message', (rawData: WebSocket.RawData, isBinary: boolean) => {
        let textData = ''
        let byteSize = 0

        if (Buffer.isBuffer(rawData)) {
          byteSize = rawData.byteLength
          textData = isBinary ? rawData.toString('hex') : rawData.toString('utf-8')
        } else if (Array.isArray(rawData)) {
          const buf = Buffer.concat(rawData)
          byteSize = buf.byteLength
          textData = isBinary ? buf.toString('hex') : buf.toString('utf-8')
        } else {
          const buf = Buffer.from(rawData)
          byteSize = buf.byteLength
          textData = isBinary ? buf.toString('hex') : buf.toString('utf-8')
        }

        this.emitEvent({
          connectionId,
          type: 'message',
          direction: 'in',
          data: textData,
          isBinary,
          size: byteSize,
          timestamp: Date.now()
        })
      })

      ws.on('ping', (data: Buffer) => {
        this.emitEvent({
          connectionId,
          type: 'ping',
          direction: 'in',
          data: data ? data.toString('utf-8') : '',
          timestamp: Date.now()
        })
      })

      ws.on('pong', (data: Buffer) => {
        this.emitEvent({
          connectionId,
          type: 'pong',
          direction: 'in',
          data: data ? data.toString('utf-8') : '',
          timestamp: Date.now()
        })
      })

      ws.on('close', (code: number, reason: Buffer) => {
        this.connections.delete(connectionId)
        this.emitEvent({
          connectionId,
          type: 'close',
          direction: 'system',
          code,
          reason: reason ? reason.toString('utf-8') : '',
          timestamp: Date.now()
        })
      })

      ws.on('error', (err: Error) => {
        this.emitEvent({
          connectionId,
          type: 'error',
          direction: 'system',
          data: err.message || 'WebSocket error occurred',
          timestamp: Date.now()
        })
      })

      return { success: true }
    } catch (err: any) {
      this.connections.delete(connectionId)
      return { success: false, error: err.message || 'Failed to initialize WebSocket' }
    }
  }

  public send(connectionId: string, data: string, isBinary: boolean = false): { success: boolean; error?: string } {
    const ws = this.connections.get(connectionId)
    if (!ws) {
      return { success: false, error: 'Connection not found' }
    }
    if (ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'WebSocket is not open' }
    }

    try {
      const payload = isBinary ? Buffer.from(data, 'hex') : data
      ws.send(payload)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send message' }
    }
  }

  public ping(connectionId: string, data?: string): { success: boolean; error?: string } {
    const ws = this.connections.get(connectionId)
    if (!ws) {
      return { success: false, error: 'Connection not found' }
    }
    if (ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: 'WebSocket is not open' }
    }

    try {
      ws.ping(data || '')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send ping' }
    }
  }

  public disconnect(connectionId: string, code = 1000, reason?: string): { success: boolean } {
    const ws = this.connections.get(connectionId)
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(code, reason)
        }
      } catch {
        // ignore close error
      }
      this.connections.delete(connectionId)
    }
    return { success: true }
  }

  public cleanupAll() {
    this.connections.forEach((ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1001, 'Application shutdown')
        }
      } catch {
        // ignore
      }
    })
    this.connections.clear()
  }
}

export const wsService = new WebSocketService()
