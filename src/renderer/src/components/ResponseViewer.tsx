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
  WrapText,
  Calendar,
  ArrowLeftRight
} from 'lucide-react'
import { ResponseData, ResponseRun } from '../types'
import { CodeEditor } from './CodeEditor'
import { ResponseDiffModal } from './ResponseDiffModal'
import { useI18n } from '../i18n'

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
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')
  const [bodyFormat, setBodyFormat] = useState<'pretty' | 'raw'>('pretty')
  const [wrapLines, setWrapLines] = useState(true)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [isDiffOpen, setIsDiffOpen] = useState(false)

  // Determine active response: either from selected run or direct response prop
  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0]
  const displayResponse = activeRun ? activeRun.response : response

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
        name: requestName,
        timestamp: activeTimestamp
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