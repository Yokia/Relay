import React, { useState } from 'react'
import {
  Copy,
  Check,
  Clock,
  Database,
  AlertCircle,
  History,
  ExternalLink,
  Download,
  WrapText
} from 'lucide-react'
import { ResponseData, ResponseRun } from '../types'
import { CodeEditor } from './CodeEditor'

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
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')
  const [bodyFormat, setBodyFormat] = useState<'pretty' | 'raw'>('pretty')
  const [wrapLines, setWrapLines] = useState(true)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  // Determine active response: either from selected run or direct response prop
  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0]
  const displayResponse = activeRun ? activeRun.response : response

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 select-none">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs tracking-wider">Sending request...</span>
      </div>
    )
  }

  if (!displayResponse) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 p-6 select-none">
        <div className="text-4xl">⚡</div>
        <span className="text-sm font-medium text-slate-400">No response yet</span>
        <p className="text-xs text-slate-600 max-w-xs text-center">
          Click "Send" or press Ctrl+Enter to dispatch the request. Response history will be recorded automatically.
        </p>
      </div>
    )
  }

  const isSuccess = displayResponse.status >= 200 && displayResponse.status < 300
  const isRedirect = displayResponse.status >= 300 && displayResponse.status < 400
  const isError = displayResponse.status >= 400 || displayResponse.status === 0

  let statusBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700'
  if (isSuccess) statusBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  else if (isRedirect) statusBadgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  else if (isError) statusBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30'

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return ms + ' ms'
    return (ms / 1000).toFixed(2) + ' s'
  }

  const getFormattedBody = () => {
    if (displayResponse.data === null || displayResponse.data === undefined) return ''
    if (typeof displayResponse.data === 'object') {
      return JSON.stringify(displayResponse.data, null, 2)
    }
    return String(displayResponse.data)
  }

  const bodyString = getFormattedBody()
  const rawString = typeof displayResponse.data === 'object' ? JSON.stringify(displayResponse.data) : String(displayResponse.data || '')

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
        name: requestName
      })
    }
  }

  const handleSaveFile = async () => {
    if (!window.electronAPI?.saveFileDialog || !displayResponse) return
    const defaultFilename = (requestName ? requestName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'response') + (typeof displayResponse.data === 'object' ? '.json' : '.txt')
    const result = await window.electronAPI.saveFileDialog({
      defaultPath: defaultFilename,
      content: bodyFormat === 'pretty' ? bodyString : rawString
    })
    if (result && result.success) {
      setSavedNotice('Saved!')
      setTimeout(() => setSavedNotice(null), 2500)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950/60">
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
          <div className="flex items-center gap-1 text-slate-400" title="Response Time">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(displayResponse.time)}</span>
          </div>

          {/* Size */}
          <div className="flex items-center gap-1 text-slate-400" title="Response Size">
            <Database className="w-3.5 h-3.5" />
            <span>{formatSize(displayResponse.size)}</span>
          </div>

          {/* Multi-run history dropdown for this request */}
          {runs.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 ml-1">
              <History className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-sans">Run:</span>
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

          <button
            type="button"
            onClick={handleSaveFile}
            className="flex items-center gap-1 text-slate-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
            title="Save Response to File (另存为文件)"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPopout}
            className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
            title="Open in New Window (独立新窗口查看)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Pop-out</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
            title="Copy Response Body"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy
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
            <span>Body</span>
            {activeTab === 'body' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={"py-2 relative transition-colors " + (activeTab === 'headers' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
          >
            <span>Headers</span>
            <span className="ml-1 text-[10px] text-slate-500">
              ({Object.keys(displayResponse.headers || {}).length})
            </span>
            {activeTab === 'headers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
            )}
          </button>
        </div>

        {activeTab === 'body' && (
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setWrapLines((prev) => !prev)}
              className={"px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors " + (wrapLines ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "text-slate-400 hover:text-slate-200")}
              title="Toggle Line Wrap (自动换行)"
            >
              <WrapText className="w-3 h-3" />
              <span>Wrap</span>
            </button>

            {typeof displayResponse.data === 'object' && (
              <>
                <button
                  type="button"
                  onClick={() => setBodyFormat('pretty')}
                  className={"px-1.5 py-0.5 rounded " + (bodyFormat === 'pretty' ? "bg-slate-800 text-sky-400" : "text-slate-400 hover:text-slate-200")}
                >
                  Pretty
                </button>
                <button
                  type="button"
                  onClick={() => setBodyFormat('raw')}
                  className={"px-1.5 py-0.5 rounded " + (bodyFormat === 'raw' ? "bg-slate-800 text-sky-400" : "text-slate-400 hover:text-slate-200")}
                >
                  Raw
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-2.5">
        {displayResponse.error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-xs mb-3 font-mono select-text">
            {displayResponse.error}
          </div>
        )}

        {activeTab === 'body' && (
          <div className="flex-1 h-full min-h-0">
            <CodeEditor
              value={bodyFormat === 'pretty' ? bodyString : rawString}
              readOnly={true}
              wrap={wrapLines}
              onOpenUrlInRelay={onOpenUrlInRelay}
            />
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 font-mono text-xs select-text">
            {Object.entries(displayResponse.headers || {}).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 py-1 border-b border-slate-800/40">
                <span className="text-sky-400 font-medium w-44 truncate">{k}:</span>
                <span className="text-slate-300 flex-1 break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}