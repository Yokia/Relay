import React, { useState, useEffect, useRef } from 'react'
import {
  CheckSquare,
  Square,
  Trash2,
  Plus,
  AlertCircle,
  Code2,
  MessageSquare
} from 'lucide-react'
import {
  parseJsoncToKeyValues,
  serializeKeyValuesToJsonc,
  JsonKvEntry,
  JsonKvParsedData,
  JsonKvValueType
} from '../utils/jsonUtils'
import { useI18n } from '../i18n'

interface Props {
  value: string
  onChange: (newJson: string) => void
  onSwitchToCode: () => void
}

export const JsonKeyValueEditor: React.FC<Props> = ({ value, onChange, onSwitchToCode }) => {
  const { t } = useI18n()
  const lastSerializedRef = useRef<string>(value)

  const [parsedData, setParsedData] = useState<JsonKvParsedData>(() =>
    parseJsoncToKeyValues(value)
  )

  useEffect(() => {
    if (value !== lastSerializedRef.current) {
      lastSerializedRef.current = value
      setParsedData(parseJsoncToKeyValues(value))
    }
  }, [value])

  const handleUpdate = (newData: JsonKvParsedData) => {
    setParsedData(newData)
    const serialized = serializeKeyValuesToJsonc(newData)
    lastSerializedRef.current = serialized
    onChange(serialized)
  }

  const handleToggle = (index: number) => {
    const nextEntries = [...parsedData.entries]
    nextEntries[index] = {
      ...nextEntries[index],
      enabled: !nextEntries[index].enabled
    }
    handleUpdate({
      ...parsedData,
      entries: nextEntries
    })
  }

  const handleKeyChange = (index: number, newKey: string) => {
    const nextEntries = [...parsedData.entries]
    nextEntries[index] = {
      ...nextEntries[index],
      key: newKey
    }
    handleUpdate({
      ...parsedData,
      entries: nextEntries
    })
  }

  const handleTypeChange = (index: number, newType: JsonKvValueType) => {
    const nextEntries = [...parsedData.entries]
    const item = nextEntries[index]
    let nextValue = item.value

    if (newType === 'boolean') {
      if (nextValue !== 'true' && nextValue !== 'false') {
        nextValue = 'true'
      }
    } else if (newType === 'null') {
      nextValue = 'null'
    } else if (newType === 'number') {
      if (isNaN(Number(nextValue)) || nextValue.trim() === '') {
        nextValue = '0'
      }
    } else if (newType === 'object') {
      if (!nextValue.startsWith('{') || !nextValue.endsWith('}')) {
        nextValue = '{}'
      }
    } else if (newType === 'array') {
      if (!nextValue.startsWith('[') || !nextValue.endsWith(']')) {
        nextValue = '[]'
      }
    }

    nextEntries[index] = {
      ...item,
      valueType: newType,
      value: nextValue
    }
    handleUpdate({
      ...parsedData,
      entries: nextEntries
    })
  }

  const handleValueChange = (index: number, newVal: string) => {
    const nextEntries = [...parsedData.entries]
    const item = nextEntries[index]

    // Smart type detection if user types something obvious
    let detectedType = item.valueType
    const trimmed = newVal.trim()
    if (item.valueType === 'string') {
      if (trimmed === 'true' || trimmed === 'false') {
        detectedType = 'boolean'
      } else if (trimmed === 'null') {
        detectedType = 'null'
      }
    }

    nextEntries[index] = {
      ...item,
      value: newVal,
      valueType: detectedType
    }
    handleUpdate({
      ...parsedData,
      entries: nextEntries
    })
  }

  const handleDescriptionChange = (index: number, newDesc: string) => {
    const nextEntries = [...parsedData.entries]
    nextEntries[index] = {
      ...nextEntries[index],
      description: newDesc
    }
    handleUpdate({
      ...parsedData,
      entries: nextEntries
    })
  }

  const handleDelete = (index: number) => {
    const nextEntries = parsedData.entries.filter((_, i) => i !== index)
    handleUpdate({
      ...parsedData,
      entries: nextEntries
    })
  }

  const handleAdd = () => {
    const newEntry: JsonKvEntry = {
      id: `kv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key: '',
      value: '',
      enabled: true,
      valueType: 'string',
      description: ''
    }
    handleUpdate({
      ...parsedData,
      isValid: true,
      entries: [...parsedData.entries, newEntry]
    })
  }

  if (!parsedData.isValid) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3 border border-dashed border-slate-800 rounded-lg m-2 bg-slate-900/20">
        <AlertCircle className="w-8 h-8 text-amber-400/80" />
        <div className="text-sm font-medium text-slate-300">
          {t('editor.jsonKvUnsupported')}
        </div>
        <p className="text-xs text-slate-500 max-w-md">
          {t('editor.jsonKvUnsupportedDesc')}
        </p>
        <button
          type="button"
          onClick={onSwitchToCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium border border-sky-500/30 transition-colors cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{t('editor.switchToCode')}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2 h-full overflow-y-auto">
      {/* Header Comments Notice if present */}
      {parsedData.headerComments && parsedData.headerComments.length > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/20 rounded font-mono">
          <MessageSquare className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {parsedData.headerComments.join(' | ')}
          </span>
        </div>
      )}

      {/* Table Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 flex items-center gap-2 text-xs text-slate-400 font-medium px-2 py-1.5 border-b border-slate-800">
        <span className="w-8 text-center" title={t('editor.colActive')}>
          {t('editor.colActive')}
        </span>
        <span className="flex-1 min-w-[120px]">{t('editor.colKey')}</span>
        <span className="w-24 shrink-0">{t('editor.colType')}</span>
        <span className="flex-[1.2] min-w-[140px]">{t('editor.colValue')}</span>
        <span className="flex-1 min-w-[120px]">{t('editor.colComment')}</span>
        <span className="w-8 text-center">{t('editor.colDel')}</span>
      </div>

      {/* Rows */}
      {parsedData.entries.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          {t('editor.paramKeyPlaceholder')} / {t('editor.colKey')}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 pr-1">
          {parsedData.entries.map((item, idx) => (
            <React.Fragment key={item.id || idx}>
              {/* Optional Section / Leading Comment */}
              {item.leadingComments && item.leadingComments.length > 0 && (
                <div className="text-[11px] text-emerald-400/80 font-mono italic pl-8 pt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 inline-block mr-0.5" />
                  {item.leadingComments.join(' ')}
                </div>
              )}

              <div
                className={`flex items-center gap-2 group transition-opacity ${
                  item.enabled ? 'opacity-100' : 'opacity-65'
                }`}
              >
                {/* Active Toggle Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(idx)}
                  className="w-8 flex justify-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={item.enabled ? t('common.active') : t('sidebar.switchActiveValue')}
                >
                  {item.enabled ? (
                    <CheckSquare className="w-4 h-4 text-sky-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {/* Key Input */}
                <input
                  type="text"
                  placeholder={t('editor.paramKeyPlaceholder')}
                  value={item.key}
                  onChange={(e) => handleKeyChange(idx, e.target.value)}
                  className={`flex-1 min-w-[120px] bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono ${
                    !item.enabled ? 'line-through text-slate-400' : ''
                  }`}
                />

                {/* Type Selector */}
                <select
                  value={item.valueType}
                  onChange={(e) => handleTypeChange(idx, e.target.value as JsonKvValueType)}
                  className="w-24 shrink-0 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded px-1.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-sky-500 font-mono cursor-pointer"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="null">Null</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>

                {/* Value Input */}
                {item.valueType === 'boolean' ? (
                  <select
                    value={item.value === 'false' ? 'false' : 'true'}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    className="flex-[1.2] min-w-[140px] bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs text-amber-400 focus:outline-none focus:border-sky-500 font-mono cursor-pointer"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : item.valueType === 'null' ? (
                  <input
                    type="text"
                    disabled
                    value="null"
                    className="flex-[1.2] min-w-[140px] bg-slate-900/50 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-500 font-mono cursor-not-allowed"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={t('editor.paramValPlaceholder')}
                    value={item.value}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    className={`flex-[1.2] min-w-[140px] bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-500 font-mono ${
                      item.valueType === 'number'
                        ? 'text-emerald-400'
                        : item.valueType === 'object' || item.valueType === 'array'
                        ? 'text-purple-400'
                        : 'text-slate-200'
                    }`}
                  />
                )}

                {/* Comment / Description Input */}
                <div className="relative flex-1 min-w-[120px] flex items-center">
                  <input
                    type="text"
                    placeholder={t('editor.commentPlaceholder')}
                    value={item.description || ''}
                    onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded px-2.5 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                  />
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  className="w-8 flex justify-center text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Add Button */}
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium px-2 py-1 rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> {t('editor.addParam')}
        </button>

        {parsedData.footerComments && parsedData.footerComments.length > 0 && (
          <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
            {parsedData.footerComments.join(' | ')}
          </span>
        )}
      </div>
    </div>
  )
}
