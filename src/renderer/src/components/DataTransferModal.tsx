import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Download,
  Upload,
  FileJson,
  Check,
  Copy,
  AlertTriangle,
  Layers,
  Zap,
  Globe,
  FileText,
  Sparkles,
  ArrowDownToLine,
  FolderDown,
  FolderTree,
  BookOpen,
  FileCode,
  Loader2
} from 'lucide-react'
import { CollectionItem, ConstantItem, Environment, AppSettings } from '../types'
import { generateMarkdownDoc, generateHtmlDoc } from '../utils/docExportUtils'
import {
  countCollectionsInTree,
  countRequestsInTree,
  parseImportData,
  ParsedImportData,
  RelayBackupData,
  RelayCollectionsData,
  RelayEnvConstantsData
} from '../utils/dataTransferUtils'
import { findCollectionInTree } from '../utils/collectionTree'
import { useI18n } from '../i18n'

interface Props {
  isOpen: boolean
  initialTab?: 'export' | 'import'
  initialExportFormat?: 'json' | 'html' | 'markdown'
  selectedCollectionId?: string
  collections: CollectionItem[]
  constants: ConstantItem[]
  environments: Environment[]
  activeEnvId?: string
  settings: AppSettings
  onClose: () => void
  onImport: (data: ParsedImportData, mode: 'merge' | 'overwrite') => void
  onExportToast?: (msg: string) => void
}

type ExportScope = 'all' | 'collections' | 'singleCollection' | 'envConstants'
type ExportFormat = 'json' | 'html' | 'markdown'
type ImportStrategy = 'merge' | 'overwrite'

export const DataTransferModal: React.FC<Props> = ({
  isOpen,
  initialTab = 'export',
  initialExportFormat,
  selectedCollectionId,
  collections = [],
  constants = [],
  environments = [],
  activeEnvId,
  settings,
  onClose,
  onImport,
  onExportToast
}) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab)

  // Export State
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [exportScope, setExportScope] = useState<ExportScope>(
    selectedCollectionId ? 'singleCollection' : 'all'
  )
  const [targetCollectionId, setTargetCollectionId] = useState<string>(
    selectedCollectionId || collections[0]?.id || ''
  )
  const [docTitle, setDocTitle] = useState('')
  const [docDesc, setDocDesc] = useState('')
  const [docIncludeCurl, setDocIncludeCurl] = useState(true)
  const [docIncludeScripts, setDocIncludeScripts] = useState(false)
  const [copiedExport, setCopiedExport] = useState(false)

  // Import State
  const [importRawText, setImportRawText] = useState('')
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('merge')
  const [isDragOver, setIsDragOver] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Update tab if initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      if (initialExportFormat) {
        setExportFormat(initialExportFormat)
      }
      if (selectedCollectionId) {
        setExportScope('singleCollection')
        setTargetCollectionId(selectedCollectionId)
      }
    }
  }, [isOpen, initialTab, initialExportFormat, selectedCollectionId])

  // Parse imported text when changed
  useEffect(() => {
    if (!importRawText.trim()) {
      setParsedData(null)
      setParseError(null)
      return
    }

    const result = parseImportData(importRawText)
    if (result.success) {
      setParsedData(result.data)
      setParseError(null)
    } else {
      setParsedData(null)
      setParseError(result.error)
    }
  }, [importRawText])

  if (!isOpen) return null

  // Flatten collections for single collection picker dropdown
  const flattenCollections = (cols: CollectionItem[], prefix = ''): { id: string; name: string }[] => {
    let list: { id: string; name: string }[] = []
    for (const c of cols) {
      const label = prefix ? `${prefix} / ${c.name}` : c.name
      list.push({ id: c.id, name: label })
      if (c.children && c.children.length > 0) {
        list = list.concat(flattenCollections(c.children, label))
      }
    }
    return list
  }
  const allFlatCols = flattenCollections(collections)

  // Safe state for export in progress
  const [isExporting, setIsExporting] = useState(false)

  // Calculate Export Data safely with useMemo and defensive fallback
  const exportPayload = useMemo(() => {
    try {
      const timestamp = new Date().toISOString()
      const dateStr = timestamp.slice(0, 10)

      // Target collections based on scope
      let exportCols: CollectionItem[] = []
      let targetColName = 'relay-api-docs'

      if (exportScope === 'singleCollection') {
        const singleCol =
          (targetCollectionId ? findCollectionInTree(collections, targetCollectionId) : null) ||
          collections[0] ||
          null

        if (singleCol) {
          exportCols = [singleCol]
          targetColName = (singleCol.name || 'collection').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')
        }
      } else {
        exportCols = collections || []
      }

      // Default title
      const effectiveTitle =
        docTitle.trim() ||
        (exportScope === 'singleCollection' && exportCols[0]
          ? `${exportCols[0].name || 'Collection'} API Documentation`
          : 'Relay API Documentation')

      // Helper: resolve {{variable}} placeholders using constants + active environment
      const resolveText = (text: string, overrides?: Record<string, string>): string => {
        if (!text) return text
        let result = text
        // 1. Replace constants (request-level overrides take precedence)
        for (const c of constants) {
          if (c.name && (c.currentValue || (overrides && overrides[c.name] !== undefined))) {
            const effectiveVal = overrides && overrides[c.name] !== undefined ? overrides[c.name] : c.currentValue
            if (effectiveVal) {
              result = result.replaceAll('{{' + c.name + '}}', effectiveVal)
            }
          }
        }
        // 2. Replace active environment variables
        if (activeEnvId) {
          const env = environments.find((e) => e.id === activeEnvId)
          if (env) {
            for (const v of env.variables) {
              if (v.enabled && v.key.trim()) {
                result = result.replaceAll('{{' + v.key.trim() + '}}', v.value)
              }
            }
          }
        }
        return result
      }

      // Deep clone collections and resolve all request URLs/headers/params for doc export
      const resolveCollections = (cols: CollectionItem[]): CollectionItem[] =>
        cols.map((col) => ({
          ...col,
          requests: (col.requests || []).map((req) => ({
            ...req,
            url: resolveText(req.url || '', req.constantOverrides),
            headers: (req.headers || []).map((h) => ({
              ...h,
              key: resolveText(h.key, req.constantOverrides),
              value: resolveText(h.value, req.constantOverrides)
            })),
            params: (req.params || []).map((p) => ({
              ...p,
              key: resolveText(p.key, req.constantOverrides),
              value: resolveText(p.value, req.constantOverrides)
            }))
          })),
          children: col.children ? resolveCollections(col.children) : []
        }))

      const resolvedExportCols = resolveCollections(exportCols)

      // 1. Standalone HTML Export
      if (exportFormat === 'html') {
        const htmlContent = generateHtmlDoc({
          title: effectiveTitle,
          description: docDesc.trim(),
          collections: resolvedExportCols,
          includeCurl: docIncludeCurl,
          includeScripts: docIncludeScripts
        })
        return {
          format: 'html' as const,
          rawContent: htmlContent,
          filename: `${targetColName}-${dateStr}.html`,
          collectionsCount: countCollectionsInTree(exportCols),
          requestsCount: countRequestsInTree(exportCols),
          constantsCount: 0,
          environmentsCount: 0
        }
      }

      // 2. Markdown Export
      if (exportFormat === 'markdown') {
        const mdContent = generateMarkdownDoc({
          title: effectiveTitle,
          description: docDesc.trim(),
          collections: resolvedExportCols,
          includeCurl: docIncludeCurl,
          includeScripts: docIncludeScripts
        })
        return {
          format: 'markdown' as const,
          rawContent: mdContent,
          filename: `${targetColName}-${dateStr}.md`,
          collectionsCount: countCollectionsInTree(exportCols),
          requestsCount: countRequestsInTree(exportCols),
          constantsCount: 0,
          environmentsCount: 0
        }
      }

      // 3. JSON Exports
      if (exportScope === 'all') {
        const payload: RelayBackupData = {
          type: 'relay-backup',
          version: 1,
          exportedAt: timestamp,
          collections: collections || [],
          constants: constants || [],
          environments: environments || [],
          settings
        }
        return {
          format: 'json' as const,
          rawContent: JSON.stringify(payload, null, 2),
          filename: `relay-backup-${dateStr}.json`,
          collectionsCount: countCollectionsInTree(collections || []),
          requestsCount: countRequestsInTree(collections || []),
          constantsCount: (constants || []).length,
          environmentsCount: (environments || []).length
        }
      }

      if (exportScope === 'collections') {
        const payload: RelayCollectionsData = {
          type: 'relay-collections',
          version: 1,
          exportedAt: timestamp,
          collections: collections || []
        }
        return {
          format: 'json' as const,
          rawContent: JSON.stringify(payload, null, 2),
          filename: `relay-collections-${dateStr}.json`,
          collectionsCount: countCollectionsInTree(collections || []),
          requestsCount: countRequestsInTree(collections || []),
          constantsCount: 0,
          environmentsCount: 0
        }
      }

      if (exportScope === 'singleCollection') {
        const singleCol =
          (targetCollectionId ? findCollectionInTree(collections, targetCollectionId) : null) ||
          collections[0] ||
          null
        const cols = singleCol ? [singleCol] : []
        const payload: RelayCollectionsData = {
          type: 'relay-collections',
          version: 1,
          exportedAt: timestamp,
          collections: cols
        }
        return {
          format: 'json' as const,
          rawContent: JSON.stringify(payload, null, 2),
          filename: `relay-col-${targetColName}-${dateStr}.json`,
          collectionsCount: singleCol ? countCollectionsInTree([singleCol]) : 0,
          requestsCount: singleCol ? countRequestsInTree([singleCol]) : 0,
          constantsCount: 0,
          environmentsCount: 0
        }
      }

      // envConstants
      const payload: RelayEnvConstantsData = {
        type: 'relay-env-constants',
        version: 1,
        exportedAt: timestamp,
        constants: constants || [],
        environments: environments || []
      }
      return {
        format: 'json' as const,
        rawContent: JSON.stringify(payload, null, 2),
        filename: `relay-env-constants-${dateStr}.json`,
        collectionsCount: 0,
        requestsCount: 0,
        constantsCount: (constants || []).length,
        environmentsCount: (environments || []).length
      }
    } catch (err) {
      console.error('Failed to compute export payload:', err)
      return {
        format: exportFormat,
        rawContent: '',
        filename: `export-error.txt`,
        collectionsCount: 0,
        requestsCount: 0,
        constantsCount: 0,
        environmentsCount: 0
      }
    }
  }, [
    exportFormat,
    exportScope,
    targetCollectionId,
    collections,
    constants,
    environments,
    activeEnvId,
    settings,
    docTitle,
    docDesc,
    docIncludeCurl,
    docIncludeScripts
  ])

  // Action: Save to File
  const handleSaveToFile = async () => {
    setIsExporting(true)
    try {
      const mimeType =
        exportPayload.format === 'html'
          ? 'text/html;charset=utf-8'
          : exportPayload.format === 'markdown'
          ? 'text/markdown;charset=utf-8'
          : 'application/json;charset=utf-8'

      if (window.electronAPI?.saveFileDialog) {
        try {
          const res = await window.electronAPI.saveFileDialog({
            defaultPath: exportPayload.filename,
            content: exportPayload.rawContent
          })
          if (res && res.success) {
            if (onExportToast) {
              onExportToast(exportPayload.format === 'json' ? t('toast.dataExported') : t('toast.docExported'))
            }
            onClose()
            return
          }
        } catch (err) {
          console.error('Failed to save file dialog:', err)
        }
      }

      // Fallback: Web Blob Download
      const blob = new Blob([exportPayload.rawContent], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = exportPayload.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      if (onExportToast) {
        onExportToast(exportPayload.format === 'json' ? t('toast.dataExported') : t('toast.docExported'))
      }
      onClose()
    } finally {
      setIsExporting(false)
    }
  }

  // Action: Copy to Clipboard
  const handleCopyContent = () => {
    navigator.clipboard.writeText(exportPayload.rawContent)
    setCopiedExport(true)
    if (onExportToast) {
      onExportToast(exportPayload.format === 'markdown' ? t('toast.markdownCopied') : t('toast.dataCopied'))
    }
    setTimeout(() => setCopiedExport(false), 2000)
  }

  // Action: Handle File Load (Native or Input)
  const handlePickFileNative = async () => {
    if (window.electronAPI?.openFileDialog) {
      try {
        const res = await window.electronAPI.openFileDialog({
          filters: [
            { name: 'JSON & Collections', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })
        if (res && res.success && res.content) {
          setImportRawText(res.content)
          return
        }
      } catch (err) {
        console.error('Failed native open dialog:', err)
      }
    }
    // Web fallback
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result
        if (typeof text === 'string') {
          setImportRawText(text)
        }
      }
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  // Action: Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result
        if (typeof text === 'string') {
          setImportRawText(text)
        }
      }
      reader.readAsText(file)
      return
    }

    const text = e.dataTransfer.getData('text/plain')
    if (text) {
      setImportRawText(text)
    }
  }

  // Action: Confirm Execute Import
  const handleExecuteImport = () => {
    if (!parsedData) return

    if (importStrategy === 'overwrite') {
      setShowOverwriteConfirm(true)
    } else {
      onImport(parsedData, 'merge')
      onClose()
    }
  }

  const handleConfirmOverwrite = () => {
    if (!parsedData) return
    setShowOverwriteConfirm(false)
    onImport(parsedData, 'overwrite')
    onClose()
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
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-200 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-200">
            <div className="p-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FolderDown className="w-4 h-4" />
            </div>
            <span>{t('dataTransfer.title')}</span>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === 'export'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('dataTransfer.tabExport')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === 'import'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('dataTransfer.tabImport')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto min-h-0 flex flex-col gap-4 text-xs">
          {/* ===================== EXPORT TAB ===================== */}
          {activeTab === 'export' && (
            <div className="flex flex-col gap-4">
              {/* Export Format Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('dataTransfer.exportFormatTitle')}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Format 1: JSON */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      exportFormat === 'json'
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/50'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="mt-0.5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <FileJson className="w-3.5 h-3.5 text-sky-400" />
                        {t('dataTransfer.formatJson')}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-relaxed">
                        {t('dataTransfer.formatJsonDesc')}
                      </span>
                    </div>
                  </label>

                  {/* Format 2: HTML Doc */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      exportFormat === 'html'
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/50'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'html'}
                      onChange={() => {
                        setExportFormat('html')
                        if (exportScope === 'envConstants') setExportScope('all')
                      }}
                      className="mt-0.5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        {t('dataTransfer.formatHtml')}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-relaxed">
                        {t('dataTransfer.formatHtmlDesc')}
                      </span>
                    </div>
                  </label>

                  {/* Format 3: Markdown Doc */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      exportFormat === 'markdown'
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/50'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'markdown'}
                      onChange={() => {
                        setExportFormat('markdown')
                        if (exportScope === 'envConstants') setExportScope('all')
                      }}
                      className="mt-0.5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                        {t('dataTransfer.formatMarkdown')}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-relaxed">
                        {t('dataTransfer.formatMarkdownDesc')}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Documentation Configuration (Shown for HTML & Markdown) */}
              {exportFormat !== 'json' && (
                <div className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col gap-3">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    {t('dataTransfer.docOptionsTitle')}
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-medium">
                        {t('dataTransfer.docTitleLabel')}
                      </label>
                      <input
                        type="text"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder={t('dataTransfer.docTitlePlaceholder')}
                        className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-medium">
                        {t('dataTransfer.docDescLabel')}
                      </label>
                      <input
                        type="text"
                        value={docDesc}
                        onChange={(e) => setDocDesc(e.target.value)}
                        placeholder={t('dataTransfer.docDescPlaceholder')}
                        className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={docIncludeCurl}
                        onChange={(e) => setDocIncludeCurl(e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-xs">{t('dataTransfer.docIncludeCurl')}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={docIncludeScripts}
                        onChange={(e) => setDocIncludeScripts(e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-xs">{t('dataTransfer.docIncludeScripts')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Scope Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('dataTransfer.exportScopeTitle')}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Option 1: Full Backup */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      exportScope === 'all'
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/50'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="mt-0.5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        {t('dataTransfer.exportAll')}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-relaxed">
                        {t('dataTransfer.exportAllDesc')}
                      </span>
                    </div>
                  </label>

                  {/* Option 2: Collections Only */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      exportScope === 'collections'
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/50'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'collections'}
                      onChange={() => setExportScope('collections')}
                      className="mt-0.5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        {t('dataTransfer.exportCollectionsOnly')}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-relaxed">
                        {t('dataTransfer.exportCollectionsOnlyDesc')}
                      </span>
                    </div>
                  </label>

                  {/* Option 3: Single Collection */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      exportScope === 'singleCollection'
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/50'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'singleCollection'}
                      onChange={() => setExportScope('singleCollection')}
                      className="mt-0.5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex flex-col gap-1 w-full">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                        {t('dataTransfer.exportSingleCol')}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-relaxed">
                        {t('dataTransfer.exportSingleColDesc')}
                      </span>
                      {exportScope === 'singleCollection' && allFlatCols.length > 0 && (
                        <select
                          value={targetCollectionId}
                          onChange={(e) => setTargetCollectionId(e.target.value)}
                          className="mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {allFlatCols.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>

                  {/* Option 4: Constants & Env (Only relevant for JSON data transfer) */}
                  {exportFormat === 'json' && (
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        exportScope === 'envConstants'
                          ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/50'
                          : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'envConstants'}
                        onChange={() => setExportScope('envConstants')}
                        className="mt-0.5 text-sky-500 focus:ring-sky-500"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          {t('dataTransfer.exportEnvConstantsOnly')}
                        </span>
                        <span className="text-[11px] text-slate-400 leading-relaxed">
                          {t('dataTransfer.exportEnvConstantsOnlyDesc')}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Data Summary Card */}
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  {t('dataTransfer.summaryTitle')}:
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col items-center">
                    <span className="text-lg font-mono font-bold text-sky-400">
                      {exportPayload.collectionsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">{t('dataTransfer.summaryCollections')}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col items-center">
                    <span className="text-lg font-mono font-bold text-emerald-400">
                      {exportPayload.requestsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">{t('dataTransfer.summaryRequests')}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col items-center">
                    <span className="text-lg font-mono font-bold text-amber-400">
                      {exportPayload.constantsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">{t('dataTransfer.summaryConstants')}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col items-center">
                    <span className="text-lg font-mono font-bold text-indigo-400">
                      {exportPayload.environmentsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">{t('dataTransfer.summaryEnvironments')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== IMPORT TAB ===================== */}
          {activeTab === 'import' && (
            <div className="flex flex-col gap-4">
              {/* Drag & Drop / File Select Box */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('dataTransfer.importSourceTitle')}
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={handlePickFileNative}
                  className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-sky-400 bg-sky-500/15 scale-[0.99]'
                      : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
                  }`}
                >
                  <div className="p-2.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-200">
                      {t('dataTransfer.dragDropOrBrowse')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('dataTransfer.supportFilesTip')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs rounded-md transition-colors font-medium mt-1 border border-slate-700"
                  >
                    {t('dataTransfer.clickToBrowse')}
                  </button>
                </div>
              </div>

              {/* Paste JSON Area */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {t('dataTransfer.orPasteJson')}
                  </span>
                  {importRawText && (
                    <button
                      type="button"
                      onClick={() => setImportRawText('')}
                      className="text-[11px] text-slate-500 hover:text-slate-300"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
                <textarea
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  placeholder={t('dataTransfer.pasteJsonPlaceholder')}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 resize-none placeholder-slate-600"
                />
              </div>

              {/* Parsing status & preview */}
              {parseError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError.includes('JSON') ? t('dataTransfer.invalidFormat') : parseError}</span>
                </div>
              )}

              {parsedData && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-200">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>
                        {t('dataTransfer.parseSuccess')} (
                        {parsedData.kind === 'postman'
                          ? 'Postman Collection'
                          : parsedData.kind === 'custom'
                          ? 'OpenAPI / Swagger'
                          : parsedData.kind === 'backup'
                          ? t('dataTransfer.fullBackup')
                          : t('dataTransfer.collectionsConfig')}
                        )
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-slate-200">
                    <div className="p-1.5 rounded bg-slate-900/60 border border-emerald-500/20">
                      <div className="font-mono font-bold text-sky-400">{parsedData.stats.collectionsCount}</div>
                      <div className="text-[10px] text-slate-400">{t('dataTransfer.summaryCollections')}</div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/60 border border-emerald-500/20">
                      <div className="font-mono font-bold text-emerald-400">{parsedData.stats.requestsCount}</div>
                      <div className="text-[10px] text-slate-400">{t('dataTransfer.summaryRequests')}</div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/60 border border-emerald-500/20">
                      <div className="font-mono font-bold text-amber-400">{parsedData.stats.constantsCount}</div>
                      <div className="text-[10px] text-slate-400">{t('dataTransfer.summaryConstants')}</div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900/60 border border-emerald-500/20">
                      <div className="font-mono font-bold text-indigo-400">{parsedData.stats.environmentsCount}</div>
                      <div className="text-[10px] text-slate-400">{t('dataTransfer.summaryEnvironments')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Strategy */}
              {parsedData && (
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('dataTransfer.importStrategyTitle')}
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {/* Strategy 1: Merge */}
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        importStrategy === 'merge'
                          ? 'border-sky-500 bg-sky-500/10 text-slate-100 ring-1 ring-sky-500/40'
                          : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importStrategy"
                        checked={importStrategy === 'merge'}
                        onChange={() => setImportStrategy('merge')}
                        className="mt-0.5 text-sky-500 focus:ring-sky-500"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-slate-200">
                          {t('dataTransfer.strategyMerge')}
                        </span>
                        <span className="text-[11px] text-slate-400 leading-relaxed">
                          {t('dataTransfer.strategyMergeDesc')}
                        </span>
                      </div>
                    </label>

                    {/* Strategy 2: Overwrite */}
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        importStrategy === 'overwrite'
                          ? 'border-rose-500 bg-rose-500/10 text-slate-100 ring-1 ring-rose-500/40'
                          : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importStrategy"
                        checked={importStrategy === 'overwrite'}
                        onChange={() => setImportStrategy('overwrite')}
                        className="mt-0.5 text-rose-500 focus:ring-rose-500"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-rose-300">
                          {t('dataTransfer.strategyOverwrite')}
                        </span>
                        <span className="text-[11px] text-slate-400 leading-relaxed">
                          {t('dataTransfer.strategyOverwriteDesc')}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 rounded-md transition-colors font-medium"
          >
            {t('common.cancel')}
          </button>

          {activeTab === 'export' ? (
            <div className="flex items-center gap-2">
              {exportFormat !== 'html' && (
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-md transition-colors border border-slate-700 flex items-center gap-1.5"
                >
                  {copiedExport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{exportFormat === 'markdown' ? t('dataTransfer.copyMarkdown') : t('dataTransfer.copyJson')}</span>
                </button>
              )}
              <button
                type="button"
                disabled={isExporting}
                onClick={handleSaveToFile}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm flex items-center gap-1.5 ${
                  isExporting
                    ? 'bg-sky-600/70 text-white/80 cursor-wait'
                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                }`}
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>
                  {isExporting
                    ? t('dataTransfer.exporting')
                    : exportFormat === 'html'
                    ? t('dataTransfer.saveAsHtmlFile')
                    : exportFormat === 'markdown'
                    ? t('dataTransfer.saveAsMdFile')
                    : t('dataTransfer.saveAsJsonFile')}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!parsedData}
              onClick={handleExecuteImport}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm flex items-center gap-1.5 ${
                parsedData
                  ? importStrategy === 'overwrite'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('dataTransfer.btnExecuteImport')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Overwrite Confirmation Secondary Modal */}
      {showOverwriteConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
          onClick={() => setShowOverwriteConfirm(false)}
        >
          <div
            className="bg-slate-900 border border-rose-500/40 rounded-xl shadow-2xl p-5 max-w-md w-full flex flex-col gap-4 text-slate-200 animate-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-rose-300">
                  {t('dataTransfer.overwriteConfirmTitle')}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('dataTransfer.overwriteConfirmMsg')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowOverwriteConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 rounded-md transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwrite}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors font-medium flex items-center gap-1.5 shadow-lg shadow-rose-900/40"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t('dataTransfer.strategyOverwrite')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
