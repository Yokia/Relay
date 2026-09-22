import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Copy,
  Check,
  Clock,
  Database,
  AlertCircle,
  Download,
  WrapText,
  FileCode,
  ListFilter,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Sun,
  Moon
} from 'lucide-react'
import { ResponseData, Language, Theme } from '../types'
import { CodeEditor } from './CodeEditor'
import { I18nProvider, useI18n } from '../i18n'
import { ThemeProvider, useTheme } from '../theme'
import { queryJsonPath } from '../utils/jsonPath'
import { getSuggestedFileName, getFileFilters } from '../utils/fileExport'

const methodBadgeColor: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  HEAD: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
}

interface PopoutData {
  response: ResponseData
  url?: string
  method?: string
  name?: string
  timestamp?: number
}

const PopoutContent: React.FC<{ data: PopoutData }> = ({ data }) => {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [headersCopied, setHeadersCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')
  const [bodyFormat, setBodyFormat] = useState<'pretty' | 'raw'>('pretty')
  const [wrapLines, setWrapLines] = useState(true)
  const [headerSearch, setHeaderSearch] = useState('')
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [jsonPath, setJsonPath] = useState('')
  const [isJsonPathFocused, setIsJsonPathFocused] = useState(false)
  const [jsonPathSuggestionIndex, setJsonPathSuggestionIndex] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchActiveIndex, setSearchActiveIndex] = useState(0)
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false)
  const [searchWholeWord, setSearchWholeWord] = useState(false)
  const [searchRegex, setSearchRegex] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { response, url, method = 'GET', name, timestamp: propTimestamp } = data
  const reqTimestamp = propTimestamp || response?.timestamp

  const isSuccess = response.status >= 200 && response.status < 300
  const isRedirect = response.status >= 300 && response.status < 400
  const isError = response.status >= 400 || response.status === 0

  let statusBadgeClass = 'bg-slate-800 text-slate-200 border border-slate-700 font-semibold'
  if (isSuccess) statusBadgeClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 font-semibold'
  else if (isRedirect) statusBadgeClass = 'bg-blue-500/15 text-blue-400 border border-blue-500/40 font-semibold'
  else if (isError) statusBadgeClass = 'bg-rose-500/15 text-rose-400 border border-rose-500/40 font-semibold'

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatTime = (ms: number) => {
    if (!ms) return '0 ms'
    if (ms < 1000) return ms + ' ms'
    return (ms / 1000).toFixed(2) + ' s'
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

  const getFormattedBody = () => {
    if (response.data === null || response.data === undefined) return ''
    if (typeof response.data === 'object') {
      return JSON.stringify(response.data, null, 2)
    }
    return String(response.data)
  }

  const bodyString = getFormattedBody()
  const rawString = typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data || '')
  const currentBody = bodyFormat === 'pretty' ? bodyString : rawString
  const jsonPathSuggestions = useMemo(() => {
    if (!isJsonPathFocused || typeof response.data !== 'object' || response.data === null) return []
    const paths: string[] = []
    const visit = (value: any, path: string, depth: number) => {
      if (depth > 4 || value === null || value === undefined || paths.length >= 200) return
      if (Array.isArray(value)) {
        value.slice(0, 10).forEach((item, index) => { const next = `${path}[${index}]`; paths.push(next); visit(item, next, depth + 1) })
      } else if (typeof value === 'object') {
        Object.keys(value).forEach((key) => { if (paths.length >= 200) return; const next = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}['${key.replace(/'/g, "\\'")}']`; paths.push(next); visit(value[key], next, depth + 1) })
      }
    }
    visit(response.data, '$', 0)
    const query = jsonPath.trim().toLowerCase()
    return paths.filter((path) => !query || path.toLowerCase().includes(query)).slice(0, 12)
  }, [response.data, isJsonPathFocused, jsonPath])
  const searchMatchCount = useMemo(() => {
    if (!searchTerm.trim()) return 0
    const pathValue = jsonPath.trim() ? queryJsonPath(response.data, jsonPath) : undefined
    const source = jsonPath.trim()
      ? (pathValue === undefined ? 'Not found' : typeof pathValue === 'string' ? pathValue : JSON.stringify(pathValue, null, 2))
      : currentBody
    const sourcePattern = searchRegex ? searchTerm : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = searchWholeWord ? `\\b(?:${sourcePattern})\\b` : sourcePattern
    try { return Array.from(source.matchAll(new RegExp(pattern, searchCaseSensitive ? 'g' : 'gi'))).length } catch { return 0 }
  }, [currentBody, response.data, jsonPath, searchTerm, searchCaseSensitive, searchWholeWord, searchRegex])
  const displayedBody = jsonPath.trim()
    ? (() => { const value = queryJsonPath(response.data, jsonPath); return value === undefined ? 'Not found' : typeof value === 'string' ? value : JSON.stringify(value, null, 2) })()
    : currentBody

  useEffect(() => { setJsonPathSuggestionIndex(0) }, [jsonPath])
  useEffect(() => { if (isSearchOpen) { searchInputRef.current?.focus(); searchInputRef.current?.select() } }, [isSearchOpen])
  useEffect(() => { setSearchActiveIndex(0) }, [searchTerm, searchCaseSensitive, searchWholeWord, searchRegex])

  const openSearch = () => setIsSearchOpen(true)
  const closeSearch = () => { setIsSearchOpen(false); setSearchTerm('') }
  const selectJsonPathSuggestion = (value: string) => { setJsonPath(value); setIsJsonPathFocused(false) }

  const handleCopyBody = () => {
    navigator.clipboard.writeText(currentBody)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveFile = async () => {
    if (!window.electronAPI?.saveFileDialog) return
    const isJsonObject = typeof response.data === 'object'
    const defaultFilename = getSuggestedFileName({
      url,
      headers: response.headers,
      requestName: name,
      contentType: response.contentType,
      isPreview: false,
      isJsonObject
    })
    const filters = getFileFilters({
      contentType: response.contentType,
      isPreview: false,
      isJsonObject,
      defaultPath: defaultFilename
    })
    const result = await window.electronAPI.saveFileDialog({
      defaultPath: defaultFilename,
      filters,
      content: currentBody
    })
    if (result && result.success) {
      setSavedNotice(t('response.savedNotice', { path: result.filePath.split(/[\\/]/).pop() || '' }))
      setTimeout(() => setSavedNotice(null), 3000)
    }
  }

  const handleCopyAllHeaders = () => {
    const headerLines = Object.entries(response.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')
    navigator.clipboard.writeText(headerLines)
    setHeadersCopied(true)
    setTimeout(() => setHeadersCopied(false), 2000)
  }

  const filteredHeaders = Object.entries(response.headers || {}).filter(([k, v]) => {
    if (!headerSearch) return true
    const q = headerSearch.toLowerCase()
    return k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
  })

  return (
    <div
      className="flex flex-col h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden select-none font-sans"
      tabIndex={0}
      onKeyDownCapture={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
          event.preventDefault()
          openSearch()
        }
      }}
    >
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-4 drag-region shrink-0">
        {/* Left: Method + Title + URL */}
        <div className="flex items-center gap-3 min-w-0 flex-1 no-drag">
          <span className={`px-2 py-0.5 rounded text-xs font-black font-mono border uppercase tracking-wider shrink-0 ${methodBadgeColor[method] || methodBadgeColor.GET}`}>
            {method}
          </span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 truncate">
                {name || 'Response Details'}
              </span>
              {reqTimestamp && (
                <span
                  className="text-[10px] text-slate-500 font-mono"
                  title={`${t('response.requestTimestamp')}: ${formatFullDateTime(reqTimestamp)}`}
                >
                  {formatTimestamp(reqTimestamp)}
                </span>
              )}
            </div>
            {url && (
              <span className="text-xs font-mono text-slate-400 truncate max-w-xl select-text" title={url}>
                {url}
              </span>
            )}
          </div>
        </div>

        {/* Center: Status & Metrics Badges */}
        <div className="flex items-center gap-2 no-drag shrink-0">
          <div className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 shadow-sm ${statusBadgeClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{response.status || '0'} {response.statusText || (response.status === 0 ? 'Network Error' : '')}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{formatTime(response.time)}</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>{formatSize(response.size)}</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 no-drag">
          {savedNotice && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded animate-in fade-in font-medium">
              ✓ {savedNotice}
            </span>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 px-2.5 py-1 rounded transition-colors"
            title={t('common.toggleTheme')}
          >
            {theme === 'light' ? (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-400" />
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveFile}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 px-2.5 py-1 rounded transition-colors"
            title={t('response.downloadResponse')}
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('common.save')}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyBody}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 px-2.5 py-1 rounded transition-colors"
            title={t('response.copyResponse')}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('common.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('common.copy')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-header / Tabs & Controls */}
      <div className="px-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-medium text-slate-400 shrink-0">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('body')}
            className={`py-2.5 relative transition-colors flex items-center gap-1.5 ${activeTab === 'body' ? 'text-sky-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{t('response.tabBody')}</span>
            {activeTab === 'body' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={`py-2.5 relative transition-colors flex items-center gap-1.5 ${activeTab === 'headers' ? 'text-sky-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>{t('response.tabHeaders')}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({Object.keys(response.headers || {}).length})
            </span>
            {activeTab === 'headers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
            )}
          </button>
        </div>

        {/* Tab-specific controls */}
        {activeTab === 'body' && (
          <div className="flex items-center gap-2 text-xs py-1.5">
            {/* Word wrap toggle */}
            <button
              type="button"
              onClick={() => setWrapLines((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${wrapLines ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 font-medium' : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:text-slate-100 hover:bg-slate-700'}`}
              title={t('editor.wordWrap')}
            >
              <WrapText className="w-3.5 h-3.5" />
              <span>{t('editor.wordWrap')}</span>
            </button>
            <button
              type="button"
              onClick={openSearch}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${isSearchOpen ? 'bg-sky-500/15 text-sky-400 border-sky-500/40' : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:text-slate-100 hover:bg-slate-700'}`}
              title={t('response.searchTooltip')}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t('response.searchResponse')}</span>
            </button>

            {/* Pretty / Raw toggle */}
            {typeof response.data === 'object' && (
              <div className="flex items-center bg-slate-800/60 rounded border border-slate-700/60 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBodyFormat('pretty')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${bodyFormat === 'pretty' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'}`}
                >
                  {t('response.pretty')}
                </button>
                <button
                  type="button"
                  onClick={() => setBodyFormat('raw')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${bodyFormat === 'raw' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'}`}
                >
                  {t('response.raw')}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="flex items-center gap-2 text-xs py-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-500" />
              <input
                type="text"
                placeholder={t('sidebar.searchPlaceholder')}
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded pl-7 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans w-48"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyAllHeaders}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 px-2 py-1 rounded transition-colors"
              title={t('common.copy')}
            >
              {headersCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">{t('common.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px]">{t('common.copy')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 bg-slate-950/80 flex flex-col">
        {response.error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-xs mb-3 font-mono select-text flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{response.error}</span>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="relative flex-1 h-full min-h-0 flex flex-col gap-2">
            <div className="relative shrink-0">
              <input
                type="text"
                value={jsonPath}
                onChange={(event) => { setJsonPath(event.target.value); setIsJsonPathFocused(true) }}
                onFocus={() => setIsJsonPathFocused(true)}
                onBlur={() => window.setTimeout(() => setIsJsonPathFocused(false), 120)}
                onKeyDown={(event) => {
                  if (!jsonPathSuggestions.length) return
                  if (event.key === 'ArrowDown') { event.preventDefault(); setJsonPathSuggestionIndex((value) => (value + 1) % jsonPathSuggestions.length) }
                  else if (event.key === 'ArrowUp') { event.preventDefault(); setJsonPathSuggestionIndex((value) => (value - 1 + jsonPathSuggestions.length) % jsonPathSuggestions.length) }
                  else if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); selectJsonPathSuggestion(jsonPathSuggestions[jsonPathSuggestionIndex]) }
                }}
                placeholder={t('response.jsonPathPlaceholder')}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 pr-9 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-sky-500"
              />
              {jsonPath && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setJsonPath('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200" title={t('response.clearJsonPath')}><X className="w-4 h-4" /></button>}
              {isJsonPathFocused && jsonPath && jsonPathSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded border border-slate-700 bg-slate-900 py-1 shadow-xl">
                  {jsonPathSuggestions.map((suggestion, index) => (
                    <button key={suggestion} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectJsonPathSuggestion(suggestion)} className={`block w-full px-3 py-1.5 text-left font-mono text-xs ${index === jsonPathSuggestionIndex ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:bg-slate-800'}`}>{suggestion}</button>
                  ))}
                </div>
              )}
            </div>
            {isSearchOpen && (
              <div className="absolute top-0 right-0 z-20 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 shadow-2xl">
                <div className="relative">
                  <input ref={searchInputRef} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setSearchActiveIndex((value) => searchMatchCount ? (value + (event.shiftKey ? -1 : 1) + searchMatchCount) % searchMatchCount : 0) } else if (event.key === 'Escape') closeSearch() }} placeholder={t('response.searchPlaceholder')} className="w-72 bg-slate-800 border border-slate-700 rounded px-2 py-1 pr-24 text-xs text-slate-200 focus:outline-none focus:border-sky-500" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                    <button type="button" onClick={() => setSearchCaseSensitive((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs ${searchCaseSensitive ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`} title={t('response.caseSensitive')}>Aa</button>
                    <button type="button" onClick={() => setSearchWholeWord((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs ${searchWholeWord ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`} title={t('response.wholeWord')}>ab</button>
                    <button type="button" onClick={() => setSearchRegex((value) => !value)} className={`px-1.5 py-0.5 rounded text-xs font-mono ${searchRegex ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`} title={t('response.regex')}>.*</button>
                  </div>
                </div>
                <span className="min-w-12 text-center text-[11px] text-slate-400">{searchMatchCount ? `${searchActiveIndex + 1} / ${searchMatchCount}` : '0 / 0'}</span>
                <button type="button" onClick={() => searchMatchCount && setSearchActiveIndex((value) => (value - 1 + searchMatchCount) % searchMatchCount)} className="p-1 text-slate-400 hover:text-slate-100" title={t('response.prevMatch')}><ChevronUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => searchMatchCount && setSearchActiveIndex((value) => (value + 1) % searchMatchCount)} className="p-1 text-slate-400 hover:text-slate-100" title={t('response.nextMatch')}><ChevronDown className="w-4 h-4" /></button>
                <button type="button" onClick={closeSearch} className="p-1 text-slate-400 hover:text-slate-100" title={t('common.close')}><X className="w-4 h-4" /></button>
              </div>
            )}
            <CodeEditor
              value={displayedBody}
              readOnly={true}
              wrap={wrapLines}
              height="100%"
              searchTerm={searchTerm}
              searchActiveIndex={searchActiveIndex}
              searchCaseSensitive={searchCaseSensitive}
              searchWholeWord={searchWholeWord}
              searchRegex={searchRegex}
            />
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs select-text">
            {filteredHeaders.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic">
                {t('response.noHeaders')}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-800">
                {filteredHeaders.map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3 py-1.5 hover:bg-slate-800/30 px-2 rounded group transition-colors">
                    <span className="text-sky-400 font-semibold w-56 truncate select-all shrink-0">
                      {k}:
                    </span>
                    <span className="text-slate-200 flex-1 break-all select-all font-mono">
                      {v}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(v)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 rounded transition-opacity"
                      title={t('common.copy')}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const ResponsePopoutWindow: React.FC = () => {
  const [data, setData] = useState<PopoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('relay_language') as Language) || 'zh-CN')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('relay_theme') as Theme) || 'dark')

  useEffect(() => {
    const fetchPopoutData = async () => {
      try {
        if (window.electronAPI?.getPopoutData) {
          const res = await window.electronAPI.getPopoutData()
          setData(res)
          if (res?.language) {
            setLanguage(res.language)
          }
          if (res?.theme) {
            setTheme(res.theme)
          }
        }
        if (window.electronAPI?.getData) {
          const allData = await window.electronAPI.getData()
          if (allData?.settings?.language) {
            setLanguage(allData.settings.language)
          }
          if (allData?.settings?.theme) {
            setTheme(allData.settings.theme)
          }
        }
      } catch (err) {
        console.error('Failed to get popout data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPopoutData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider">Loading...</span>
        </div>
      </div>
    )
  }

  if (!data || !data.response) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-500 gap-3 select-none p-6">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <span className="text-sm font-medium text-slate-300">No response data found</span>
      </div>
    )
  }

  return (
    <I18nProvider language={language}>
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <PopoutContent data={data} />
      </ThemeProvider>
    </I18nProvider>
  )
}
