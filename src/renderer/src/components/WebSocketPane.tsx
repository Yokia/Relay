import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Wifi,
  WifiOff,
  Radio,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  AlertCircle,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  Zap,
  Sliders,
  Clock,
  Code,
  FileText,
  CornerDownLeft,
  Bookmark,
  Plus,
  RefreshCw,
  Filter,
  ChevronDown,
  EyeOff
} from 'lucide-react'
import {
  RequestItem,
  WebSocketTimelineItem,
  WebSocketConnectionStatus,
  WebSocketMessagePreset,
  WebSocketFilterRule,
  KeyValueItem
} from '../types'
import { useI18n } from '../i18n'
import { useWebSocket } from '../utils/useWebSocket'
import { KeyValueEditor } from './KeyValueEditor'

interface Props {
  request: RequestItem
  resolvedUrl: string
  onChange: (updates: Partial<RequestItem>) => void
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDuration(startTime: number | null): string {
  if (!startTime) return '00:00'
  const diffSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
  const hrs = Math.floor(diffSec / 3600)
  const mins = Math.floor((diffSec % 3600) / 60)
  const secs = diffSec % 60
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

export const WebSocketPane: React.FC<Props> = ({
  request,
  resolvedUrl,
  onChange,
  onToast
}) => {
  const { t } = useI18n()
  const {
    status,
    messages,
    connectedAt,
    inCount,
    inBytes,
    outCount,
    outBytes,
    connect,
    disconnect,
    send,
    ping,
    clearMessages,
    setupHeartbeat
  } = useWebSocket(request.id)

  const [activeTab, setActiveTab] = useState<'messages' | 'params' | 'headers' | 'config' | 'presets'>('messages')
  const [filterText, setFilterText] = useState('')
  const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out' | 'system'>('all')
  const [composerText, setComposerText] = useState('')
  const [composerType, setComposerType] = useState<'json' | 'text'>('json')
  const [sendWithCtrlEnter, setSendWithCtrlEnter] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [durationStr, setDurationStr] = useState('00:00')
  const [newPresetName, setNewPresetName] = useState('')
  const [isAddingPreset, setIsAddingPreset] = useState(false)
  const [showFilterRules, setShowFilterRules] = useState(false)
  const filterRulesRef = useRef<HTMLDivElement>(null)

  const filterEnabled = !!request.wsConfig?.filterEnabled
  const filterRules = useMemo(() => request.wsConfig?.filterRules || [], [request.wsConfig?.filterRules])
  const activeRulesCount = useMemo(
    () => filterRules.filter((r) => r.enabled && r.pattern.trim()).length,
    [filterRules]
  )

  // Close filter rules popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRulesRef.current && !filterRulesRef.current.contains(event.target as Node)) {
        setShowFilterRules(false)
      }
    }
    if (showFilterRules) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterRules])

  const handleToggleFilterEnabled = (val?: boolean) => {
    const nextVal = typeof val === 'boolean' ? val : !filterEnabled
    onChange({
      wsConfig: {
        ...request.wsConfig,
        filterEnabled: nextVal
      }
    })
  }

  const handleAddRule = (initialPattern = '') => {
    const newRule: WebSocketFilterRule = {
      id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      pattern: initialPattern,
      enabled: true
    }
    onChange({
      wsConfig: {
        ...request.wsConfig,
        filterEnabled: true,
        filterRules: [...filterRules, newRule]
      }
    })
  }

  const handleUpdateRule = (id: string, updates: Partial<WebSocketFilterRule>) => {
    const updated = filterRules.map((r) => (r.id === id ? { ...r, ...updates } : r))
    onChange({
      wsConfig: {
        ...request.wsConfig,
        filterRules: updated
      }
    })
  }

  const handleDeleteRule = (id: string) => {
    const updated = filterRules.filter((r) => r.id !== id)
    onChange({
      wsConfig: {
        ...request.wsConfig,
        filterRules: updated
      }
    })
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // Live connection duration timer
  useEffect(() => {
    if (status !== 'connected' || !connectedAt) {
      setDurationStr('00:00')
      return
    }

    const interval = setInterval(() => {
      setDurationStr(formatDuration(connectedAt))
    }, 1000)

    setDurationStr(formatDuration(connectedAt))
    return () => clearInterval(interval)
  }, [status, connectedAt])

  // Setup heartbeat when connected and configured
  useEffect(() => {
    if (status === 'connected') {
      const hb = request.wsConfig?.heartbeat
      const interval = request.wsConfig?.heartbeatInterval || 30
      const payload = request.wsConfig?.heartbeatMessage
      if (hb && interval > 0) {
        setupHeartbeat(interval, payload)
      } else {
        setupHeartbeat(0)
      }
    }
  }, [status, request.wsConfig?.heartbeat, request.wsConfig?.heartbeatInterval, request.wsConfig?.heartbeatMessage, setupHeartbeat])

  // Auto scroll timeline to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, autoScroll])

  // Handle Connect / Disconnect
  const handleToggleConnection = () => {
    if (status === 'connected' || status === 'connecting') {
      disconnect()
    } else {
      // Build resolved headers map
      const headersMap: Record<string, string> = {}
      ;(request.headers || []).forEach((h) => {
        if (h.enabled && h.key) {
          headersMap[h.key] = h.value || ''
        }
      })

      connect({
        url: resolvedUrl || request.url,
        headers: headersMap,
        protocols: request.wsConfig?.protocols,
        wsConfig: request.wsConfig
      })
    }
  }

  // Handle Send Message
  const handleSendMessage = async () => {
    if (!composerText.trim() || status !== 'connected') return

    const success = await send(composerText.trim(), false)
    if (success) {
      // Optional: keep composer text or clear depending on preference
    }
  }

  // Prettify JSON
  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(composerText)
      setComposerText(JSON.stringify(parsed, null, 2))
      setComposerType('json')
    } catch {
      onToast?.('Invalid JSON format', 'error')
    }
  }

  // Minify JSON
  const handleMinifyJson = () => {
    try {
      const parsed = JSON.parse(composerText)
      setComposerText(JSON.stringify(parsed))
      setComposerType('json')
    } catch {
      onToast?.('Invalid JSON format', 'error')
    }
  }

  // Copy message
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
    onToast?.(t('websocket.msgCopied'), 'success')
  }

  // Export messages log
  const handleExportLog = async () => {
    if (messages.length === 0) return
    const exportData = {
      url: resolvedUrl || request.url,
      exportedAt: new Date().toISOString(),
      summary: {
        total: messages.length,
        inCount,
        inBytes,
        outCount,
        outBytes
      },
      messages
    }

    if (window.electronAPI?.saveFileDialog) {
      const res = await window.electronAPI.saveFileDialog({
        defaultPath: `websocket-log-${Date.now()}.json`,
        content: JSON.stringify(exportData, null, 2),
        filters: [{ name: 'JSON Document', extensions: ['json'] }]
      })
      if (res?.success) {
        onToast?.(t('websocket.logExported'), 'success')
      }
    }
  }

  // Filter messages
  const filteredMessages = useMemo(() => {
    const activeRules = filterEnabled
      ? filterRules.filter((r) => r.enabled && r.pattern.trim().length > 0)
      : []

    return messages.filter((m) => {
      if (directionFilter !== 'all' && m.direction !== directionFilter) {
        return false
      }
      if (filterText.trim()) {
        const query = filterText.toLowerCase()
        if (!(m.data || '').toLowerCase().includes(query)) {
          return false
        }
      }

      // 屏蔽过滤规则（针对包含内容的报文）
      if (activeRules.length > 0 && m.data) {
        const rawData = m.data
        const lowerData = rawData.toLowerCase()

        const isBlocked = activeRules.some((rule) => {
          const pat = rule.pattern.trim().toLowerCase()
          if (!pat) return false

          // 1. 文本子串匹配（如包含 ticket 或 "ticket"）
          if (lowerData.includes(pat)) {
            return true
          }

          // 2. 深度 JSON 键名/属性名匹配
          try {
            const parsed = JSON.parse(rawData)
            const matchInJson = (obj: any, targetKey: string): boolean => {
              if (!obj || typeof obj !== 'object') return false
              if (Array.isArray(obj)) {
                return obj.some((item) => matchInJson(item, targetKey))
              }
              for (const key of Object.keys(obj)) {
                if (key.toLowerCase() === targetKey) return true
                if (typeof obj[key] === 'object' && matchInJson(obj[key], targetKey)) return true
              }
              return false
            }
            if (matchInJson(parsed, pat)) {
              return true
            }
          } catch {
            // Not valid JSON
          }

          return false
        })

        if (isBlocked) {
          return false
        }
      }

      return true
    })
  }, [messages, directionFilter, filterText, filterEnabled, filterRules])

  // Save current composer payload as preset
  const handleSavePreset = () => {
    if (!newPresetName.trim() || !composerText.trim()) return
    const currentPresets = request.wsConfig?.presets || []
    const newPreset: WebSocketMessagePreset = {
      id: 'pre-' + Date.now(),
      name: newPresetName.trim(),
      payload: composerText.trim(),
      format: composerType
    }
    const updated = [...currentPresets, newPreset]
    onChange({
      wsConfig: {
        ...(request.wsConfig || {}),
        presets: updated
      }
    })
    setNewPresetName('')
    setIsAddingPreset(false)
    onToast?.('Preset saved successfully', 'success')
  }

  // Delete preset
  const handleDeletePreset = (presetId: string) => {
    const currentPresets = request.wsConfig?.presets || []
    onChange({
      wsConfig: {
        ...(request.wsConfig || {}),
        presets: currentPresets.filter((p) => p.id !== presetId)
      }
    })
  }

  // Status configuration
  const statusConfig = {
    disconnected: {
      color: 'text-slate-400 bg-slate-800/80 border-slate-700',
      dotColor: 'bg-slate-400',
      label: t('websocket.disconnected'),
      btnBg: 'bg-teal-600 hover:bg-teal-500 text-white',
      btnText: t('websocket.connect'),
      icon: Wifi
    },
    connecting: {
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      dotColor: 'bg-amber-400 animate-ping',
      label: t('websocket.connecting'),
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      btnText: t('websocket.disconnect'),
      icon: RefreshCw
    },
    connected: {
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      dotColor: 'bg-emerald-400',
      label: `${t('websocket.connected')} (${durationStr})`,
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
      btnText: t('websocket.disconnect'),
      icon: WifiOff
    },
    disconnecting: {
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      dotColor: 'bg-rose-400',
      label: t('websocket.disconnecting'),
      btnBg: 'bg-slate-700 text-slate-400 cursor-not-allowed',
      btnText: t('websocket.disconnecting'),
      icon: WifiOff
    }
  }[status]

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950 text-slate-200 select-none overflow-hidden">
      {/* 1. Connection Header & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
            <span>{statusConfig.label}</span>
          </div>

          {/* Connect / Disconnect Action Button */}
          <button
            type="button"
            onClick={handleToggleConnection}
            disabled={status === 'disconnecting'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ${statusConfig.btnBg}`}
          >
            {status === 'connecting' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : status === 'connected' ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}
            <span>{statusConfig.btnText}</span>
          </button>

          {/* Quick Ping Frame Button */}
          {status === 'connected' && (
            <button
              type="button"
              onClick={() => ping()}
              title={t('websocket.sendPing')}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-teal-400" />
              <span>{t('websocket.sendPing')}</span>
            </button>
          )}
        </div>

        {/* Stats and Stream Controls */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="hidden md:flex items-center gap-3 font-mono text-[11px] bg-slate-950/60 px-3 py-1 rounded border border-slate-800/80">
            <span className="text-slate-300 font-semibold">{messages.length} msgs</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" />
              {inCount} ({formatBytes(inBytes)})
            </span>
            <span className="text-sky-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {outCount} ({formatBytes(outBytes)})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearMessages}
              disabled={messages.length === 0}
              title={t('websocket.clearMessages')}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleExportLog}
              disabled={messages.length === 0}
              title={t('websocket.exportLog')}
              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Split: Left (Config / Presets) + Right (Message Stream & Composer) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Side: Tabs Navigation & Config Drawers */}
        <div className="w-72 lg:w-80 border-r border-slate-800 flex flex-col bg-slate-900/60 shrink-0">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900 px-2 pt-1 gap-1 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'messages'
                  ? 'border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t('websocket.messages')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('headers')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'headers'
                  ? 'border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('websocket.headers')}</span>
              {(request.headers || []).filter((h) => h.enabled && h.key).length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('params')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'params'
                  ? 'border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>{t('websocket.params')}</span>
              {(request.params || []).filter((p) => p.enabled && p.key).length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'config'
                  ? 'border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('websocket.config')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'presets'
                  ? 'border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t('websocket.presets')}</span>
              {(request.wsConfig?.presets || []).length > 0 && (
                <span className="text-[10px] px-1 rounded-full bg-slate-800 text-slate-400">
                  {request.wsConfig?.presets?.length}
                </span>
              )}
            </button>
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-3 text-xs">
            {/* Headers Config */}
            {activeTab === 'headers' && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  握手连接头将在建立 WebSocket HTTP Upgrade 握手时一同发送。支持鉴权 Token、Cookies 及自定义协议头：
                </div>
                <KeyValueEditor
                  items={request.headers || []}
                  onChange={(headers) => onChange({ headers })}
                  keyPlaceholder="Header (e.g. Authorization)"
                  valuePlaceholder="Value (e.g. Bearer token)"
                />
              </div>
            )}

            {/* Params Config */}
            {activeTab === 'params' && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  URL 查询参数将自动拼接在 ws:// 或 wss:// 地址后：
                </div>
                <KeyValueEditor
                  items={request.params || []}
                  onChange={(params) => onChange({ params })}
                  keyPlaceholder="Param"
                  valuePlaceholder="Value"
                />
              </div>
            )}

            {/* Heartbeat & Advanced Config */}
            {activeTab === 'config' && (
              <div className="flex flex-col gap-4">
                {/* Heartbeat Settings */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{t('websocket.heartbeat')}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(request.wsConfig?.heartbeat)}
                      onChange={(e) =>
                        onChange({
                          wsConfig: {
                            ...(request.wsConfig || {}),
                            heartbeat: e.target.checked
                          }
                        })
                      }
                      className="accent-teal-500 rounded cursor-pointer w-4 h-4"
                    />
                  </div>

                  {request.wsConfig?.heartbeat && (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">{t('websocket.heartbeatInterval')}:</span>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={request.wsConfig?.heartbeatInterval || 30}
                          onChange={(e) =>
                            onChange({
                              wsConfig: {
                                ...(request.wsConfig || {}),
                                heartbeatInterval: Math.max(1, parseInt(e.target.value) || 30)
                              }
                            })
                          }
                          className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono text-teal-400"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400">{t('websocket.heartbeatPayload')}:</span>
                        <input
                          type="text"
                          placeholder='e.g. {"type":"ping"} or ping (Leave empty for raw ping frame)'
                          value={request.wsConfig?.heartbeatMessage || ''}
                          onChange={(e) =>
                            onChange({
                              wsConfig: {
                                ...(request.wsConfig || {}),
                                heartbeatMessage: e.target.value
                              }
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-[11px] text-slate-200"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Subprotocols */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <span className="font-semibold text-slate-200">{t('websocket.subprotocols')}</span>
                  <input
                    type="text"
                    placeholder="e.g. chat.v1, json (Comma separated)"
                    value={(request.wsConfig?.protocols || []).join(', ')}
                    onChange={(e) => {
                      const protos = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                      onChange({
                        wsConfig: {
                          ...(request.wsConfig || {}),
                          protocols: protos
                        }
                      })
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-[11px] text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Presets Management */}
            {activeTab === 'presets' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{t('websocket.presets')}</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingPreset(!isAddingPreset)}
                    className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('websocket.addPreset')}</span>
                  </button>
                </div>

                {isAddingPreset && (
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-teal-500/40 flex flex-col gap-2">
                    <span className="font-medium text-teal-400 text-[11px]">{t('websocket.addPresetTitle')}</span>
                    <input
                      type="text"
                      placeholder={t('websocket.presetName')}
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                    <div className="flex justify-end gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingPreset(false)}
                        className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePreset}
                        disabled={!newPresetName.trim() || !composerText.trim()}
                        className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Presets List */}
                <div className="flex flex-col gap-2">
                  {(request.wsConfig?.presets || []).length === 0 ? (
                    <div className="text-center py-6 text-slate-500 italic text-[11px]">
                      暂无预设。可在右侧编辑器编写报文后，点击“存为常用预设”。
                    </div>
                  ) : (
                    request.wsConfig?.presets?.map((preset) => (
                      <div
                        key={preset.id}
                        className="group bg-slate-950 p-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 truncate">{preset.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(preset.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-h-12 overflow-hidden bg-slate-900/60 p-1 rounded">
                          {preset.payload}
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-900">
                          <button
                            type="button"
                            onClick={() => {
                              setComposerText(preset.payload)
                              setComposerType(preset.format || 'json')
                            }}
                            className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                          >
                            {t('websocket.loadToComposer')}
                          </button>
                          {status === 'connected' && (
                            <button
                              type="button"
                              onClick={() => send(preset.payload)}
                              className="text-[10px] text-teal-400 hover:underline font-semibold cursor-pointer"
                            >
                              {t('websocket.send')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Quick Helper in messages tab */}
            {activeTab === 'messages' && (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <span className="font-semibold text-slate-300">快速提示</span>
                  <div className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                    <p>• 切换上方方法为 <strong>WS</strong> 即开启 WebSocket 调试模式。</p>
                    <p>• 支持 <code>ws://</code> 及加密的 <code>wss://</code> 连接。</p>
                    <p>• 连接建立后，可在右下角编辑器直接编写文本或 JSON 发送。</p>
                    <p>• 可点击左侧 <strong>握手连接头</strong> 传递 Authorization 或鉴权 Header。</p>
                  </div>
                </div>

                {/* Common Public Test Endpoints */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <span className="font-semibold text-slate-300">常用公开测试 Echo 地址</span>
                  <div className="flex flex-col gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onChange({ url: 'wss://echo.websocket.org' })}
                      className="text-left font-mono text-teal-400 hover:underline truncate"
                    >
                      wss://echo.websocket.org
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ url: 'ws://localhost:8080' })}
                      className="text-left font-mono text-teal-400 hover:underline truncate"
                    >
                      ws://localhost:8080
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Message Stream Timeline & Message Composer */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-950">
          {/* Timeline Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-xs shrink-0">
            {/* Search Input */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1 flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder={t('websocket.filterPlaceholder')}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-xs w-full"
              />
              {filterText && (
                <button
                  type="button"
                  onClick={() => setFilterText('')}
                  className="text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setDirectionFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                  directionFilter === 'all'
                    ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span>{t('websocket.filterAll')}</span>
                <span className="text-[10px] font-mono">({messages.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDirectionFilter('in')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                  directionFilter === 'in'
                    ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <ArrowDownLeft className={`w-3 h-3 ${directionFilter === 'in' ? 'text-teal-700 dark:text-teal-300' : 'text-emerald-400'}`} />
                <span>{t('websocket.filterInbound')}</span>
                <span className="text-[10px] font-mono">({inCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setDirectionFilter('out')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                  directionFilter === 'out'
                    ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <ArrowUpRight className={`w-3 h-3 ${directionFilter === 'out' ? 'text-teal-700 dark:text-teal-300' : 'text-sky-400'}`} />
                <span>{t('websocket.filterOutbound')}</span>
                <span className="text-[10px] font-mono">({outCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setDirectionFilter('system')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                  directionFilter === 'system'
                    ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Info className={`w-3 h-3 ${directionFilter === 'system' ? 'text-teal-700 dark:text-teal-300' : 'text-amber-400'}`} />
                <span>{t('websocket.filterSystem')}</span>
              </button>
            </div>

            {/* Custom Parameter Block Filter Popover and Toggle */}
            <div className="relative" ref={filterRulesRef}>
              <div
                className={`flex items-center rounded border transition-colors ${
                  filterEnabled && activeRulesCount > 0
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {/* Master switch shortcut */}
                <button
                  type="button"
                  onClick={() => handleToggleFilterEnabled(!filterEnabled)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium transition-colors ${
                    filterEnabled
                      ? 'text-amber-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={filterEnabled ? '快捷关闭消息过滤' : '快捷开启消息过滤'}
                >
                  <Filter className="w-3 h-3 shrink-0" />
                  <span>{t('websocket.filterBlock')}</span>
                  {filterRules.length > 0 && (
                    <span
                      className={`text-[10px] px-1 rounded font-mono ${
                        filterEnabled && activeRulesCount > 0
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {filterEnabled ? `${activeRulesCount}` : '关'}
                    </span>
                  )}
                </button>

                <div className="w-[1px] h-3.5 bg-slate-800" />

                {/* Dropdown toggle for rules config */}
                <button
                  type="button"
                  onClick={() => setShowFilterRules(!showFilterRules)}
                  className={`px-1.5 py-1 text-slate-400 hover:text-slate-200 transition-colors ${
                    showFilterRules ? 'bg-slate-800 text-slate-100' : ''
                  }`}
                  title="管理自定义参数过滤规则"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFilterRules ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Filter rules popover */}
              {showFilterRules && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-80 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl p-3 flex flex-col gap-2.5 backdrop-blur-md">
                  {/* Header & Master Toggle */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        {t('websocket.filterRulesTitle')}
                      </span>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                      <span className="text-[11px] text-slate-400">
                        {t('websocket.filterMasterSwitch')}
                      </span>
                      <input
                        type="checkbox"
                        checked={filterEnabled}
                        onChange={(e) => handleToggleFilterEnabled(e.target.checked)}
                        className="accent-amber-500 rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight">
                    {t('websocket.filterRulesDesc')}
                  </p>

                  {/* Rules list */}
                  <div className="max-h-52 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                    {filterRules.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">
                        {t('websocket.noFilterRules')}
                      </div>
                    ) : (
                      filterRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 rounded px-2 py-1"
                        >
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => handleUpdateRule(rule.id, { enabled: e.target.checked })}
                            className="accent-amber-500 rounded cursor-pointer shrink-0"
                            title="勾选此项才过滤"
                          />
                          <input
                            type="text"
                            value={rule.pattern}
                            onChange={(e) => handleUpdateRule(rule.id, { pattern: e.target.value })}
                            placeholder={t('websocket.filterRulePlaceholder')}
                            className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-600 flex-1 min-w-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                            title={t('websocket.deleteRule')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleAddRule('')}
                      className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('websocket.addFilterRule')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddRule('ticket')}
                      className="text-slate-400 hover:text-amber-300 transition-colors"
                    >
                      {t('websocket.quickAddTicket')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Auto scroll toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="accent-teal-500 rounded cursor-pointer"
              />
              <span>{t('websocket.autoScroll')}</span>
            </label>
          </div>

          {/* Timeline Messages List */}
          <div
            ref={timelineContainerRef}
            className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0 select-text"
          >
            {/* Filtered hidden messages badge bar */}
            {filterEnabled && activeRulesCount > 0 && messages.length > filteredMessages.length && (
              <div className="flex items-center justify-between px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shrink-0">
                <span className="flex items-center gap-1.5">
                  <Filter className="w-3 h-3" />
                  已根据规则过滤隐藏 {messages.length - filteredMessages.length} 条消息
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleFilterEnabled(false)}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  临时关闭过滤
                </button>
              </div>
            )}

            {filteredMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 py-12 select-none">
                <Radio className="w-10 h-10 stroke-1 text-slate-600" />
                <p className="text-xs max-w-sm text-center leading-relaxed">
                  {messages.length === 0
                    ? t('websocket.noMessages')
                    : filterEnabled && activeRulesCount > 0
                    ? `已根据过滤规则隐藏全部 ${messages.length} 条消息`
                    : '未找到匹配筛选条件的消息记录'}
                </p>
                {messages.length > 0 && filterEnabled && (
                  <button
                    type="button"
                    onClick={() => handleToggleFilterEnabled(false)}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    临时关闭过滤以查看所有消息
                  </button>
                )}
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isJson = (() => {
                  try {
                    const parsed = JSON.parse(msg.data)
                    return typeof parsed === 'object' && parsed !== null
                  } catch {
                    return false
                  }
                })()

                return (
                  <div
                    key={msg.id}
                    className={`group relative rounded-lg border p-2.5 transition-all text-xs ${
                      msg.direction === 'in'
                        ? 'bg-slate-900/90 border-emerald-500/20 hover:border-emerald-500/40'
                        : msg.direction === 'out'
                        ? 'bg-slate-900/90 border-sky-500/20 hover:border-sky-500/40'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    {/* Message Header Bar */}
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/60 select-none">
                      <div className="flex items-center gap-2">
                        {/* Direction Badge */}
                        {msg.direction === 'in' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <ArrowDownLeft className="w-3 h-3" />
                            RECV
                          </span>
                        )}
                        {msg.direction === 'out' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                            <ArrowUpRight className="w-3 h-3" />
                            SENT
                          </span>
                        )}
                        {msg.direction === 'system' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <Info className="w-3 h-3" />
                            {msg.type.toUpperCase()}
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-slate-400">
                          {formatTime(msg.timestamp)}
                        </span>

                        {msg.size !== undefined && msg.size > 0 && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {formatBytes(msg.size)}
                          </span>
                        )}

                        {isJson && (
                          <span className="text-[9px] px-1 rounded bg-slate-800 text-teal-400 font-mono">
                            JSON
                          </span>
                        )}
                      </div>

                      {/* Quick Action Icons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.data)}
                          title={t('common.copy')}
                          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {msg.direction !== 'system' && (
                          <button
                            type="button"
                            onClick={() => {
                              setComposerText(msg.data)
                              setComposerType(isJson ? 'json' : 'text')
                            }}
                            title={t('websocket.loadToComposer')}
                            className="p-1 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Body Content */}
                    <div className="font-mono text-xs text-slate-200 whitespace-pre-wrap break-all leading-relaxed">
                      {isJson ? (
                        (() => {
                          try {
                            return JSON.stringify(JSON.parse(msg.data), null, 2)
                          } catch {
                            return msg.data
                          }
                        })()
                      ) : (
                        msg.data
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Message Composer */}
          <div className="border-t border-slate-800 bg-slate-900/90 p-3 flex flex-col gap-2 shrink-0">
            {/* Composer Toolbar */}
            <div className="flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">{t('websocket.composer')}</span>

                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setComposerType('json')}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      composerType === 'json'
                        ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerType('text')}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      composerType === 'text'
                        ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    Text
                  </button>
                </div>

                {composerType === 'json' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrettifyJson}
                      title={t('websocket.formatJson')}
                      className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                    >
                      {t('websocket.formatJson')}
                    </button>
                    <button
                      type="button"
                      onClick={handleMinifyJson}
                      title={t('websocket.compactJson')}
                      className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                    >
                      {t('websocket.compactJson')}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposerText('')}
                  title={t('websocket.clearComposer')}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t('websocket.clearComposer')}
                </button>

                <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWithCtrlEnter}
                    onChange={(e) => setSendWithCtrlEnter(e.target.checked)}
                    className="accent-teal-500 rounded cursor-pointer"
                  />
                  <span>Ctrl+Enter 发送</span>
                </label>
              </div>
            </div>

            {/* Input Textarea & Send Button */}
            <div className="flex items-end gap-2">
              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => {
                  if (sendWithCtrlEnter) {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  } else {
                    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }
                }}
                rows={3}
                placeholder={t('websocket.enterPayloadPlaceholder')}
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-y min-h-[64px]"
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={status !== 'connected' || !composerText.trim()}
                title={sendWithCtrlEnter ? t('websocket.ctrlEnterShortcut') : t('websocket.sendShortcut')}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-lg font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0 h-10"
              >
                <Send className="w-4 h-4" />
                <span>{t('websocket.send')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
