import React from 'react'
import { Plus, Zap } from 'lucide-react'
import { ConstantItem } from '../types'

interface Props {
  constants: ConstantItem[]
  url: string
  onSwitchConstant: (name: string, value: string) => void
  onOpenManageModal: () => void
}

export const ConstantsBar: React.FC<Props> = ({
  constants,
  url,
  onSwitchConstant,
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
          const options = c.options && c.options.length > 0 ? c.options : (c.currentValue ? [c.currentValue] : [])

          return (
            <div
              key={c.id}
              className={"flex items-center rounded border transition-all text-xs font-mono " +
                (isUsedInUrl
                  ? "bg-sky-950/40 border-sky-500/70 text-sky-200 shadow-sm ring-1 ring-sky-500/30"
                  : "bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-600")
              }
              title={"Switch value for {{' + c.name + '}}"}
            >
              <span className="px-2 py-0.5 bg-slate-800/80 border-r border-slate-700/80 text-slate-300 font-semibold text-[11px]">
                {'{' + '{' + c.name + '}' + '}'}:
              </span>

              <select
                value={c.currentValue}
                onChange={(e) => onSwitchConstant(c.name, e.target.value)}
                className="bg-transparent text-sky-400 font-semibold px-2 py-0.5 text-xs focus:outline-none cursor-pointer truncate max-w-[170px]"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt} className="bg-slate-900 text-slate-200 font-mono">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )
        })
      )}

      {/* Button to open manager modal */}
      <button
        type="button"
        onClick={onOpenManageModal}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-slate-700 hover:border-sky-500 text-slate-400 hover:text-sky-300 hover:bg-slate-800/40 transition-colors text-[11px] font-medium"
        title="Add custom constant or add server/port values"
      >
        <Plus className="w-3 h-3" />
        <span>Manage Constants</span>
      </button>
    </div>
  )
}