import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ResponsePopoutWindow } from './components/ResponsePopoutWindow'
import './index.css'

const urlParams = new URLSearchParams(window.location.search)
const isPopoutView = urlParams.get('view') === 'response-popout'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isPopoutView ? <ResponsePopoutWindow /> : <App />}
  </React.StrictMode>
)
