import React, { useState, useEffect } from 'react'
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
  BookOpen,
  Info,
  RefreshCw,
  Loader2,
  RotateCcw,
  Edit2,
  AlertCircle
} from 'lucide-react'
import { Language, Theme, AppSettings, ShortcutActionId, KeybindingItem, CustomKeybindings } from '../types'
import { useI18n } from '../i18n'
import { APP_VERSION } from '../data/changelog'
import {
  DEFAULT_KEYBINDINGS,
  getEffectiveKeybindings,
  formatKeybinding,
  areKeybindingsEqual,
  eventToKeybinding,
  findConflictingAction
} from '../utils/keybindingUtils'

export type { AppSettings }

export type SettingCategory = 'general' | 'workspace' | 'network' | 'shortcuts' | 'backup' | 'about'

interface Props {
  isOpen: boolean
  settings: AppSettings
  initialCategory?: SettingCategory
  onClose: () => void
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void
  onOpenDataTransfer?: () => void
  onOpenChangelog?: () => void
  onCheckUpdates?: () => void
  isCheckingUpdates?: boolean
}

const SettingsModalContent: React.FC<Omit<Props, 'isOpen'>> = ({
  settings,
  initialCategory = 'general',
  onClose,
  onUpdateSettings,
  onOpenDataTransfer,
  onOpenChangelog,
  onCheckUpdates,
  isCheckingUpdates = false
}) => {
  const { t } = useI18n()
  const [activeCategory, setActiveCategory] = useState<SettingCategory>(initialCategory)

  const categories: { id: SettingCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: t('settings.catGeneral'), icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'workspace', label: t('settings.catWorkspace'), icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'network', label: t('settings.catNetwork'), icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'shortcuts', label: t('settings.catShortcuts'), icon: <Keyboard className="w-3.5 h-3.5" /> },
    { id: 'backup', label: t('settings.catBackup'), icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
    { id: 'about', label: t('settings.catAbout'), icon: <Info className="w-3.5 h-3.5" /> }
  ]

  const effectiveKeybindings = getEffectiveKeybindings(settings.keybindings)
  const [recordingAction, setRecordingAction] = useState<ShortcutActionId | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  const shortcutActions: { id: ShortcutActionId; name: string; desc: string }[] = [
    { id: 'sendRequest', name: t('shortcuts.sendRequest'), desc: t('shortcuts.sendRequestDesc') },
    { id: 'saveRequest', name: t('shortcuts.saveRequest'), desc: t('shortcuts.saveRequestDesc') },
    { id: 'quickOpen', name: t('shortcuts.quickOpen'), desc: t('shortcuts.quickOpenDesc') },
    { id: 'duplicateRequest', name: t('shortcuts.duplicate'), desc: t('shortcuts.duplicateDesc') },
    { id: 'newTab', name: t('shortcuts.newTab'), desc: t('shortcuts.newTabDesc') },
    { id: 'closeTab', name: t('shortcuts.closeTab'), desc: t('shortcuts.closeTabDesc') },
    { id: 'openDevToys', name: t('shortcuts.openDevToys'), desc: t('shortcuts.openDevToysDesc') },
    { id: 'openSettings', name: t('shortcuts.settings'), desc: t('shortcuts.settingsDesc') }
  ]

  // Key recording listener
  useEffect(() => {
    if (!recordingAction) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setRecordingAction(null)
        setConflictWarning(null)
        return
      }

      const binding = eventToKeybinding(e)
      if (!binding) return

      // Conflict check
      const conflictId = findConflictingAction(recordingAction, binding, effectiveKeybindings)
      if (conflictId) {
        const otherAction = shortcutActions.find((a) => a.id === conflictId)
        setConflictWarning(
          `${t('shortcuts.conflictWarn')}: ${t('shortcuts.conflictDesc')} [${otherAction?.name || conflictId}]`
        )
      } else {
        setConflictWarning(null)
      }

      const nextKeybindings = {
        ...(settings.keybindings || {}),
        [recordingAction]: binding
      }
      onUpdateSettings({ keybindings: nextKeybindings })
      setRecordingAction(null)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recordingAction, effectiveKeybindings, settings.keybindings])

  const handleResetSingle = (actionId: ShortcutActionId) => {
    const nextKeybindings = { ...(settings.keybindings || {}) }
    delete nextKeybindings[actionId]
    onUpdateSettings({ keybindings: nextKeybindings })
    if (recordingAction === actionId) setRecordingAction(null)
    setConflictWarning(null)
  }

  const handleResetAll = () => {
    if (window.confirm(t('shortcuts.resetAllConfirm'))) {
      onUpdateSettings({ keybindings: {} })
      setRecordingAction(null)
      setConflictWarning(null)
    }
  }

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
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {t('shortcuts.title')}
                    </span>
                    <span className="text-[11px] text-slate-400">{t('shortcuts.desc')}</span>
                  </div>
                  {settings.keybindings && Object.keys(settings.keybindings).length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-400" />
                      <span>{t('shortcuts.resetAll')}</span>
                    </button>
                  )}
                </div>

                {/* Conflict warning banner */}
                {conflictWarning && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{conflictWarning}</span>
                    <button
                      type="button"
                      onClick={() => setConflictWarning(null)}
                      className="text-amber-400 hover:text-amber-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {shortcutActions.map((item) => {
                    const isRecording = recordingAction === item.id
                    const currentBinding = effectiveKeybindings[item.id]
                    const defaultBinding = DEFAULT_KEYBINDINGS[item.id]
                    const hasCustom = !areKeybindingsEqual(currentBinding, defaultBinding)
                    const keyLabels = formatKeybinding(currentBinding)

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          isRecording
                            ? 'bg-sky-500/10 border-sky-500 ring-1 ring-sky-500/50 shadow-md'
                            : 'bg-slate-950/50 border-slate-800/90 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200">{item.name}</span>
                            {hasCustom && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-medium border border-sky-500/30">
                                Modified
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 truncate">{item.desc}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isRecording ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-sky-400 animate-pulse font-medium">
                                {t('shortcuts.recording')}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRecordingAction(null)}
                                className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700 cursor-pointer"
                              >
                                {t('shortcuts.cancelRecord')}
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setConflictWarning(null)
                                setRecordingAction(item.id)
                              }}
                              className="group flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 hover:border-sky-500/80 cursor-pointer transition-colors shadow-sm"
                              title={t('shortcuts.recordTip')}
                            >
                              <div className="flex items-center gap-1">
                                {keyLabels.map((k, kIdx) => (
                                  <React.Fragment key={kIdx}>
                                    {kIdx > 0 && <span className="text-slate-600 text-xs">+</span>}
                                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-[11px] font-semibold group-hover:text-sky-300">
                                      {k}
                                    </kbd>
                                  </React.Fragment>
                                ))}
                              </div>
                              <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-sky-400 ml-1 opacity-60 group-hover:opacity-100" />
                            </div>
                          )}

                          {hasCustom && !isRecording && (
                            <button
                              type="button"
                              onClick={() => handleResetSingle(item.id)}
                              className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title={t('shortcuts.resetItem')}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
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

            {/* 6. ABOUT CATEGORY */}
            {activeCategory === 'about' && (
              <div className="flex flex-col gap-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('settings.catAbout')}
                </span>

                {/* Main Brand Card */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950/90 border border-slate-800 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-sky-500/20 mb-3 select-none">
                    R
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                    Relay
                    <span className="px-2 py-0.5 text-xs rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono font-medium">
                      v{APP_VERSION}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                    {t('settings.aboutTagline')}
                  </p>

                  <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        window.electronAPI?.openExternal?.('https://www.yokiasoft.com')
                      }}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('settings.aboutWebsiteBtn')}</span>
                    </button>
                    {onOpenChangelog && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenChangelog()
                        }}
                        className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t('settings.aboutWhatsNewBtn')}</span>
                      </button>
                    )}
                    {onCheckUpdates && (
                      <button
                        type="button"
                        onClick={onCheckUpdates}
                        disabled={isCheckingUpdates}
                        className="px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isCheckingUpdates ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span>{isCheckingUpdates ? t('updater.checking') : t('updater.checkUpdates')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        window.electronAPI?.openHelpWindow?.()
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('settings.aboutOpenDocsBtn')}</span>
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="rounded-lg bg-slate-950/50 border border-slate-800 divide-y divide-slate-800/80 text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{t('settings.aboutVersion')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-200 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {APP_VERSION}
                      </span>
                      {onCheckUpdates && (
                        <button
                          type="button"
                          onClick={onCheckUpdates}
                          disabled={isCheckingUpdates}
                          className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isCheckingUpdates && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>{isCheckingUpdates ? t('updater.checking') : t('updater.checkUpdates')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{t('settings.aboutDeveloper')}</span>
                    <span className="text-slate-200 font-medium">yokiasoft</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{t('settings.aboutWebsite')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        window.electronAPI?.openExternal?.('https://www.yokiasoft.com')
                      }}
                      className="text-sky-400 hover:text-sky-300 font-mono hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>https://www.yokiasoft.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{t('settings.aboutTechStack')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-medium">Electron 33</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-medium">React 18</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-medium">TypeScript</span>
                    </div>
                  </div>
                </div>

                {/* Copyright */}
                <div className="text-center text-[11px] text-slate-500 py-1">
                  {t('settings.aboutCopyright')}
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

export const SettingsModal: React.FC<Props> = (props) => {
  if (!props.isOpen) return null
  return <SettingsModalContent {...props} />
}

