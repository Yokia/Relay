import { WebSocketTimelineItem, WebSocketConnectionStatus, RequestItem, WebSocketConfig } from '../types'

export interface WsConnectionState {
  id: string
  status: WebSocketConnectionStatus
  messages: WebSocketTimelineItem[]
  connectedAt: number | null
  inCount: number
  inBytes: number
  outCount: number
  outBytes: number
  error?: string
}

class WsConnectionManager {
  private states = new Map<string, WsConnectionState>()
  private listeners = new Map<string, Set<() => void>>()
  private heartbeatTimers = new Map<string, any>()
  private reconnectTimers = new Map<string, any>()
  private initialized = false

  constructor() {
    this.initGlobalListener()
  }

  private initGlobalListener() {
    if (this.initialized) return
    if (typeof window !== 'undefined' && window.electronAPI?.onWsEvent) {
      this.initialized = true
      window.electronAPI.onWsEvent((event: any) => {
        this.handleWsEvent(event)
      })
    }
  }

  public getState(id: string): WsConnectionState {
    let state = this.states.get(id)
    if (!state) {
      state = {
        id,
        status: 'disconnected',
        messages: [],
        connectedAt: null,
        inCount: 0,
        inBytes: 0,
        outCount: 0,
        outBytes: 0
      }
      this.states.set(id, state)
    }
    return state
  }

  public subscribe(id: string, listener: () => void): () => void {
    this.initGlobalListener()
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set())
    }
    this.listeners.get(id)!.add(listener)

    return () => {
      const set = this.listeners.get(id)
      if (set) {
        set.delete(listener)
      }
    }
  }

  private notify(id: string) {
    const set = this.listeners.get(id)
    if (set) {
      set.forEach((fn) => fn())
    }
  }

  public async connect(
    id: string,
    options: {
      url: string
      headers?: Record<string, string>
      protocols?: string[]
      rejectUnauthorized?: boolean
      wsConfig?: WebSocketConfig
    }
  ) {
    this.initGlobalListener()
    const state = this.getState(id)
    state.status = 'connecting'
    state.error = undefined
    this.clearHeartbeat(id)
    this.clearReconnect(id)
    this.notify(id)

    try {
      const res = await window.electronAPI?.wsConnect({
        connectionId: id,
        url: options.url,
        headers: options.headers,
        protocols: options.protocols,
        rejectUnauthorized: options.rejectUnauthorized
      })

      if (!res?.success) {
        state.status = 'disconnected'
        state.error = res?.error || 'Failed to connect'
        this.appendMessage(id, {
          id: 'err-' + Date.now(),
          type: 'error',
          direction: 'system',
          data: state.error || 'Connection error',
          timestamp: Date.now()
        })
        this.notify(id)
      }
    } catch (err: any) {
      state.status = 'disconnected'
      state.error = err.message || 'Connection failed'
      this.appendMessage(id, {
        id: 'err-' + Date.now(),
        type: 'error',
        direction: 'system',
        data: state.error || 'Connection failed',
        timestamp: Date.now()
      })
      this.notify(id)
    }
  }

  public async disconnect(id: string, code = 1000, reason?: string) {
    const state = this.getState(id)
    state.status = 'disconnecting'
    this.clearHeartbeat(id)
    this.clearReconnect(id)
    this.notify(id)

    try {
      await window.electronAPI?.wsDisconnect({ connectionId: id, code, reason })
    } catch {
      // ignore
    }

    state.status = 'disconnected'
    state.connectedAt = null
    this.notify(id)
  }

  public async send(id: string, data: string, isBinary = false): Promise<boolean> {
    const state = this.getState(id)
    if (state.status !== 'connected') {
      return false
    }

    try {
      const res = await window.electronAPI?.wsSend({ connectionId: id, data, isBinary })
      if (res?.success) {
        const byteSize = new Blob([data]).size
        state.outCount += 1
        state.outBytes += byteSize
        this.appendMessage(id, {
          id: 'msg-out-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          type: 'message',
          direction: 'out',
          data,
          isBinary,
          size: byteSize,
          timestamp: Date.now()
        })
        this.notify(id)
        return true
      } else {
        this.appendMessage(id, {
          id: 'err-send-' + Date.now(),
          type: 'error',
          direction: 'system',
          data: `Send failed: ${res?.error || 'Unknown error'}`,
          timestamp: Date.now()
        })
        this.notify(id)
        return false
      }
    } catch (err: any) {
      this.appendMessage(id, {
        id: 'err-send-' + Date.now(),
        type: 'error',
        direction: 'system',
        data: `Send error: ${err.message || 'Unknown error'}`,
        timestamp: Date.now()
      })
      this.notify(id)
      return false
    }
  }

  public async ping(id: string, data?: string): Promise<boolean> {
    const state = this.getState(id)
    if (state.status !== 'connected') return false

    try {
      await window.electronAPI?.wsPing({ connectionId: id, data })
      this.appendMessage(id, {
        id: 'ping-' + Date.now(),
        type: 'ping',
        direction: 'out',
        data: data || 'ping frame sent',
        timestamp: Date.now()
      })
      this.notify(id)
      return true
    } catch {
      return false
    }
  }

  public clearMessages(id: string) {
    const state = this.getState(id)
    state.messages = []
    state.inCount = 0
    state.inBytes = 0
    state.outCount = 0
    state.outBytes = 0
    this.notify(id)
  }

  private appendMessage(id: string, msg: WebSocketTimelineItem) {
    const state = this.getState(id)
    const current = state.messages || []
    if (current.length >= 1000) {
      state.messages = [...current.slice(-800), msg]
    } else {
      state.messages = [...current, msg]
    }
  }

  private handleWsEvent(event: any) {
    const id = event.connectionId
    if (!id) return

    const state = this.getState(id)

    switch (event.type) {
      case 'open':
        state.status = 'connected'
        state.connectedAt = event.timestamp || Date.now()
        this.appendMessage(id, {
          id: 'open-' + Date.now(),
          type: 'open',
          direction: 'system',
          data: event.data || 'WebSocket connection opened',
          timestamp: event.timestamp || Date.now()
        })
        break

      case 'message':
        state.inCount += 1
        state.inBytes += event.size || 0
        this.appendMessage(id, {
          id: 'msg-in-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          type: 'message',
          direction: 'in',
          data: event.data || '',
          isBinary: event.isBinary,
          size: event.size,
          timestamp: event.timestamp || Date.now()
        })
        break

      case 'ping':
        this.appendMessage(id, {
          id: 'ping-in-' + Date.now(),
          type: 'ping',
          direction: 'in',
          data: event.data || 'ping frame received',
          timestamp: event.timestamp || Date.now()
        })
        break

      case 'pong':
        this.appendMessage(id, {
          id: 'pong-in-' + Date.now(),
          type: 'pong',
          direction: 'in',
          data: event.data || 'pong frame received',
          timestamp: event.timestamp || Date.now()
        })
        break

      case 'close':
        state.status = 'disconnected'
        state.connectedAt = null
        this.clearHeartbeat(id)
        this.appendMessage(id, {
          id: 'close-' + Date.now(),
          type: 'close',
          direction: 'system',
          data: `Disconnected (Code: ${event.code || 1000}${event.reason ? `, Reason: ${event.reason}` : ''})`,
          code: event.code,
          reason: event.reason,
          timestamp: event.timestamp || Date.now()
        })
        break

      case 'error':
        this.appendMessage(id, {
          id: 'err-' + Date.now(),
          type: 'error',
          direction: 'system',
          data: event.data || 'WebSocket error',
          timestamp: event.timestamp || Date.now()
        })
        break
    }

    this.notify(id)
  }

  private clearHeartbeat(id: string) {
    const timer = this.heartbeatTimers.get(id)
    if (timer) {
      clearInterval(timer)
      this.heartbeatTimers.delete(id)
    }
  }

  public setupHeartbeat(id: string, intervalSeconds: number, payload?: string) {
    this.clearHeartbeat(id)
    if (intervalSeconds <= 0) return

    const timer = setInterval(() => {
      const state = this.getState(id)
      if (state.status === 'connected') {
        if (payload) {
          this.send(id, payload)
        } else {
          this.ping(id)
        }
      } else {
        this.clearHeartbeat(id)
      }
    }, intervalSeconds * 1000)

    this.heartbeatTimers.set(id, timer)
  }

  private clearReconnect(id: string) {
    const timer = this.reconnectTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(id)
    }
  }
}

export const wsManager = new WsConnectionManager()
