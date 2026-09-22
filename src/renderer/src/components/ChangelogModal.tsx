import React, { useState } from 'react'
import {
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  Zap,
  ArrowRight,
  History
} from 'lucide-react'
import { CHANGELOG_DATA, APP_VERSION, ReleaseNote, ChangeType } from '../data/changelog'
import { useI18n } from '../i18n'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const ChangelogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language } = useI18n()
  const isZh = language === 'zh-CN'

  const [selectedVersion, setSelectedVersion] = useState<string>(APP_VERSION)
  const activeRelease: ReleaseNote =
    CHANGELOG_DATA.find((r) => r.version === selectedVersion) || CHANGELOG_DATA[0]

  if (!isOpen) return null

  const getTagBadge = (type: ChangeType) => {
    switch (type) {
      case 'feat':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Sparkles className="w-2.5 h-2.5" />
            {isZh ? '新功能' : 'Feature'}
          </span>
        )
      case 'perf':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
            <Zap className="w-2.5 h-2.5" />
            {isZh ? '优化' : 'Improvement'}
          </span>
        )
      case 'fix':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
            <Wrench className="w-2.5 h-2.5" />
            {isZh ? '修复' : 'Fix'}
          </span>
        )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100 tracking-tight">
                  {isZh ? '版本更新说明' : "What's New in Relay"}
                </h3>
                <span className="px-2 py-0.5 text-[11px] rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-mono font-semibold">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isZh ? '了解 Relay 最新功能特性与体验优化' : 'Discover the latest improvements and capabilities'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={isZh ? '关闭 (Esc)' : 'Close (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Switcher Bar */}
        <div className="px-6 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-2 shrink-0 overflow-x-auto text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium mr-1 shrink-0">
            <History className="w-3.5 h-3.5" />
            {isZh ? '历史版本：' : 'Releases:'}
          </span>
          {CHANGELOG_DATA.map((release, idx) => {
            const isSelected = release.version === selectedVersion
            const isLatest = idx === 0
            return (
              <button
                key={release.version}
                onClick={() => setSelectedVersion(release.version)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                <span>v{release.version}</span>
                {isLatest && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-sans uppercase ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-sky-500/20 text-sky-300'
                    }`}
                  >
                    {isZh ? '最新' : 'Latest'}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Release Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 space-y-4">
          {/* Release Hero Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 via-slate-900 to-slate-900 border border-sky-500/20 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>{isZh ? activeRelease.titleZh : activeRelease.titleEn}</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-950/60 px-2.5 py-0.5 rounded-full border border-slate-800">
                <Calendar className="w-3 h-3 text-sky-400" />
                <span>{activeRelease.date}</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isZh ? activeRelease.descriptionZh : activeRelease.descriptionEn}
            </p>
          </div>

          {/* Detailed Change Items */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>{isZh ? '变更详情' : 'Change Details'}</span>
              <span className="text-slate-500 font-normal">({activeRelease.changes.length})</span>
            </div>

            <div className="divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              {activeRelease.changes.map((item, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-slate-800/30 transition-colors flex items-start gap-3 text-xs"
                >
                  <div className="pt-0.5 shrink-0">{getTagBadge(item.type)}</div>
                  <div className="flex-1 text-slate-200 leading-relaxed">
                    {isZh ? item.textZh : item.textEn}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isZh
                ? '已自动为您载入最新版本'
                : 'You are using the latest version of Relay'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>{isZh ? '我知道了' : 'Got it'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
