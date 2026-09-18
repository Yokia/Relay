import React from 'react'
import { Plus, Zap, X, Globe, Sparkles } from 'lucide-react'
import { ConstantItem } from '../types'

interface Props {
  constants: ConstantItem[]
  url: string
  constantOverrides?: Record<string, string>
  onRequestSwitchConstant: (name: string, value: string | null) => void
  onOpenManageModal: () => void
}

export const ConstantsBar: React.FC<Props> = ({
  constants,
  url,
  constantOverrides = {},
  onRequestSwitchConstant,
  onOpenManageModal
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs select-none">
      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 shrink-0">
        <Zap className="w-3 h-3 text-amber-400" />
        <span>Constants:</span>
      </div>

      {/* Render each defined constant with a direct dropdown switcher */}
      {constants.length === 0 ? (
        <div className="text-[11px] text-slate-500 italic">
          No constants configured.
        </div>
      ) : (
        constants.map((c) => {
          const isUsedInUrl = url.includes('{{' + c.name + '}}')
          const overrideVal = constantOverrides ? constantOverrides[c.name] : undefined
          const isOverridden = overrideVal !== undefined

          const rawOptions = c.options && c.options.length > 0 ? c.options : (c.currentValue ? [c.currentValue] : [])
          // Ensure all relevant options are present
          const options = Array.from(new Set([
            ...rawOptions,
            ...(c.currentValue ? [c.currentValue] : []),
            ...(overrideVal ? [overrideVal] : [])
          ]))

          return (
            <div
              key={c.id}
              className={"flex items-center rounded border transition-all text-xs font-mono " +
                (isOverridden
                  ? "bg-purple-950/40 border-purple-500/70 text-purple-200 shadow-sm ring-1 ring-purple-500/30"
                  : isUsedInUrl
                    ? "bg-sky-950/40 border-sky-500/70 text-sky-200 shadow-sm ring-1 ring-sky-500/30"
                    : "bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-600")
              }
              title={isOverridden ? `{{${c.name}}} 当前为该请求专属覆盖值` : `{{${c.name}}} 当前跟随全局默认值`}
            >
              <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/80 border-r border-slate-700/80 text-slate-300 font-semibold text-[11px]">
                <span>{'{' + '{' + c.name + '}' + '}'}:</span>
                {isOverridden ? (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-sans">
                    专属
                  </span>
                ) : (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-700/50 text-slate-400 font-sans">
                    全局
                  </span>
                )}
              </div>

              <select
                value={isOverridden ? overrideVal : '__GLOBAL__'}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '__GLOBAL__') {
                    onRequestSwitchConstant(c.name, null)
                  } else {
                    onRequestSwitchConstant(c.name, val)
                  }
                }}
                className={"bg-transparent font-semibold px-2 py-0.5 text-xs focus:outline-none cursor-pointer truncate max-w-[190px] " +
                  (isOverridden ? "text-purple-300" : "text-sky-400")}
              >
                <option value="__GLOBAL__" className="bg-slate-900 text-slate-300 font-mono">
                  🌐 跟随全局默认 ({c.currentValue || '未设置'})
                </option>
                <option disabled className="bg-slate-900 text-slate-600">
                  ────────── 专属候选值 ──────────
                </option>
                {options.map((opt) => (
                  <option key={opt} value={opt} className="bg-slate-900 text-slate-200 font-mono">
                    {opt} {opt === c.currentValue ? '(全局默认)' : ''}
                  </option>
                ))}
              </select>

              {/* Reset to global button if overridden */}
              {isOverridden && (
                <button
                  type="button"
                  onClick={() => onRequestSwitchConstant(c.name, null)}
                  className="px-1.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors border-l border-slate-700/60"
                  title="恢复跟随全局设置"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })
      )}

      {/* Button to open manager modal */}
      <button
        type="button"
        onClick={onOpenManageModal}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-slate-700 hover:border-sky-500 text-slate-400 hover:text-sky-300 hover:bg-slate-800/40 transition-colors text-[11px] font-medium"
        title="Manage constants and candidate options"
      >
        <Plus className="w-3 h-3" />
        <span>Manage Constants</span>
      </button>
    </div>
  )
}