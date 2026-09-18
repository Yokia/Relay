import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Globe, CheckSquare, Square } from 'lucide-react'
import { Environment } from '../types'
import { useI18n } from '../i18n'

interface Props {
  isOpen: boolean
  environments: Environment[]
  activeEnvId?: string
  onClose: () => void
  onSave: (envs: Environment[], activeId?: string) => void
}

export const EnvironmentModal: React.FC<Props> = ({
  isOpen,
  environments,
  activeEnvId,
  onClose,
  onSave
}) => {
  const { t } = useI18n()
  const [envs, setEnvs] = useState<Environment[]>(() => JSON.parse(JSON.stringify(environments)))
  const [selectedEnvId, setSelectedEnvId] = useState<string>(activeEnvId || (environments[0]?.id || ''))

  useEffect(() => {
    if (isOpen) {
      setEnvs(JSON.parse(JSON.stringify(environments)))
      setSelectedEnvId(activeEnvId || (environments[0]?.id || ''))
    }
  }, [isOpen, environments, activeEnvId])

  if (!isOpen) return null

  const currentEnv = envs.find((e) => e.id === selectedEnvId) || envs[0]

  const handleAddEnv = () => {
    const newEnv: Environment = {
      id: 'env-' + Date.now(),
      name: 'New Environment',
      variables: [{ key: '', value: '', enabled: true }]
    }
    setEnvs([...envs, newEnv])
    setSelectedEnvId(newEnv.id)
  }

  const handleDeleteEnv = (id: string) => {
    if (envs.length <= 1) return
    const next = envs.filter((e) => e.id !== id)
    setEnvs(next)
    if (selectedEnvId === id) {
      setSelectedEnvId(next[0]?.id || '')
    }
  }

  const handleNameChange = (name: string) => {
    if (!currentEnv) return
    currentEnv.name = name
    setEnvs([...envs])
  }

  const handleAddVar = () => {
    if (!currentEnv) return
    currentEnv.variables.push({ key: '', value: '', enabled: true })
    setEnvs([...envs])
  }

  const handleToggleVar = (idx: number) => {
    if (!currentEnv) return
    currentEnv.variables[idx].enabled = !currentEnv.variables[idx].enabled
    setEnvs([...envs])
  }

  const handleKeyChange = (idx: number, val: string) => {
    if (!currentEnv) return
    currentEnv.variables[idx].key = val
    setEnvs([...envs])
  }

  const handleValChange = (idx: number, val: string) => {
    if (!currentEnv) return
    currentEnv.variables[idx].value = val
    setEnvs([...envs])
  }

  const handleDeleteVar = (idx: number) => {
    if (!currentEnv) return
    currentEnv.variables = currentEnv.variables.filter((_, i) => i !== idx)
    setEnvs([...envs])
  }

  const handleSaveAndClose = () => {
    onSave(envs, selectedEnvId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl h-[520px] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>{t('envModal.title')}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="w-48 border-r border-slate-800 p-3 flex flex-col gap-1 bg-slate-950/40">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{t('sidebar.envSettings')}</span>
              <button onClick={handleAddEnv} className="text-sky-400 hover:text-sky-300">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1">
              {envs.map((env) => (
                <div
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={"flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors " + (selectedEnvId === env.id ? "bg-sky-500/20 text-sky-300 font-medium" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200")}
                >
                  <span className="truncate">{env.name || t('common.untitled')}</span>
                  {envs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteEnv(env.id)
                      }}
                      className="hover:text-rose-400 text-slate-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {currentEnv ? (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="mb-4">
                <label className="text-xs text-slate-400 font-medium block mb-1">{t('envModal.envName')}</label>
                <input
                  type="text"
                  value={currentEnv.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-medium pb-1.5 border-b border-slate-800">
                <span className="w-8">{t('envModal.activeCol')}</span>
                <span className="flex-1">{t('envModal.variableCol')}</span>
                <span className="flex-1">{t('envModal.valueCol')}</span>
                <span className="w-8 text-right">{t('envModal.delCol')}</span>
              </div>

              <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1.5 pr-1">
                {currentEnv.variables.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleVar(idx)}
                      className="w-8 flex justify-center text-slate-400 hover:text-slate-200"
                    >
                      {item.enabled ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder="e.g. baseUrl"
                      value={item.key}
                      onChange={(e) => handleKeyChange(idx, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="text"
                      placeholder="e.g. https://api.dev.com"
                      value={item.value}
                      onChange={(e) => handleValChange(idx, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={() => handleDeleteVar(idx)}
                      className="w-8 flex justify-center text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddVar}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('envModal.addVariable')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              {t('envModal.noEnvs')}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white font-medium rounded transition-colors"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}