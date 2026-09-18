import React, { useMemo, useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { MatchDecorator, ViewPlugin, Decoration, EditorView } from '@codemirror/view'
import { ExternalLink, Plus, Copy, Check } from 'lucide-react'

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
  const extensions = useMemo(() => {
    const exts = [json(), clickableLinkPlugin]
    if (wrap) exts.push(EditorView.lineWrapping)
    return exts
  }, [wrap])
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
      className="flex flex-col h-full overflow-hidden border border-slate-800 rounded-lg bg-[#282c34] relative"
    >
      {/* CodeMirror Area */}
      <div className="flex-1 overflow-auto text-xs font-mono select-text">
        <CodeMirror
          value={value}
          height={height}
          minHeight={minHeight}
          theme={oneDark}
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