import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Sliders,
  Layers,
  BarChart3,
  AlertCircle,
  FileJson,
  CheckSquare,
  Square as SquareEmpty,
  ExternalLink
} from 'lucide-react'
import {
  RequestItem,
  ConstantItem,
  Environment,
  AppSettings,
  RunnerRequestResult,
  RunnerReport,
  HttpMethod,
  ResponseData
} from '../types'
import { useI18n } from '../i18n'

interface Props {
  isOpen: boolean
  title: string
  requests: RequestItem[]
  constants: ConstantItem[]
  environments: Environment[]
  activeEnvId?: string
  settings: AppSettings
  onClose: () => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const methodBadgeColor: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  HEAD: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
}

export const CollectionRunnerModal: React.FC<Props> = ({
  isOpen,
  title,
  requests,
  constants,
  environments,
  activeEnvId,
  settings,
  onClose,
  onToast
}) => {
  const { t } = useI18n()

  // Runner Configuration State
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(() => new Set(requests.map((r) => r.id)))
  const [selectedEnvId, setSelectedEnvId] = useState<string>(activeEnvId || '')
  const [delayMs, setDelayMs] = useState<number>(50)
  const [stopOnError, setStopOnError] = useState<boolean>(false)

  // View state
  const [viewTab, setViewTab] = useState<'queue' | 'report'>('queue')
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all')

  // Execution State
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isAborted, setIsAborted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [results, setResults] = useState<RunnerRequestResult[]>([])
  const [runStartTime, setRunStartTime] = useState<number>(0)
  const [runEndTime, setRunEndTime] = useState<number>(0)
  const [expandedResultIds, setExpandedResultIds] = useState<Set<string>>(new Set())
  const [copiedSummary, setCopiedSummary] = useState(false)

  const abortRef = useRef<boolean>(false)

  // Reset selected IDs when requests change
  useEffect(() => {
    setSelectedReqIds(new Set(requests.map((r) => r.id)))
    setResults([])
    setIsCompleted(false)
    setIsAborted(false)
    setCurrentIndex(-1)
    setViewTab('queue')
  }, [requests])

  // Interpolation helper taking selectedEnvId and constants into account
  const interpolate = (text: string, req?: RequestItem): string => {
    if (!text) return text
    let result = text
    const overrides = req?.constantOverrides || {}

    // 1. Replace constants
    for (const c of constants) {
      if (c.name) {
        const effectiveVal = overrides[c.name] !== undefined ? overrides[c.name] : c.currentValue
        if (effectiveVal) {
          result = result.replaceAll('{{' + c.name + '}}', effectiveVal)
        }
      }
    }

    // 2. Replace active environment variables
    if (selectedEnvId) {
      const env = environments.find((e) => e.id === selectedEnvId)
      if (env) {
        for (const v of env.variables) {
          if (v.enabled && v.key.trim()) {
            result = result.replaceAll('{{' + v.key.trim() + '}}', v.value)
          }
        }
      }
    }
    return result
  }

  // Active queue of requests to run
  const runnableRequests = useMemo(() => {
    return requests.filter((r) => selectedReqIds.has(r.id))
  }, [requests, selectedReqIds])

  // Toggle selection
  const handleToggleReq = (id: string) => {
    if (isRunning) return
    setSelectedReqIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (isRunning) return
    setSelectedReqIds(new Set(requests.map((r) => r.id)))
  }

  const handleDeselectAll = () => {
    if (isRunning) return
    setSelectedReqIds(new Set())
  }

  const toggleExpand = (resultId: string) => {
    setExpandedResultIds((prev) => {
      const next = new Set(prev)
      if (next.has(resultId)) next.delete(resultId)
      else next.add(resultId)
      return next
    })
  }

  // Start Runner execution
  const handleStartRun = async () => {
    if (runnableRequests.length === 0 || isRunning) return

    abortRef.current = false
    setIsRunning(true)
    setIsCompleted(false)
    setIsAborted(false)
    setResults([])
    setExpandedResultIds(new Set())
    setViewTab('report')
    const start = Date.now()
    setRunStartTime(start)

    const accumulatedResults: RunnerRequestResult[] = []

    for (let i = 0; i < runnableRequests.length; i++) {
      if (abortRef.current) {
        setIsAborted(true)
        break
      }

      setCurrentIndex(i)
      const currentReq = runnableRequests[i]

      // Prepare payload with interpolation
      const processedUrl = interpolate(currentReq.url.trim(), currentReq)
      const processedHeaders = (currentReq.headers || []).map((h) => ({
        ...h,
        key: interpolate(h.key, currentReq),
        value: interpolate(h.value, currentReq)
      }))
      const processedParams = (currentReq.params || []).map((p) => ({
        ...p,
        key: interpolate(p.key, currentReq),
        value: interpolate(p.value, currentReq)
      }))
      const processedBodyRaw = interpolate(currentReq.bodyRaw || '', currentReq)

      const payload = {
        method: currentReq.method,
        url: processedUrl,
        headers: processedHeaders,
        params: processedParams,
        bodyType: currentReq.bodyType,
        bodyRaw: processedBodyRaw,
        bodyUrlEncoded: currentReq.bodyUrlEncoded,
        bodyFormData: currentReq.bodyFormData,
        timeout: settings.timeout || 30000,
        rejectUnauthorized: settings.sslVerify !== false
      }

      // Format snapshot of request headers & params for detail inspection
      const reqHeadersSnapshot: Record<string, string> = {}
      for (const h of processedHeaders) {
        if (h.enabled && h.key) reqHeadersSnapshot[h.key] = h.value
      }
      const reqParamsSnapshot: Record<string, string> = {}
      for (const p of processedParams) {
        if (p.enabled && p.key) reqParamsSnapshot[p.key] = p.value
      }

      let resResult: RunnerRequestResult

      try {
        const res = await window.electronAPI.sendRequest(payload)
        resResult = {
          id: 'res-' + Date.now() + '-' + i,
          requestId: currentReq.id,
          requestName: currentReq.name || currentReq.url || t('common.untitled'),
          method: currentReq.method,
          url: processedUrl,
          status: res.status,
          statusText: res.statusText,
          time: res.time,
          size: res.size,
          error: res.error,
          responseBody: res.data,
          responseHeaders: res.headers,
          requestHeaders: reqHeadersSnapshot,
          requestParams: reqParamsSnapshot,
          requestBody: processedBodyRaw || currentReq.bodyFormData || currentReq.bodyUrlEncoded,
          timestamp: Date.now()
        }
      } catch (err: any) {
        resResult = {
          id: 'res-' + Date.now() + '-' + i,
          requestId: currentReq.id,
          requestName: currentReq.name || currentReq.url || t('common.untitled'),
          method: currentReq.method,
          url: processedUrl,
          status: 0,
          statusText: 'Network Error',
          time: 0,
          size: 0,
          error: err.message || 'Unknown network error',
          responseBody: null,
          responseHeaders: {},
          requestHeaders: reqHeadersSnapshot,
          requestParams: reqParamsSnapshot,
          requestBody: processedBodyRaw,
          timestamp: Date.now()
        }
      }

      accumulatedResults.push(resResult)
      setResults([...accumulatedResults])

      const isPass = resResult.status >= 200 && resResult.status < 400
      if (stopOnError && !isPass) {
        setIsAborted(true)
        break
      }

      // Delay between requests
      if (delayMs > 0 && i < runnableRequests.length - 1 && !abortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    setRunEndTime(Date.now())
    setIsRunning(false)
    setIsCompleted(!abortRef.current)
    setCurrentIndex(-1)
  }

  // Abort execution
  const handleStopRun = () => {
    abortRef.current = true
    setIsRunning(false)
    setIsAborted(true)
  }

  // Summary Metrics
  const summary = useMemo(() => {
    const total = results.length
    let passed = 0
    let failed = 0
    let totalTime = 0
    const statusCodeDistribution: Record<string, number> = {}

    for (const r of results) {
      const isPass = r.status >= 200 && r.status < 400
      if (isPass) passed++
      else failed++

      totalTime += r.time || 0

      const key = r.status === 0 ? 'Network Error' : `${r.status} ${r.statusText || ''}`.trim()
      statusCodeDistribution[key] = (statusCodeDistribution[key] || 0) + 1
    }

    const avgTime = total > 0 ? Math.round(totalTime / total) : 0
    const overallDuration = runEndTime > runStartTime ? runEndTime - runStartTime : totalTime

    return {
      total,
      passed,
      failed,
      totalTime: overallDuration,
      avgTime,
      statusCodeDistribution
    }
  }, [results, runStartTime, runEndTime])

  // Filtered results list
  const displayedResults = useMemo(() => {
    if (filterStatus === 'passed') {
      return results.filter((r) => r.status >= 200 && r.status < 400)
    }
    if (filterStatus === 'failed') {
      return results.filter((r) => r.status < 200 || r.status >= 400)
    }
    return results
  }, [results, filterStatus])

  // Export JSON report
  const handleExportJson = async () => {
    if (results.length === 0) return

    const report: RunnerReport = {
      title,
      startTime: runStartTime,
      endTime: runEndTime || Date.now(),
      totalDuration: summary.totalTime,
      totalCount: summary.total,
      passedCount: summary.passed,
      failedCount: summary.failed,
      statusCodeDistribution: summary.statusCodeDistribution,
      results
    }

    const reportJson = JSON.stringify(report, null, 2)
    const filename = `relay-runner-report-${title.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')}-${Date.now()}.json`

    if (window.electronAPI?.saveFileDialog) {
      try {
        const res = await window.electronAPI.saveFileDialog({
          defaultPath: filename,
          content: reportJson
        })
        if (res && res.success) {
          onToast(t('toast.runnerReportExported'), 'success')
          return
        }
      } catch (err) {
        console.error('Failed to export report via dialog:', err)
      }
    }

    // Web blob fallback
    const blob = new Blob([reportJson], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    onToast(t('toast.runnerReportExported'), 'success')
  }

  // Open single result in dedicated popout window
  const handleOpenPopout = (r: RunnerRequestResult) => {
    if (window.electronAPI?.openResponseWindow) {
      const resData: ResponseData = {
        status: r.status,
        statusText: r.statusText,
        headers: r.responseHeaders || {},
        data: r.responseBody,
        size: r.size,
        time: r.time,
        contentType: r.responseHeaders?.['content-type'] || r.responseHeaders?.['Content-Type'] || 'application/json',
        error: r.error,
        timestamp: r.timestamp
      }
      window.electronAPI.openResponseWindow({
        response: resData,
        url: r.url,
        method: r.method,
        name: r.requestName,
        timestamp: r.timestamp
      })
    }
  }

  // Copy Markdown Summary to clipboard
  const handleCopyMarkdown = () => {
    if (results.length === 0) return

    const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0
    const statusCodesText = Object.entries(summary.statusCodeDistribution)
      .map(([code, count]) => `${code}: ${count}`)
      .join(' | ')

    const failedItems = results.filter((r) => r.status < 200 || r.status >= 400)

    let md = `### 🚀 ${t('runner.smokeReportTitle')} - ${title}\n`
    md += `- **${t('runner.totalRequests')}**: ${summary.total}\n`
    md += `- **${t('runner.passed')}**: ${summary.passed} (${passRate}%)\n`
    md += `- **${t('runner.failed')}**: ${summary.failed} (${100 - passRate}%)\n`
    md += `- **${t('runner.totalDuration')}**: ${summary.totalTime} ms (${t('runner.avgDuration')}: ${summary.avgTime} ms)\n`
    md += `- **${t('runner.statusCodeDistribution')}**: ${statusCodesText || '-'}\n\n`

    if (failedItems.length > 0) {
      md += `#### ⚠️ ${t('runner.markdownAbnormalTitle')} (${failedItems.length}):\n`
      failedItems.forEach((f) => {
        md += `- ❌ **${f.method}** ${f.requestName} (${f.url}) -> [${f.status} ${f.statusText || ''}] ${t('runner.duration')}:${f.time}ms ${f.error ? `Error: ${f.error}` : ''}\n`
      })
    } else {
      md += `${t('runner.markdownAllPassed')}\n`
    }

    navigator.clipboard.writeText(md)
    setCopiedSummary(true)
    onToast(t('runner.copied'), 'success')
    setTimeout(() => setCopiedSummary(false), 2000)
  }

  if (!isOpen) return null

  const progressPercent =
    runnableRequests.length > 0 ? Math.round((results.length / runnableRequests.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Play className="w-4 h-4 fill-sky-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">{t('runner.title')}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-sky-300 border border-slate-700/60 max-w-xs truncate">
                  {title}
                </span>
                {isRunning && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('runner.running')} ({results.length}/{runnableRequests.length})
                  </span>
                )}
                {isCompleted && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('runner.completed')}
                  </span>
                )}
                {isAborted && (
                  <span className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('runner.aborted')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('runner.runnerSubtitle', { total: requests.length, selected: runnableRequests.length })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Environment select */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t('sidebar.constants')}:</span>
              <select
                value={selectedEnvId}
                disabled={isRunning}
                onChange={(e) => setSelectedEnvId(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 cursor-pointer disabled:opacity-50"
              >
                <option value="">{t('sidebar.noEnv')}</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Delay ms */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t('runner.delayMs')}:</span>
              <input
                type="number"
                min="0"
                step="50"
                value={delayMs}
                disabled={isRunning}
                onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-slate-950 border border-slate-700/80 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono disabled:opacity-50"
              />
            </div>

            {/* Stop on error */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-slate-100">
              <input
                type="checkbox"
                checked={stopOnError}
                disabled={isRunning}
                onChange={(e) => setStopOnError(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>{t('runner.stopOnError')}</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={handleStopRun}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow-sm transition-all text-xs"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>{t('runner.stop')}</span>
              </button>
            ) : results.length > 0 ? (
              <button
                type="button"
                onClick={handleStartRun}
                disabled={runnableRequests.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-sm transition-all text-xs disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('runner.rerun')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRun}
                disabled={runnableRequests.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-sm transition-all text-xs disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{t('runner.run')} ({runnableRequests.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (when active or finished) */}
        {(isRunning || results.length > 0) && (
          <div className="w-full bg-slate-950/60 border-b border-slate-800">
            <div className="flex items-center justify-between px-5 py-1 text-[11px] text-slate-400 font-mono">
              <span>{results.length} / {runnableRequests.length} {t('runner.completed')}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  summary.failed > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Tab switchers */}
        <div className="flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/20">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setViewTab('queue')}
              className={`py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                viewTab === 'queue'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('runner.queue')} ({runnableRequests.length}/{requests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('report')}
              className={`py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                viewTab === 'report'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t('runner.report')} {results.length > 0 ? `(${results.length})` : ''}</span>
            </button>
          </div>

          {/* Quick actions for tabs */}
          {viewTab === 'queue' && !isRunning && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-slate-400 hover:text-sky-400 transition-colors"
              >
                {t('runner.selectAll')}
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-400 hover:text-sky-400 transition-colors"
              >
                {t('runner.deselectAll')}
              </button>
            </div>
          )}

          {viewTab === 'report' && results.length > 0 && (
            <div className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{t('runner.copySummary')}</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>{t('runner.exportReport')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {viewTab === 'queue' && (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-slate-400 mb-1">
                {t('runner.queueDesc')}
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                {requests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">{t('runner.noRequests')}</div>
                ) : (
                  requests.map((req, idx) => {
                    const isSelected = selectedReqIds.has(req.id)
                    return (
                      <div
                        key={req.id}
                        onClick={() => handleToggleReq(req.id)}
                        className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-900/60 hover:bg-slate-800/60'
                            : 'opacity-50 hover:opacity-75 bg-slate-950/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isRunning}
                            onChange={() => handleToggleReq(req.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer"
                          />
                          <span className="text-slate-500 font-mono text-[11px] w-6">{idx + 1}.</span>
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              methodBadgeColor[req.method] || 'text-slate-400'
                            }`}
                          >
                            {req.method}
                          </span>
                          <span className="font-medium text-slate-200 truncate max-w-xs" title={req.name}>
                            {req.name || t('common.untitled')}
                          </span>
                          <span className="text-slate-400 truncate text-[11px] font-mono flex-1" title={req.url}>
                            {req.url}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {viewTab === 'report' && (
            <div className="flex flex-col gap-5">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Total */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">{t('runner.totalRequests')}</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-100 font-mono">{summary.total}</span>
                    <span className="text-xs text-slate-500">/ {runnableRequests.length}</span>
                  </div>
                </div>

                {/* Passed */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('runner.passed')}
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-400 font-mono">{summary.passed}</span>
                    {summary.total > 0 && (
                      <span className="text-xs text-emerald-500/80 font-mono">
                        ({Math.round((summary.passed / summary.total) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Failed */}
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {t('runner.failed')}
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-rose-400 font-mono">{summary.failed}</span>
                    {summary.total > 0 && (
                      <span className="text-xs text-rose-500/80 font-mono">
                        ({Math.round((summary.failed / summary.total) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Total Duration */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">{t('runner.totalDuration')}</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-100 font-mono">
                      {summary.totalTime > 1000 ? (summary.totalTime / 1000).toFixed(2) : summary.totalTime}
                    </span>
                    <span className="text-xs text-slate-500">{summary.totalTime > 1000 ? 's' : 'ms'}</span>
                  </div>
                </div>

                {/* Avg Response Time */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">{t('runner.avgDuration')}</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-400 font-mono">{summary.avgTime}</span>
                    <span className="text-xs text-slate-500">ms</span>
                  </div>
                </div>
              </div>

              {/* Status Code Distribution Bar & Pills */}
              {Object.keys(summary.statusCodeDistribution).length > 0 && (
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('runner.statusCodeDistribution')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(summary.statusCodeDistribution).map(([codeName, count]) => {
                      const is2xx = codeName.startsWith('2')
                      const is3xx = codeName.startsWith('3')
                      const is4xx = codeName.startsWith('4')
                      const is5xx = codeName.startsWith('5') || codeName.includes('Error')

                      let pillStyle = 'border-slate-700 bg-slate-800/60 text-slate-300'
                      if (is2xx) pillStyle = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      else if (is3xx) pillStyle = 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                      else if (is4xx) pillStyle = 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      else if (is5xx) pillStyle = 'border-rose-500/30 bg-rose-500/10 text-rose-400'

                      const percent = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0

                      return (
                        <div
                          key={codeName}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-2 shadow-sm ${pillStyle}`}
                        >
                          <span className="font-bold">{codeName}</span>
                          <span className="opacity-80">
                            {count} ({percent}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Result Details List */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <span>{t('runner.requestDetails')}</span>
                    <span className="text-slate-500 font-normal font-mono">({displayedResults.length})</span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      className={`px-2.5 py-0.5 rounded ${
                        filterStatus === 'all'
                          ? 'bg-slate-800 text-slate-100 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t('common.all')} ({results.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('passed')}
                      className={`px-2.5 py-0.5 rounded ${
                        filterStatus === 'passed'
                          ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t('runner.passed')} ({summary.passed})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('failed')}
                      className={`px-2.5 py-0.5 rounded ${
                        filterStatus === 'failed'
                          ? 'bg-rose-500/20 text-rose-400 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t('runner.failed')} ({summary.failed})
                    </button>
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {results.length === 0 && !isRunning && (
                    <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
                      <Play className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                      <span>{t('runner.notStartedTip')}</span>
                    </div>
                  )}

                  {displayedResults.map((r, idx) => {
                    const isPass = r.status >= 200 && r.status < 400
                    const isExpanded = expandedResultIds.has(r.id)

                    return (
                      <div key={r.id} className="flex flex-col">
                        <div
                          onClick={() => toggleExpand(r.id)}
                          className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-800/40 transition-colors ${
                            !isPass ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-slate-500 hover:text-slate-300">
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </span>

                            {isPass ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}

                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                methodBadgeColor[r.method] || 'text-slate-400'
                              }`}
                            >
                              {r.method}
                            </span>

                            <span className="font-semibold text-slate-200 truncate max-w-xs" title={r.requestName}>
                              {r.requestName}
                            </span>

                            <span className="text-slate-400 truncate text-[11px] font-mono flex-1" title={r.url}>
                              {r.url}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                            {/* Status badge */}
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                isPass
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {r.status > 0 ? `${r.status} ${r.statusText || ''}` : 'Error'}
                            </span>

                            <span className="text-slate-400 w-16 text-right">{r.time} ms</span>
                            <span className="text-slate-500 w-16 text-right">
                              {r.size > 1024 ? `${(r.size / 1024).toFixed(1)} KB` : `${r.size} B`}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenPopout(r)
                              }}
                              title={t('runner.openInNewWindow')}
                              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 text-xs flex flex-col gap-3 font-sans">
                            {r.error && (
                              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                                <strong>Error:</strong> {r.error}
                              </div>
                            )}

                            {/* Request / Response Details Tabs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: Request Sent */}
                              <div className="flex flex-col gap-1.5 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
                                <span className="font-semibold text-sky-400 text-[11px] uppercase tracking-wide">
                                  Request Sent
                                </span>
                                <div className="text-[11px] font-mono break-all text-slate-300">
                                  <strong>URL:</strong> {r.url}
                                </div>
                                {r.requestHeaders && Object.keys(r.requestHeaders).length > 0 && (
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="text-[10px] text-slate-500 font-semibold">{t('runner.requestHeaders')}:</span>
                                    <div className="max-h-24 overflow-y-auto font-mono text-[10px] bg-slate-950 p-1.5 rounded text-slate-400">
                                      {Object.entries(r.requestHeaders).map(([k, v]) => (
                                        <div key={k}>
                                          <span className="text-slate-300">{k}:</span> {v}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {r.requestBody && (
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="text-[10px] text-slate-500 font-semibold">Body:</span>
                                    <pre className="max-h-28 overflow-y-auto font-mono text-[10px] bg-slate-950 p-1.5 rounded text-slate-300 whitespace-pre-wrap">
                                      {typeof r.requestBody === 'string'
                                        ? r.requestBody
                                        : JSON.stringify(r.requestBody, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {/* Right: Response Received */}
                              <div className="flex flex-col gap-1.5 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wide">
                                    Response Received
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPopout(r)}
                                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                                    title={t('runner.openInNewWindow')}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>{t('runner.openInNewWindow')}</span>
                                  </button>
                                </div>
                                <div className="text-[11px] font-mono text-slate-300">
                                  <strong>Status:</strong> {r.status} {r.statusText} · {r.time} ms
                                </div>
                                {r.responseHeaders && Object.keys(r.responseHeaders).length > 0 && (
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="text-[10px] text-slate-500 font-semibold">{t('runner.responseHeaders')}:</span>
                                    <div className="max-h-24 overflow-y-auto font-mono text-[10px] bg-slate-950 p-1.5 rounded text-slate-400">
                                      {Object.entries(r.responseHeaders).map(([k, v]) => (
                                        <div key={k}>
                                          <span className="text-slate-300">{k}:</span> {v}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {r.responseBody !== undefined && (
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="text-[10px] text-slate-500 font-semibold">{t('runner.responseBody')}:</span>
                                    <pre className="max-h-28 overflow-y-auto font-mono text-[10px] bg-slate-950 p-1.5 rounded text-slate-300 whitespace-pre-wrap">
                                      {typeof r.responseBody === 'object'
                                        ? JSON.stringify(r.responseBody, null, 2)
                                        : String(r.responseBody)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Active running row indicator */}
                  {isRunning && currentIndex >= 0 && currentIndex < runnableRequests.length && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs bg-sky-950/20 border-t border-sky-500/30 animate-pulse">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            methodBadgeColor[runnableRequests[currentIndex].method] || 'text-slate-400'
                          }`}
                        >
                          {runnableRequests[currentIndex].method}
                        </span>
                        <span className="font-semibold text-sky-300 truncate">
                          {runnableRequests[currentIndex].name}
                        </span>
                        <span className="text-slate-400 truncate text-[11px] font-mono flex-1">
                          {runnableRequests[currentIndex].url}
                        </span>
                      </div>
                      <span className="text-sky-400 text-xs font-semibold">{t('runner.running')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
