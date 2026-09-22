import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  HardDrive,
  Calendar,
  ArrowRight
} from 'lucide-react'
import { UpdateCheckResult, UpdateDownloadProgress } from '../types'
import { useI18n } from '../i18n'

interface Props {
  isOpen: boolean
  updateInfo: UpdateCheckResult | null
  onClose: () => void
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export const UpdateModal: React.FC<Props> = ({ isOpen, updateInfo, onClose, onToast }) => {
  const { t } = useI18n()

  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle')
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownloadProgress>({
    percent: 0,
    transferred: 0,
    total: 0,
    bytesPerSecond: 0
  })
  const [downloadError, setDownloadError] = useState<string>('')
  const [installerPath, setInstallerPath] = useState<string>('')

  // Reset state when modal reopens with a new update
  useEffect(() => {
    if (isOpen) {
      setDownloadState('idle')
      setDownloadProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 })
      setDownloadError('')
      setInstallerPath('')
    }
  }, [isOpen, updateInfo?.latestVersion])

  // Listen to download progress and completion events from main process
  useEffect(() => {
    if (!window.electronAPI) return

    const unsubProgress = window.electronAPI.onUpdateDownloadProgress?.((progress: UpdateDownloadProgress) => {
      setDownloadProgress(progress)
      setDownloadState('downloading')
    })

    const unsubComplete = window.electronAPI.onUpdateDownloadComplete?.((path: string) => {
      setInstallerPath(path)
      setDownloadState('completed')
      setDownloadProgress((prev) => ({ ...prev, percent: 100 }))
    })

    return () => {
      unsubProgress?.()
      unsubComplete?.()
    }
  }, [])

  if (!isOpen || !updateInfo) return null

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    const kb = bytes / 1024
    return `${kb.toFixed(0)} KB`
  }

  const formatSpeed = (bytesPerSec: number): string => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s'
    const mb = bytesPerSec / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(2)} MB/s`
    const kb = bytesPerSec / 1024
    return `${kb.toFixed(0)} KB/s`
  }

  const formatDate = (isoString?: string): string => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString()
    } catch {
      return ''
    }
  }

  const handleStartDownload = async () => {
    const downloadUrl = updateInfo.asset?.downloadUrl
    if (!downloadUrl) {
      if (updateInfo.releaseUrl) {
        window.electronAPI?.openExternal?.(updateInfo.releaseUrl)
      }
      return
    }

    setDownloadState('downloading')
    setDownloadError('')
    setDownloadProgress({ percent: 0, transferred: 0, total: updateInfo.asset.size || 0, bytesPerSecond: 0 })

    try {
      const res = await window.electronAPI?.startDownloadUpdate?.(downloadUrl)
      if (res && !res.success) {
        setDownloadState('error')
        setDownloadError(res.error || t('updater.downloadFailed'))
      }
    } catch (err: any) {
      setDownloadState('error')
      setDownloadError(err.message || t('updater.downloadFailed'))
    }
  }

  const handleCancelDownload = () => {
    window.electronAPI?.cancelDownloadUpdate?.()
    setDownloadState('idle')
    setDownloadProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 })
    onToast(t('updater.cancel'), 'info')
  }

  const handleInstallAndRestart = () => {
    const success = window.electronAPI?.installAndRestart?.(installerPath)
    if (!success) {
      onToast('Failed to launch installer', 'error')
    }
  }

  const handleOpenBrowser = () => {
    const target = updateInfo.releaseUrl || `https://github.com/Yokia/Relay/releases`
    window.electronAPI?.openExternal?.(target)
  }

  // Render markdown release notes into clean paragraphs/bullets
  const renderReleaseNotes = (notes: string) => {
    if (!notes || !notes.trim()) {
      return <div className="text-slate-500 italic py-4">{t('changelog.details')}</div>
    }

    const lines = notes.split('\n')
    return (
      <div className="space-y-1 text-xs text-slate-300 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={idx} className="h-1.5" />

          // Headers
          if (trimmed.startsWith('#')) {
            const headerText = trimmed.replace(/^#+\s*/, '')
            return (
              <h4 key={idx} className="font-bold text-slate-100 mt-2 mb-1 text-xs">
                {headerText}
              </h4>
            )
          }

          // Bullet points
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const bulletText = trimmed.replace(/^[-*]\s*/, '')
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span className="flex-1 text-slate-300">{bulletText}</span>
              </div>
            )
          }

          return (
            <p key={idx} className="text-slate-300">
              {trimmed}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {t('updater.newVersionFound')}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/25">
                  v{updateInfo.latestVersion}
                </span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {updateInfo.releaseName || `Relay v${updateInfo.latestVersion}`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={downloadState === 'downloading'}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          {/* Version comparison card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t('updater.currentVersion')}</span>
                <span className="text-xs font-mono font-semibold text-slate-300">v{updateInfo.currentVersion}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className="flex flex-col">
                <span className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">{t('updater.latestVersion')}</span>
                <span className="text-xs font-mono font-bold text-emerald-400">v{updateInfo.latestVersion}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              {updateInfo.asset?.size ? (
                <span className="flex items-center gap-1" title={t('updater.packageSize')}>
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  {formatBytes(updateInfo.asset.size)}
                </span>
              ) : null}
              {updateInfo.publishedAt ? (
                <span className="flex items-center gap-1" title={t('updater.releaseDate')}>
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {formatDate(updateInfo.publishedAt)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Release Notes */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>{t('updater.releaseNotes')}</span>
            </span>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 overflow-y-auto max-h-48 text-xs leading-relaxed custom-scrollbar">
              {renderReleaseNotes(updateInfo.releaseNotes || '')}
            </div>
          </div>

          {/* Download Progress View */}
          {downloadState === 'downloading' && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-sky-500/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  {t('updater.downloading')}
                </span>
                <span className="font-mono font-bold text-sky-400">{downloadProgress.percent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>
                  {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                </span>
                <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
              </div>
            </div>
          )}

          {/* Completed View */}
          {downloadState === 'completed' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold">{t('updater.downloadComplete')}</span>
                <span className="text-[11px] text-emerald-500/90 mt-0.5">
                  点击“立即安装并重启”启动安装程序并自动覆盖更新 Relay。
                </span>
              </div>
            </div>
          )}

          {/* Error View */}
          {downloadState === 'error' && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{t('updater.downloadFailed')}</span>
                {downloadError && <span className="text-[11px] opacity-80 font-mono">{downloadError}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpenBrowser}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('updater.viewOnGitHub')}</span>
          </button>

          <div className="flex items-center gap-2">
            {downloadState === 'idle' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  {t('updater.later')}
                </button>
                <button
                  type="button"
                  onClick={handleStartDownload}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('updater.updateNow')}</span>
                </button>
              </>
            )}

            {downloadState === 'downloading' && (
              <button
                type="button"
                onClick={handleCancelDownload}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                {t('updater.cancel')}
              </button>
            )}

            {downloadState === 'completed' && (
              <button
                type="button"
                onClick={handleInstallAndRestart}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('updater.installAndRestart')}</span>
              </button>
            )}

            {downloadState === 'error' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  {t('updater.later')}
                </button>
                <button
                  type="button"
                  onClick={handleStartDownload}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('updater.retry')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
