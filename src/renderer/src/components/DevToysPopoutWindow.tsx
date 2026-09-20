import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Theme, Language } from '../types'
import { I18nProvider, useI18n } from '../i18n'
import { ThemeProvider, useTheme } from '../theme'
import { DevToysContent } from './DevToysModal'
import { ToastContainer, ToastMessage } from './Toast'

function DevToysPopoutBody() {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 font-sans text-slate-100 relative">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Floating Theme Switcher at bottom-right corner for convenient toggling */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed bottom-4 right-5 z-40 p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs backdrop-blur-sm"
        title={t('common.toggleTheme')}
      >
        {theme === 'light' ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-medium">{t('common.themeLight')}</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-medium">{t('common.themeDark')}</span>
          </>
        )}
      </button>

      {/* Main Tool Area */}
      <div className="flex-1 h-full overflow-hidden">
        <DevToysContent isPopout onToast={addToast} />
      </div>
    </div>
  )
}

export const DevToysPopoutWindow: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('relay_theme') as Theme) || 'dark')
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('relay_language') as Language) || 'zh-CN')
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
      }).catch((err: any) => {
        console.error('Failed to load settings in DevToys window', err)
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
    <I18nProvider language={language}>
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <DevToysPopoutBody />
      </ThemeProvider>
    </I18nProvider>
  )
}
