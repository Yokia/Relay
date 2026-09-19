import React, { useMemo, useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { RangeSetBuilder } from '@codemirror/state'
import { MatchDecorator, ViewPlugin, Decoration, EditorView, DecorationSet, ViewUpdate } from '@codemirror/view'
import { ExternalLink, Plus, Copy, Check } from 'lucide-react'
import { findCommentRanges } from '../utils/jsonUtils'
import { useTheme } from '../theme'

interface Props {
  value: string
  onChange?: (val: string) => void
  readOnly?: boolean
  height?: string
  minHeight?: string
  placeholder?: string
  onOpenUrlInRelay?: (url: string) => void
  wrap?: boolean
}

interface ContextMenuState {
  x: number
  y: number
  url: string
}

// CodeMirror 6 plugin to decorate URLs as clickable links
const linkMatcher = new MatchDecorator({
  regexp: /https?:\/\/[^\s"'<>`]+/g,
  decoration: (match) => {
    const cleanUrl = match[0].replace(/[,\";]+$/, '')
    return Decoration.mark({
      class: 'cm-clickable-link text-sky-400 underline underline-offset-2 cursor-pointer hover:text-sky-300 font-mono transition-colors font-medium',
      attributes: {
        'data-url': cleanUrl,
        'title': 'Click to open in browser, right-click for actions'
      }
    })
  }
})

const clickableLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: any
    constructor(view: EditorView) {
      this.decorations = linkMatcher.createDeco(view)
    }
    update(update: any) {
      this.decorations = linkMatcher.updateDeco(update, this.decorations)
    }
  },
  {
    decorations: (v: any) => v.decorations
  }
)

// CodeMirror 6 plugin to style comments (//, /* ... */, and #) in JSON
const commentDecoration = Decoration.mark({
  class: 'cm-json-comment'
})

function buildCommentDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const text = view.state.doc.toString()
  const ranges = findCommentRanges(text)

  for (const r of ranges) {
    if (r.from < r.to) {
      builder.add(r.from, r.to, commentDecoration)
    }
  }

  return builder.finish()
}

const jsonCommentPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildCommentDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildCommentDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations
  }
)

// High-contrast, clear styling for comments and comment links
const commentTheme = EditorView.baseTheme({
  '.cm-json-comment, .cm-json-comment *': {
    color: '#94a3b8 !important',
    opacity: '1 !important',
    fontStyle: 'italic !important'
  },
  '.cm-json-comment .cm-clickable-link, .cm-json-comment a': {
    color: '#7dd3fc !important',
    textDecoration: 'underline !important',
    textDecorationColor: 'rgba(56, 189, 248, 0.4) !important',
    fontStyle: 'normal !important'
  },
  '.cm-json-comment .cm-clickable-link:hover, .cm-json-comment a:hover': {
    color: '#38bdf8 !important',
    textDecorationColor: '#38bdf8 !important'
  }
})

// Modern syntax highlighting style for JSON and general code in Relay
const relayHighlightStyle = HighlightStyle.define([
  // JSON Keys / Property Names - Crisp Sky Blue (no harsh red error color)
  { tag: tags.propertyName, color: '#7dd3fc', fontWeight: '500' },
  // String Values - Fresh Emerald Mint
  { tag: tags.string, color: '#86efac' },
  // Numbers - Warm Golden Amber
  { tag: [tags.number, tags.integer, tags.float], color: '#fbbf24' },
  // Booleans - Soft Violet / Orchid
  { tag: tags.bool, color: '#c084fc', fontWeight: '500' },
  // Null & Atom - Soft Coral
  { tag: [tags.null, tags.atom], color: '#f87171' },
  // Keywords & Operators - Soft Indigo
  { tag: [tags.keyword, tags.operator, tags.operatorKeyword], color: '#818cf8' },
  // Punctuation, Separators, Brackets, Braces - Clean Slate/Silver
  { tag: [tags.punctuation, tags.separator, tags.bracket, tags.brace, tags.squareBracket], color: '#cbd5e1' },
  // Comments - Clean, readable Slate Gray (WCAG AAA contrast 7.5:1)
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#94a3b8', fontStyle: 'italic' },
  // URLs / Links
  { tag: tags.link, color: '#38bdf8', textDecoration: 'underline' },
  // Invalid
  { tag: tags.invalid, color: '#f87171' }
])

// Deep, sleek dark theme for Relay's CodeMirror editors
const relayTheme = EditorView.theme({
  '&': {
    color: '#e2e8f0',
    backgroundColor: '#0d131f'
  },
  '.cm-content': {
    caretColor: '#38bdf8',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#38bdf8',
    borderLeftWidth: '2px'
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(56, 189, 248, 0.22) !important'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(56, 189, 248, 0.04)'
  },
  '.cm-gutters': {
    backgroundColor: '#090d16',
    color: '#64748b',
    borderRight: '1px solid rgba(30, 41, 59, 0.8)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    color: '#38bdf8',
    fontWeight: 'bold'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '4px',
    padding: '0 4px',
    margin: '0 2px'
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    outline: '1px solid rgba(56, 189, 248, 0.5)'
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(234, 179, 8, 0.25)',
    outline: '1px solid rgba(234, 179, 8, 0.6)'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(234, 179, 8, 0.4)'
  }
}, { dark: true })

const relayDark = [relayTheme, syntaxHighlighting(relayHighlightStyle)]

// Modern syntax highlighting style for Light Mode in Relay
const relayLightHighlightStyle = HighlightStyle.define([
  // JSON Keys / Property Names - Deep Sapphire Blue
  { tag: tags.propertyName, color: '#0369a1', fontWeight: '600' },
  // String Values - Forest Emerald Green
  { tag: tags.string, color: '#15803d' },
  // Numbers - Warm Golden Amber
  { tag: [tags.number, tags.integer, tags.float], color: '#b45309' },
  // Booleans - Deep Violet
  { tag: tags.bool, color: '#7e22ce', fontWeight: '600' },
  // Null & Atom - Ruby Coral Red
  { tag: [tags.null, tags.atom], color: '#dc2626' },
  // Keywords & Operators - Deep Indigo
  { tag: [tags.keyword, tags.operator, tags.operatorKeyword], color: '#4338ca' },
  // Punctuation, Separators, Brackets, Braces - Dark Slate
  { tag: [tags.punctuation, tags.separator, tags.bracket, tags.brace, tags.squareBracket], color: '#475569' },
  // Comments - Clean readable Slate Gray
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#64748b', fontStyle: 'italic' },
  // URLs / Links
  { tag: tags.link, color: '#0284c7', textDecoration: 'underline' },
  // Invalid
  { tag: tags.invalid, color: '#dc2626' }
])

// Clean, high-contrast light theme for Relay's CodeMirror editors
const relayLightTheme = EditorView.theme({
  '&': {
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  '.cm-content': {
    caretColor: '#0284c7',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#0284c7',
    borderLeftWidth: '2px'
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(14, 165, 233, 0.18) !important'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(14, 165, 233, 0.04)'
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    borderRight: '1px solid #e2e8f0'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    color: '#0284c7',
    fontWeight: 'bold'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#64748b',
    borderRadius: '4px',
    padding: '0 4px',
    margin: '0 2px'
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    outline: '1px solid rgba(14, 165, 233, 0.5)'
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    outline: '1px solid rgba(234, 179, 8, 0.6)'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(234, 179, 8, 0.35)'
  }
}, { dark: false })

const relayLight = [relayLightTheme, syntaxHighlighting(relayLightHighlightStyle)]

export const CodeEditor: React.FC<Props> = ({
  value,
  onChange,
  readOnly = false,
  height = '100%',
  minHeight = '180px',
  placeholder = '{\n  "key": "value"\n}',
  onOpenUrlInRelay,
  wrap = true
}) => {
  const { theme } = useTheme()

  const activeThemeExts = useMemo(() => {
    return theme === 'light' ? relayLight : relayDark
  }, [theme])

  const extensions = useMemo(() => {
    const exts = [json(), clickableLinkPlugin, jsonCommentPlugin, commentTheme, ...activeThemeExts]
    if (wrap) exts.push(EditorView.lineWrapping)
    return exts
  }, [wrap, activeThemeExts])
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleClose = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('mousedown', handleClose)
      window.addEventListener('scroll', handleClose, true)
    }
    return () => {
      window.removeEventListener('mousedown', handleClose)
      window.removeEventListener('scroll', handleClose, true)
    }
  }, [contextMenu])

  const handleOpenBrowser = (url: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setContextMenu(null)
    }, 1200)
  }

  // Global click & contextmenu delegate for .cm-clickable-link inside this editor
  const handleMouseDownCapture = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest('[data-url]') as HTMLElement | null
    if (!target) return
    const url = target.getAttribute('data-url')
    if (!url) return

    if (e.button === 0) {
      // Left click: Open directly in browser
      e.preventDefault()
      e.stopPropagation()
      handleOpenBrowser(url)
    }
  }

  const handleContextMenuCapture = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest('[data-url]') as HTMLElement | null
    if (!target) return
    const url = target.getAttribute('data-url')
    if (!url) return

    // Right click: Prevent native menu and show custom action popup
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      url
    })
  }

  return (
    <div
      ref={containerRef}
      onMouseDownCapture={handleMouseDownCapture}
      onContextMenuCapture={handleContextMenuCapture}
      className={`flex flex-col h-full overflow-hidden border rounded-lg relative ${
        theme === 'light' ? 'bg-white border-slate-700/80' : 'bg-slate-900 border-slate-800'
      }`}
    >
      {/* CodeMirror Area */}
      <div className="flex-1 overflow-auto text-xs font-mono select-text">
        <CodeMirror
          value={value}
          height={height}
          minHeight={minHeight}
          theme={theme === 'light' ? relayLightTheme : relayTheme}
          extensions={extensions}
          onChange={(val) => onChange && onChange(val)}
          readOnly={readOnly}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: !readOnly,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
            tabSize: 2
          }}
        />
      </div>

      {/* Right-click Link Action Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 150),
            zIndex: 9999
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700/90 rounded-lg shadow-2xl py-1.5 w-56 flex flex-col gap-0.5 text-xs select-none backdrop-blur-md animate-in fade-in duration-100"
        >
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800 truncate font-mono mb-1">
            {contextMenu.url}
          </div>

          {/* Option 1: Open in default browser */}
          <button
            type="button"
            onClick={() => {
              handleOpenBrowser(contextMenu.url)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-sky-500/20 hover:text-sky-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span>Open in Browser</span>
          </button>

          {/* Option 2: Open as new request in Relay */}
          {onOpenUrlInRelay && (
            <button
              type="button"
              onClick={() => {
                onOpenUrlInRelay(contextMenu.url)
                setContextMenu(null)
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open in Relay as Request</span>
            </button>
          )}

          {/* Option 3: Copy link */}
          <button
            type="button"
            onClick={() => handleCopyLink(contextMenu.url)}
            className="flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied to clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Link URL</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}