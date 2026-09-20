import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  BookOpen,
  Search,
  Zap,
  Layers,
  Play,
  History,
  Code,
  ArrowUpDown,
  Sliders,
  Keyboard,
  HelpCircle,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Terminal,
  Compass,
  X,
  Languages,
  ExternalLink
} from 'lucide-react'
import { Theme, Language } from '../types'
import { I18nProvider, useI18n } from '../i18n'
import { ThemeProvider, useTheme } from '../theme'
import { getHelpDoc } from '../i18n/locales/help'

interface HelpSection {
  id: string
  icon: React.ReactNode
  title: string
  tag?: string
  keywords: string[]
  content: React.ReactNode
}

function HelpContent() {
  const { t, language, setLanguage } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [activeSectionId, setActiveSectionId] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const helpDoc = useMemo(() => getHelpDoc(language), [language])

  const scrollToSection = (id: string) => {
    setActiveSectionId(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const sections: HelpSection[] = useMemo(() => [
    {
      id: 'overview',
      icon: <Compass className="w-4 h-4 text-sky-400" />,
      title: helpDoc.overview.title,
      tag: helpDoc.overview.tag,
      keywords: helpDoc.overview.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/25">
            <h4 className="font-semibold text-base text-sky-400 flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-sky-400" />
              {helpDoc.overview.bannerTitle}
            </h4>
            <p className="text-xs text-slate-300 leading-normal">
              {helpDoc.overview.bannerDesc}
            </p>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            {helpDoc.overview.panelsTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{helpDoc.overview.leftNavTitle}</span>
              <p className="text-xs text-slate-400">
                {helpDoc.overview.leftNavDesc}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{helpDoc.overview.centerEditorTitle}</span>
              <p className="text-xs text-slate-400">
                {helpDoc.overview.centerEditorDesc}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{helpDoc.overview.rightPanelTitle}</span>
              <p className="text-xs text-slate-400">
                {helpDoc.overview.rightPanelDesc}
              </p>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            {helpDoc.overview.firstRequestTitle}
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
            <li>
              {helpDoc.overview.step1Prefix} <span className="text-sky-400 font-medium">{helpDoc.overview.step1Btn}</span> {helpDoc.overview.step1Or} <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+T</kbd>{language === 'zh-CN' ? '。' : '.'}
            </li>
            <li>
              {helpDoc.overview.step2Prefix} <code className="text-sky-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono">https://jsonplaceholder.typicode.com/todos/1</code>{language === 'zh-CN' ? '。' : '.'}
            </li>
            <li>
              {helpDoc.overview.step3Prefix} <span className="font-semibold text-sky-400">{helpDoc.overview.step3Btn}</span> {helpDoc.overview.step3Or} <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+Enter</kbd>{language === 'zh-CN' ? '。' : '.'}
            </li>
            <li>{helpDoc.overview.step4}</li>
          </ol>
        </div>
      )
    },
    {
      id: 'request-builder',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      title: helpDoc.requestBuilder.title,
      tag: helpDoc.requestBuilder.tag,
      keywords: helpDoc.requestBuilder.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.requestBuilder.constantsTitle}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.requestBuilder.constantsDesc}
          </p>
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
            <div className="text-slate-500">{helpDoc.requestBuilder.urlExampleComment}</div>
            <div>&#123;&#123;server&#125;&#125;:&#123;&#123;port&#125;&#125;/api/v1/users?token=&#123;&#123;token&#125;&#125;</div>
            <div className="text-emerald-400 pt-1">{helpDoc.requestBuilder.previewExampleComment}</div>
            <div className="text-emerald-400 font-semibold">http://127.0.0.1:8008/api/v1/users?token=secret_9881</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-amber-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                {helpDoc.requestBuilder.presetCandidatesTitle}
              </h5>
              <p className="text-xs text-slate-400">
                {helpDoc.requestBuilder.presetCandidatesDesc}
              </p>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-sky-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                {helpDoc.requestBuilder.overrideTitle}
              </h5>
              <p className="text-xs text-slate-400">
                {helpDoc.requestBuilder.overrideDesc}
              </p>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            {helpDoc.requestBuilder.jsonCommentsTitle}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.requestBuilder.jsonCommentsDesc}{' '}
            <code className="text-slate-200 bg-slate-800 border border-slate-700/60 px-1 py-0.5 rounded font-mono">{helpDoc.requestBuilder.singleLineComment}</code>{' '}
            {language === 'zh-CN' ? '和' : 'and'}{' '}
            <code className="text-slate-200 bg-slate-800 border border-slate-700/60 px-1 py-0.5 rounded font-mono">{helpDoc.requestBuilder.multiLineComment}</code>{language === 'zh-CN' ? '。' : '.'}
          </p>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-slate-300 leading-relaxed">
            <strong className="text-emerald-400 font-semibold">💡 </strong>
            {helpDoc.requestBuilder.smartProtectionTip}
          </div>
        </div>
      )
    },
    {
      id: 'multi-tabs',
      icon: <Layers className="w-4 h-4 text-blue-400" />,
      title: helpDoc.multiTabs.title,
      tag: helpDoc.multiTabs.tag,
      keywords: helpDoc.multiTabs.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.multiTabs.heading}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.multiTabs.desc}
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.multiTabs.newTabTitle}</strong>：{helpDoc.multiTabs.newTabDesc}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.multiTabs.closeTabTitle}</strong>：{helpDoc.multiTabs.closeTabDesc}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.multiTabs.contextMenuTitle}</strong>：{helpDoc.multiTabs.contextMenuDesc}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.multiTabs.unsavedTitle}</strong>：{helpDoc.multiTabs.unsavedDesc}</span>
            </li>
          </ul>

          <div className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/60">
            <h5 className="font-semibold text-xs text-sky-400 mb-1">
              {helpDoc.multiTabs.stateRestorationTitle}
            </h5>
            <p className="text-xs text-slate-400">
              {helpDoc.multiTabs.stateRestorationDesc}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'collection-runner',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      title: helpDoc.collectionRunner.title,
      tag: helpDoc.collectionRunner.tag,
      keywords: helpDoc.collectionRunner.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.collectionRunner.heading}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.collectionRunner.desc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/60">
              <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-emerald-400/20 text-emerald-400" /> {helpDoc.collectionRunner.method1Title}
              </div>
              <p className="text-xs text-slate-400">
                {helpDoc.collectionRunner.method1Desc}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/60">
              <div className="text-xs font-semibold text-sky-400 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> {helpDoc.collectionRunner.method2Title}
              </div>
              <p className="text-xs text-slate-400">
                {helpDoc.collectionRunner.method2Desc}
              </p>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            {helpDoc.collectionRunner.reportsHeading}
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li><strong>{helpDoc.collectionRunner.itemDashboardTitle}</strong>：{helpDoc.collectionRunner.itemDashboardDesc}</li>
            <li><strong>{helpDoc.collectionRunner.itemStopOnErrorTitle}</strong>：{helpDoc.collectionRunner.itemStopOnErrorDesc}</li>
            <li><strong>{helpDoc.collectionRunner.itemPopoutTitle}</strong>：{helpDoc.collectionRunner.itemPopoutDesc}</li>
            <li><strong>{helpDoc.collectionRunner.itemExportTitle}</strong>：{helpDoc.collectionRunner.itemExportDesc}</li>
          </ul>
        </div>
      )
    },
    {
      id: 'history-popout',
      icon: <History className="w-4 h-4 text-purple-400" />,
      title: helpDoc.historyPopout.title,
      tag: helpDoc.historyPopout.tag,
      keywords: helpDoc.historyPopout.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.historyPopout.heading}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.historyPopout.desc}
          </p>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            {helpDoc.historyPopout.popoutHeading}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.historyPopout.popoutDesc}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-purple-400 mb-1">{helpDoc.historyPopout.filterCardTitle}</h5>
              <p className="text-xs text-slate-400">
                {helpDoc.historyPopout.filterCardDesc}
              </p>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-sky-400 mb-1">{helpDoc.historyPopout.restoreCardTitle}</h5>
              <p className="text-xs text-slate-400">
                {helpDoc.historyPopout.restoreCardDesc}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'command-palette',
      icon: <Search className="w-4 h-4 text-sky-400" />,
      title: helpDoc.commandPalette.title,
      tag: helpDoc.commandPalette.tag,
      keywords: helpDoc.commandPalette.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.commandPalette.heading}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.commandPalette.desc}
          </p>
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono font-semibold">Ctrl+P</kbd>
              <span className="text-slate-400">{helpDoc.commandPalette.triggerDesc}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sky-400 font-semibold">{language === 'zh-CN' ? '模糊检索' : 'Fuzzy Search'}</span>
              <span className="text-slate-400">{helpDoc.commandPalette.fuzzyDesc}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{language === 'zh-CN' ? '键盘操控' : 'Keyboard'}</span>
              <span className="text-slate-400">
                {helpDoc.commandPalette.keyboardDesc} <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Enter</kbd> {helpDoc.commandPalette.keyboardAction} <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Esc</kbd> {helpDoc.commandPalette.keyboardEsc}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'code-and-data',
      icon: <Code className="w-4 h-4 text-amber-400" />,
      title: helpDoc.codeAndData.title,
      tag: helpDoc.codeAndData.tag,
      keywords: helpDoc.codeAndData.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.codeAndData.codeHeading}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.codeAndData.codeDesc}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {helpDoc.codeAndData.languages.map((lang) => (
              <span key={lang} className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded text-slate-300 font-medium">
                {lang}
              </span>
            ))}
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            {helpDoc.codeAndData.dataHeading}
          </h3>
          <p className="text-xs text-slate-300">
            {helpDoc.codeAndData.dataDesc}
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li><strong>{helpDoc.codeAndData.backupTitle}</strong>：{helpDoc.codeAndData.backupDesc}</li>
            <li><strong>{helpDoc.codeAndData.collectionOnlyTitle}</strong>：{helpDoc.codeAndData.collectionOnlyDesc}</li>
            <li><strong>{helpDoc.codeAndData.curlImportTitle}</strong>：{helpDoc.codeAndData.curlImportDesc}</li>
          </ul>
        </div>
      )
    },
    {
      id: 'layout-customization',
      icon: <Sliders className="w-4 h-4 text-rose-400" />,
      title: helpDoc.layoutCustomization.title,
      tag: helpDoc.layoutCustomization.tag,
      keywords: helpDoc.layoutCustomization.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.layoutCustomization.heading}
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.layoutCustomization.sidebarResizeTitle}</strong>：{helpDoc.layoutCustomization.sidebarResizeDesc}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.layoutCustomization.splitPaneResizeTitle}</strong>：{helpDoc.layoutCustomization.splitPaneResizeDesc}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.layoutCustomization.globalMemoryTitle}</strong>：{helpDoc.layoutCustomization.globalMemoryDesc}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>{helpDoc.layoutCustomization.dualThemeTitle}</strong>：{helpDoc.layoutCustomization.dualThemeDesc}</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'shortcuts-cheat-sheet',
      icon: <Keyboard className="w-4 h-4 text-cyan-400" />,
      title: helpDoc.shortcutsCheatSheet.title,
      tag: helpDoc.shortcutsCheatSheet.tag,
      keywords: helpDoc.shortcutsCheatSheet.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.shortcutsCheatSheet.heading}
          </h3>
          <div className="overflow-hidden border border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">{helpDoc.shortcutsCheatSheet.thShortcut}</th>
                  <th className="px-3 py-2.5">{helpDoc.shortcutsCheatSheet.thFunction}</th>
                  <th className="px-3 py-2.5">{helpDoc.shortcutsCheatSheet.thContext}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {helpDoc.shortcutsCheatSheet.shortcuts.map((sc, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-mono font-medium text-sky-400">{sc.key}</td>
                    <td className="px-3 py-2 text-slate-200 font-medium">{sc.func}</td>
                    <td className="px-3 py-2 text-slate-400">{sc.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      icon: <HelpCircle className="w-4 h-4 text-emerald-400" />,
      title: helpDoc.faq.title,
      tag: helpDoc.faq.tag,
      keywords: helpDoc.faq.keywords,
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            {helpDoc.faq.heading}
          </h3>
          <div className="space-y-3">
            {helpDoc.faq.items.map((item, idx) => {
              const borderColors = ['text-sky-400', 'text-amber-400', 'text-purple-400']
              const color = borderColors[idx % borderColors.length]
              return (
                <div key={idx} className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
                  <h5 className={`font-semibold text-xs ${color} mb-1`}>
                    {item.q}
                  </h5>
                  <p className="text-xs text-slate-300 leading-normal">
                    {item.a}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
  ], [helpDoc, language])

  // Filter sections according to search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q))
      )
    })
  }, [sections, searchQuery])

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 select-none overflow-hidden font-sans">
      {/* Top Navigation Header */}
      <header className="h-12 px-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3 font-bold text-sm text-slate-100">
          <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-md shadow-sky-500/20">
            R
          </div>
          <div className="flex flex-col">
            <span className="leading-none text-slate-100 font-bold">{t('help.docsTitle')}</span>
            <span className="text-[10px] text-slate-500 font-normal">{t('help.docsSubtitle')}</span>
          </div>
        </div>

        {/* Global Search inside Docs */}
        <div className="relative w-80 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('help.searchPlaceholder')}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Quick Language Switcher */}
          <button
            type="button"
            onClick={() => {
              const nextLang = language === 'zh-CN' ? 'en-US' : 'zh-CN'
              setLanguage(nextLang)
              if (window.electronAPI?.saveSettings) {
                window.electronAPI.getData().then((data: any) => {
                  const settings = data?.settings || {}
                  window.electronAPI.saveSettings({ ...settings, language: nextLang })
                }).catch(() => {})
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 transition-colors text-xs font-semibold cursor-pointer"
            title={language === 'zh-CN' ? 'Switch to English' : '切换到中文'}
          >
            <Languages className="w-3.5 h-3.5 text-sky-400" />
            <span>{language === 'zh-CN' ? 'English' : '中文'}</span>
          </button>

          {/* Theme Toggle */}
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
        </div>
      </header>

      {/* Main Body: Sidebar Table of Contents + Rich Document Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left TOC Sidebar */}
        <aside className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 select-none">
          <div className="p-3 border-b border-slate-800/80 text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              {t('help.quickJump')} ({filteredSections.length})
            </span>
            {searchQuery && (
              <span className="text-[10px] text-sky-400 font-normal">{t('help.filtered')}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSections.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {t('help.noResults')}
              </div>
            ) : (
              filteredSections.map((section) => {
                const isActive = activeSectionId === section.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer group ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {section.icon}
                      <span className="truncate">{section.title}</span>
                    </div>
                    {section.tag && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700/60 text-slate-400 shrink-0 font-normal">
                        {section.tag}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Sidebar Footer Hint & Developer Info */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500 space-y-1 text-center">
            <div>{helpDoc.footerHint}</div>
            <div className="pt-1 flex items-center justify-center gap-1.5 text-slate-400 font-mono text-[10px]">
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 font-semibold">v1.0.0</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  window.electronAPI?.openExternal?.('https://www.yokiasoft.com')
                }}
                className="text-slate-400 hover:text-sky-400 transition-colors inline-flex items-center gap-0.5 cursor-pointer font-sans"
              >
                <span>© 2026 yokiasoft</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
              </button>
            </div>
          </div>
        </aside>

        {/* Right Documentation Panels */}
        <main
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 select-text bg-slate-900/30 scroll-smooth"
        >
          {filteredSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm scroll-mt-6"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800 text-sky-400 border border-slate-700/60">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-100">{section.title}</h2>
                  </div>
                </div>
                {section.tag && (
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                    {section.tag}
                  </span>
                )}
              </div>

              {section.content}
            </section>
          ))}
        </main>
      </div>
    </div>
  )
}

export const HelpPopoutWindow: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark')
  const [language, setLanguage] = useState<Language>('zh-CN')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getData().then((data: any) => {
        if (data?.settings?.theme) {
          setTheme(data.settings.theme)
        }
        if (data?.settings?.language) {
          setLanguage(data.settings.language)
        }
      }).catch((err) => {
        console.error('Failed to load settings in Help window', err)
      }).finally(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <I18nProvider language={language} onLanguageChange={setLanguage}>
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <HelpContent />
      </ThemeProvider>
    </I18nProvider>
  )
}
