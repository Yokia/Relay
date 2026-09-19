import React from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

interface Props {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none select-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={"pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md " +
            (t.type === 'success'
              ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-700/60 dark:text-emerald-200"
              : t.type === 'error'
              ? "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/90 dark:border-rose-700/60 dark:text-rose-200"
              : "bg-slate-900/90 border-slate-700 text-slate-200")
          }
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />}
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />}
          <span className="pr-1">{t.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-200 ml-auto -mr-1 p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}