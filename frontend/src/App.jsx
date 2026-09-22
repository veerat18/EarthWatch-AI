import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/health')
      .then((res) => res.json())
      .then((data) => {
        setBackendStatus(`${data.project} (${data.status})`)
      })
      .catch(() => {
        setBackendStatus('Backend offline or unreachable')
      })
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header>
        <h1>EarthWatch AI</h1>
        <p>AI-Powered Geospatial Intelligence Platform</p>
      </header>

      <main style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Foundation Setup</h2>
        <p>
          <strong>Backend Health Status:</strong> {backendStatus}
        </p>
        <p>
          Basic frontend scaffolded with React + Vite. Awaiting subsequent pipeline stages.
        </p>
      </main>
    </div>
  )
}

export default App
