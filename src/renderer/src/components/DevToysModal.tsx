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
  Binary
} from 'lucide-react'
import { useI18n } from '../i18n'
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
  encodeUnicode
} from '../utils/escapeUtils'
import { CodeEditor } from './CodeEditor'

export type ToolTab = 'scratchpad' | 'timestamp' | 'url' | 'escape' | 'base64' | 'jwt' | 'hash' | 'uuid'

interface DevToysContentProps {
  onClose?: () => void
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void
  isPopout?: boolean
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

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(value)
      const formatted = JSON.stringify(parsed, null, 2)
      if (onChange) {
        onChange(formatted)
      }
      onToast?.(t('devtoys.prettify'), 'success')
    } catch (err: any) {
      onToast?.(`JSON: ${err.message}`, 'error')
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
          <span className="text-[11px] font-semibold text-slate-400">{title}</span>
          {isJson && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30">
              JSON
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isJson && (
            <>
              <button
                type="button"
                onClick={handlePrettify}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors"
                title={t('devtoys.prettify')}
              >
                <Code2 className="w-3 h-3 text-sky-400" />
                <span>Format</span>
              </button>
              <button
                type="button"
                onClick={handleMinify}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors"
                title={t('devtoys.minify')}
              >
                <Minimize2 className="w-3 h-3 text-amber-400" />
                <span>Minify</span>
              </button>
            </>
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
            <span>Wrap</span>
          </button>
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
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
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
        <div className="flex-1 bg-slate-900/60 overflow-y-auto p-5 select-text">
          {activeTab === 'scratchpad' && <ScratchpadTool onToast={onToast} />}
          {activeTab === 'timestamp' && <TimestampTool language={language} onToast={onToast} />}
          {activeTab === 'url' && <UrlTool onToast={onToast} />}
          {activeTab === 'escape' && <EscapeTool onToast={onToast} />}
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
            placeholder="例如: 1718000000 (秒或毫秒)"
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

      {/* Input / Output Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-1.5 min-h-0">
          <span className="text-[11px] font-semibold text-slate-400">Input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('devtoys.inputPlaceholder')}
            className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
          />
        </div>

        <FormattedCodeOutput
          value={output}
          title="Output (格式化与取色)"
          onToast={onToast}
          onChange={setOutput}
        />
      </div>
    </div>
  )
}

// ==========================================
// 4. Escape / Unescape Tool (转义与反转义解码 - 支持 CodeEditor 格式化与取色)
// ==========================================
const EscapeTool: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error') => void }> = ({
  onToast
}) => {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  const handleUnescapeJson = () => {
    try {
      const res = unescapeJsonString(input)
      // Check if result is JSON
      try {
        const parsed = JSON.parse(res)
        setOutput(JSON.stringify(parsed, null, 2))
      } catch {
        setOutput(res)
      }
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
    <div className="flex flex-col gap-4 h-full">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-3 gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleUnescapeJson}
            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer"
            title="去除反斜杠转义并格式化 JSON"
          >
            {t('devtoys.unescapeJsonString')}
          </button>
          <button
            type="button"
            onClick={handleEscapeJson}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            {t('devtoys.escapeJsonString')}
          </button>
          <button
            type="button"
            onClick={handleDecodeHtml}
            className="px-2.5 py-1 text-xs rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors cursor-pointer"
          >
            {t('devtoys.decodeHtmlEntities')}
          </button>
          <button
            type="button"
            onClick={handleEncodeHtml}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            {t('devtoys.escapeHtmlEntities')}
          </button>
          <button
            type="button"
            onClick={handleDecodeUnicode}
            className="px-2.5 py-1 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer"
          >
            {t('devtoys.decodeUnicode')}
          </button>
          <button
            type="button"
            onClick={handleEncodeUnicode}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            {t('devtoys.escapeUnicode')}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-1.5 min-h-0">
          <span className="text-[11px] font-semibold text-slate-400">Input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'例如: {"name":"demo"} 或 <div> 或 \\u4e2d\\u6587'}
            className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
          />
        </div>

        <FormattedCodeOutput
          value={output}
          title="Output (格式化与取色)"
          onToast={onToast}
          onChange={setOutput}
        />
      </div>
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

      {/* Input / Output Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-1.5 min-h-0">
          <span className="text-[11px] font-semibold text-slate-400">Input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('devtoys.inputPlaceholder')}
            className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
          />
        </div>

        <FormattedCodeOutput
          value={output}
          title="Output (格式化与取色)"
          onToast={onToast}
          onChange={setOutput}
        />
      </div>
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
