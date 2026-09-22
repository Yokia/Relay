import React, { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Save, Folder, X } from 'lucide-react'
import { WorkspaceTab, RequestItem, CollectionItem, HttpMethod } from '../types'
import { useI18n } from '../i18n'
import { findRequestInTree } from '../utils/collectionTree'

interface Props {
  isOpen: boolean
  tab: WorkspaceTab | null
  request: RequestItem | null
  collections: CollectionItem[]
  onSaveAndClose: (tab: WorkspaceTab, request: RequestItem, targetColId?: string) => void
  onDiscardAndClose: (tab: WorkspaceTab) => void
  onCancel: () => void
}

const methodColor: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  PUT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  HEAD: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
}

function flattenCollections(
  cols: CollectionItem[],
  prefix = ''
): Array<{ id: string; name: string }> {
  let result: Array<{ id: string; name: string }> = []
  for (const c of cols) {
    const fullName = prefix ? `${prefix} / ${c.name}` : c.name
    result.push({ id: c.id, name: fullName })
    if (c.children && c.children.length > 0) {
      result = result.concat(flattenCollections(c.children, fullName))
    }
  }
  return result
}

export const CloseTabConfirmModal: React.FC<Props> = ({
  isOpen,
  tab,
  request,
  collections,
  onSaveAndClose,
  onDiscardAndClose,
  onCancel
}) => {
  const { t } = useI18n()
  const flatCols = useMemo(() => flattenCollections(collections), [collections])

  const [reqName, setReqName] = useState('')
  const [selectedColId, setSelectedColId] = useState('')

  const isInCollection = useMemo(() => {
    if (!request) return false
    return Boolean(findRequestInTree(collections, request.id))
  }, [collections, request])

  useEffect(() => {
    if (isOpen && tab) {
      setReqName(request?.name || tab.name || t('tabs.untitledTab'))
      setSelectedColId(flatCols[0]?.id || '')
    }
  }, [isOpen, tab, request, flatCols, t])

  if (!isOpen || !tab || !request) return null

  const handleSave = () => {
    const updatedReq: RequestItem = {
      ...request,
      name: reqName.trim() || request.name || 'New Request'
    }
    onSaveAndClose(tab, updatedReq, selectedColId || undefined)
  }

  const handleDiscard = () => {
    onDiscardAndClose(tab)
  }

  const effectiveMethod = (request.method || tab.method || 'GET') as HttpMethod

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-100"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          handleSave()
        }
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-5 max-w-md w-full flex flex-col gap-4 text-slate-200 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-slate-100">
                {t('tabs.saveConfirmTitle')}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('tabs.saveConfirmDesc', { name: reqName || tab.name })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab & Request Preview Pill */}
        <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2 text-xs">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${
              methodColor[effectiveMethod] || 'text-slate-400 border-slate-700'
            }`}
          >
            {effectiveMethod}
          </span>
          <span className="font-medium text-slate-200 truncate flex-1">
            {reqName || tab.name}
          </span>
          {request.url && (
            <span className="text-[11px] font-mono text-slate-500 truncate max-w-[160px]">
              {request.url}
            </span>
          )}
        </div>

        {/* Extra Fields for Brand New Requests (not yet in any collection) */}
        {!isInCollection && (
          <div className="flex flex-col gap-3 pt-1">
            {/* Request Name Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-400">
                {t('tabs.requestNameLabel')}
              </label>
              <input
                type="text"
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                placeholder="New Request"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Target Collection Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Folder className="w-3 h-3 text-sky-400" />
                <span>{t('tabs.saveToCollection')}</span>
              </label>
              {flatCols.length > 0 ? (
                <select
                  value={selectedColId}
                  onChange={(e) => setSelectedColId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
                >
                  {flatCols.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[11px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1.5 rounded-lg">
                  {t('tabs.autoCreateCollectionNotice')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-1">
          {/* Discard / Don't Save */}
          <button
            type="button"
            onClick={handleDiscard}
            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded-lg transition-colors font-medium cursor-pointer"
          >
            {t('tabs.dontSave')}
          </button>

          <div className="flex items-center gap-2">
            {/* Cancel */}
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 rounded-lg transition-colors font-medium cursor-pointer"
            >
              {t('common.cancel')}
            </button>

            {/* Save & Close */}
            <button
              type="button"
              autoFocus
              onClick={handleSave}
              className="px-4 py-1.5 text-xs text-white bg-sky-500 hover:bg-sky-400 rounded-lg transition-colors font-semibold flex items-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('tabs.saveAndClose')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
