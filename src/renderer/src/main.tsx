import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ResponsePopoutWindow } from './components/ResponsePopoutWindow'
import { HistoryPopoutWindow } from './components/HistoryPopoutWindow'
import { HelpPopoutWindow } from './components/HelpPopoutWindow'
import { DevToysPopoutWindow } from './components/DevToysPopoutWindow'
import './index.css'

const urlParams = new URLSearchParams(window.location.search)
const view = urlParams.get('view')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {view === 'response-popout' ? (
      <ResponsePopoutWindow />
    ) : view === 'history-popout' ? (
      <HistoryPopoutWindow />
    ) : view === 'help-window' ? (
      <HelpPopoutWindow />
    ) : view === 'devtoys' ? (
      <DevToysPopoutWindow />
    ) : (
      <App />
    )}
  </React.StrictMode>
)
