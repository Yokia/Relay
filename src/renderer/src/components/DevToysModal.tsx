import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Clock,
  Link2,
  FileCode,
  ShieldCheck,
  Hash,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ArrowRightLeft,
  Pause,
  Play,
  FileEdit,
  Code2,
  Minimize2,
  WrapText,
  AlertCircle,
  CheckCircle2,
  Binary,
  Languages,
  Settings,
  Loader2,
  Sun,
  Moon
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useTheme } from '../theme'
import {
  computeMD5,
  computeHash,
  encodeBase64,
  decodeBase64,
  parseJwt,
  ParsedJwt,
  formatDateTime,
  formatRelativeTime
} from '../utils/cryptoUtils'
import {
  unescapeJsonString,
  escapeJsonString,
  decodeHtmlEntities,
  encodeHtmlEntities,
  decodeUnicode,
  encodeUnicode,
  smartFormatText,
  smartUnescape,
  expandStringEscapes,
  collapseStringEscapes
} from '../utils/escapeUtils'
import { CodeEditor } from './CodeEditor'

export type ToolTab = 'scratchpad' | 'timestamp' | 'url' | 'escape' | 'base64' | 'jwt' | 'hash' | 'uuid' | 'translate'

interface DevToysContentProps {
  onClose?: () => void
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void
  isPopout?: boolean
}

/**
 * Resizable dual-panel container with draggable splitter and persisted ratio
 */
const ResizableDualPanels: React.FC<{
  left: React.ReactNode
  right: React.ReactNode
  storageKey?: string
  defaultRatio?: number
}> = ({ left, right, storageKey = 'relay_devtoys_split_ratio', defaultRatio = 50 }) => {
  const { t } = useI18n()
  const [ratio, setRatio] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = parseFloat(saved)
      if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) return parsed
    }
    return defaultRatio
  })

  const containerRef = React.useRef<HTMLDivElement>(null)
  const isDraggingRef = React.useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newRatio = ((ev.clientX - rect.left) / rect.width) * 100
      const clamped = Math.max(20, Math.min(80, newRatio))
      setRatio(clamped)
      localStorage.setItem(storageKey, clamped.toString())
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div ref={containerRef} className="flex-1 flex min-h-0 w-full overflow-hidden">
      <div style={{ width: `${ratio}%` }} className="h-full flex flex-col min-w-0 pr-1.5">
        {left}
      </div>

      <div
        onMouseDown={handleMouseDown}
        className="w-2.5 -mx-1 hover:w-2.5 bg-transparent hover:bg-sky-500/20 active:bg-sky-500/40 cursor-col-resize flex items-center justify-center transition-colors group select-none shrink-0 z-10 rounded"
        title={t('common.resizeSplitter')}
      >
        <div className="w-1 h-8 bg-slate-700/80 group-hover:bg-sky-400 group-active:bg-sky-400 rounded-full transition-colors" />
      </div>

      <div style={{ width: `${100 - ratio}%` }} className="h-full flex flex-col min-w-0 pl-1.5">
        {right}
      </div>
    </div>
  )
}

/**
 * Reusable Output Panel with CodeEditor, JSON Prettify/Minify, and Wrap toggles
 */
const FormattedCodeOutput: React.FC<{
  value: string
  title?: string
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void
  onChange?: (val: string) => void
  readOnly?: boolean
}> = ({ value, title = 'Output', onToast, onChange, readOnly = true }) => {
  const { t } = useI18n()
  const [wrap, setWrap] = useState(true)
  const [copied, setCopied] = useState(false)
  const [expandEscapes, setExpandEscapes] = useState<boolean>(() => {
    return localStorage.getItem('relay_devtoys_expand_escapes') === 'true'
  })

  // Detect if current value is valid JSON
  const isJson = useMemo(() => {
    if (!value || !value.trim()) return false
    const trimmed = value.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
    try {
      JSON.parse(trimmed)
      return true
    } catch {
      return false
    }
  }, [value])

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onToast?.(t('devtoys.copied'), 'success')
  }

  const handleFormat = () => {
    if (!value || !value.trim()) return
    try {
      let formatted = smartFormatText(value)
      if (expandEscapes) {
        formatted = expandStringEscapes(formatted)
      }
      if (onChange) {
        onChange(formatted)
      }
      onToast?.(t('devtoys.prettify'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleToggleExpandEscapes = () => {
    const next = !expandEscapes
    setExpandEscapes(next)
    localStorage.setItem('relay_devtoys_expand_escapes', String(next))
    if (value && onChange) {
      if (next) {
        const expanded = expandStringEscapes(value)
        onChange(expanded)
        onToast?.(t('devtoys.escapesExpanded'), 'success')
      } else {
        const collapsed = collapseStringEscapes(value)
        onChange(collapsed)
        onToast?.(t('devtoys.escapesCollapsed'), 'success')
      }
    }
  }

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value)
      const minified = JSON.stringify(parsed)
      if (onChange) {
        onChange(minified)
      }
      onToast?.(t('devtoys.minify'), 'success')
    } catch (err: any) {
      onToast?.(`JSON: ${err.message}`, 'error')
    }
  }

  return (
    <div className="flex flex-col h-full gap-1.5 min-h-0">
      <div className="flex items-center justify-between px-1 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">{title || t('devtoys.output')}</span>
          {isJson && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30">
              JSON
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleToggleExpandEscapes}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                expandEscapes
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={
                expandEscapes
                  ? t('devtoys.expandedEscapesTip')
                  : t('devtoys.expandEscapesTip')
              }
            >
              <span className="font-mono text-[10px] font-bold">\n\t</span>
              <span>{expandEscapes ? t('devtoys.expandedEscapes') : t('devtoys.expandEscapes')}</span>
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={handleFormat}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
              title={t('devtoys.prettifyTip')}
            >
              <Code2 className="w-3 h-3 text-sky-400" />
              <span>{t('devtoys.format')}</span>
            </button>
          )}
          {isJson && (
            <button
              type="button"
              onClick={handleMinify}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
              title={t('devtoys.minify')}
            >
              <Minimize2 className="w-3 h-3 text-amber-400" />
              <span>{t('devtoys.minify')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setWrap(!wrap)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors ${
              wrap ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={t('devtoys.wrapLines')}
          >
            <WrapText className="w-3 h-3" />
            <span>{t('devtoys.wrapLines')}</span>
          </button>
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? t('devtoys.copied') : t('devtoys.copy')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-[160px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80 focus-within:border-sky-500/80 transition-colors relative">
        <CodeEditor
          value={value}
          readOnly={readOnly}
          onChange={onChange}
          wrap={wrap}
          height="100%"
          minHeight="100%"
          placeholder={t('devtoys.outputPlaceholder')}
        />
      </div>
    </div>
  )
}

export const DevToysContent: React.FC<DevToysContentProps> = ({ onClose, onToast, isPopout }) => {
  const { t, language } = useI18n()
  const { theme, toggleTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<ToolTab>(() => {
    return (localStorage.getItem('relay_devtoys_active_tab') as ToolTab) || 'scratchpad'
  })

  useEffect(() => {
    localStorage.setItem('relay_devtoys_active_tab', activeTab)
  }, [activeTab])

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 select-none overflow-hidden text-slate-100">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-5 flex items-center justify-between bg-slate-950/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">{t('devtoys.title')}</h2>
            <p className="text-[11px] text-slate-400">
              {activeTab === 'scratchpad' && t('devtoys.scratchpadDesc')}
              {activeTab === 'timestamp' && t('devtoys.timestampDesc')}
              {activeTab === 'url' && t('devtoys.urlDesc')}
              {activeTab === 'escape' && t('devtoys.escapeDesc')}
              {activeTab === 'base64' && t('devtoys.base64Desc')}
              {activeTab === 'jwt' && t('devtoys.jwtDesc')}
              {activeTab === 'hash' && t('devtoys.hashDesc')}
              {activeTab === 'uuid' && t('devtoys.uuidDesc')}
              {activeTab === 'translate' && t('devtoys.translateDesc')}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
            title={t('common.toggleTheme')}
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-sky-400" />
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('common.closeEsc')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-56 border-r border-slate-800 bg-slate-950/40 p-2.5 flex flex-col gap-1 overflow-y-auto shrink-0">
          <NavItem
            active={activeTab === 'scratchpad'}
            onClick={() => setActiveTab('scratchpad')}
            icon={<FileEdit className="w-4 h-4 text-emerald-400" />}
            label={t('devtoys.scratchpad')}
          />
          <NavItem
            active={activeTab === 'timestamp'}
            onClick={() => setActiveTab('timestamp')}
            icon={<Clock className="w-4 h-4 text-sky-400" />}
            label={t('devtoys.timestamp')}
          />
          <NavItem
            active={activeTab === 'url'}
            onClick={() => setActiveTab('url')}
            icon={<Link2 className="w-4 h-4 text-amber-400" />}
            label={t('devtoys.urlEncoder')}
          />
          <NavItem
            active={activeTab === 'escape'}
            onClick={() => setActiveTab('escape')}
            icon={<Code2 className="w-4 h-4 text-emerald-400" />}
            label={t('devtoys.escape')}
          />
          <NavItem
            active={activeTab === 'translate'}
            onClick={() => setActiveTab('translate')}
            icon={<Languages className="w-4 h-4 text-sky-400" />}
            label={t('devtoys.translate')}
          />
          <NavItem
            active={activeTab === 'base64'}
            onClick={() => setActiveTab('base64')}
            icon={<FileCode className="w-4 h-4 text-purple-400" />}
            label={t('devtoys.base64')}
          />
          <NavItem
            active={activeTab === 'jwt'}
            onClick={() => setActiveTab('jwt')}
            icon={<ShieldCheck className="w-4 h-4 text-rose-400" />}
            label={t('devtoys.jwt')}
          />
          <NavItem
            active={activeTab === 'hash'}
            onClick={() => setActiveTab('hash')}
            icon={<Hash className="w-4 h-4 text-cyan-400" />}
            label={t('devtoys.hash')}
          />
          <NavItem
            active={activeTab === 'uuid'}
            onClick={() => setActiveTab('uuid')}
            icon={<Binary className="w-4 h-4 text-indigo-400" />}
            label={t('devtoys.uuid')}
          />
        </div>

        {/* Workspace View */}
        <div className="flex-1 bg-slate-900/60 overflow-y-auto p-5 select-text flex flex-col min-h-0">
          {activeTab === 'scratchpad' && <ScratchpadTool onToast={onToast} />}
          {activeTab === 'timestamp' && <TimestampTool language={language} onToast={onToast} />}
          {activeTab === 'url' && <UrlTool onToast={onToast} />}
          {activeTab === 'escape' && <EscapeTool onToast={onToast} />}
          {activeTab === 'translate' && <TranslateTool onToast={onToast} />}
          {activeTab === 'base64' && <Base64Tool onToast={onToast} />}
          {activeTab === 'jwt' && <JwtTool onToast={onToast} />}
          {activeTab === 'hash' && <HashTool onToast={onToast} />}
          {activeTab === 'uuid' && <UuidTool onToast={onToast} />}
        </div>
      </div>
    </div>
  )
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export const DevToysModal: React.FC<ModalProps> = ({ isOpen, onClose, onToast }) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DevToysContent onClose={onClose} onToast={onToast} />
      </div>
    </div>
  )
}

const NavItem: React.FC<{
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
      active
        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`}
  >
    {icon}
    <span className="truncate">{label}</span>
  </button>
)

// ==========================================
// 1. Scratchpad (便签草稿本 - 升级 CodeEditor)
// ==========================================
const ScratchpadTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [content, setContent] = useState(() => {
    return localStorage.getItem('relay_scratchpad_content') || ''
  })
  const [copied, setCopied] = useState(false)
  const [wrap, setWrap] = useState(true)

  const handleChange = (val: string) => {
    setContent(val)
    localStorage.setItem('relay_scratchpad_content', val)
  }

  const handleCopy = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onToast?.(t('devtoys.copied'), 'success')
  }

  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(content)
      const formatted = JSON.stringify(parsed, null, 2)
      handleChange(formatted)
      onToast?.(t('devtoys.prettify'), 'success')
    } catch (err: any) {
      onToast?.(`JSON: ${err.message}`, 'error')
    }
  }

  const handleMinifyJson = () => {
    try {
      const parsed = JSON.parse(content)
      const minified = JSON.stringify(parsed)
      handleChange(minified)
      onToast?.(t('devtoys.minify'), 'success')
    } catch (err: any) {
      onToast?.(`JSON: ${err.message}`, 'error')
    }
  }

  const stats = useMemo(() => {
    const chars = content.length
    const lines = content ? content.split('\n').length : 0
    const bytes = new TextEncoder().encode(content).length
    return { chars, lines, bytes }
  }, [content])

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Top Action & Stats Bar */}
      <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-xs shrink-0">
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <div>
            {t('devtoys.characters')}: <span className="text-sky-400 font-bold">{stats.chars}</span>
          </div>
          <div>
            {t('devtoys.lines')}: <span className="text-emerald-400 font-bold">{stats.lines}</span>
          </div>
          <div>
            {t('devtoys.bytes')}: <span className="text-amber-400 font-bold">{stats.bytes} B</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrettifyJson}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('devtoys.prettify')}</span>
          </button>
          <button
            type="button"
            onClick={handleMinifyJson}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('devtoys.minify')}</span>
          </button>
          <button
            type="button"
            onClick={() => setWrap(!wrap)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg transition-colors ${
              wrap ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={t('devtoys.wrapLines')}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>{t('devtoys.wrapLines')}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!content}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('devtoys.copied') : t('devtoys.copy')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleChange('')}
            disabled={!content}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('devtoys.clear')}</span>
          </button>
        </div>
      </div>

      {/* Editor Area with CodeEditor */}
      <div className="flex-1 min-h-[300px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80 focus-within:border-sky-500/80 transition-colors">
        <CodeEditor
          value={content}
          onChange={handleChange}
          wrap={wrap}
          height="100%"
          minHeight="100%"
          placeholder={t('devtoys.inputPlaceholder')}
        />
      </div>
    </div>
  )
}

// ==========================================
// 2. Timestamp Tool (时间戳转换器)
// ==========================================
const TimestampTool: React.FC<{
  language: 'zh-CN' | 'en-US'
  onToast?: (msg: string, type?: 'success' | 'error') => void
}> = ({ language, onToast }) => {
  const { t } = useI18n()

  const [currentNow, setCurrentNow] = useState(Date.now())
  const [isLivePaused, setIsLivePaused] = useState(false)

  useEffect(() => {
    if (isLivePaused) return
    const timer = setInterval(() => {
      setCurrentNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [isLivePaused])

  const [inputTimestamp, setInputTimestamp] = useState(() => String(Math.floor(Date.now() / 1000)))

  const [inputDateStr, setInputDateStr] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  const parsedDateResult = useMemo(() => {
    const trimmed = inputTimestamp.trim()
    if (!trimmed) return null
    let num = Number(trimmed)
    if (isNaN(num)) return null
    if (trimmed.length <= 11) {
      num = num * 1000
    }
    const d = new Date(num)
    if (isNaN(d.getTime())) return null

    return {
      local: formatDateTime(d),
      utc: d.toUTCString(),
      iso: d.toISOString(),
      relative: formatRelativeTime(d, language)
    }
  }, [inputTimestamp, language])

  const parsedTimestampResult = useMemo(() => {
    if (!inputDateStr) return null
    const d = new Date(inputDateStr)
    if (isNaN(d.getTime())) return null
    return {
      sec: Math.floor(d.getTime() / 1000),
      ms: d.getTime()
    }
  }, [inputDateStr])

  const copyVal = (val: string | number) => {
    navigator.clipboard.writeText(String(val))
    onToast?.(t('devtoys.copied'), 'success')
  }

  const applyOffset = (hours: number) => {
    const current = inputDateStr ? new Date(inputDateStr).getTime() : Date.now()
    const next = new Date(current + hours * 3600 * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    setInputDateStr(
      `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Real-time Clock Card */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">
              {t('devtoys.currentTimestamp')}
            </span>
            <span className="text-xs text-slate-300 font-mono">{formatDateTime(new Date(currentNow))}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-500 mr-2">{t('devtoys.seconds')}</span>
            <span className="font-mono text-xs font-bold text-sky-400 mr-2">
              {Math.floor(currentNow / 1000)}
            </span>
            <button
              type="button"
              onClick={() => copyVal(Math.floor(currentNow / 1000))}
              className="p-1 hover:text-sky-300 text-slate-400 transition-colors cursor-pointer"
              title={t('devtoys.copy')}
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-500 mr-2">{t('devtoys.milliseconds')}</span>
            <span className="font-mono text-xs font-bold text-emerald-400 mr-2">{currentNow}</span>
            <button
              type="button"
              onClick={() => copyVal(currentNow)}
              className="p-1 hover:text-emerald-300 text-slate-400 transition-colors cursor-pointer"
              title={t('devtoys.copy')}
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsLivePaused(!isLivePaused)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title={isLivePaused ? t('devtoys.resume') : t('devtoys.pause')}
          >
            {isLivePaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Part 1: Timestamp to Date */}
      <div className="bg-slate-950/50 border border-slate-800/90 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <h3 className="text-xs font-bold text-slate-200">{t('devtoys.timestampToDate')}</h3>
          </div>
          <button
            type="button"
            onClick={() => setInputTimestamp(String(Math.floor(Date.now() / 1000)))}
            className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
          >
            {t('devtoys.now')}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input
            type="text"
            value={inputTimestamp}
            onChange={(e) => setInputTimestamp(e.target.value)}
            placeholder={t('devtoys.timestampPlaceholder')}
            className="flex-1 w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 font-mono text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        {parsedDateResult ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <ResultItem label={t('devtoys.localTime')} value={parsedDateResult.local} onCopy={() => copyVal(parsedDateResult.local)} />
            <ResultItem label={t('devtoys.utcTime')} value={parsedDateResult.utc} onCopy={() => copyVal(parsedDateResult.utc)} />
            <ResultItem label={t('devtoys.iso8601')} value={parsedDateResult.iso} onCopy={() => copyVal(parsedDateResult.iso)} />
            <ResultItem label={t('devtoys.relativeTime')} value={parsedDateResult.relative} onCopy={() => copyVal(parsedDateResult.relative)} />
          </div>
        ) : (
          <div className="text-xs text-rose-400/80 italic py-1">{t('devtoys.invalidTimestamp')}</div>
        )}
      </div>

      {/* Part 2: Date to Timestamp */}
      <div className="bg-slate-950/50 border border-slate-800/90 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200">{t('devtoys.dateToTimestamp')}</h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyOffset(1)}
              className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {t('devtoys.plus1Hour')}
            </button>
            <button
              type="button"
              onClick={() => applyOffset(24)}
              className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {t('devtoys.plus1Day')}
            </button>
            <button
              type="button"
              onClick={() => applyOffset(24 * 7)}
              className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {t('devtoys.plus7Days')}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="datetime-local"
            value={inputDateStr}
            onChange={(e) => setInputDateStr(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 font-mono text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        {parsedTimestampResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <ResultItem
              label={t('devtoys.seconds')}
              value={String(parsedTimestampResult.sec)}
              onCopy={() => copyVal(parsedTimestampResult.sec)}
            />
            <ResultItem
              label={t('devtoys.milliseconds')}
              value={String(parsedTimestampResult.ms)}
              onCopy={() => copyVal(parsedTimestampResult.ms)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const ResultItem: React.FC<{ label: string; value: string; onCopy: () => void }> = ({
  label,
  value,
  onCopy
}) => (
  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
    <div className="flex flex-col min-w-0 mr-2">
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      <span className="text-xs font-mono text-slate-200 truncate select-all">{value}</span>
    </div>
    <button
      type="button"
      onClick={onCopy}
      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  </div>
)

// ==========================================
// 3. URL Encoder / Decoder (使用 CodeEditor 格式化与取色)
// ==========================================
const UrlTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'component' | 'full'>('component')

  const handleEncode = () => {
    try {
      const res = mode === 'component' ? encodeURIComponent(input) : encodeURI(input)
      setOutput(res)
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleDecode = () => {
    try {
      const res = mode === 'component' ? decodeURIComponent(input) : decodeURI(input)
      // Check if decoded result is JSON, optionally format it
      try {
        const parsed = JSON.parse(res)
        setOutput(JSON.stringify(parsed, null, 2))
      } catch {
        setOutput(res)
      }
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleSwap = () => {
    setInput(output)
    setOutput(input)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="radio"
              checked={mode === 'component'}
              onChange={() => setMode('component')}
              className="text-sky-500 focus:ring-sky-500"
            />
            <span>encodeURIComponent</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 ml-3">
            <input
              type="radio"
              checked={mode === 'full'}
              onChange={() => setMode('full')}
              className="text-sky-500 focus:ring-sky-500"
            />
            <span>encodeURI</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEncode}
            className="px-3 py-1 text-xs rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors cursor-pointer"
          >
            {t('devtoys.encode')}
          </button>
          <button
            type="button"
            onClick={handleDecode}
            className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer"
          >
            {t('devtoys.decode')}
          </button>
          <button
            type="button"
            onClick={handleSwap}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title={t('devtoys.swap')}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setInput('')
              setOutput('')
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            title={t('devtoys.clear')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Resizable Input / Output Panels */}
      <ResizableDualPanels
        storageKey="relay_devtoys_url_split"
        left={
          <div className="flex flex-col gap-1.5 h-full min-h-0">
            <span className="text-[11px] font-semibold text-slate-400">{t('devtoys.input')}</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('devtoys.inputPlaceholder')}
              className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
            />
          </div>
        }
        right={
          <FormattedCodeOutput
            value={output}
            title={t('devtoys.outputFormatted')}
            onToast={onToast}
            onChange={setOutput}
          />
        }
      />
    </div>
  )
}

// ==========================================
// 4. Escape / Unescape Tool (转义与反转义解码 - 支持 CodeEditor 格式化与取色)
// ==========================================
type EscapeMode = 'smart' | 'json' | 'html' | 'unicode'

const EscapeTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [mode, setMode] = useState<EscapeMode>('smart')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [expandEscapes, setExpandEscapes] = useState<boolean>(() => {
    return localStorage.getItem('relay_devtoys_expand_escapes') === 'true'
  })

  const handleSmartUnescape = () => {
    try {
      let res = smartUnescape(input)
      if (expandEscapes) {
        res = expandStringEscapes(res)
      }
      setOutput(res)
      onToast?.(t('devtoys.smartUnescapeBtn'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleUnescapeJson = () => {
    try {
      const res = unescapeJsonString(input)
      let formatted = smartFormatText(res)
      if (expandEscapes) {
        formatted = expandStringEscapes(formatted)
      }
      setOutput(formatted)
      onToast?.(t('devtoys.unescapeJsonString'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleEscapeJson = () => {
    try {
      const res = escapeJsonString(input)
      setOutput(res)
      onToast?.(t('devtoys.escapeJsonString'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleDecodeHtml = () => {
    try {
      const res = decodeHtmlEntities(input)
      setOutput(res)
      onToast?.(t('devtoys.decodeHtmlEntities'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleEncodeHtml = () => {
    try {
      const res = encodeHtmlEntities(input)
      setOutput(res)
      onToast?.(t('devtoys.escapeHtmlEntities'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleDecodeUnicode = () => {
    try {
      const res = decodeUnicode(input)
      setOutput(res)
      onToast?.(t('devtoys.decodeUnicode'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleEncodeUnicode = () => {
    try {
      const res = encodeUnicode(input)
      setOutput(res)
      onToast?.(t('devtoys.escapeUnicode'), 'success')
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleSwap = () => {
    setInput(output)
    setOutput(input)
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Top Header & Mode Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Segmented Mode Selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800/90 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setMode('smart')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'smart'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t('devtoys.smartMode')}
            </button>
            <button
              type="button"
              onClick={() => setMode('json')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'json'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t('devtoys.jsonMode')}
            </button>
            <button
              type="button"
              onClick={() => setMode('html')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'html'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t('devtoys.htmlMode')}
            </button>
            <button
              type="button"
              onClick={() => setMode('unicode')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                mode === 'unicode'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t('devtoys.unicodeMode')}
            </button>
          </div>

          {/* Action Buttons for Current Mode */}
          <div className="flex items-center gap-2">
            {mode === 'smart' && (
              <button
                type="button"
                onClick={handleSmartUnescape}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-medium shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('devtoys.smartUnescapeBtn')}</span>
              </button>
            )}

            {mode === 'json' && (
              <>
                <button
                  type="button"
                  onClick={handleUnescapeJson}
                  className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer"
                  title={t('devtoys.unescapeJsonTip')}
                >
                  {t('devtoys.unescapeJsonString')}
                </button>
                <button
                  type="button"
                  onClick={handleEscapeJson}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  {t('devtoys.escapeJsonString')}
                </button>
              </>
            )}

            {mode === 'html' && (
              <>
                <button
                  type="button"
                  onClick={handleDecodeHtml}
                  className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors cursor-pointer"
                >
                  {t('devtoys.decodeHtmlEntities')}
                </button>
                <button
                  type="button"
                  onClick={handleEncodeHtml}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  {t('devtoys.escapeHtmlEntities')}
                </button>
              </>
            )}

            {mode === 'unicode' && (
              <>
                <button
                  type="button"
                  onClick={handleDecodeUnicode}
                  className="px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer"
                >
                  {t('devtoys.decodeUnicode')}
                </button>
                <button
                  type="button"
                  onClick={handleEncodeUnicode}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  {t('devtoys.escapeUnicode')}
                </button>
              </>
            )}

            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            <label
              className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300 hover:text-slate-100 select-none px-2 py-1 rounded-lg hover:bg-slate-800/60 transition-colors"
              title={t('devtoys.expandStringEscapesTip')}
            >
              <input
                type="checkbox"
                checked={expandEscapes}
                onChange={(e) => {
                  const checked = e.target.checked
                  setExpandEscapes(checked)
                  localStorage.setItem('relay_devtoys_expand_escapes', String(checked))
                  if (output) {
                    setOutput(checked ? expandStringEscapes(output) : collapseStringEscapes(output))
                  }
                }}
                className="rounded text-sky-500 focus:ring-sky-500 cursor-pointer"
              />
              <span className="font-mono text-[11px] text-sky-400 font-bold">\n\t</span>
              <span className="text-[11px]">{t('devtoys.expandStringEscapesOption')}</span>
            </label>

            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={t('devtoys.swap')}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('')
                setOutput('')
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              title={t('devtoys.clear')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tip description banner */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1 font-sans">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
          <span>
            {mode === 'smart' && t('devtoys.smartModeTip')}
            {mode === 'json' && t('devtoys.jsonModeTip')}
            {mode === 'html' && t('devtoys.htmlModeTip')}
            {mode === 'unicode' && t('devtoys.unicodeModeTip')}
          </span>
        </div>
      </div>

      {/* Resizable Input / Output Panels */}
      <ResizableDualPanels
        storageKey="relay_devtoys_escape_split"
        left={
          <div className="flex flex-col gap-1.5 h-full min-h-0">
            <div className="flex items-center justify-between px-1 text-xs shrink-0">
              <span className="text-[11px] font-semibold text-slate-400">{t('devtoys.input')}</span>
              {input && (
                <button
                  type="button"
                  onClick={() => setInput(smartFormatText(input))}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t('devtoys.cleanInputTip')}
                >
                  <Code2 className="w-3 h-3 text-sky-400" />
                  <span>{t('devtoys.cleanInput')}</span>
                </button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('devtoys.escapeInputPlaceholder')}
              className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
            />
          </div>
        }
        right={
          <FormattedCodeOutput
            value={output}
            title={t('devtoys.outputFormatted')}
            onToast={onToast}
            onChange={setOutput}
          />
        }
      />
    </div>
  )
}

// ==========================================
// 5. Base64 Tool (使用 CodeEditor 格式化与取色)
// ==========================================
const Base64Tool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [urlSafe, setUrlSafe] = useState(false)

  const handleEncode = () => {
    try {
      setOutput(encodeBase64(input, urlSafe))
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleDecode = () => {
    try {
      const res = decodeBase64(input, urlSafe)
      // If it's valid JSON, format it with indentation
      try {
        const parsed = JSON.parse(res)
        setOutput(JSON.stringify(parsed, null, 2))
      } catch {
        setOutput(res)
      }
    } catch (err: any) {
      onToast?.(err.message, 'error')
    }
  }

  const handleSwap = () => {
    setInput(output)
    setOutput(input)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-3 shrink-0">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={urlSafe}
            onChange={(e) => setUrlSafe(e.target.checked)}
            className="rounded text-sky-500 focus:ring-sky-500"
          />
          <span>{t('devtoys.urlSafe')}</span>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEncode}
            className="px-3 py-1 text-xs rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors cursor-pointer"
          >
            {t('devtoys.encode')}
          </button>
          <button
            type="button"
            onClick={handleDecode}
            className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer"
          >
            {t('devtoys.decode')}
          </button>
          <button
            type="button"
            onClick={handleSwap}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title={t('devtoys.swap')}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setInput('')
              setOutput('')
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            title={t('devtoys.clear')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Resizable Input / Output Panels */}
      <ResizableDualPanels
        storageKey="relay_devtoys_base64_split"
        left={
          <div className="flex flex-col gap-1.5 h-full min-h-0">
            <span className="text-[11px] font-semibold text-slate-400">{t('devtoys.input')}</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('devtoys.inputPlaceholder')}
              className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
            />
          </div>
        }
        right={
          <FormattedCodeOutput
            value={output}
            title={t('devtoys.outputFormatted')}
            onToast={onToast}
            onChange={setOutput}
          />
        }
      />
    </div>
  )
}

// ==========================================
// 6. JWT Inspector (JWT 解析器)
// ==========================================
const JwtTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [jwtToken, setJwtToken] = useState('')

  const parsed = useMemo<ParsedJwt | null>(() => {
    if (!jwtToken.trim()) return null
    try {
      return parseJwt(jwtToken)
    } catch {
      return null
    }
  }, [jwtToken])

  const copyVal = (val: any) => {
    const text = typeof val === 'string' ? val : JSON.stringify(val, null, 2)
    navigator.clipboard.writeText(text)
    onToast?.(t('devtoys.copied'), 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Input token */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400">Encoded Token</span>
          {jwtToken && (
            <button
              type="button"
              onClick={() => setJwtToken('')}
              className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              {t('devtoys.clear')}
            </button>
          )}
        </div>
        <textarea
          value={jwtToken}
          onChange={(e) => setJwtToken(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          className="h-24 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
        />
      </div>

      {jwtToken && !parsed && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{t('devtoys.invalidJwt')}</span>
        </div>
      )}

      {parsed && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              {parsed.isExpired === true ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{t('devtoys.jwtExpired')}</span>
                </div>
              ) : parsed.isExpired === false ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('devtoys.jwtValid')}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
              {parsed.issuedAt && (
                <div>
                  {t('devtoys.jwtIssuedAt')}: <span className="text-slate-200">{parsed.issuedAt}</span>
                </div>
              )}
              {parsed.expiresAt && (
                <div>
                  {t('devtoys.jwtExpiresAt')}:{' '}
                  <span className={parsed.isExpired ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {parsed.expiresAt}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64">
              <FormattedCodeOutput
                value={JSON.stringify(parsed.header, null, 2)}
                title={t('devtoys.jwtHeader')}
                onToast={onToast}
              />
            </div>
            <div className="h-64">
              <FormattedCodeOutput
                value={JSON.stringify(parsed.payload, null, 2)}
                title={t('devtoys.jwtPayload')}
                onToast={onToast}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// 7. Hash Tool (哈希计算器)
// ==========================================
const HashTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [upperCase, setUpperCase] = useState(false)
  const [hashes, setHashes] = useState<{
    md5: string
    sha1: string
    sha256: string
    sha512: string
  }>({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: ''
  })

  useEffect(() => {
    if (!text) {
      setHashes({ md5: '', sha1: '', sha256: '', sha512: '' })
      return
    }

    let active = true
    const calculate = async () => {
      const md5 = computeMD5(text)
      const sha1 = await computeHash(text, 'SHA-1')
      const sha256 = await computeHash(text, 'SHA-256')
      const sha512 = await computeHash(text, 'SHA-512')

      if (active) {
        setHashes({ md5, sha1, sha256, sha512 })
      }
    }
    calculate()

    return () => {
      active = false
    }
  }, [text])

  const copyHash = (val: string) => {
    if (!val) return
    const formatted = upperCase ? val.toUpperCase() : val.toLowerCase()
    navigator.clipboard.writeText(formatted)
    onToast?.(t('devtoys.copied'), 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400">Input String</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={upperCase}
              onChange={(e) => setUpperCase(e.target.checked)}
              className="rounded text-sky-500 focus:ring-sky-500"
            />
            <span>{t('devtoys.upperCase')}</span>
          </label>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('devtoys.inputPlaceholder')}
          className="h-24 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
        />
      </div>

      <div className="flex flex-col gap-3">
        <HashRow
          algorithm="MD5"
          value={hashes.md5}
          upperCase={upperCase}
          onCopy={() => copyHash(hashes.md5)}
        />
        <HashRow
          algorithm="SHA-1"
          value={hashes.sha1}
          upperCase={upperCase}
          onCopy={() => copyHash(hashes.sha1)}
        />
        <HashRow
          algorithm="SHA-256"
          value={hashes.sha256}
          upperCase={upperCase}
          onCopy={() => copyHash(hashes.sha256)}
        />
        <HashRow
          algorithm="SHA-512"
          value={hashes.sha512}
          upperCase={upperCase}
          onCopy={() => copyHash(hashes.sha512)}
        />
      </div>
    </div>
  )
}

const HashRow: React.FC<{
  algorithm: string
  value: string
  upperCase: boolean
  onCopy: () => void
}> = ({ algorithm, value, upperCase, onCopy }) => {
  const displayVal = value ? (upperCase ? value.toUpperCase() : value.toLowerCase()) : '—'

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{algorithm}</span>
        <span className="font-mono text-xs text-slate-200 truncate select-all">{displayVal}</span>
      </div>
      <button
        type="button"
        disabled={!value}
        onClick={onCopy}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors shrink-0 cursor-pointer"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ==========================================
// 8. UUID Generator (UUID 生成器)
// ==========================================
const UuidTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [count, setCount] = useState(5)
  const [includeHyphens, setIncludeHyphens] = useState(true)
  const [upperCase, setUpperCase] = useState(false)
  const [uuids, setUuids] = useState<string[]>([])

  const generateUuids = () => {
    const list: string[] = []
    for (let i = 0; i < count; i++) {
      let id = crypto.randomUUID()
      if (!includeHyphens) {
        id = id.replace(/-/g, '')
      }
      if (upperCase) {
        id = id.toUpperCase()
      }
      list.push(id)
    }
    setUuids(list)
  }

  useEffect(() => {
    generateUuids()
  }, [count, includeHyphens, upperCase])

  const copySingle = (id: string) => {
    navigator.clipboard.writeText(id)
    onToast?.(t('devtoys.copied'), 'success')
  }

  const copyAll = () => {
    if (uuids.length === 0) return
    navigator.clipboard.writeText(uuids.join('\n'))
    onToast?.(t('devtoys.copied'), 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-3 gap-3">
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{t('devtoys.quantity')}:</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={1}>1</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHyphens}
              onChange={(e) => setIncludeHyphens(e.target.checked)}
              className="rounded text-sky-500 focus:ring-sky-500"
            />
            <span>{t('devtoys.hyphens')}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={upperCase}
              onChange={(e) => setUpperCase(e.target.checked)}
              className="rounded text-sky-500 focus:ring-sky-500"
            />
            <span>{t('devtoys.upperCase')}</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generateUuids}
            className="px-3 py-1 text-xs rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors cursor-pointer"
          >
            {t('devtoys.generate')}
          </button>
          <button
            type="button"
            onClick={copyAll}
            className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('devtoys.copyAll')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {uuids.map((id, index) => (
          <div
            key={index}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between group hover:border-slate-700 transition-colors"
          >
            <span className="font-mono text-xs text-slate-200 select-all">{id}</span>
            <button
              type="button"
              onClick={() => copySingle(id)}
              className="p-1 hover:text-sky-300 text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
              title={t('devtoys.copy')}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Helper to convert text into coding naming conventions (camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case)
 */
function toNamingConventions(text: string) {
  if (!text || !text.trim()) return null
  // Match letters, numbers
  const words = text
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .split(/[\s-_]+/)
    .filter(Boolean)

  if (words.length === 0) return null

  const cleanWords = words.map((w) => w.toLowerCase())

  const camel = cleanWords
    .map((w, idx) => (idx === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')

  const pascal = cleanWords
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')

  const snake = cleanWords.join('_')
  const constant = cleanWords.map((w) => w.toUpperCase()).join('_')
  const kebab = cleanWords.join('-')

  return { camel, pascal, snake, constant, kebab }
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', nameZh: '自动检测', nameEn: 'Auto Detect' },
  { code: 'zh-CN', nameZh: '中文 (简体)', nameEn: 'Chinese (Simplified)' },
  { code: 'zh-TW', nameZh: '中文 (繁體)', nameEn: 'Chinese (Traditional)' },
  { code: 'en', nameZh: '英语 (English)', nameEn: 'English' },
  { code: 'ja', nameZh: '日语 (日本語)', nameEn: 'Japanese' },
  { code: 'ko', nameZh: '韩语 (한국어)', nameEn: 'Korean' },
  { code: 'vi', nameZh: '越南语 (Tiếng Việt)', nameEn: 'Vietnamese' },
  { code: 'th', nameZh: '泰语 (ไทย)', nameEn: 'Thai' },
  { code: 'id', nameZh: '印尼语 (Bahasa Indonesia)', nameEn: 'Indonesian' },
  { code: 'fr', nameZh: '法语 (Français)', nameEn: 'French' },
  { code: 'de', nameZh: '德语 (Deutsch)', nameEn: 'German' },
  { code: 'es', nameZh: '西班牙语 (Español)', nameEn: 'Spanish' },
  { code: 'pt', nameZh: '葡萄牙语 (Português)', nameEn: 'Portuguese' },
  { code: 'ru', nameZh: '俄语 (Русский)', nameEn: 'Russian' },
  { code: 'it', nameZh: '意大利语 (Italiano)', nameEn: 'Italian' },
  { code: 'ar', nameZh: '阿拉伯语 (العربية)', nameEn: 'Arabic' },
  { code: 'hi', nameZh: '印地语 (हिन्दी)', nameEn: 'Hindi' }
]

/**
 * 9. TRANSLATION TOOL
 */
const TranslateTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void }> = ({ onToast }) => {
  const { t, language } = useI18n()
  const [input, setInput] = useState(() => localStorage.getItem('relay_devtoys_translate_input') || '')
  const [output, setOutput] = useState('')
  const [sourceLang, setSourceLang] = useState(() => localStorage.getItem('relay_devtoys_translate_source') || 'auto')
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem('relay_devtoys_translate_target') || 'en')
  const [loading, setLoading] = useState(false)
  const [detectedLang, setDetectedLang] = useState<string | null>(null)
  const [usedEngine, setUsedEngine] = useState<string>('')
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    return localStorage.getItem('relay_devtoys_translate_autotype') !== 'false'
  })

  // Advanced Engine Settings
  const [showConfig, setShowConfig] = useState(false)
  const [engineType, setEngineType] = useState<'free' | 'deepl' | 'openai'>(() => {
    return (localStorage.getItem('relay_devtoys_translate_engine') as any) || 'free'
  })
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('relay_devtoys_translate_key') || '')
  const [apiEndpoint, setApiEndpoint] = useState(() => localStorage.getItem('relay_devtoys_translate_endpoint') || '')

  useEffect(() => {
    localStorage.setItem('relay_devtoys_translate_input', input)
  }, [input])

  useEffect(() => {
    localStorage.setItem('relay_devtoys_translate_source', sourceLang)
  }, [sourceLang])

  useEffect(() => {
    localStorage.setItem('relay_devtoys_translate_target', targetLang)
  }, [targetLang])

  useEffect(() => {
    localStorage.setItem('relay_devtoys_translate_autotype', String(autoTranslate))
  }, [autoTranslate])

  const handleSaveConfig = () => {
    localStorage.setItem('relay_devtoys_translate_engine', engineType)
    localStorage.setItem('relay_devtoys_translate_key', apiKey)
    localStorage.setItem('relay_devtoys_translate_endpoint', apiEndpoint)
    setShowConfig(false)
    onToast?.(t('devtoys.engineConfigSaved'), 'success')
  }

  const doTranslate = async (textToTranslate = input, sl = sourceLang, tl = targetLang) => {
    if (!textToTranslate || !textToTranslate.trim()) {
      setOutput('')
      setDetectedLang(null)
      return
    }

    setLoading(true)
    try {
      if (window.electronAPI?.translate) {
        const res = await window.electronAPI.translate({
          text: textToTranslate,
          from: sl,
          to: tl,
          engine: engineType,
          apiKey: apiKey || undefined,
          apiEndpoint: apiEndpoint || undefined
        })
        setOutput(res.text || '')
        setDetectedLang(res.detectedLang || null)
        setUsedEngine(res.engine || '')
      } else {
        // Web fallback (direct Google GTX)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(textToTranslate)}`
        const res = await fetch(url)
        const data = await res.json()
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const text = data[0].map((item: any) => item[0]).filter(Boolean).join('')
          setOutput(text)
          setDetectedLang(data[2] || null)
          setUsedEngine('Google (Web)')
        }
      }
    } catch (err: any) {
      onToast?.(err.message || '翻译失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Debounced auto-translation on input typing
  useEffect(() => {
    if (!autoTranslate) return
    if (!input || !input.trim()) {
      setOutput('')
      return
    }
    const timer = setTimeout(() => {
      doTranslate(input)
    }, 600)
    return () => clearTimeout(timer)
  }, [input, sourceLang, targetLang, engineType, autoTranslate])

  // Swap Languages
  const handleSwap = () => {
    if (sourceLang === 'auto') {
      const newSource = targetLang === 'zh-CN' ? 'en' : 'zh-CN'
      const newTarget = 'zh-CN'
      setSourceLang(newSource)
      setTargetLang(newTarget)
      if (output) {
        setInput(output)
        doTranslate(output, newSource, newTarget)
      }
    } else {
      const prevSource = sourceLang
      const prevTarget = targetLang
      setSourceLang(prevTarget)
      setTargetLang(prevSource)
      if (output) {
        setInput(output)
        doTranslate(output, prevTarget, prevSource)
      }
    }
  }

  // Naming conventions for developer code
  const namingStyles = useMemo(() => {
    return toNamingConventions(output)
  }, [output])

  const copyNaming = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
    onToast?.(t('devtoys.copiedVariable', { name: `${label} (${value})` }), 'success')
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 select-text">
      {/* Top Toolbar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source Lang Select */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/90 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 font-medium text-[11px]">{t('devtoys.sourceLang')}:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-transparent text-sky-400 font-medium focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-slate-200">
                    {language === 'zh-CN' ? l.nameZh : l.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              title={t('devtoys.swapLang')}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-sky-300 transition-colors border border-slate-800/80 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            {/* Target Lang Select */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/90 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 font-medium text-[11px]">{t('devtoys.targetLang')}:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-transparent text-emerald-400 font-medium focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-slate-200">
                    {language === 'zh-CN' ? l.nameZh : l.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Translate Button */}
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => doTranslate()}
              className="px-3.5 py-1 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-sky-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('devtoys.translating')}</span>
                </>
              ) : (
                <>
                  <Languages className="w-3.5 h-3.5" />
                  <span>{t('devtoys.translateBtn')}</span>
                </>
              )}
            </button>

            {/* Auto Translate Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none ml-1">
              <input
                type="checkbox"
                checked={autoTranslate}
                onChange={(e) => setAutoTranslate(e.target.checked)}
                className="rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-700"
              />
              <span className="text-[11px]">{t('devtoys.autoTranslateOnType')}</span>
            </label>
          </div>

          {/* Engine Settings Toggle */}
          <div className="flex items-center gap-2">
            {usedEngine && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 font-mono">
                {usedEngine}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              title={t('devtoys.engineConfig')}
              className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs cursor-pointer ${
                showConfig || engineType !== 'free'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 font-medium'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t('devtoys.engineConfig')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Engine Config Collapsible Panel */}
      {showConfig && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-sky-500/30 shadow-inner flex flex-col gap-3 shrink-0 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('devtoys.engineConfig')}</span>
            </h4>
            <span className="text-[11px] text-slate-500">{t('devtoys.configTip')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
              engineType === 'free'
                ? 'bg-sky-500/10 border-sky-500 text-sky-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
              <input
                type="radio"
                name="engineType"
                checked={engineType === 'free'}
                onChange={() => setEngineType('free')}
                className="mt-0.5 text-sky-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Google / MyMemory</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{t('devtoys.engineFree')}</span>
              </div>
            </label>

            <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
              engineType === 'deepl'
                ? 'bg-sky-500/10 border-sky-500 text-sky-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
              <input
                type="radio"
                name="engineType"
                checked={engineType === 'deepl'}
                onChange={() => setEngineType('deepl')}
                className="mt-0.5 text-sky-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">DeepL API</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{t('devtoys.engineDeepL')}</span>
              </div>
            </label>

            <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
              engineType === 'openai'
                ? 'bg-sky-500/10 border-sky-500 text-sky-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
              <input
                type="radio"
                name="engineType"
                checked={engineType === 'openai'}
                onChange={() => setEngineType('openai')}
                className="mt-0.5 text-sky-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">AI LLM (OpenAI / DeepSeek)</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{t('devtoys.engineOpenAI')}</span>
              </div>
            </label>
          </div>

          {engineType !== 'free' && (
            <div className="flex flex-col gap-2 pt-1">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('devtoys.apiKeyPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              {engineType === 'openai' && (
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder={t('devtoys.apiEndpointPlaceholder')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-3 py-1 text-xs rounded bg-sky-500 hover:bg-sky-600 text-white font-medium cursor-pointer"
            >
              {t('devtoys.saveEngineConfig')}
            </button>
          </div>
        </div>
      )}

      {/* Main Translation Dual Panels matching EscapeTool full height */}
      <ResizableDualPanels
        storageKey="relay_devtoys_translate_split"
        left={
          <div className="flex flex-col gap-1.5 h-full min-h-0">
            <div className="flex items-center justify-between px-1 text-xs shrink-0">
              <span className="text-[11px] font-semibold text-slate-400">{t('devtoys.input')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">
                  {input.length} {t('devtoys.characters')}
                </span>
                {input && (
                  <button
                    type="button"
                    onClick={() => {
                      setInput('')
                      setOutput('')
                    }}
                    className="hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                    title={t('devtoys.clear')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  doTranslate()
                }
              }}
              placeholder={t('devtoys.translateInputPlaceholder')}
              className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
            />
          </div>
        }
        right={
          <FormattedCodeOutput
            value={output}
            title={detectedLang ? `${t('devtoys.output')} (检测源语言: ${detectedLang})` : t('devtoys.output')}
            onToast={onToast}
            onChange={setOutput}
          />
        }
      />

      {/* Developer Naming Conventions Bar (Click to copy directly into code) */}
      {namingStyles && (
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('devtoys.devNamingConventions')}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyNaming(namingStyles.camel, 'camelCase')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-200 hover:text-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span className="text-slate-500 text-[10px] font-mono">camelCase:</span>
              <span className="font-mono text-sky-400 font-semibold">{namingStyles.camel}</span>
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => copyNaming(namingStyles.pascal, 'PascalCase')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-xs text-slate-200 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span className="text-slate-500 text-[10px] font-mono">PascalCase:</span>
              <span className="font-mono text-emerald-400 font-semibold">{namingStyles.pascal}</span>
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => copyNaming(namingStyles.snake, 'snake_case')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-xs text-slate-200 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span className="text-slate-500 text-[10px] font-mono">snake_case:</span>
              <span className="font-mono text-amber-400 font-semibold">{namingStyles.snake}</span>
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => copyNaming(namingStyles.constant, 'CONSTANT_CASE')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-xs text-slate-200 hover:text-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span className="text-slate-500 text-[10px] font-mono">CONSTANT:</span>
              <span className="font-mono text-purple-400 font-semibold">{namingStyles.constant}</span>
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => copyNaming(namingStyles.kebab, 'kebab-case')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-xs text-slate-200 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span className="text-slate-500 text-[10px] font-mono">kebab-case:</span>
              <span className="font-mono text-rose-400 font-semibold">{namingStyles.kebab}</span>
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

