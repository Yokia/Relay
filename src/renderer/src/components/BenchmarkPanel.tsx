import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Zap,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  Copy,
  Check,
  Layers,
  BarChart3,
  AlertCircle,
  ExternalLink,
  Activity,
  Flame,
  Gauge,
  ListFilter
} from 'lucide-react'
import {
  RequestItem,
  ConstantItem,
  Environment,
  AppSettings,
  BenchmarkStopCondition,
  HttpMethod,
  ResponseData
} from '../types'
import {
  BenchmarkMetrics,
  BenchmarkSampleResult,
  calculateBenchmarkMetrics,
  formatBytes,
  generateBenchmarkMarkdown
} from '../utils/benchmarkUtils'
import { executePreRequestScript } from '../utils/scriptEngine'
import { useI18n } from '../i18n'

interface Props {
  title: string
  requests: RequestItem[]
  selectedReqIds: Set<string>
  onToggleReq: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  constants: ConstantItem[]
  environments: Environment[]
  selectedEnvId: string
  onChangeEnvId: (id: string) => void
  interpolate: (text: string, req?: RequestItem) => string
  settings: AppSettings
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  onOpenPopout: (r: {
    status: number
    statusText?: string
    headers?: Record<string, string>
    data?: any
    size?: number
    time?: number
    error?: string
    timestamp: number
    url: string
    method: HttpMethod
    requestName: string
  }) => void
}

const methodBadgeColor: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  HEAD: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  WS: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
}

export const BenchmarkPanel: React.FC<Props> = ({
  title,
  requests,
  selectedReqIds,
  onToggleReq,
  onSelectAll,
  onDeselectAll,
  constants,
  environments,
  selectedEnvId,
  onChangeEnvId,
  interpolate,
  settings,
  onToast,
  onOpenPopout
}) => {
  const { t } = useI18n()

  // Benchmark Config
  const [concurrency, setConcurrency] = useState<number>(5)
  const [stopCondition, setStopCondition] = useState<BenchmarkStopCondition>('requests')
  const [totalRequests, setTotalRequests] = useState<number>(100)
  const [durationSeconds, setDurationSeconds] = useState<number>(10)
  const [benchmarkDelayMs, setBenchmarkDelayMs] = useState<number>(0)
  const [stopOnError, setStopOnError] = useState<boolean>(false)

  // Execution State
  const [isBenchmarking, setIsBenchmarking] = useState(false)
  const [benchmarkCompleted, setBenchmarkCompleted] = useState(false)
  const [benchmarkAborted, setBenchmarkAborted] = useState(false)
  const [benchmarkStartTime, setBenchmarkStartTime] = useState(0)
  const [benchmarkEndTime, setBenchmarkEndTime] = useState(0)
  const [benchmarkMetrics, setBenchmarkMetrics] = useState<BenchmarkMetrics | null>(null)
  const [benchmarkSamples, setBenchmarkSamples] = useState<BenchmarkSampleResult[]>([])
  const [sampleFilter, setSampleFilter] = useState<'all' | 'failed'>('all')

  // Real-time tracking
  const [realtimeState, setRealtimeState] = useState({
    sent: 0,
    completed: 0,
    success: 0,
    error: 0,
    qps: 0,
    elapsedMs: 0,
    bytes: 0
  })

  // Sub Tab
  const [panelTab, setPanelTab] = useState<'metrics' | 'samples' | 'targets'>('metrics')
  const [copiedMd, setCopiedMd] = useState(false)

  const abortRef = useRef<boolean>(false)

  const runnableRequests = useMemo(() => {
    return requests.filter((r) => selectedReqIds.has(r.id))
  }, [requests, selectedReqIds])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  // Start Benchmark Execution
  const handleStartBenchmark = async () => {
    if (runnableRequests.length === 0 || isBenchmarking) return

    abortRef.current = false
    setIsBenchmarking(true)
    setBenchmarkCompleted(false)
    setBenchmarkAborted(false)
    setBenchmarkMetrics(null)
    setBenchmarkSamples([])
    setPanelTab('metrics')

    const start = Date.now()
    setBenchmarkStartTime(start)
    setBenchmarkEndTime(0)

    const sentRef = { current: 0 }
    const completedRef = { current: 0 }
    const successRef = { current: 0 }
    const errorRef = { current: 0 }
    const latenciesRef = { current: [] as number[] }
    const bytesRef = { current: 0 }
    const statusCountsRef = { current: {} as Record<string, number> }
    const samplesRef = { current: [] as BenchmarkSampleResult[] }

    // High frequency ticker to update UI state smoothly
    const timer = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.max(1, now - start)
      const qps = Number(((completedRef.current / elapsed) * 1000).toFixed(1))
      setRealtimeState({
        sent: sentRef.current,
        completed: completedRef.current,
        success: successRef.current,
        error: errorRef.current,
        qps,
        elapsedMs: elapsed,
        bytes: bytesRef.current
      })
    }, 120)

    const activeConcurrency = Math.min(100, Math.max(1, concurrency))

    const runWorker = async () => {
      while (!abortRef.current) {
        // Stop condition check
        if (stopCondition === 'requests' && sentRef.current >= totalRequests) {
          break
        }
        if (stopCondition === 'duration') {
          const elapsedSec = (Date.now() - start) / 1000
          if (elapsedSec >= durationSeconds) {
            break
          }
        }

        const taskIndex = sentRef.current++
        const targetReq = runnableRequests[taskIndex % runnableRequests.length]
        const activeEnv = selectedEnvId ? environments.find((e) => e.id === selectedEnvId) : environments[0]

        // Interpolate request
        let currentReq = { ...targetReq }
        if (currentReq.preRequestScript && currentReq.preRequestScript.trim()) {
          const preResult = executePreRequestScript(currentReq.preRequestScript, {
            request: currentReq,
            activeEnv
          })
          if (preResult.modifiedRequest) {
            currentReq = { ...currentReq, ...preResult.modifiedRequest }
          }
        }

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
        const processedAuth = currentReq.auth
          ? {
              ...currentReq.auth,
              token: interpolate(currentReq.auth.token || '', currentReq),
              username: interpolate(currentReq.auth.username || '', currentReq),
              password: interpolate(currentReq.auth.password || '', currentReq),
              key: interpolate(currentReq.auth.key || '', currentReq),
              value: interpolate(currentReq.auth.value || '', currentReq),
              tokenUrl: interpolate(currentReq.auth.tokenUrl || '', currentReq),
              clientId: interpolate(currentReq.auth.clientId || '', currentReq),
              clientSecret: interpolate(currentReq.auth.clientSecret || '', currentReq),
              scope: interpolate(currentReq.auth.scope || '', currentReq),
              accessToken: interpolate(currentReq.auth.accessToken || '', currentReq)
            }
          : undefined

        const payload = {
          method: currentReq.method,
          url: processedUrl,
          headers: processedHeaders,
          params: processedParams,
          bodyType: currentReq.bodyType,
          bodyRaw: processedBodyRaw,
          bodyUrlEncoded: currentReq.bodyUrlEncoded,
          bodyFormData: currentReq.bodyFormData,
          auth: processedAuth,
          timeout: settings.timeout || 30000,
          rejectUnauthorized: settings.sslVerify !== false
        }

        const t0 = performance.now()
        try {
          const res = await window.electronAPI.sendRequest(payload)
          const t1 = performance.now()
          const latency = Math.round(t1 - t0)

          latenciesRef.current.push(latency)
          completedRef.current++
          bytesRef.current += res.size || 0

          const isPass = res.status >= 200 && res.status < 400
          if (isPass) {
            successRef.current++
          } else {
            errorRef.current++
            if (stopOnError) {
              abortRef.current = true
            }
          }

          const statusKey = res.status === 0 ? 'Network Error' : `${res.status} ${res.statusText || ''}`.trim()
          statusCountsRef.current[statusKey] = (statusCountsRef.current[statusKey] || 0) + 1

          // Store failed samples or first 60 samples for inspection
          if (!isPass || samplesRef.current.length < 60) {
            samplesRef.current.push({
              id: 'bs-' + taskIndex,
              requestId: targetReq.id,
              requestName: targetReq.name || processedUrl,
              method: targetReq.method,
              url: processedUrl,
              status: res.status,
              statusText: res.statusText,
              time: latency,
              size: res.size,
              error: res.error,
              timestamp: Date.now()
            })
            if (samplesRef.current.length > 300) samplesRef.current.shift()
          }
        } catch (err: any) {
          const t1 = performance.now()
          const latency = Math.round(t1 - t0)
          latenciesRef.current.push(latency)
          completedRef.current++
          errorRef.current++
          if (stopOnError) {
            abortRef.current = true
          }
          statusCountsRef.current['Network Error'] = (statusCountsRef.current['Network Error'] || 0) + 1
          samplesRef.current.push({
            id: 'bs-' + taskIndex,
            requestId: targetReq.id,
            requestName: targetReq.name || processedUrl,
            method: targetReq.method,
            url: processedUrl,
            status: 0,
            statusText: 'Network Error',
            time: latency,
            size: 0,
            error: err.message || 'Network error',
            timestamp: Date.now()
          })
          if (samplesRef.current.length > 300) samplesRef.current.shift()
        }

        if (benchmarkDelayMs > 0 && !abortRef.current) {
          await new Promise((resolve) => setTimeout(resolve, benchmarkDelayMs))
        }
      }
    }

    const workers = Array.from({ length: activeConcurrency }, () => runWorker())
    await Promise.all(workers)

    clearInterval(timer)
    const end = Date.now()
    const totalDuration = end - start
    setBenchmarkEndTime(end)
    setIsBenchmarking(false)
    setBenchmarkCompleted(!abortRef.current)
    setBenchmarkAborted(abortRef.current)

    // Compute final aggregated benchmark metrics
    const finalMetrics = calculateBenchmarkMetrics(
      sentRef.current,
      completedRef.current,
      successRef.current,
      errorRef.current,
      latenciesRef.current,
      bytesRef.current,
      totalDuration,
      statusCountsRef.current
    )
    setBenchmarkMetrics(finalMetrics)
    setBenchmarkSamples([...samplesRef.current])
    setRealtimeState({
      sent: sentRef.current,
      completed: completedRef.current,
      success: successRef.current,
      error: errorRef.current,
      qps: finalMetrics.qps,
      elapsedMs: totalDuration,
      bytes: bytesRef.current
    })
  }

  const handleStopBenchmark = () => {
    abortRef.current = true
    setIsBenchmarking(false)
    setBenchmarkAborted(true)
  }

  // Copy Markdown Report
  const handleCopyMarkdown = () => {
    if (!benchmarkMetrics) return
    const md = generateBenchmarkMarkdown(
      benchmarkMetrics,
      title,
      runnableRequests.length,
      concurrency
    )
    navigator.clipboard.writeText(md)
    setCopiedMd(true)
    onToast(t('runner.copiedBenchmarkMarkdown'), 'success')
    setTimeout(() => setCopiedMd(false), 2000)
  }

  // Export JSON Report
  const handleExportJson = async () => {
    if (!benchmarkMetrics) return
    const data = {
      title,
      type: 'benchmark-report',
      concurrency,
      stopCondition,
      totalRequests,
      durationSeconds,
      startTime: benchmarkStartTime,
      endTime: benchmarkEndTime,
      metrics: benchmarkMetrics,
      samples: benchmarkSamples
    }
    const jsonStr = JSON.stringify(data, null, 2)
    const filename = `relay-benchmark-${title.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')}-${Date.now()}.json`

    if (window.electronAPI?.saveFileDialog) {
      try {
        const res = await window.electronAPI.saveFileDialog({
          defaultPath: filename,
          content: jsonStr
        })
        if (res && res.success) {
          onToast(t('toast.runnerReportExported'), 'success')
          return
        }
      } catch (err) {
        console.error(err)
      }
    }

    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' })
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

  // Display metrics
  const activeMetrics = benchmarkMetrics
  const displayQps = activeMetrics ? activeMetrics.qps : realtimeState.qps
  const displayCompleted = activeMetrics ? activeMetrics.totalCompleted : realtimeState.completed
  const displaySent = activeMetrics ? activeMetrics.totalSent : realtimeState.sent
  const displaySuccess = activeMetrics ? activeMetrics.successCount : realtimeState.success
  const displayError = activeMetrics ? activeMetrics.errorCount : realtimeState.error
  const displayDuration = activeMetrics ? activeMetrics.durationMs : realtimeState.elapsedMs
  const displayBytes = activeMetrics ? activeMetrics.totalBytes : realtimeState.bytes

  const successRate =
    displayCompleted > 0 ? ((displaySuccess / displayCompleted) * 100).toFixed(1) : '100.0'
  const errorRate =
    displayCompleted > 0 ? ((displayError / displayCompleted) * 100).toFixed(1) : '0.0'

  const progressPercent = useMemo(() => {
    if (stopCondition === 'requests') {
      return totalRequests > 0 ? Math.min(100, Math.round((displayCompleted / totalRequests) * 100)) : 0
    } else {
      const targetMs = durationSeconds * 1000
      return targetMs > 0 ? Math.min(100, Math.round((displayDuration / targetMs) * 100)) : 0
    }
  }, [stopCondition, totalRequests, durationSeconds, displayCompleted, displayDuration])

  const filteredSamples = useMemo(() => {
    if (sampleFilter === 'failed') {
      return benchmarkSamples.filter((s) => s.status < 200 || s.status >= 400)
    }
    return benchmarkSamples
  }, [benchmarkSamples, sampleFilter])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-900">
      {/* Benchmark Configuration Bar */}
      <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Environment */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{t('runner.environment')}:</span>
            <select
              value={selectedEnvId}
              disabled={isBenchmarking}
              onChange={(e) => onChangeEnvId(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
            >
              <option value="">{t('sidebar.noEnv')}</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>

          {/* Concurrency setting */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1" title={t('runner.concurrencyTip')}>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('runner.concurrency')}:</span>
            </span>
            <div className="flex items-center gap-1">
              {[1, 5, 10, 20, 50].map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={isBenchmarking}
                  onClick={() => setConcurrency(c)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    concurrency === c
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {c}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="100"
                value={concurrency}
                disabled={isBenchmarking}
                onChange={(e) => setConcurrency(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-14 bg-slate-950 border border-slate-700/80 text-amber-300 rounded px-1.5 py-0.5 text-xs text-center font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Stop Condition */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">{t('runner.stopCondition')}:</span>
            <div className="flex items-center gap-1 bg-slate-900 rounded p-0.5 border border-slate-800">
              <button
                type="button"
                disabled={isBenchmarking}
                onClick={() => setStopCondition('requests')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  stopCondition === 'requests'
                    ? 'bg-amber-500/20 text-amber-400 dark:text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('runner.stopConditionRequests')}
              </button>
              <button
                type="button"
                disabled={isBenchmarking}
                onClick={() => setStopCondition('duration')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  stopCondition === 'duration'
                    ? 'bg-amber-500/20 text-amber-400 dark:text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('runner.stopConditionDuration')}
              </button>
            </div>

            {stopCondition === 'requests' ? (
              <div className="flex items-center gap-1">
                {[50, 100, 500, 1000].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    disabled={isBenchmarking}
                    onClick={() => setTotalRequests(cnt)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      totalRequests === cnt
                        ? 'bg-amber-500/20 text-amber-400 dark:text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cnt}{t('runner.requestsUnitSuffix')}
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={totalRequests}
                    disabled={isBenchmarking}
                    onChange={(e) => setTotalRequests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-slate-950 border border-slate-700/80 text-amber-400 dark:text-amber-300 rounded px-1.5 py-0.5 text-xs text-center font-mono font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-slate-400">{t('runner.requestsUnitSuffix')}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {[5, 10, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    disabled={isBenchmarking}
                    onClick={() => setDurationSeconds(sec)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      durationSeconds === sec
                        ? 'bg-amber-500/20 text-amber-400 dark:text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={durationSeconds}
                    disabled={isBenchmarking}
                    onChange={(e) => setDurationSeconds(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 bg-slate-950 border border-slate-700/80 text-amber-400 dark:text-amber-300 rounded px-1.5 py-0.5 text-xs text-center font-mono font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-slate-400">s</span>
                </div>
              </div>
            )}
          </div>

          {/* Delay / Throttle */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{t('runner.warmupOrThrottle')}:</span>
            <input
              type="number"
              min="0"
              step="10"
              value={benchmarkDelayMs}
              disabled={isBenchmarking}
              onChange={(e) => setBenchmarkDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 bg-slate-950 border border-slate-700/80 text-slate-200 rounded px-1.5 py-0.5 text-xs text-center font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Stop on error */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={stopOnError}
              disabled={isBenchmarking}
              onChange={(e) => setStopOnError(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>{t('runner.stopOnError')}</span>
          </label>
        </div>

        {/* Start / Stop Benchmark Button */}
        <div className="flex items-center gap-2">
          {isBenchmarking ? (
            <button
              type="button"
              onClick={handleStopBenchmark}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow-md transition-all text-xs cursor-pointer active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>{t('runner.stopBenchmark')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartBenchmark}
              disabled={runnableRequests.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg shadow-md shadow-amber-500/20 transition-all text-xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>
                {benchmarkMetrics ? t('runner.rerun') : t('runner.startBenchmark')} ({runnableRequests.length})
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Progress & Live QPS status bar */}
      {(isBenchmarking || displayCompleted > 0) && (
        <div className="w-full bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center justify-between px-5 py-1 text-[11px] text-slate-300 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                {isBenchmarking ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                ) : (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                )}
                <span>
                  {displayCompleted} {t('runner.completed')} / {displaySent} {t('runner.iteration')}
                </span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-bold">{displayQps} QPS</span>
              <span className="text-slate-600">|</span>
              <span>{(displayDuration / 1000).toFixed(1)} s</span>
            </div>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                displayError > 0 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Benchmark Sub-tabs */}
      <div className="flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/30">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setPanelTab('metrics')}
            className={`py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              panelTab === 'metrics'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{t('runner.report')}</span>
          </button>

          <button
            type="button"
            onClick={() => setPanelTab('samples')}
            className={`py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              panelTab === 'samples'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>
              {t('runner.failedSamples')}
              {benchmarkSamples.length > 0 && ` (${benchmarkSamples.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPanelTab('targets')}
            className={`py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              panelTab === 'targets'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {t('runner.queue')} ({runnableRequests.length}/{requests.length})
            </span>
          </button>
        </div>

        {/* Action Tools */}
        {displayCompleted > 0 && (
          <div className="flex items-center gap-2 py-1.5">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer"
            >
              {copiedMd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{t('runner.copyBenchmarkMarkdown')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>{t('runner.exportBenchmarkReport')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        {panelTab === 'metrics' && (
          <div className="flex flex-col gap-5">
            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* QPS */}
              <div className="bg-gradient-to-br from-amber-500/10 via-slate-950/60 to-slate-950 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Activity className="w-4 h-4" />
                    <span>{isBenchmarking ? t('runner.realtimeQps') : t('runner.avgQps')}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{concurrency} workers</span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-amber-300 font-mono tracking-tight">{displayQps}</span>
                  <span className="text-xs text-amber-500/80 font-mono font-medium">req/s</span>
                </div>
              </div>

              {/* Progress / Completion */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>{t('runner.totalRequests')}</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {(displayDuration / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-100 font-mono">{displayCompleted}</span>
                  <span className="text-xs text-slate-500">
                    / {stopCondition === 'requests' ? totalRequests : `${durationSeconds}s`}
                  </span>
                </div>
              </div>

              {/* Success / Error Rate */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>{t('runner.successRate')}</span>
                  <span className="text-[11px] font-mono text-rose-400">
                    {displayError > 0 ? `${displayError} ${t('runner.failed')}` : '0 错误'}
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span
                    className={`text-3xl font-black font-mono tracking-tight ${
                      displayError === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {successRate}%
                  </span>
                  <span className="text-xs text-emerald-500/80 font-mono">{displaySuccess} ok</span>
                </div>
              </div>

              {/* Latency & Bytes */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>{t('runner.avgDuration')}</span>
                  <span className="text-[11px] font-mono text-sky-400">{formatBytes(displayBytes)}</span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-sky-300 font-mono">
                    {activeMetrics ? activeMetrics.avgLatency : '--'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ms</span>
                </div>
              </div>
            </div>

            {/* Latency Percentiles Section */}
            {activeMetrics && (
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    <span>{t('runner.latencyStats')}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Min: {activeMetrics.minLatency}ms · Max: {activeMetrics.maxLatency}ms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-sans">{t('runner.minLatency')}</span>
                    <span className="text-base font-bold text-emerald-400 mt-1">{activeMetrics.minLatency} ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-sans">{t('runner.p50Latency')}</span>
                    <span className="text-base font-bold text-teal-300 mt-1">{activeMetrics.p50Latency} ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-sans">{t('runner.p90Latency')}</span>
                    <span className="text-base font-bold text-sky-400 mt-1">{activeMetrics.p90Latency} ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-sans">{t('runner.p95Latency')}</span>
                    <span className="text-base font-bold text-amber-400 mt-1">{activeMetrics.p95Latency} ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-sans">{t('runner.p99Latency')}</span>
                    <span className="text-base font-bold text-orange-400 mt-1">{activeMetrics.p99Latency} ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-sans">{t('runner.maxLatency')}</span>
                    <span className="text-base font-bold text-rose-400 mt-1">{activeMetrics.maxLatency} ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col">
                    <span className="text-[10px] text-amber-400 font-sans">{t('runner.avgLatency')}</span>
                    <span className="text-base font-bold text-amber-300 mt-1">{activeMetrics.avgLatency} ms</span>
                  </div>
                </div>
              </div>
            )}

            {/* Latency Distribution Histogram */}
            {activeMetrics && activeMetrics.latencyBuckets.length > 0 && (
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>{t('runner.latencyHistogram')}</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {activeMetrics.latencyBuckets.map((bucket) => (
                    <div key={bucket.label} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-24 text-slate-400 truncate text-[11px] text-right shrink-0">
                        {bucket.label}
                      </span>
                      <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${bucket.color.split(' ')[1]}`}
                          style={{ width: `${bucket.percentage}%` }}
                        />
                      </div>
                      <span className="w-16 text-slate-300 font-bold text-right shrink-0">{bucket.count}</span>
                      <span className="w-14 text-slate-500 text-[11px] text-right shrink-0">
                        {bucket.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Code Distribution Breakdown */}
            {activeMetrics && Object.keys(activeMetrics.statusCodeDistribution).length > 0 && (
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>{t('runner.statusCodeDistribution')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(activeMetrics.statusCodeDistribution).map(([code, count]) => {
                    const is2xx = code.startsWith('2')
                    const is3xx = code.startsWith('3')
                    const is4xx = code.startsWith('4')
                    const is5xx = code.startsWith('5')
                    const isErr = code === 'Network Error'

                    let badgeCls = 'bg-slate-800 text-slate-300 border-slate-700'
                    if (is2xx) badgeCls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    else if (is3xx) badgeCls = 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    else if (is4xx) badgeCls = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    else if (is5xx || isErr) badgeCls = 'bg-rose-500/10 text-rose-400 border-rose-500/30'

                    return (
                      <div
                        key={code}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium ${badgeCls}`}
                      >
                        <span>{code}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-200 font-bold text-[10px]">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty state when no test has run */}
            {!activeMetrics && !isBenchmarking && (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Zap className="w-8 h-8 text-amber-500/40" />
                <p className="text-xs text-slate-400 max-w-sm">
                  {t('runner.benchmarkTargetTip')}
                </p>
                <button
                  type="button"
                  onClick={handleStartBenchmark}
                  disabled={runnableRequests.length === 0}
                  className="mt-2 px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  {t('runner.startBenchmark')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Samples / Failures Tab */}
        {panelTab === 'samples' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSampleFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    sampleFilter === 'all'
                      ? 'bg-slate-800 text-slate-200 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  全部采样 ({benchmarkSamples.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSampleFilter('failed')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    sampleFilter === 'failed'
                      ? 'bg-rose-500/20 text-rose-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  仅看异常 ({benchmarkSamples.filter((s) => s.status < 200 || s.status >= 400).length})
                </button>
              </div>
              <span className="text-[11px] text-slate-500">
                保留最近的异常与采样请求
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
              {filteredSamples.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">{t('runner.noFailedSamples')}</div>
              ) : (
                filteredSamples.map((s) => {
                  const isPass = s.status >= 200 && s.status < 400
                  return (
                    <div
                      key={s.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            methodBadgeColor[s.method as HttpMethod] || 'text-slate-400'
                          }`}
                        >
                          {s.method}
                        </span>
                        <span className="font-semibold text-slate-200 truncate max-w-xs">{s.requestName}</span>
                        <span className="text-slate-400 font-mono text-[11px] truncate flex-1">{s.url}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">{s.time} ms</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            isPass
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {s.status === 0 ? 'Error' : `${s.status} ${s.statusText || ''}`}
                        </span>
                        {s.error && (
                          <span className="text-rose-400 text-[11px] truncate max-w-[150px]" title={s.error}>
                            {s.error}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPopout({
                              status: s.status,
                              statusText: s.statusText,
                              data: null,
                              time: s.time,
                              size: s.size,
                              error: s.error,
                              timestamp: s.timestamp,
                              url: s.url,
                              method: s.method as HttpMethod,
                              requestName: s.requestName
                            })
                          }
                          className="p-1 hover:text-sky-400 text-slate-500 rounded transition-colors"
                          title={t('runner.openInNewWindow')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Targets Selection Tab */}
        {panelTab === 'targets' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{t('runner.benchmarkTargetTip')}</span>
              {!isBenchmarking && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {t('runner.selectAll')}
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={onDeselectAll}
                    className="text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {t('runner.deselectAll')}
                  </button>
                </div>
              )}
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
                      onClick={() => onToggleReq(req.id)}
                      className={`px-3.5 py-2.5 flex items-start gap-3 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-slate-900/60 hover:bg-slate-800/60'
                          : 'opacity-50 hover:opacity-75 bg-slate-950/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isBenchmarking}
                        onChange={() => onToggleReq(req.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-500 font-mono text-[11px] w-5 shrink-0">{idx + 1}.</span>
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                              methodBadgeColor[req.method] || 'text-slate-400'
                            }`}
                          >
                            {req.method}
                          </span>
                          <span className="font-semibold text-slate-200 truncate text-xs" title={req.name}>
                            {req.name || t('common.untitled')}
                          </span>
                        </div>
                        <div className="flex items-center pl-7 min-w-0">
                          <span
                            className="inline-block max-w-full truncate text-[11px] font-mono text-slate-300 bg-slate-950/80 border border-slate-800/90 rounded px-2.5 py-0.5"
                            title={interpolate(req.url, req)}
                          >
                            {interpolate(req.url, req)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
