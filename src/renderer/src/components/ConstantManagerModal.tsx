import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Sliders, Check, HelpCircle } from 'lucide-react'
import { ConstantItem } from '../types'
import { useI18n } from '../i18n'

interface Props {
  isOpen: boolean
  constants: ConstantItem[]
  onClose: () => void
  onSave: (constants: ConstantItem[]) => void
}

export const ConstantManagerModal: React.FC<Props> = ({
  isOpen,
  constants,
  onClose,
  onSave
}) => {
  const { t } = useI18n()
  const [list, setList] = useState<ConstantItem[]>(() => JSON.parse(JSON.stringify(constants)))
  const [selectedId, setSelectedId] = useState<string>(constants[0]?.id || '')
  const [newOptionInput, setNewOptionInput] = useState('')
  const [newOptionNote, setNewOptionNote] = useState('')
  const [editingNoteOpt, setEditingNoteOpt] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  // Keep list synchronized with latest constants whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const cloned = JSON.parse(JSON.stringify(constants))
      setList(cloned)
      setSelectedId((prev) => {
        if (cloned.some((c: ConstantItem) => c.id === prev)) {
          return prev
        }
        return cloned[0]?.id || ''
      })
      setNewOptionInput('')
      setNewOptionNote('')
      setEditingNoteOpt(null)
      setEditingNoteText('')
    }
  }, [isOpen, constants])

  if (!isOpen) return null

  const current = list.find((c) => c.id === selectedId) || list[0]

  const handleAddConstant = () => {
    const newItem: ConstantItem = {
      id: 'const-' + Date.now(),
      name: 'new_variable',
      currentValue: 'http://localhost:3000',
      options: ['http://localhost:3000', 'http://127.0.0.1:8080'],
      description: ''
    }
    setList((prev) => [...prev, newItem])
    setSelectedId(newItem.id)
  }

  const handleDeleteConstant = (id: string) => {
    if (list.length <= 1) return
    const next = list.filter((c) => c.id !== id)
    setList(next)
    if (selectedId === id) setSelectedId(next[0]?.id || '')
  }

  const handleUpdateName = (name: string) => {
    if (!current) return
    // Allow Chinese characters, letters, numbers, underscores, etc. Only strip whitespace and braces
    const cleanName = name.replace(/[\s{}]/g, '')
    setList((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, name: cleanName } : c))
    )
  }

  const handleAddOption = () => {
    if (!current || !newOptionInput.trim()) return
    const val = newOptionInput.trim()
    const note = newOptionNote.trim()
    setList((prev) =>
      prev.map((c) => {
        if (c.id === current.id) {
          const nextOptions = c.options.includes(val) ? c.options : [...c.options, val]
          const nextOptionNotes = { ...(c.optionNotes || {}) }
          if (note) {
            nextOptionNotes[val] = note
          }
          return {
            ...c,
            options: nextOptions,
            optionNotes: nextOptionNotes,
            currentValue: c.currentValue || val
          }
        }
        return c
      })
    )
    setNewOptionInput('')
    setNewOptionNote('')
  }

  const handleDeleteOption = (opt: string) => {
    if (!current) return
    setList((prev) =>
      prev.map((c) => {
        if (c.id === current.id) {
          const nextOptions = c.options.filter((o) => o !== opt)
          const nextOptionNotes = { ...(c.optionNotes || {}) }
          delete nextOptionNotes[opt]
          return {
            ...c,
            options: nextOptions,
            optionNotes: nextOptionNotes,
            currentValue: c.currentValue === opt ? nextOptions[0] || '' : c.currentValue
          }
        }
        return c
      })
    )
  }

  const handleSaveNote = (opt: string, note: string) => {
    if (!current) return
    const cleanNote = note.trim()
    setList((prev) =>
      prev.map((c) => {
        if (c.id === current.id) {
          const nextOptionNotes = { ...(c.optionNotes || {}) }
          if (cleanNote) {
            nextOptionNotes[opt] = cleanNote
          } else {
            delete nextOptionNotes[opt]
          }
          return {
            ...c,
            optionNotes: nextOptionNotes
          }
        }
        return c
      })
    )
    setEditingNoteOpt(null)
  }

  const handleSetCurrentValue = (val: string) => {
    if (!current) return
    setList((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, currentValue: val } : c))
    )
  }

  const handleSaveAndClose = () => {
    onSave(list)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl h-[530px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>{t('constantsModal.title')}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Left List */}
          <div className="w-52 border-r border-slate-800 p-3 flex flex-col gap-1 bg-slate-950/30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{t('sidebar.constants')}</span>
              <button
                onClick={handleAddConstant}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                title={t('common.add')}
              >
                <Plus className="w-3.5 h-3.5" /> {t('common.add')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
              {list.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={"flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs font-mono transition-colors group " +
                    (selectedId === c.id
                      ? "bg-sky-500/15 text-sky-400 font-bold shadow-sm"
                      : "text-slate-200 hover:bg-slate-800/60 hover:text-slate-100")
                  }
                >
                  <span className="truncate">{'{' + '{' + c.name + '}' + '}'}</span>
                  {list.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConstant(c.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-slate-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Edit Details */}
          {current ? (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto gap-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  {t('constantsModal.varName')}
                </label>
                <input
                  type="text"
                  value={current.name}
                  onChange={(e) => handleUpdateName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  placeholder="server, port, host..."
                />
              </div>

              {/* Options / Candidates */}
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-medium">
                    {t('constantsModal.optionsList')}
                  </label>
                </div>

                {/* Add new option */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddOption()
                      }
                    }}
                    placeholder={t('constantsModal.addOptionPlaceholder')}
                    className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    value={newOptionNote}
                    onChange={(e) => setNewOptionNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddOption()
                      }
                    }}
                    placeholder={t('constantsModal.addNotePlaceholder')}
                    className="w-48 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    disabled={!newOptionInput.trim()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 hover:text-slate-100 disabled:opacity-50 text-xs font-medium rounded transition-colors shadow-sm shrink-0"
                  >
                    {t('common.add')}
                  </button>
                </div>

                {/* Options list */}
                <div className="flex-1 border border-slate-800 rounded-lg p-2 bg-slate-950/60 flex flex-col gap-1 overflow-y-auto max-h-56">
                  {current.options.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 italic">
                      {t('constantsModal.emptyOptionsTip')}
                    </div>
                  ) : (
                    current.options.map((opt) => {
                      const isSelected = current.currentValue === opt
                      const note = current.optionNotes?.[opt]
                      const isEditingThisNote = editingNoteOpt === opt

                      return (
                        <div
                          key={opt}
                          onClick={() => handleSetCurrentValue(opt)}
                          className={"flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs font-mono transition-colors group " +
                            (isSelected
                              ? "bg-sky-500/15 text-sky-400 font-bold border border-sky-500/30 shadow-sm"
                              : "text-slate-200 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent")
                          }
                        >
                          <div className="flex items-center gap-2 truncate flex-1 mr-2">
                            <div className={"w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 " + (isSelected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-600")}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="truncate">{opt}</span>

                            {/* Note badge or inline editor */}
                            {isEditingThisNote ? (
                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      handleSaveNote(opt, editingNoteText)
                                    } else if (e.key === 'Escape') {
                                      setEditingNoteOpt(null)
                                    }
                                  }}
                                  onBlur={() => handleSaveNote(opt, editingNoteText)}
                                  placeholder={t('constantsModal.noteLabel')}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-sky-400 text-slate-100 text-[11px] font-sans focus:outline-none w-32 shadow-sm"
                                />
                              </div>
                            ) : (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingNoteOpt(opt)
                                  setEditingNoteText(note || '')
                                }}
                                className="flex items-center gap-1 shrink-0 cursor-pointer"
                                title={t('constantsModal.editNote')}
                              >
                                {note ? (
                                  <span className={"text-[10px] px-1.5 py-0.2 rounded font-sans transition-colors border " +
                                    (isSelected
                                      ? "bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/40 font-medium"
                                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80")
                                  }>
                                    {note}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 font-sans transition-opacity">
                                    +{t('constantsModal.noteLabel')}
                                  </span>
                                )}
                              </div>
                            )}

                            {isSelected && (
                              <span className="text-[10px] text-sky-400 font-sans font-medium px-1.5 py-0.2 bg-sky-500/10 rounded border border-sky-500/30 shrink-0">
                                {t('constantsModal.activeBadge')}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteOption(opt)
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-slate-500 shrink-0 p-0.5 transition-opacity"
                            title={t('common.remove')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              {t('constantsModal.subtitle')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Use in URL address like: <code className="text-sky-400">{'{' + '{server}' + '}'}:{'{' + '{port}' + '}'}/api</code></span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-4 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white font-medium rounded transition-colors shadow-sm"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}