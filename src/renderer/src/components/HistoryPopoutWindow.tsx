import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Trash2,
  Search,
  X,
  Copy,
  Check,
  Clock,
  Sun,
  Moon,
  RefreshCw,
  AlertTriangle,
  Layers,
  Terminal,
  Link,
  ArrowRight,
  Database,
  FileCode,
  FileText,
  AlertCircle
  ,ChevronUp
  ,ChevronDown
} from 'lucide-react'
import { HistoryItem, RequestItem, HttpMethod, Language, Theme, ConstantItem, Environment } from '../types'
import { CodeEditor } from './CodeEditor'
import { I18nProvider, useI18n } from '../i18n'
import { ThemeProvider, useTheme } from '../theme'
import { stripJsonComments } from '../utils/jsonUtils'
import { queryJsonPath } from '../utils/jsonPath'

const methodColorMap: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  HEAD: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
}

function HistoryPopoutContent() {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [constants, setConstants] = useState<ConstantItem[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [activeEnvId, setActiveEnvId] = useState<string | undefined>(undefined)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL')
  const [activeDetailTab, setActiveDetailTab] = useState<'response' | 'params' | 'headers' | 'body'>('response')

  const [copiedCurl, setCopiedCurl] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedResponse, setCopiedResponse] = useState(false)
  const [responseFormat, setResponseFormat] = useState<'pretty' | 'raw'>('pretty')
  const [openedNotice, setOpenedNotice] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showResponseHeaders, setShowResponseHeaders] = useState(false)
  const [jsonPath, setJsonPath] = useState('')
  const [isJsonPathFocused, setIsJsonPathFocused] = useState(false)
  const [jsonPathSuggestionIndex, setJsonPathSuggestionIndex] = useState(0)
  const [responseSearch, setResponseSearch] = useState('')
  const [isResponseSearchOpen, setIsResponseSearchOpen] = useState(false)
  const [responseSearchIndex, setResponseSearchIndex] = useState(0)
  const [responseSearchCaseSensitive, setResponseSearchCaseSensitive] = useState(false)
  const [responseSearchWholeWord, setResponseSearchWholeWord] = useState(false)
  const [responseSearchRegex, setResponseSearchRegex] = useState(false)
  const responseSearchInputRef = useRef<HTMLInputElement>(null)

  // Interpolate constant variables for older history items that saved raw templates
  const interpolateUrl = (url: string): string => {
    if (!url) return ''
    let result = url
    for (const c of constants) {
      if (c.name && c.currentValue) {
        result = result.replaceAll('{{' + c.name + '}}', c.currentValue)
      }
    }
    if (activeEnvId) {
      const env = environments.find((e) => e.id === activeEnvId)
      if (env) {
        for (const v of env.variables) {
          if (v.enabled && v.key?.trim()) {
            result = result.replaceAll('{{' + v.key.trim() + '}}', v.value)
          }
        }
      }
    }
    return result
  }

  // Load history & environment context from storage
  const loadHistory = () => {
    if (window.electronAPI) {
      window.electronAPI.getData().then((data: any) => {
        if (data) {
          if (data.history) setHistory(data.history)
          if (data.constants) setConstants(data.constants)
          if (data.environments) setEnvironments(data.environments)
          if (data.activeEnvironmentId) setActiveEnvId(data.activeEnvironmentId)
          if (data.history?.length > 0 && !selectedId) {
            setSelectedId(data.history[0].id)
          }
        }
      })
    }
  }

  useEffect(() => {
    loadHistory()
    if (window.electronAPI?.onHistoryUpdated) {
      const unsubscribe = window.electronAPI.onHistoryUpdated((newHist) => {
        if (Array.isArray(newHist)) {
          setHistory(newHist)
        }
      })
      return () => {
        if (unsubscribe) unsubscribe()
      }
    }
  }, [])

  // Filter history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const effectiveUrl = interpolateUrl(item.request.url)
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchUrl = effectiveUrl.toLowerCase().includes(q)
        const matchMethod = item.request.method.toLowerCase().includes(q)
        const matchStatus = String(item.status).includes(q)
        const matchName = item.request.name?.toLowerCase().includes(q)
        if (!matchUrl && !matchMethod && !matchStatus && !matchName) return false
      }
      // Method filter
      if (methodFilter !== 'ALL' && item.request.method !== methodFilter) {
        return false
      }
      // Status filter
      if (statusFilter === 'SUCCESS') {
        if (!(item.status >= 200 && item.status < 300)) return false
      } else if (statusFilter === 'ERROR') {
        if (!(item.status >= 400 || item.status === 0)) return false
      }
      return true
    })
  }, [history, searchQuery, methodFilter, statusFilter, constants, environments, activeEnvId])

  // Active selected item
  const selectedItem = useMemo(() => {
    if (!selectedId) return filteredHistory[0] || null
    return history.find((h) => h.id === selectedId) || filteredHistory[0] || null
  }, [history, selectedId, filteredHistory])

  useEffect(() => {
    const blobId = selectedItem?.response?.blobId
    if (!blobId || !window.electronAPI?.getResponseBlob) return
    window.electronAPI.getResponseBlob(blobId).then((data: any) => {
      setHistory((prev) => prev.map((item) => item.id === selectedItem.id
        ? { ...item, response: { ...item.response, data, blobId: undefined } }
        : item
      ))
    }).catch((err: any) => {
      console.error('Failed to load history response blob:', err)
    })
  }, [selectedItem?.id, selectedItem?.response?.blobId])

  const selectedPreviewUrl = useMemo(() => {
    return selectedItem ? interpolateUrl(selectedItem.request.url) : ''
  }, [selectedItem, constants, environments, activeEnvId])

  const responseBody = selectedItem?.response ? formatResponseData(selectedItem.response.data, responseFormat) : ''
  const jsonPathSuggestions = useMemo(() => {
    const data = selectedItem?.response?.data
    if (!isJsonPathFocused || !data || typeof data !== 'object') return []
    const paths: string[] = []
    const visit = (value: any, path: string, depth: number) => {
      if (depth > 4 || value === null || value === undefined || paths.length >= 200) return
      if (Array.isArray(value)) value.slice(0, 10).forEach((item, index) => { const next = `${path}[${index}]`; paths.push(next); visit(item, next, depth + 1) })
      else if (typeof value === 'object') Object.keys(value).forEach((key) => { if (paths.length >= 200) return; const next = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}['${key.replace(/'/g, "\\'")}']`; paths.push(next); visit(value[key], next, depth + 1) })
    }
    visit(data, '$', 0)
    const query = jsonPath.trim().toLowerCase()
    return paths.filter((path) => !query || path.toLowerCase().includes(query)).slice(0, 12)
  }, [selectedItem, isJsonPathFocused, jsonPath])
  const displayedResponseBody = useMemo(() => {
    if (!jsonPath.trim() || !selectedItem?.response) return responseBody
    const value = queryJsonPath(selectedItem.response.data, jsonPath)
    return value === undefined ? 'Not found' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }, [selectedItem, jsonPath, responseBody])
  const responseSearchMatchCount = useMemo(() => {
    if (!responseSearch.trim()) return 0
    const sourcePattern = responseSearchRegex ? responseSearch : responseSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = responseSearchWholeWord ? `\\b(?:${sourcePattern})\\b` : sourcePattern
    try { return Array.from(displayedResponseBody.matchAll(new RegExp(pattern, responseSearchCaseSensitive ? 'g' : 'gi'))).length } catch { return 0 }
  }, [displayedResponseBody, responseSearch, responseSearchCaseSensitive, responseSearchWholeWord, responseSearchRegex])

  useEffect(() => { setJsonPathSuggestionIndex(0) }, [jsonPath])
  useEffect(() => { setResponseSearchIndex(0) }, [responseSearch, responseSearchCaseSensitive, responseSearchWholeWord, responseSearchRegex])
  useEffect(() => { if (isResponseSearchOpen) { responseSearchInputRef.current?.focus(); responseSearchInputRef.current?.select() } }, [isResponseSearchOpen])

  // Delete single history item
  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const next = history.filter((h) => h.id !== id)
    setHistory(next)
    if (selectedId === id) {
      const remainingFiltered = filteredHistory.filter((h) => h.id !== id)
      setSelectedId(remainingFiltered[0]?.id || null)
    }
    if (window.electronAPI) {
      window.electronAPI.saveData({ history: next })
      window.electronAPI.notifyHistoryUpdated(next)
    }
  }

  // Clear all history
  const handleClearAll = () => {
    setHistory([])
    setSelectedId(null)
    setShowClearConfirm(false)
    if (window.electronAPI) {
      window.electronAPI.saveData({ history: [] })
      window.electronAPI.notifyHistoryUpdated([])
    }
  }

  // Open in Main Window
  const handleOpenInMain = () => {
    if (!selectedItem || !window.electronAPI) return
    // Pass request with resolved URL so main workspace loads the previewed address directly
    const reqToOpen: RequestItem = {
      ...selectedItem.request,
      url: selectedPreviewUrl
    }
    window.electronAPI.openRequestInMain(reqToOpen)
    setOpenedNotice(true)
    setTimeout(() => setOpenedNotice(false), 2000)
  }

  // Copy URL
  const handleCopyUrl = () => {
    if (!selectedPreviewUrl) return
    navigator.clipboard.writeText(selectedPreviewUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1500)
  }

  // Copy cURL
  const handleCopyCurl = () => {
    if (!selectedItem) return
    const req = selectedItem.request
    let curl = `curl --location --request ${req.method} '${selectedPreviewUrl}'`
    if (req.headers && req.headers.length > 0) {
      req.headers.forEach((h) => {
        if (h.enabled && h.key) {
          curl += ` \\\n  --header '${h.key}: ${h.value}'`
        }
      })
    }
    if (req.bodyType === 'json' && req.bodyRaw) {
      const cleanJson = stripJsonComments(req.bodyRaw)
      curl += ` \\\n  --header 'Content-Type: application/json' \\\n  --data-raw '${cleanJson.replace(/'/g, "'\\''")}'`
    }
    navigator.clipboard.writeText(curl)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 1500)
  }

  // Copy Response Body
  const handleCopyResponse = () => {
    if (!selectedItem?.response?.data) return
    const text = formatResponseData(selectedItem.response.data, responseFormat)
    navigator.clipboard.writeText(text)
    setCopiedResponse(true)
    setTimeout(() => setCopiedResponse(false), 1500)
  }

  // Format response data
  function formatResponseData(data: any, format: 'pretty' | 'raw'): string {
    if (data === null || data === undefined) return ''
    if (typeof data === 'string') {
      if (format === 'pretty') {
        try {
          const parsed = JSON.parse(data)
          return JSON.stringify(parsed, null, 2)
        } catch {
          return data
        }
      }
      return data
    }
    if (typeof data === 'object') {
      return format === 'pretty' ? JSON.stringify(data, null, 2) : JSON.stringify(data)
    }
    return String(data)
  }

  // Format bytes
  const formatSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // Format timestamp
  const formatTime = (timestamp: number) => {
    if (!timestamp) return '-'
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const date = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-200 select-none overflow-hidden font-sans" tabIndex={0} onKeyDownCapture={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && activeDetailTab === 'response') { event.preventDefault(); setIsResponseSearchOpen(true) } }}>
      {/* Top Header */}
      <header className="h-11 px-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 font-bold text-sm text-slate-100">
          <div className="w-6 h-6 bg-sky-500 rounded flex items-center justify-center text-white text-xs font-black shadow-md shadow-sky-500/20">
            R
          </div>
          <span>{t('historyWindow.title')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-normal">
            {t('historyWindow.recordsCount', { count: history.length })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 rounded transition-colors cursor-pointer"
              title={t('historyWindow.clearAll')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('historyWindow.clearAll')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadHistory}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title={t('common.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors cursor-pointer"
            title={t('common.toggleTheme')}
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: Filter & Records List */}
        <aside className="w-[380px] border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0">
          {/* Search & Filter Bar */}
          <div className="p-2.5 border-b border-slate-800 flex flex-col gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder={t('historyWindow.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/70 rounded pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  className={`px-2 py-0.5 rounded font-mono font-medium transition-colors ${
                    methodFilter === m
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {m === 'ALL' ? t('historyWindow.allMethods') : m}
                </button>
              ))}

              <div className="h-3 w-px bg-slate-800 mx-0.5" />

              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'SUCCESS' ? 'ALL' : 'SUCCESS')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  statusFilter === 'SUCCESS'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-emerald-400/80 hover:bg-slate-700'
                }`}
              >
                2xx
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'ERROR' ? 'ALL' : 'ERROR')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  statusFilter === 'ERROR'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-rose-400/80 hover:bg-slate-700'
                }`}
              >
                4xx/5xx
              </button>
            </div>
          </div>

          {/* Records List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500 text-xs text-center gap-2">
                <Clock className="w-8 h-8 opacity-40" />
                <span>{history.length === 0 ? t('historyWindow.noHistory') : t('historyWindow.noMatching')}</span>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isSelected = selectedItem?.id === item.id
                const isSuccess = item.status >= 200 && item.status < 300
                const isError = item.status >= 400 || item.status === 0
                const itemPreviewUrl = interpolateUrl(item.request.url)

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all border group relative ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/50 shadow-sm ring-1 ring-sky-500/30'
                        : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${methodColorMap[item.request.method] || 'text-slate-400 border-slate-700'}`}>
                          {item.request.method}
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-200 truncate" title={itemPreviewUrl}>
                          {itemPreviewUrl || 'No URL'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] font-mono font-semibold ${isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-amber-400'}`}>
                          {item.status || 'Err'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded transition-opacity"
                          title={t('historyWindow.deleteItem')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{formatTime(item.timestamp)}</span>
                      <div className="flex items-center gap-2">
                        {item.response?.size ? (
                          <span>{formatSize(item.response.size)}</span>
                        ) : null}
                        <span>{item.time || 0} ms</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Right Column: Record Detail View */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-900">
          {selectedItem ? (
            <div className="h-full flex flex-col">
              {/* Detail Top Header */}
              <div className="p-3.5 border-b border-slate-800 bg-slate-950/30 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border shrink-0 ${methodColorMap[selectedItem.request.method] || 'text-slate-400 border-slate-700'}`}>
                      {selectedItem.request.method}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-100 truncate select-text" title={selectedPreviewUrl}>
                      {selectedPreviewUrl}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                      title={t('sidebar.copyUrl')}
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link className="w-3.5 h-3.5 text-indigo-400" />}
                      <span>{copiedUrl ? t('common.copied') : t('sidebar.copyUrl')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCurl}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                      title={t('sidebar.copyAsCurl')}
                    >
                      {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{copiedCurl ? t('common.copied') : t('sidebar.copyAsCurl')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenInMain}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded shadow-sm shadow-sky-900/30 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>{openedNotice ? t('historyWindow.openedInMain') : t('historyWindow.openInMain')}</span>
                    </button>
                  </div>
                </div>

                {/* Status & Timing Bar */}
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">{t('historyWindow.status')}:</span>
                    <span className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                      selectedItem.status >= 200 && selectedItem.status < 300
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : selectedItem.status === 0
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {selectedItem.status} {selectedItem.response?.statusText ? `(${selectedItem.response.statusText})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">{t('historyWindow.time')}:</span>
                    <span className="text-slate-200 font-semibold">{selectedItem.time || 0} ms</span>
                  </div>
                  {selectedItem.response?.size !== undefined && selectedItem.response?.size > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">{t('historyWindow.size')}:</span>
                      <span className="text-slate-200">{formatSize(selectedItem.response.size)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">{t('historyWindow.date')}:</span>
                    <span className="text-slate-300">{formatTime(selectedItem.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Detail Navigation Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/20 px-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('response')}
                  className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeDetailTab === 'response'
                      ? 'border-sky-500 text-sky-400 font-semibold bg-sky-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{t('historyWindow.tabResponse')}</span>
                  {selectedItem.response && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab('params')}
                  className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                    activeDetailTab === 'params'
                      ? 'border-sky-500 text-sky-400 font-semibold bg-sky-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('historyWindow.tabParams')} ({selectedItem.request.params?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab('headers')}
                  className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                    activeDetailTab === 'headers'
                      ? 'border-sky-500 text-sky-400 font-semibold bg-sky-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('historyWindow.tabHeaders')} ({selectedItem.request.headers?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab('body')}
                  className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                    activeDetailTab === 'body'
                      ? 'border-sky-500 text-sky-400 font-semibold bg-sky-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('historyWindow.tabBody')} ({selectedItem.request.bodyType || 'none'})
                </button>
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1 overflow-y-auto p-4 select-text">
                {/* 1. Response Data Tab */}
                {activeDetailTab === 'response' && (
                  <div className="h-full flex flex-col gap-3">
                    {selectedItem.response ? (
                      <>
                        {/* Response Action Bar */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px] font-mono">
                              {selectedItem.response.contentType || 'unknown type'}
                            </span>
                            {selectedItem.response.headers && Object.keys(selectedItem.response.headers).length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowResponseHeaders(!showResponseHeaders)}
                                className={`px-2 py-0.5 rounded text-[11px] transition-colors border ${
                                  showResponseHeaders
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-medium'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                {t('historyWindow.tabResponseHeaders')} ({Object.keys(selectedItem.response.headers).length})
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setResponseFormat('pretty')}
                                className={`px-2 py-0.5 rounded transition-colors ${
                                  responseFormat === 'pretty'
                                    ? 'bg-slate-800 text-sky-400 font-medium'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Pretty
                              </button>
                              <button
                                type="button"
                                onClick={() => setResponseFormat('raw')}
                                className={`px-2 py-0.5 rounded transition-colors ${
                                  responseFormat === 'raw'
                                    ? 'bg-slate-800 text-sky-400 font-medium'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Raw
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={handleCopyResponse}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                              title={t('historyWindow.copyResponse')}
                            >
                              {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedResponse ? t('historyWindow.responseCopied') : t('historyWindow.copyResponse')}</span>
                            </button>
                            <button type="button" onClick={() => setIsResponseSearchOpen(true)} className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-colors ${isResponseSearchOpen ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`} title="Find in response (Ctrl+F)">
                              <Search className="w-3.5 h-3.5" />
                              <span>搜索</span>
                            </button>
                          </div>
                        </div>

                        {/* Expandable Response Headers */}
                        {showResponseHeaders && selectedItem.response.headers && (
                          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg max-h-48 overflow-y-auto mb-2">
                            <table className="w-full text-left text-xs border-collapse">
                              <tbody>
                                {Object.entries(selectedItem.response.headers).map(([k, v]) => (
                                  <tr key={k} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                    <td className="py-1 px-2 font-mono font-semibold text-sky-400 w-1/3">{k}</td>
                                    <td className="py-1 px-2 font-mono text-slate-200 break-all">{v}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Error Banner if any */}
                        {selectedItem.response.error && (
                          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div className="font-mono whitespace-pre-wrap">{selectedItem.response.error}</div>
                          </div>
                        )}

                        {/* Response Body Viewer */}
                        <div className="relative flex-1 min-h-[300px] border border-slate-800 rounded-lg overflow-hidden flex flex-col p-2">
                          {isResponseSearchOpen && <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 shadow-2xl"><div className="relative"><input ref={responseSearchInputRef} value={responseSearch} onChange={(event) => setResponseSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setIsResponseSearchOpen(false); if (event.key === 'Enter' && responseSearchMatchCount > 0) setResponseSearchIndex((current) => (current + (event.shiftKey ? -1 : 1) + responseSearchMatchCount) % responseSearchMatchCount) }} placeholder="Find in response" className="w-72 bg-slate-800 border border-slate-700 rounded px-2 py-1 pr-24 text-xs text-slate-200 focus:outline-none focus:border-sky-500" /><div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center"><button type="button" onClick={() => setResponseSearchCaseSensitive((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs ${responseSearchCaseSensitive ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`}>Aa</button><button type="button" onClick={() => setResponseSearchWholeWord((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs ${responseSearchWholeWord ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`}>ab</button><button type="button" onClick={() => setResponseSearchRegex((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs font-mono ${responseSearchRegex ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`}>.*</button></div></div><span className="min-w-12 text-center text-[11px] text-slate-400">{responseSearchMatchCount ? `${responseSearchIndex + 1} / ${responseSearchMatchCount}` : '0 / 0'}</span><button type="button" onClick={() => responseSearchMatchCount && setResponseSearchIndex((current) => (current - 1 + responseSearchMatchCount) % responseSearchMatchCount)} className="p-1 text-slate-400 hover:text-slate-100"><ChevronUp className="w-4 h-4" /></button><button type="button" onClick={() => responseSearchMatchCount && setResponseSearchIndex((current) => (current + 1) % responseSearchMatchCount)} className="p-1 text-slate-400 hover:text-slate-100"><ChevronDown className="w-4 h-4" /></button><button type="button" onClick={() => setIsResponseSearchOpen(false)} className="p-1 text-slate-400 hover:text-slate-100"><X className="w-4 h-4" /></button></div>}
                          <div className="relative shrink-0 mb-2"><input value={jsonPath} onChange={(event) => { setJsonPath(event.target.value); setIsJsonPathFocused(true) }} onFocus={() => setIsJsonPathFocused(true)} onBlur={() => window.setTimeout(() => setIsJsonPathFocused(false), 120)} onKeyDown={(event) => { if (event.key === 'ArrowDown' && jsonPathSuggestions.length) { event.preventDefault(); setJsonPathSuggestionIndex((value) => (value + 1) % jsonPathSuggestions.length) } else if (event.key === 'ArrowUp' && jsonPathSuggestions.length) { event.preventDefault(); setJsonPathSuggestionIndex((value) => (value - 1 + jsonPathSuggestions.length) % jsonPathSuggestions.length) } else if ((event.key === 'Enter' || event.key === 'Tab') && jsonPathSuggestions.length) { event.preventDefault(); setJsonPath(jsonPathSuggestions[jsonPathSuggestionIndex]); setIsJsonPathFocused(false) } }} placeholder="JSONPath: data.token or $.data.token" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 pr-7 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500" />{jsonPath && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setJsonPath('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"><X className="w-3.5 h-3.5" /></button>}{isJsonPathFocused && jsonPath.trim() && jsonPathSuggestions.length > 0 && <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl text-[11px] font-mono">{jsonPathSuggestions.map((path, index) => <button key={path} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setJsonPath(path); setIsJsonPathFocused(false) }} className={`block w-full text-left px-2 py-1.5 rounded truncate ${index === jsonPathSuggestionIndex ? 'bg-sky-500/15 text-sky-300' : 'text-slate-300 hover:bg-sky-500/15 hover:text-sky-300'}`}>{path}</button>)}</div>}</div>
                          <div className="flex-1 min-h-0"><CodeEditor value={displayedResponseBody} onChange={() => {}} readOnly={true} language={selectedItem.response.contentType?.includes('json') ? 'json' : 'text'} searchTerm={responseSearch} searchActiveIndex={responseSearchIndex} searchCaseSensitive={responseSearchCaseSensitive} searchWholeWord={responseSearchWholeWord} searchRegex={responseSearchRegex} /></div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-8 gap-2">
                        <Database className="w-8 h-8 opacity-40" />
                        <p>{t('historyWindow.responseSnapshotMissing')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Params Tab */}
                {activeDetailTab === 'params' && (
                  <div>
                    {!selectedItem.request.params || selectedItem.request.params.length === 0 ? (
                      <div className="text-slate-500 text-xs italic py-4">
                        {t('historyWindow.noParams')}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                            <th className="py-1.5 px-2 w-1/3">Key</th>
                            <th className="py-1.5 px-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.request.params.map((p, idx) => (
                            <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                              <td className="py-2 px-2 font-mono font-semibold text-sky-400">{p.key}</td>
                              <td className="py-2 px-2 font-mono text-slate-200 break-all">{p.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 3. Headers Tab */}
                {activeDetailTab === 'headers' && (
                  <div>
                    {!selectedItem.request.headers || selectedItem.request.headers.length === 0 ? (
                      <div className="text-slate-500 text-xs italic py-4">
                        {t('historyWindow.noHeaders')}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                            <th className="py-1.5 px-2 w-1/3">Header</th>
                            <th className="py-1.5 px-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.request.headers.map((h, idx) => (
                            <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                              <td className="py-2 px-2 font-mono font-semibold text-amber-400">{h.key}</td>
                              <td className="py-2 px-2 font-mono text-slate-200 break-all">{h.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 4. Request Body Tab */}
                {activeDetailTab === 'body' && (
                  <div className="h-full flex flex-col">
                    <div className="mb-2 text-xs text-slate-400 flex items-center gap-2">
                      <span className="font-semibold text-slate-300">Type:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-200">
                        {selectedItem.request.bodyType || 'none'}
                      </span>
                    </div>

                    {selectedItem.request.bodyType === 'json' || selectedItem.request.bodyType === 'raw' ? (
                      selectedItem.request.bodyRaw ? (
                        <div className="flex-1 min-h-[300px] border border-slate-800 rounded-lg overflow-hidden">
                          <CodeEditor
                            value={selectedItem.request.bodyRaw}
                            onChange={() => {}}
                            readOnly={true}
                            language={selectedItem.request.bodyType === 'json' ? 'json' : 'text'}
                          />
                        </div>
                      ) : (
                        <div className="text-slate-500 text-xs italic py-4">{t('historyWindow.noBody')}</div>
                      )
                    ) : selectedItem.request.bodyType === 'x-www-form-urlencoded' && selectedItem.request.bodyUrlEncoded ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                            <th className="py-1.5 px-2 w-1/3">Key</th>
                            <th className="py-1.5 px-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.request.bodyUrlEncoded.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                              <td className="py-2 px-2 font-mono font-semibold text-sky-400">{item.key}</td>
                              <td className="py-2 px-2 font-mono text-slate-200 break-all">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : selectedItem.request.bodyType === 'form-data' && selectedItem.request.bodyFormData ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                            <th className="py-1.5 px-2 w-1/3">Key</th>
                            <th className="py-1.5 px-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.request.bodyFormData.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                              <td className="py-2 px-2 font-mono font-semibold text-sky-400">{item.key}</td>
                              <td className="py-2 px-2 font-mono text-slate-200 break-all">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-slate-500 text-xs italic py-4">{t('historyWindow.noBody')}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              {t('historyWindow.noMatching')}
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal for Clear All */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-5 max-w-md w-full flex flex-col gap-4 text-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-slate-100">{t('historyWindow.clearConfirmTitle')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t('historyWindow.clearConfirmMsg')}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('common.confirmDelete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const HistoryPopoutWindow: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh-CN')
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getData().then((data: any) => {
        if (data?.settings?.language) setLanguage(data.settings.language)
        if (data?.settings?.theme) setTheme(data.settings.theme)
      })
    }
  }, [])

  return (
    <I18nProvider language={language} onLanguageChange={setLanguage}>
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <HistoryPopoutContent />
      </ThemeProvider>
    </I18nProvider>
  )
}
