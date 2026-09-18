import React from 'react'
import { X, Settings, ShieldCheck, Zap } from 'lucide-react'

export interface AppSettings {
  autoSave: boolean
  timeout: number
  sslVerify: boolean
  maxResponsesPerRequest?: number
}

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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Settings className="w-4 h-4 text-sky-400" />
            <span>Preferences & Settings</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Auto Save Toggle */}
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto Save (实时自动保存)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                开启后，修改地址、参数、Header、Body 会实时自动持久化保存。<br />
                关闭后，修改内容会作为草稿保留（切换接口不丢失），需手动点击 Save 或按 Ctrl+S 正式保存。
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
              <span className="font-semibold text-slate-200">Request Timeout</span>
              <span className="text-slate-400 text-[11px]">Max wait time before request fails (seconds)</span>
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
              <span className="font-semibold text-slate-200">History Runs per Request (响应保留次数)</span>
              <span className="text-slate-400 text-[11px]">每个接口保留最近 N 次请求结果，切换接口不丢失并可回看对比</span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={settings.maxResponsesPerRequest || 5}
                onChange={(e) => onUpdateSettings({ maxResponsesPerRequest: parseInt(e.target.value, 10) || 5 })}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {[1, 3, 5, 10, 20].map((num) => (
                  <option key={num} value={num}>
                    Last {num} runs
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
                <span>SSL Certificate Verification</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                关闭后可调试自签名或不受信任证书的 HTTPS 接口。
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
            Done
          </button>
        </div>
      </div>
    </div>
  )
}