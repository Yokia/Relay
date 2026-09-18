import React from 'react'
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react'
import { KeyValueItem } from '../types'
import { useI18n } from '../i18n'

interface Props {
  items: KeyValueItem[]
  onChange: (items: KeyValueItem[]) => void
  placeholderKey?: string
  placeholderValue?: string
}

export const KeyValueEditor: React.FC<Props> = ({
  items,
  onChange,
  placeholderKey,
  placeholderValue
}) => {
  const { t } = useI18n()

  const defaultKeyPlaceholder = placeholderKey || t('editor.colKey')
  const defaultValPlaceholder = placeholderValue || t('editor.colValue')

  const handleToggle = (index: number) => {
    const next = [...items]
    next[index].enabled = !next[index].enabled
    onChange(next)
  }

  const handleKeyChange = (index: number, val: string) => {
    const next = [...items]
    next[index].key = val
    onChange(next)
  }

  const handleValChange = (index: number, val: string) => {
    const next = [...items]
    next[index].value = val
    onChange(next)
  }

  const handleDelete = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    onChange([...items, { key: '', value: '', enabled: true }])
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-2 pb-1 border-b border-slate-800">
        <span className="w-8">{t('editor.colActive')}</span>
        <span className="flex-1">{t('editor.colKey')}</span>
        <span className="flex-1">{t('editor.colValue')}</span>
        <span className="w-8 text-right">{t('editor.colDel')}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">
          {t('editor.paramKeyPlaceholder')} / {t('editor.colKey')}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => handleToggle(idx)}
                className="w-8 flex justify-center text-slate-400 hover:text-slate-200"
              >
                {item.enabled ? (
                  <CheckSquare className="w-4 h-4 text-sky-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
              </button>

              <input
                type="text"
                placeholder={defaultKeyPlaceholder}
                value={item.key}
                onChange={(e) => handleKeyChange(idx, e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />

              <input
                type="text"
                placeholder={defaultValPlaceholder}
                value={item.value}
                onChange={(e) => handleValChange(idx, e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />

              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="w-8 flex justify-center text-slate-600 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> {t('common.add')}
        </button>
      </div>
    </div>
  )
}
