import React from 'react'
import { X, Settings, ShieldCheck, Zap, Globe, Sun, Moon } from 'lucide-react'
import { Language, Theme, AppSettings } from '../types'
import { useI18n } from '../i18n'

export type { AppSettings }

interface Props {
  isOpen: boolean
  settings: AppSettings
  onClose: () => void
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings
}) => {
  const { t } = useI18n()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Settings className="w-4 h-4 text-sky-400" />
            <span>{t('settings.title')}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
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

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white font-medium rounded transition-colors shadow-sm"
          >
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  )
}