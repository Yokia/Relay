import React, { useState } from 'react'
import {
  X,
  Settings,
  ShieldCheck,
  Zap,
  Globe,
  Sun,
  Moon,
  ArrowUpDown,
  Layers,
  Keyboard,
  Sliders,
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-react'
import { Language, Theme, AppSettings } from '../types'
import { useI18n } from '../i18n'

export type { AppSettings }

interface Props {
  isOpen: boolean
  settings: AppSettings
  onClose: () => void
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void
  onOpenDataTransfer?: () => void
}

type SettingCategory = 'general' | 'workspace' | 'network' | 'shortcuts' | 'backup'

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onOpenDataTransfer
}) => {
  const { t } = useI18n()
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('general')

  if (!isOpen) return null

  const categories: { id: SettingCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: t('settings.catGeneral'), icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'workspace', label: t('settings.catWorkspace'), icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'network', label: t('settings.catNetwork'), icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'shortcuts', label: t('settings.catShortcuts'), icon: <Keyboard className="w-3.5 h-3.5" /> },
    { id: 'backup', label: t('settings.catBackup'), icon: <ArrowUpDown className="w-3.5 h-3.5" /> }
  ]

  const shortcutsList = [
    { key: ['Ctrl', 'Enter'], name: t('shortcuts.sendRequest'), desc: t('shortcuts.sendRequestDesc') },
    { key: ['Ctrl', 'S'], name: t('shortcuts.saveRequest'), desc: t('shortcuts.saveRequestDesc') },
    { key: ['Ctrl', 'P'], name: t('shortcuts.quickOpen'), desc: t('shortcuts.quickOpenDesc') },
    { key: ['Ctrl', 'D'], name: t('shortcuts.duplicate'), desc: t('shortcuts.duplicateDesc') },
    { key: ['Ctrl', 'T'], name: t('shortcuts.newTab'), desc: t('shortcuts.newTabDesc') },
    { key: ['Ctrl', 'W'], name: t('shortcuts.closeTab'), desc: t('shortcuts.closeTabDesc') },
    { key: ['Ctrl', ','], name: t('shortcuts.settings'), desc: t('shortcuts.settingsDesc') },
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-100"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] text-slate-200 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <div className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Settings className="w-4 h-4" />
            </div>
            <span>{t('settings.title')}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with Left Nav & Right Panel */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Category Nav */}
          <div className="w-44 border-r border-slate-800 bg-slate-950/40 p-2 flex flex-col gap-1 shrink-0 select-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  activeCategory === cat.id
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Right Setting Panels */}
          <div className="flex-1 p-5 overflow-y-auto min-h-0 text-xs flex flex-col gap-4">
            {/* 1. GENERAL CATEGORY */}
            {activeCategory === 'general' && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('settings.catGeneral')}
                </span>

                {/* Theme Switcher */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      {settings.theme === 'light' ? (
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-sky-400" />
                      )}
                      <span>{t('settings.themeTitle')}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{t('settings.themeDesc')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={settings.theme || 'dark'}
                      onChange={(e) => onUpdateSettings({ theme: e.target.value as Theme })}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
                    >
                      <option value="dark">{t('settings.themeDark')}</option>
                      <option value="light">{t('settings.themeLight')}</option>
                    </select>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('settings.languageTitle')}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{t('settings.languageDesc')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={settings.language || 'zh-CN'}
                      onChange={(e) => onUpdateSettings({ language: e.target.value as Language })}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
                    >
                      <option value="zh-CN">简体中文 (Chinese)</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>
                </div>

                {/* User Guide Card */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('help.title')}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{t('help.guideDesc')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electronAPI?.openHelpWindow) {
                        window.electronAPI.openHelpWindow()
                      }
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-sky-500 hover:bg-sky-600 text-white font-medium transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span>{t('help.openInNewWindow')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. WORKSPACE & TABS CATEGORY */}
            {activeCategory === 'workspace' && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('settings.catWorkspace')}
                </span>

                {/* Multi Tabs Toggle */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('settings.multiTabsTitle')}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {t('settings.multiTabsDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={settings.enableMultiTabs !== false}
                      onChange={(e) => onUpdateSettings({ enableMultiTabs: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Collection Path in Tabs Toggle */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>{t('settings.showCollectionPathTitle')}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {t('settings.showCollectionPathDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={settings.showCollectionPath === true}
                      onChange={(e) => onUpdateSettings({ showCollectionPath: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Auto Save Toggle */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('settings.autoSaveTitle')}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {t('settings.autoSaveDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Max Responses History per Request */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-200">{t('settings.maxHistoryTitle')}</span>
                    <span className="text-slate-400 text-[11px]">{t('settings.maxHistoryDesc')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={settings.maxResponsesPerRequest || 5}
                      onChange={(e) => onUpdateSettings({ maxResponsesPerRequest: parseInt(e.target.value, 10) || 5 })}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {[1, 3, 5, 10, 20].map((num) => (
                        <option key={num} value={num}>
                          {t('settings.historyRunOption', { num })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Response Blob Storage Limit */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-200">{t('settings.responseStorageTitle')}</span>
                    <span className="text-slate-400 text-[11px]">{t('settings.responseStorageDesc')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="10"
                      max="2048"
                      value={settings.responseStorageLimitMB || 100}
                      onChange={(e) => onUpdateSettings({ responseStorageLimitMB: Math.max(10, Math.min(2048, parseInt(e.target.value, 10) || 100)) })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-slate-400">{t('settings.responseStorageUnit')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. NETWORK & SSL CATEGORY */}
            {activeCategory === 'network' && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('settings.catNetwork')}
                </span>

                {/* Timeout */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-200">{t('settings.timeoutTitle')}</span>
                    <span className="text-slate-400 text-[11px]">{t('settings.timeoutDesc')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={Math.round((settings.timeout || 30000) / 1000)}
                      onChange={(e) => onUpdateSettings({ timeout: (parseInt(e.target.value, 10) || 30) * 1000 })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-slate-400">s</span>
                  </div>
                </div>

                {/* SSL Verification */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('settings.sslTitle')}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {t('settings.sslDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={settings.sslVerify}
                      onChange={(e) => onUpdateSettings({ sslVerify: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>
              </div>
            )}

            {/* 4. SHORTCUTS CATEGORY */}
            {activeCategory === 'shortcuts' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('shortcuts.title')}
                  </span>
                  <span className="text-[11px] text-slate-400">{t('shortcuts.desc')}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {shortcutsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/90"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-slate-200">{item.name}</span>
                        <span className="text-[11px] text-slate-400">{item.desc}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {item.key.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            {kIdx > 0 && <span className="text-slate-600 text-xs">+</span>}
                            <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 font-mono text-[11px] shadow-sm font-semibold">
                              {k}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. BACKUP & DATA CATEGORY */}
            {activeCategory === 'backup' && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('settings.catBackup')}
                </span>

                <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('settings.dataBackupTitle')}</span>
                    </div>
                    <span className="text-slate-400 text-[11px] leading-relaxed">
                      {t('settings.dataBackupDesc')}
                    </span>
                  </div>
                  {onOpenDataTransfer && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenDataTransfer()
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded text-xs font-medium transition-colors shrink-0 ml-3"
                    >
                      {t('settings.openTransferBtn')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-950/50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md transition-colors shadow-sm"
          >
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
