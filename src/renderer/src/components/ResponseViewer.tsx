import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Copy,
  Check,
  Clock,
  Database,
  AlertCircle,
  History,
  ExternalLink,
  Download,
  WrapText,
  Calendar,
  ArrowLeftRight,
  Search,
  Eye,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react'
import { ResponseData, ResponseRun } from '../types'
import { CodeEditor } from './CodeEditor'
import { ResponseDiffModal } from './ResponseDiffModal'
import { useI18n } from '../i18n'
import { useTheme } from '../theme'
import { queryJsonPath } from '../utils/jsonPath'
import { getSuggestedFileName, getFileFilters } from '../utils/fileExport'

interface Props {
  response: ResponseData | null
  isLoading: boolean
  runs?: ResponseRun[]
  selectedRunId?: string
  onSelectRun?: (runId: string) => void
  onOpenUrlInRelay?: (url: string) => void
  requestUrl?: string
  requestMethod?: string
  requestName?: string
}

function buildJsonPathSuggestions(value: any, maxDepth = 4): string[] {
  const paths: string[] = []
  const visit = (current: any, path: string, depth: number) => {
    if (depth > maxDepth || current === null || current === undefined || paths.length >= 200) return
    if (Array.isArray(current)) {
      current.slice(0, 10).forEach((item, index) => {
        const childPath = `${path}[${index}]`
        paths.push(childPath)
        visit(item, childPath, depth + 1)
      })
      return
    }
    if (typeof current !== 'object') return
    Object.keys(current).forEach((key) => {
      if (paths.length >= 200) return
      const childPath = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}['${key.replace(/'/g, "\\'")}']`
      paths.push(childPath)
      visit(current[key], childPath, depth + 1)
    })
  }
  visit(value, '$', 0)
  return paths
}

export const ResponseViewer: React.FC<Props> = ({
  response,
  isLoading,
  runs = [],
  selectedRunId,
  onSelectRun,
  onOpenUrlInRelay,
  requestUrl,
  requestMethod = 'GET',
  requestName
}) => {
  const { t, language } = useI18n()
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'body' | 'preview' | 'headers' | 'tests'>('body')
  const [bodyFormat, setBodyFormat] = useState<'pretty' | 'raw'>('pretty')
  const [wrapLines, setWrapLines] = useState(true)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [isDiffOpen, setIsDiffOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchActiveIndex, setSearchActiveIndex] = useState(0)
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false)
  const [searchWholeWord, setSearchWholeWord] = useState(false)
  const [searchRegex, setSearchRegex] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [jsonPath, setJsonPath] = useState('')
  const [isJsonPathFocused, setIsJsonPathFocused] = useState(false)
  const [jsonPathSuggestionIndex, setJsonPathSuggestionIndex] = useState(0)
  const [mediaInfo, setMediaInfo] = useState<{ width?: number; height?: number; duration?: number }>({})

  // Determine active response: either from selected run or direct response prop
  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0]
  const displayResponse = activeRun ? activeRun.response : response
  const jsonPathSuggestions = useMemo(() => {
    if (!isJsonPathFocused || !displayResponse || typeof displayResponse.data !== 'object' || displayResponse.data === null) return []
    const query = jsonPath.trim().toLowerCase()
    return buildJsonPathSuggestions(displayResponse.data).filter((path) => !query || path.toLowerCase().includes(query)).slice(0, 12)
  }, [displayResponse, isJsonPathFocused, jsonPath])

  useEffect(() => {
    setJsonPathSuggestionIndex(0)
  }, [jsonPath])

  const searchMatchCount = useMemo(() => {
    if (!displayResponse || !searchTerm.trim()) return 0
    const source = typeof displayResponse.data === 'object' ? JSON.stringify(displayResponse.data, null, 2) : String(displayResponse.data || '')
    const sourcePattern = searchRegex ? searchTerm : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = searchWholeWord ? `\\b(?:${sourcePattern})\\b` : sourcePattern
    try {
      return Array.from(source.matchAll(new RegExp(pattern, searchCaseSensitive ? 'g' : 'gi'))).length
    } catch {
      return 0
    }
  }, [displayResponse, searchTerm, searchCaseSensitive, searchWholeWord, searchRegex])

  const openSearch = () => {
    if (activeTab !== 'body') {
      setActiveTab('body')
    }
    setIsSearchOpen(true)
    if (document.activeElement !== searchInputRef.current) {
      const sel = window.getSelection()?.toString()?.trim()
      if (sel && !sel.includes('\n') && sel.length <= 100) {
        setSearchTerm(sel)
      }
    }
    if (searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    } else {
      setTimeout(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }, 0)
    }
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchTerm('')
  }

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
  }, [isSearchOpen])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const activeEl = document.activeElement as HTMLElement | null
        const isOtherInput =
          activeEl &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
          !containerRef.current?.contains(activeEl)
        if (isOtherInput) return

        const isInside = containerRef.current?.contains(activeEl)
        if (isInside || isSearchOpen) {
          e.preventDefault()
          e.stopPropagation()
          openSearch()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true)
  }, [isSearchOpen, activeTab])

  useEffect(() => {
    setSearchActiveIndex(0)
  }, [searchTerm, searchCaseSensitive, searchWholeWord, searchRegex])

  useEffect(() => {
    setMediaInfo({})
  }, [displayResponse])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 select-none">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs tracking-wider">{t('response.sending')}</span>
      </div>
    )
  }

  if (!displayResponse) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 p-6 select-none">
        <div className="text-4xl">⚡</div>
        <span className="text-sm font-medium text-slate-400">{t('response.emptyTitle')}</span>
        <p className="text-xs text-slate-400 max-w-xs text-center">
          {t('response.emptyDesc')}
        </p>
      </div>
    )
  }

  const isSuccess = displayResponse.status >= 200 && displayResponse.status < 300
  const isRedirect = displayResponse.status >= 300 && displayResponse.status < 400
  const isError = displayResponse.status >= 400 || displayResponse.status === 0

  let statusBadgeClass = 'bg-slate-800 text-slate-200 border border-slate-700 font-semibold'
  if (isSuccess) statusBadgeClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 font-semibold'
  else if (isRedirect) statusBadgeClass = 'bg-blue-500/15 text-blue-400 border border-blue-500/40 font-semibold'
  else if (isError) statusBadgeClass = 'bg-rose-500/15 text-rose-400 border border-rose-500/40 font-semibold'

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return ms + ' ms'
    return (ms / 1000).toFixed(2) + ' s'
  }

  const formatMediaDuration = (seconds?: number) => {
    if (!seconds || !Number.isFinite(seconds)) return ''
    const minutes = Math.floor(seconds / 60)
    const remaining = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${remaining}`
  }

  const formatTimestamp = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const formatFullDateTime = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const activeTimestamp = activeRun?.timestamp || displayResponse.timestamp
  const contentType = (displayResponse.contentType || '').toLowerCase().split(';')[0]
  const isMediaResponse = contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/') || contentType === 'application/pdf'
  const isLargeMediaResponse = isMediaResponse && typeof displayResponse.data === 'string' && displayResponse.data.length > 1024 * 1024

  const getFormattedBody = () => {
    if (displayResponse.data === null || displayResponse.data === undefined) return ''
    if (isLargeMediaResponse) return t('response.largeMediaBodyNotice')
    if (typeof displayResponse.data === 'object') {
      return JSON.stringify(displayResponse.data, null, 2)
    }
    const text = String(displayResponse.data)
    if (displayResponse.contentType?.includes('xml') || displayResponse.contentType?.includes('html')) {
      return text.replace(/>\s*</g, '>\n<')
    }
    return text
  }

  const bodyString = getFormattedBody()
  const rawString = isLargeMediaResponse ? bodyString : typeof displayResponse.data === 'object' ? JSON.stringify(displayResponse.data) : String(displayResponse.data || '')
  const searchedBody = bodyFormat === 'pretty' ? bodyString : rawString
  const getJsonPathResult = () => {
    if (!jsonPath.trim()) return ''
    const value = queryJsonPath(displayResponse.data, jsonPath)
    return value === undefined ? 'Not found' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }
  const displayedBody = jsonPath.trim() ? getJsonPathResult() : searchedBody
  const previewType = (displayResponse.contentType || '').toLowerCase().split(';')[0]
  const previewSupported = previewType.startsWith('image/') || previewType.startsWith('video/') || previewType.startsWith('audio/') || previewType === 'text/html' || previewType === 'application/pdf'
  const previewSource = typeof displayResponse.data === 'string' ? displayResponse.data : ''
  const previewUrl = previewSource.startsWith('data:')
    ? previewSource
    : previewSource.startsWith('http://') || previewSource.startsWith('https://')
      ? previewSource
      : previewSource
        ? `data:${previewType || 'application/octet-stream'};base64,${previewSource.replace(/^base64,/, '')}`
        : ''
  const handleCopy = () => {
    navigator.clipboard.writeText(bodyFormat === 'pretty' ? bodyString : rawString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenPopout = () => {
    if (window.electronAPI?.openResponseWindow && displayResponse) {
      const resolvedUrl = (requestUrl && !requestUrl.includes('{{'))
        ? requestUrl
        : (activeRun?.url && !activeRun.url.includes('{{'))
          ? activeRun.url
          : (requestUrl || activeRun?.url || '')

      window.electronAPI.openResponseWindow({
        response: displayResponse,
        url: resolvedUrl,
        method: activeRun?.method || requestMethod,
        name: requestName,
        timestamp: activeTimestamp,
        language,
        theme
      })
    }
  }

  const handleSaveFile = async () => {
    if (!window.electronAPI?.saveFileDialog || !displayResponse) return
    const isPreview = activeTab === 'preview'
    const binaryPreview = isPreview && (previewType.startsWith('image/') || previewType.startsWith('video/') || previewType.startsWith('audio/') || previewType === 'application/pdf')
    const isJsonObject = typeof displayResponse.data === 'object'

    const effectiveUrl = (activeRun?.url && !activeRun.url.includes('{{'))
      ? activeRun.url
      : (requestUrl && !requestUrl.includes('{{'))
        ? requestUrl
        : (previewSource.startsWith('http://') || previewSource.startsWith('https://'))
          ? previewSource
          : (activeRun?.url || requestUrl || '')

    const defaultPath = getSuggestedFileName({
      url: effectiveUrl,
      headers: displayResponse.headers,
      requestName,
      contentType: displayResponse.contentType,
      isPreview,
      isJsonObject
    })

    const filters = getFileFilters({
      contentType: displayResponse.contentType,
      isPreview,
      isJsonObject,
      defaultPath
    })

    let previewBase64 = previewSource.match(/^data:[^;]+;base64,(.*)$/s)?.[1] || null
    if (!previewBase64 && binaryPreview && typeof previewSource === 'string') {
      if (previewSource.startsWith('base64,')) {
        previewBase64 = previewSource.slice(7)
      } else if (!previewSource.startsWith('http://') && !previewSource.startsWith('https://')) {
        previewBase64 = previewSource.trim()
      }
    }

    const result = await window.electronAPI.saveFileDialog({
      defaultPath,
      filters,
      content: binaryPreview && previewBase64
        ? { encoding: 'base64', data: previewBase64 }
        : isPreview && previewType === 'text/html'
          ? previewSource
          : bodyFormat === 'pretty' ? bodyString : rawString
    })
    if (result && result.success) {
      setSavedNotice('Saved!')
      setTimeout(() => setSavedNotice(null), 2500)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full overflow-hidden bg-slate-950/60"
      tabIndex={0}
      onKeyDownCapture={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
          event.preventDefault()
          event.stopPropagation()
          openSearch()
        }
      }}
    >
      {/* Response Status Bar */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs select-none gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Badge */}
          <div className={"flex items-center gap-1 px-2.5 py-0.5 rounded border font-mono font-medium " + statusBadgeClass}>
            {displayResponse.status === 0 ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" /> Error
              </>
            ) : (
              <>
                <span>{displayResponse.status}</span>
                <span className="opacity-80">{displayResponse.statusText}</span>
              </>
            )}
          </div>

          {/* Time */}
          <div className="flex items-center gap-1 text-slate-400" title={t('response.time')}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(displayResponse.time)}</span>
          </div>

          {/* Size */}
          <div className="flex items-center gap-1 text-slate-400" title={t('response.size')}>
            <Database className="w-3.5 h-3.5" />
            <span>{formatSize(displayResponse.size)}</span>
          </div>

          {/* Request Timestamp */}
          {activeTimestamp && (
            <div
              className="flex items-center gap-1 text-slate-400 font-mono text-xs"
              title={`${t('response.requestTimestamp')}: ${formatFullDateTime(activeTimestamp)}`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatTimestamp(activeTimestamp)}</span>
            </div>
          )}

          {/* Multi-run history dropdown for this request */}
          {runs.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 ml-1">
              <History className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-sans">{t('response.historyRuns')}:</span>
              <select
                value={activeRun?.id || ''}
                onChange={(e) => onSelectRun && onSelectRun(e.target.value)}
                className="bg-transparent text-xs text-sky-300 font-mono focus:outline-none cursor-pointer truncate max-w-[170px]"
              >
                {runs.map((r, idx) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    #{runs.length - idx} • {r.response.status} ({new Date(r.timestamp).toLocaleTimeString()}) - {r.response.time}ms
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {savedNotice && (
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mr-1 animate-in fade-in">
              ✓ {savedNotice}
            </span>
          )}

          {runs.length >= 2 && (
            <button
              type="button"
              onClick={() => setIsDiffOpen(true)}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
              title={t('diff.title')}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{t('diff.buttonText')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveFile}
            className="flex items-center gap-1 text-slate-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
            title={t('response.downloadResponse')}
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{t('common.save')}</span>
          </button>

          <button type="button" onClick={openSearch} className="p-1.5 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800/60 transition-colors" title={t('response.searchTooltip')}>
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenPopout}
            className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
            title={t('response.popoutWindow')}
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{t('response.popoutWindow')}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
            title={t('response.copyResponse')}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> {t('common.copied')}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> {t('common.copy')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-3 border-b border-slate-800 text-xs font-medium text-slate-400 select-none">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('body')}
            className={"py-2 relative transition-colors " + (activeTab === 'body' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
          >
            <span>{t('response.tabBody')}</span>
            {activeTab === 'body' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={"py-2 relative transition-colors " + (activeTab === 'headers' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
          >
            <span>{t('response.tabHeaders')}</span>
            <span className="ml-1 text-[10px] text-slate-500">
              ({Object.keys(displayResponse.headers || {}).length})
            </span>
            {activeTab === 'headers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={"py-2 relative transition-colors " + (activeTab === 'preview' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
          >
            <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{t('response.tabPreview')}</span>
            {activeTab === 'preview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={"py-2 relative transition-colors " + (activeTab === 'tests' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
          >
            <span>{t('response.tabTests')}</span>
            {displayResponse.testResults && displayResponse.testResults.length > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${
                  displayResponse.testResults.every((t) => t.passed)
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {displayResponse.testResults.filter((t) => t.passed).length}/{displayResponse.testResults.length}
              </span>
            )}
            {activeTab === 'tests' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
            )}
          </button>
        </div>

        {activeTab === 'body' && (
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setWrapLines((prev) => !prev)}
              className={"px-2 py-0.5 rounded flex items-center gap-1 transition-colors " + (wrapLines ? "bg-sky-500/15 text-sky-400 border border-sky-500/40 font-medium" : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60")}
              title={t('editor.wordWrap')}
            >
              <WrapText className="w-3 h-3" />
              <span>{t('editor.wordWrap')}</span>
            </button>

            {typeof displayResponse.data === 'object' && (
              <div className="flex items-center bg-slate-800/60 rounded border border-slate-700/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setBodyFormat('pretty')}
                  className={"px-2 py-0.5 rounded font-medium transition-colors " + (bodyFormat === 'pretty' ? "bg-sky-500 text-white shadow-sm" : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60")}
                >
                  {t('response.pretty')}
                </button>
                <button
                  type="button"
                  onClick={() => setBodyFormat('raw')}
                  className={"px-2 py-0.5 rounded font-medium transition-colors " + (bodyFormat === 'raw' ? "bg-sky-500 text-white shadow-sm" : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60")}
                >
                  {t('response.raw')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative flex-1 min-h-0 flex flex-col p-2.5" style={{ overflow: 'clip' }}>
        {isSearchOpen && (
          <div className="absolute top-3 right-3 z-50 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 shadow-2xl">
            <div className="relative">
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeSearch()
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (searchMatchCount > 0) {
                      setSearchActiveIndex((current) => (current + (event.shiftKey ? -1 : 1) + searchMatchCount) % searchMatchCount)
                    }
                  }
                }}
                placeholder={t('response.searchPlaceholder')}
                className="w-72 bg-slate-800 border border-slate-700 rounded px-2 py-1 pr-24 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                <button type="button" onClick={() => setSearchCaseSensitive((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs ${searchCaseSensitive ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`} title={t('response.caseSensitive')}>Aa</button>
                <button type="button" onClick={() => setSearchWholeWord((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs ${searchWholeWord ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`} title={t('response.wholeWord')}>ab</button>
                <button type="button" onClick={() => setSearchRegex((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs font-mono ${searchRegex ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`} title={t('response.regex')}>.*</button>
              </div>
            </div>
            <span className="min-w-12 text-center text-[11px] text-slate-400">{searchMatchCount ? `${searchActiveIndex + 1} / ${searchMatchCount}` : '0 / 0'}</span>
            <button type="button" onClick={() => searchMatchCount && setSearchActiveIndex((current) => (current - 1 + searchMatchCount) % searchMatchCount)} className="p-1 text-slate-400 hover:text-slate-100" title={t('response.prevMatch')}><ChevronUp className="w-4 h-4" /></button>
            <button type="button" onClick={() => searchMatchCount && setSearchActiveIndex((current) => (current + 1) % searchMatchCount)} className="p-1 text-slate-400 hover:text-slate-100" title={t('response.nextMatch')}><ChevronDown className="w-4 h-4" /></button>
            <button type="button" onClick={closeSearch} className="p-1 text-slate-400 hover:text-slate-100" title={t('common.close')}><X className="w-4 h-4" /></button>
          </div>
        )}
        {displayResponse.error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-xs mb-3 font-mono select-text">
            {displayResponse.error}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="flex-1 min-h-0 rounded-lg border border-slate-800 bg-slate-950/60 overflow-auto flex flex-col p-4">
            {previewSupported && previewUrl && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-3 text-xs text-slate-400 font-mono shrink-0">
                <span>{previewType || 'unknown'}</span>
                <span>{formatSize(displayResponse.size)}</span>
                {mediaInfo.width && mediaInfo.height && <span>{mediaInfo.width} × {mediaInfo.height}</span>}
                {mediaInfo.duration && <span>{formatMediaDuration(mediaInfo.duration)}</span>}
              </div>
            )}
            <div className="flex-1 min-h-0 flex items-center justify-center">
            {previewSupported && previewUrl ? (
              previewType.startsWith('image/') ? (
                <img src={previewUrl} alt="Response preview" onLoad={(event) => setMediaInfo({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="max-w-full max-h-full object-contain rounded" />
              ) : previewType.startsWith('video/') ? (
                <video src={previewUrl} controls onLoadedMetadata={(event) => setMediaInfo({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight, duration: event.currentTarget.duration })} className="max-w-full max-h-full rounded" />
              ) : previewType.startsWith('audio/') ? (
                <audio src={previewUrl} controls onLoadedMetadata={(event) => setMediaInfo({ duration: event.currentTarget.duration })} className="w-full max-w-xl" />
              ) : previewType === 'text/html' ? (
                <iframe srcDoc={previewSource} title="HTML response preview" sandbox="allow-forms" className="w-full h-full rounded bg-white" />
              ) : (
                <iframe src={previewUrl} title="PDF response preview" className="w-full h-full rounded bg-white" />
              )
            ) : (
              <div className="text-center text-sm text-slate-500">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('response.previewUnavailable')}</p>
                <p className="mt-1 text-xs text-slate-600">{displayResponse.contentType || 'unknown type'}</p>
              </div>
            )}
            </div>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="flex-1 h-full min-h-0">
            <div className="relative flex items-center gap-2 mb-2 z-20">
              <input
                value={jsonPath}
                onChange={(e) => {
                  setJsonPath(e.target.value)
                  setIsJsonPathFocused(Boolean(e.target.value.trim()))
                }}
                onFocus={() => setIsJsonPathFocused(true)}
                onBlur={() => window.setTimeout(() => setIsJsonPathFocused(false), 150)}
                onKeyDown={(e) => {
                  if (!jsonPath.trim()) return
                  if (e.key === 'ArrowDown' && jsonPathSuggestions.length > 0) {
                    e.preventDefault()
                    setJsonPathSuggestionIndex((current) => (current + 1) % jsonPathSuggestions.length)
                  } else if (e.key === 'ArrowUp' && jsonPathSuggestions.length > 0) {
                    e.preventDefault()
                    setJsonPathSuggestionIndex((current) => (current - 1 + jsonPathSuggestions.length) % jsonPathSuggestions.length)
                  } else if ((e.key === 'Enter' || e.key === 'Tab') && jsonPathSuggestions.length > 0) {
                    e.preventDefault()
                    setJsonPath(jsonPathSuggestions[jsonPathSuggestionIndex])
                    setIsJsonPathFocused(false)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setIsJsonPathFocused(false)
                  }
                }}
                placeholder={t('response.jsonPathPlaceholder')}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 pr-7 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
              />
              {jsonPath && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setJsonPath('')
                    setIsJsonPathFocused(false)
                  }}
                  className="absolute right-2 p-0.5 text-slate-500 hover:text-slate-200 rounded transition-colors"
                  title={t('response.clearJsonPath')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {isJsonPathFocused && jsonPath.trim() ? (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl text-[11px] font-mono">
                  <div className="p-1">
                    <div className="px-2 py-1 text-[10px] text-slate-500 font-sans">可选字段</div>
                    {jsonPathSuggestions.length === 0 && <div className="px-2 py-1.5 text-slate-500 font-sans">无匹配字段</div>}
                    {jsonPathSuggestions.map((path, index) => (
                      <button key={path} type="button" onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setJsonPathSuggestionIndex(index)} onClick={() => { setJsonPath(path); setIsJsonPathFocused(false) }} className={`block w-full text-left px-2 py-1.5 rounded truncate ${index === jsonPathSuggestionIndex ? 'bg-sky-500/15 text-sky-300' : 'text-slate-300 hover:bg-sky-500/15 hover:text-sky-300'}`}>
                        {path}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <CodeEditor
              value={displayedBody}
              readOnly={true}
              wrap={wrapLines}
              searchTerm={searchTerm}
              searchActiveIndex={searchActiveIndex}
              searchCaseSensitive={searchCaseSensitive}
              searchWholeWord={searchWholeWord}
              searchRegex={searchRegex}
              onOpenUrlInRelay={onOpenUrlInRelay}
            />
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 font-mono text-xs select-text">
            {Object.keys(displayResponse.headers || {}).length === 0 ? (
              <div className="text-slate-500 py-6 text-center italic">{t('response.noHeaders')}</div>
            ) : (
              Object.entries(displayResponse.headers || {}).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 py-1 border-b border-slate-800/40">
                  <span className="text-sky-400 font-medium w-44 truncate">{k}:</span>
                  <span className="text-slate-300 flex-1 break-all">{v}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-1 text-xs select-text">
            {!displayResponse.testResults || displayResponse.testResults.length === 0 ? (
              <div className="text-slate-500 py-12 text-center flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 opacity-40" />
                <span>{t('response.noTestsRun')}</span>
                <span className="text-[11px] text-slate-400">{t('response.noTestsRunTip')}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Summary Header */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{t('response.testSummary')}:</span>
                    <span className="px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10 font-mono font-medium border border-emerald-500/20">
                      PASS: {displayResponse.testResults.filter((r) => r.passed).length}
                    </span>
                    <span className="px-2 py-0.5 rounded text-rose-400 bg-rose-500/10 font-mono font-medium border border-rose-500/20">
                      FAIL: {displayResponse.testResults.filter((r) => !r.passed).length}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {displayResponse.testResults.length} {t('response.totalTests')}
                  </span>
                </div>

                {/* Individual Test Assertions */}
                <div className="flex flex-col gap-1.5">
                  {displayResponse.testResults.map((test, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-colors ${
                        test.passed
                          ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {test.passed ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                            PASS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                            FAIL
                          </span>
                        )}
                        <span className="font-medium text-slate-200">{test.name}</span>
                      </div>
                      {test.error && (
                        <div className="text-[11px] font-mono text-rose-400 pl-7 break-all">
                          {test.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isDiffOpen && (
        <ResponseDiffModal
          isOpen={isDiffOpen}
          runs={runs}
          initialLeftRunId={runs.length > 1 ? runs[1].id : runs[0]?.id}
          initialRightRunId={activeRun?.id || runs[0]?.id}
          onClose={() => setIsDiffOpen(false)}
        />
      )}
    </div>
  )
}
