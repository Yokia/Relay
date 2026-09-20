import React, { useState, useMemo, useEffect } from 'react'
import { X, Clipboard, Trash2, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react'
import { KeyValueItem } from '../types'
import { parseRawHeaders } from '../utils/headerConstants'
import { useI18n } from '../i18n'

interface Props {
  isOpen: boolean
  onClose: () => void
  onImport: (headers: KeyValueItem[], mode: 'append' | 'replace') => void
  initialText?: string
}

export const HeaderBulkImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImport,
  initialText = ''
}) => {
  const { t } = useI18n()
  const [rawText, setRawText] = useState(initialText)
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append')
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setRawText(initialText)
      setClipboardNotice(null)
    }
  }, [isOpen, initialText])

  const parsedHeaders = useMemo(() => {
    return parseRawHeaders(rawText)
  }, [rawText])

  if (!isOpen) return null

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text.trim()) {
        setRawText(text)
        const parsed = parseRawHeaders(text)
        if (parsed.length > 0) {
          setClipboardNotice(t('editor.clipboardReadSuccess', { count: parsed.length }))
        } else {
          setClipboardNotice(t('editor.noHeadersDetected'))
        }
      } else {
        setClipboardNotice(t('editor.clipboardEmpty'))
      }
    } catch (e) {
      setClipboardNotice(t('editor.clipboardEmpty'))
    }
  }

  const handleConfirm = () => {
    if (parsedHeaders.length === 0) return
    onImport(parsedHeaders, importMode)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{t('editor.pasteHeadersTitle')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('editor.pasteHeadersDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Quick Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-sm transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>{t('editor.pasteFromClipboard')}</span>
              </button>

              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('')
                    setClipboardNotice(null)
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('common.delete')}</span>
                </button>
              )}
            </div>

            {/* Mode: Append vs Replace */}
            <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  importMode === 'append'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('editor.importModeAppend')}
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('editor.importModeReplace')}
              </button>
            </div>
          </div>

          {/* Clipboard Notice Banner */}
          {clipboardNotice && (
            <div className="px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-xs text-sky-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-sky-400" />
              <span>{clipboardNotice}</span>
            </div>
          )}

          {/* Raw Text Input */}
          <div className="flex-1 flex flex-col min-h-[220px]">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={t('editor.pastePlaceholder')}
              className="flex-1 w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none leading-relaxed transition-colors"
              autoFocus
            />
          </div>

          {/* Parsing Feedback & Badges */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                {parsedHeaders.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">
                      {t('editor.parsedCountNotice', { count: parsedHeaders.length })}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-500">{t('editor.noHeadersDetected')}</span>
                  </>
                )}
              </span>
            </div>

            {parsedHeaders.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {parsedHeaders.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/60 text-[11px] font-mono text-slate-300"
                    title={`${item.key}: ${item.value}`}
                  >
                    <span className="text-sky-400 font-semibold">{item.key}:</span>
                    <span className="truncate max-w-[140px] text-slate-400">{item.value || '""'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={parsedHeaders.length === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              parsedHeaders.length > 0
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <span>{t('editor.confirmImport', { count: parsedHeaders.length })}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
