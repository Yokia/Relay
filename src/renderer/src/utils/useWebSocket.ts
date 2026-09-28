import { useState, useEffect, useCallback } from 'react'
import { wsManager, WsConnectionState } from './wsManager'
import { WebSocketConfig } from '../types'

export function useWebSocket(requestId: string) {
  const [state, setState] = useState<WsConnectionState>(() => wsManager.getState(requestId))

  useEffect(() => {
    // Sync immediate current state
    const cur = wsManager.getState(requestId)
    setState({ ...cur, messages: [...cur.messages] })

    // Subscribe to changes
    const unsubscribe = wsManager.subscribe(requestId, () => {
      const updated = wsManager.getState(requestId)
      setState({ ...updated, messages: [...updated.messages] })
    })

    return unsubscribe
  }, [requestId])

  const connect = useCallback(
    (options: {
      url: string
      headers?: Record<string, string>
      protocols?: string[]
      rejectUnauthorized?: boolean
      wsConfig?: WebSocketConfig
    }) => {
      return wsManager.connect(requestId, options)
    },
    [requestId]
  )

  const disconnect = useCallback(
    (code?: number, reason?: string) => {
      return wsManager.disconnect(requestId, code, reason)
    },
    [requestId]
  )

  const send = useCallback(
    (data: string, isBinary = false) => {
      return wsManager.send(requestId, data, isBinary)
    },
    [requestId]
  )

  const ping = useCallback(
    (data?: string) => {
      return wsManager.ping(requestId, data)
    },
    [requestId]
  )

  const clearMessages = useCallback(() => {
    wsManager.clearMessages(requestId)
  }, [requestId])

  const setupHeartbeat = useCallback(
    (intervalSeconds: number, payload?: string) => {
      wsManager.setupHeartbeat(requestId, intervalSeconds, payload)
    },
    [requestId]
  )

  return {
    ...state,
    connect,
    disconnect,
    send,
    ping,
    clearMessages,
    setupHeartbeat
  }
}
