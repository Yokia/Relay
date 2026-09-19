import React, { useState, useMemo } from 'react'
import {
  X,
  ArrowLeftRight,
  Columns,
  AlignJustify,
  Filter,
  Copy,
  Check,
  Clock,
  Database,
  FileCheck2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { ResponseRun } from '../types'
import { useI18n } from '../i18n'
import { computeLineDiff } from '../utils/diffUtils'

interface Props {
  isOpen: boolean
  runs: ResponseRun[]
  initialLeftRunId?: string
  initialRightRunId?: string
  onClose: () => void
  onToast?: (msg: string) => void
}

export const ResponseDiffModal: React.FC<Props> = ({
  isOpen,
  runs,
  initialLeftRunId,
  initialRightRunId,
  onClose,
  onToast
}) => {
  const { t } = useI18n()

  // Default selection: Right is latest (runs[0]), Left is previous (runs[1] or runs[0])
  const [leftRunId, setLeftRunId] = useState<string>(() => {
    if (initialLeftRunId && runs.some((r) => r.id === initialLeftRunId)) return initialLeftRunId
    return runs.length > 1 ? runs[1].id : runs[0]?.id || ''
  })

  const [rightRunId, setRightRunId] = useState<string>(() => {
    if (initialRightRunId && runs.some((r) => r.id === initialRightRunId)) return initialRightRunId
    return runs[0]?.id || ''
  })

  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split')
  const [diffOnly, setDiffOnly] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [activeDiffIndex, setActiveDiffIndex] = useState<number>(-1)

  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Keep state sync if runs change or initial props change
  React.useEffect(() => {
    if (isOpen && runs.length >= 2) {
      if (!runs.some((r) => r.id === leftRunId)) {
        setLeftRunId(runs[1]?.id || runs[0]?.id || '')
      }
      if (!runs.some((r) => r.id === rightRunId)) {
        setRightRunId(runs[0]?.id || '')
      }
    }
  }, [isOpen, runs])

  const leftRun = useMemo(() => runs.find((r) => r.id === leftRunId), [runs, leftRunId])
  const rightRun = useMemo(() => runs.find((r) => r.id === rightRunId), [runs, rightRunId])

  const formatBodyString = (run?: ResponseRun) => {
    if (!run || run.response.data === null || run.response.data === undefined) return ''
    if (typeof run.response.data === 'object') {
      try {
        return JSON.stringify(run.response.data, null, 2)
      } catch {
        return String(run.response.data)
      }
    }
    return String(run.response.data)
  }

  const leftText = useMemo(() => formatBodyString(leftRun), [leftRun])
  const rightText = useMemo(() => formatBodyString(rightRun), [rightRun])

  const diffResult = useMemo(() => {
    return computeLineDiff(leftText, rightText)
  }, [leftText, rightText])

  if (!isOpen) return null

  const handleSwap = () => {
    const temp = leftRunId
    setLeftRunId(rightRunId)
    setRightRunId(temp)
  }

  const handleCopy = () => {
    if (diffResult.lines.length === 0) return
    const text = diffResult.lines
      .map((line) => {
        const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '
        return prefix + line.text
      })
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    if (onToast) onToast(t('diff.diffCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return ms + ' ms'
    return (ms / 1000).toFixed(2) + ' s'
  }

  const formatFullDateTime = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  // Metrics deltas
  const timeDelta = (rightRun?.response.time || 0) - (leftRun?.response.time || 0)
  const sizeDelta = (rightRun?.response.size || 0) - (leftRun?.response.size || 0)

  // Filtered lines when diffOnly is toggled
  const filteredUnifiedLines = useMemo(() => {
    if (!diffOnly) return diffResult.lines
    return diffResult.lines.filter((l) => l.type !== 'unchanged')
  }, [diffResult.lines, diffOnly])

  const filteredSideBySideLines = useMemo(() => {
    if (!diffOnly) return diffResult.sideBySide
    return diffResult.sideBySide.filter(
      (pair) => pair.left?.type === 'removed' || pair.right?.type === 'added'
    )
  }, [diffResult.sideBySide, diffOnly])

  // Group consecutive modified rows into distinct diff blocks (chunks)
  const diffBlocks = useMemo(() => {
    const blocks: { id: number; startIndex: number; endIndex: number }[] = []
    let currentBlock: { id: number; startIndex: number; endIndex: number } | null = null

    if (viewMode === 'split') {
      filteredSideBySideLines.forEach((line, idx) => {
        const isDiff = line.left?.type === 'removed' || line.right?.type === 'added'
        if (isDiff) {
          if (!currentBlock) {
            currentBlock = { id: blocks.length, startIndex: idx, endIndex: idx }
          } else {
            currentBlock.endIndex = idx
          }
        } else {
          if (currentBlock) {
            blocks.push(currentBlock)
            currentBlock = null
          }
        }
      })
    } else {
      filteredUnifiedLines.forEach((line, idx) => {
        const isDiff = line.type !== 'unchanged'
        if (isDiff) {
          if (!currentBlock) {
            currentBlock = { id: blocks.length, startIndex: idx, endIndex: idx }
          } else {
            currentBlock.endIndex = idx
          }
        } else {
          if (currentBlock) {
            blocks.push(currentBlock)
            currentBlock = null
          }
        }
      })
    }

    if (currentBlock) {
      blocks.push(currentBlock)
    }

    return blocks
  }, [viewMode, filteredSideBySideLines, filteredUnifiedLines])

  // Reset activeDiffIndex when view mode or diff blocks change
  React.useEffect(() => {
    setActiveDiffIndex(-1)
  }, [viewMode, diffBlocks.length, leftRunId, rightRunId, diffOnly])

  const activeDiffBlock = useMemo(() => {
    if (activeDiffIndex < 0 || activeDiffIndex >= diffBlocks.length) return null
    return diffBlocks[activeDiffIndex]
  }, [diffBlocks, activeDiffIndex])

  const scrollToDiff = (targetIndex: number) => {
    if (diffBlocks.length === 0) return
    const block = diffBlocks[targetIndex]
    if (!block) return
    setActiveDiffIndex(targetIndex)

    const el = scrollContainerRef.current?.querySelector(`[data-diff-row="${block.startIndex}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handlePrevDiff = () => {
    if (diffBlocks.length === 0) return
    const nextIdx = activeDiffIndex <= 0 ? diffBlocks.length - 1 : activeDiffIndex - 1
    scrollToDiff(nextIdx)
  }

  const handleNextDiff = () => {
    if (diffBlocks.length === 0) return
    const nextIdx = activeDiffIndex >= diffBlocks.length - 1 ? 0 : activeDiffIndex + 1
    scrollToDiff(nextIdx)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh] text-slate-100 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-100">
            <div className="p-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <span>{t('diff.title')}</span>
            <span className="text-xs font-normal text-slate-400 ml-1">
              ({runs.length} {t('response.historyRuns')})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                  viewMode === 'split'
                    ? 'bg-sky-500 text-white shadow-sm font-medium'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                title={t('diff.splitView')}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('diff.splitView')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                  viewMode === 'unified'
                    ? 'bg-sky-500 text-white shadow-sm font-medium'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                title={t('diff.unifiedView')}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('diff.unifiedView')}</span>
              </button>
            </div>

            {/* Previous / Next Diff Jump Navigation */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={handlePrevDiff}
                disabled={diffBlocks.length === 0}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t('diff.prevDiff')}
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              <span className="px-2 text-[11px] font-mono text-slate-300 select-none">
                {diffBlocks.length === 0
                  ? '0/0'
                  : activeDiffIndex >= 0
                    ? `${activeDiffIndex + 1}/${diffBlocks.length}`
                    : `-/${diffBlocks.length}`}
              </span>

              <button
                type="button"
                onClick={handleNextDiff}
                disabled={diffBlocks.length === 0}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t('diff.nextDiff')}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Diff Only Toggle */}
            <button
              type="button"
              onClick={() => setDiffOnly(!diffOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                diffOnly
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 dark:text-amber-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-100'
              }`}
              title={diffOnly ? t('diff.showAll') : t('diff.diffOnly')}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{diffOnly ? t('diff.diffOnly') : t('diff.showAll')}</span>
            </button>

            {/* Copy Diff */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
              title={t('diff.copyDiff')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copied ? t('common.copied') : t('diff.copyDiff')}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Version Pickers & Comparison Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4 flex-wrap shrink-0 text-xs">
          {/* Left Version Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-slate-400 font-medium shrink-0">{t('diff.selectRunA')}:</span>
            <div className="relative flex-1">
              <select
                value={leftRunId}
                onChange={(e) => setLeftRunId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500 cursor-pointer truncate shadow-sm"
              >
                {runs.map((r, idx) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    #{runs.length - idx} • {r.response.status} ({formatFullDateTime(r.timestamp)}) - {r.response.time}ms ({formatSize(r.response.size)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-sky-400 hover:border-sky-500/50 transition-colors shrink-0 shadow-sm"
            title={t('diff.swap')}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* Right Version Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-slate-400 font-medium shrink-0">{t('diff.selectRunB')}:</span>
            <div className="relative flex-1">
              <select
                value={rightRunId}
                onChange={(e) => setRightRunId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer truncate shadow-sm"
              >
                {runs.map((r, idx) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    #{runs.length - idx} • {r.response.status} ({formatFullDateTime(r.timestamp)}) - {r.response.time}ms ({formatSize(r.response.size)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Metrics Status Comparison Strip */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between text-xs gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Status Code Comparison */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">{t('diff.statusDiff')}:</span>
              <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                {leftRun?.response.status ?? '-'}
              </span>
              <span className="text-slate-400">→</span>
              <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                {rightRun?.response.status ?? '-'}
              </span>
            </div>

            {/* Time Delta */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">{t('diff.timeDiff')}:</span>
              <span className="font-mono text-slate-300">{formatTime(leftRun?.response.time || 0)}</span>
              <span className="text-slate-400">→</span>
              <span className="font-mono text-slate-300">{formatTime(rightRun?.response.time || 0)}</span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  timeDelta < 0
                    ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
                    : timeDelta > 0
                      ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20'
                      : 'text-slate-400 bg-slate-800'
                }`}
              >
                {timeDelta > 0 ? `+${timeDelta}ms` : `${timeDelta}ms`}
              </span>
            </div>

            {/* Size Delta */}
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">{t('diff.sizeDiff')}:</span>
              <span className="font-mono text-slate-300">{formatSize(leftRun?.response.size || 0)}</span>
              <span className="text-slate-400">→</span>
              <span className="font-mono text-slate-300">{formatSize(rightRun?.response.size || 0)}</span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  sizeDelta < 0
                    ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
                    : sizeDelta > 0
                      ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20'
                      : 'text-slate-400 bg-slate-800'
                }`}
              >
                {sizeDelta > 0 ? `+${sizeDelta} B` : `${sizeDelta} B`}
              </span>
            </div>
          </div>

          {/* Additions / Deletions Summary */}
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
              +{diffResult.additions}
            </span>
            <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 font-bold">
              -{diffResult.deletions}
            </span>
            {diffResult.isIdentical && (
              <span className="flex items-center gap-1 text-emerald-400 font-sans text-xs font-medium">
                <FileCheck2 className="w-3.5 h-3.5" />
                {t('diff.identical')}
              </span>
            )}
          </div>
        </div>

        {/* Diff Content View Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-slate-950 font-mono text-xs leading-relaxed select-text p-0 scroll-smooth">
          {diffResult.isIdentical && !diffOnly && (
            <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/20 text-emerald-400 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>{t('diff.identicalDesc')}</span>
            </div>
          )}

          {diffOnly && filteredUnifiedLines.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
              <FileCheck2 className="w-10 h-10 text-emerald-500/40 mb-3" />
              <p className="text-sm font-sans text-slate-300 font-medium">{t('diff.identical')}</p>
              <p className="text-xs font-sans text-slate-400 mt-1">{t('diff.identicalDesc')}</p>
            </div>
          )}

          {/* VIEW MODE 1: SPLIT (Side-by-Side) */}
          {viewMode === 'split' && filteredSideBySideLines.length > 0 && (
            <div className="flex min-w-full divide-x divide-slate-800">
              {/* Left Column (Old/Baseline) */}
              <div className="w-1/2 overflow-x-auto">
                <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-3 py-1.5 text-xs font-sans flex items-center justify-between z-10">
                  <span className="text-rose-500 font-semibold">{t('diff.leftBaseline')}</span>
                  <span className="font-mono text-[11px] text-slate-400 font-medium">{leftRun?.method} {leftRun?.response.status}</span>
                </div>
                {filteredSideBySideLines.map((pair, idx) => {
                  const left = pair.left
                  const isRemoved = left?.type === 'removed'
                  const isCurrentActiveDiff = activeDiffBlock && idx >= activeDiffBlock.startIndex && idx <= activeDiffBlock.endIndex
                  return (
                    <div
                      key={`left-${idx}`}
                      data-diff-row={idx}
                      className={`flex items-start min-h-[22px] px-2 py-0.5 border-b border-slate-800/40 transition-colors ${
                        isCurrentActiveDiff ? 'ring-1 ring-inset ring-amber-400/80 ' : ''
                      }${
                        isRemoved
                          ? 'bg-rose-500/20 text-rose-950 dark:text-rose-100 font-medium'
                          : left
                            ? 'text-slate-300'
                            : 'bg-slate-900/30 text-transparent select-none'
                      }`}
                    >
                      <span className={`w-10 shrink-0 select-none text-right pr-3 font-mono text-[11px] ${
                        isRemoved ? 'text-rose-500 font-bold' : 'text-slate-500'
                      }`}>
                        {left?.lineNumber || ''}
                      </span>
                      <span className={`w-4 shrink-0 select-none text-center font-bold text-xs ${
                        isRemoved ? 'text-rose-500' : 'text-slate-600'
                      }`}>
                        {isRemoved ? '-' : ''}
                      </span>
                      <pre className="flex-1 whitespace-pre-wrap break-all font-mono">
                        {left?.text || ' '}
                      </pre>
                    </div>
                  )
                })}
              </div>

              {/* Right Column (New/Target) */}
              <div className="w-1/2 overflow-x-auto">
                <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-3 py-1.5 text-xs font-sans flex items-center justify-between z-10">
                  <span className="text-emerald-500 font-semibold">{t('diff.rightCurrent')}</span>
                  <span className="font-mono text-[11px] text-slate-400 font-medium">{rightRun?.method} {rightRun?.response.status}</span>
                </div>
                {filteredSideBySideLines.map((pair, idx) => {
                  const right = pair.right
                  const isAdded = right?.type === 'added'
                  const isCurrentActiveDiff = activeDiffBlock && idx >= activeDiffBlock.startIndex && idx <= activeDiffBlock.endIndex
                  return (
                    <div
                      key={`right-${idx}`}
                      data-diff-row={idx}
                      className={`flex items-start min-h-[22px] px-2 py-0.5 border-b border-slate-800/40 transition-colors ${
                        isCurrentActiveDiff ? 'ring-1 ring-inset ring-amber-400/80 ' : ''
                      }${
                        isAdded
                          ? 'bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 font-medium'
                          : right
                            ? 'text-slate-300'
                            : 'bg-slate-900/30 text-transparent select-none'
                      }`}
                    >
                      <span className={`w-10 shrink-0 select-none text-right pr-3 font-mono text-[11px] ${
                        isAdded ? 'text-emerald-500 font-bold' : 'text-slate-500'
                      }`}>
                        {right?.lineNumber || ''}
                      </span>
                      <span className={`w-4 shrink-0 select-none text-center font-bold text-xs ${
                        isAdded ? 'text-emerald-500' : 'text-slate-600'
                      }`}>
                        {isAdded ? '+' : ''}
                      </span>
                      <pre className="flex-1 whitespace-pre-wrap break-all font-mono">
                        {right?.text || ' '}
                      </pre>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: UNIFIED (Inline) */}
          {viewMode === 'unified' && filteredUnifiedLines.length > 0 && (
            <div className="w-full">
              {filteredUnifiedLines.map((line, idx) => {
                const isAdded = line.type === 'added'
                const isRemoved = line.type === 'removed'
                const isCurrentActiveDiff = activeDiffBlock && idx >= activeDiffBlock.startIndex && idx <= activeDiffBlock.endIndex
                return (
                  <div
                    key={`unified-${idx}`}
                    data-diff-row={idx}
                    className={`flex items-start px-2 py-0.5 border-b border-slate-800/40 transition-colors ${
                      isCurrentActiveDiff ? 'ring-1 ring-inset ring-amber-400/80 ' : ''
                    }${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 font-medium'
                        : isRemoved
                          ? 'bg-rose-500/20 text-rose-950 dark:text-rose-100 font-medium'
                          : 'text-slate-300'
                    }`}
                  >
                    <span className={`w-10 shrink-0 select-none text-right pr-2 font-mono text-[11px] ${
                      isRemoved ? 'text-rose-500 font-bold' : 'text-slate-500'
                    }`}>
                      {line.oldLineNumber || ''}
                    </span>
                    <span className={`w-10 shrink-0 select-none text-right pr-3 font-mono text-[11px] ${
                      isAdded ? 'text-emerald-500 font-bold' : 'text-slate-500'
                    }`}>
                      {line.newLineNumber || ''}
                    </span>
                    <span className={`w-4 shrink-0 select-none text-center font-bold text-xs ${
                      isAdded ? 'text-emerald-500' : isRemoved ? 'text-rose-500' : 'text-slate-600'
                    }`}>
                      {isAdded ? '+' : isRemoved ? '-' : ' '}
                    </span>
                    <pre className="flex-1 whitespace-pre-wrap break-all font-mono">
                      {line.text}
                    </pre>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
