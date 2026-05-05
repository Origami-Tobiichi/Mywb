
import { useState } from 'react'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1')
  const [method, setMethod] = useState('GET')
  const [total, setTotal] = useState(50)
  const [concurrency, setConcurrency] = useState(10)
  const [timeout, setTimeout] = useState(10000) // ms
  const [headers, setHeaders] = useState([{ key: '', value: '' }])
  const [body, setBody] = useState('')
  const [contentType, setContentType] = useState('application/json')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  const methodsWithBody = ['POST', 'PUT', 'PATCH']

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }])
  const removeHeader = (index) => setHeaders(headers.filter((_, i) => i !== index))
  const updateHeader = (index, field, value) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    // Filter empty headers
    const sanitizedHeaders = {}
    headers.forEach(({ key, value }) => {
      if (key.trim()) sanitizedHeaders[key.trim()] = value.trim()
    })

    // Auto-set Content-Type if user didn't
    if (methodsWithBody.includes(method) && body && !sanitizedHeaders['Content-Type']) {
      sanitizedHeaders['Content-Type'] = contentType
    }

    try {
      const res = await fetch('/api/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          total,
          concurrency,
          timeout,
          headers: sanitizedHeaders,
          body: methodsWithBody.includes(method) ? body : undefined
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Request failed')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const stats = result ? computeStats(result.results, result.totalTime) : null

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>⚡ Advanced Stress Tester</h1>
        <p className={styles.description}>
          Uji ketahanan server dengan berbagai method dan header kustom.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Target URL</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>HTTP Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
                <option>HEAD</option>
                <option>OPTIONS</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Total Request</label>
              <input type="number" min="1" max="500" value={total} onChange={(e) => setTotal(Number(e.target.value))} required />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Concurrency</label>
              <input type="number" min="1" max="100" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Timeout (ms)</label>
              <input type="number" min="500" max="30000" value={timeout} onChange={(e) => setTimeout(Number(e.target.value))} required />
            </div>
          </div>

          <div className={styles.section}>
            <h3>Custom Headers</h3>
            {headers.map((h, i) => (
              <div key={i} className={styles.headerRow}>
                <input placeholder="Key" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} />
                <input placeholder="Value" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} />
                {headers.length > 1 && <button type="button" onClick={() => removeHeader(i)} className={styles.btnSmall}>✕</button>}
              </div>
            ))}
            <button type="button" onClick={addHeader} className={styles.btnSmall}>+ Tambah Header</button>
          </div>

          {methodsWithBody.includes(method) && (
            <div className={styles.section}>
              <div className={styles.inputGroup}>
                <label>Request Body (opsional)</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder='{"key":"value"}' />
              </div>
              <div className={styles.inputGroup}>
                <label>Content-Type</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                  <option value="application/json">application/json</option>
                  <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                  <option value="text/plain">text/plain</option>
                  <option value="application/xml">application/xml</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Menyerang...' : 'Mulai Stress Test'}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {stats && (
          <div className={styles.results}>
            <h2>Hasil Stress Test</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span>Total Waktu</span>
                <strong>{stats.totalTime} ms</strong>
              </div>
              <div className={styles.statCard}>
                <span>Sukses</span>
                <strong>{stats.successCount} / {stats.total}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Gagal</span>
                <strong>{stats.failCount}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Avg. Response</span>
                <strong>{stats.avgTime} ms</strong>
              </div>
              <div className={styles.statCard}>
                <span>Min</span>
                <strong>{stats.minTime} ms</strong>
              </div>
              <div className={styles.statCard}>
                <span>Max</span>
                <strong>{stats.maxTime} ms</strong>
              </div>
            </div>

            <h3 style={{ marginTop: '1.5rem' }}>Distribusi Status Code</h3>
            <table className={styles.statusTable}>
              <thead>
                <tr><th>Status</th><th>Jumlah</th></tr>
              </thead>
              <tbody>
                {Object.entries(stats.statusCounts).map(([code, count]) => (
                  <tr key={code}><td>{code}</td><td>{count}</td></tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => setShowRaw(!showRaw)} className={styles.btnSmall}>
                {showRaw ? 'Sembunyikan Detail' : 'Lihat Detail Tiap Request'}
              </button>
              {showRaw && (
                <div className={styles.rawLog}>
                  {result.results.map((r, i) => (
                    <div key={i} className={styles.logItem}>
                      [<span className={r.success ? styles.success : styles.fail}>{r.status}</span>] {r.time}ms {r.error ? ` – ${r.error}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function computeStats(results, totalTime) {
  const total = results.length
  const success = results.filter(r => r.success).length
  const fail = total - success
  const times = results.map(r => r.time).filter(t => t > 0)
  const avg = times.length ? Math.round(times.reduce((a,b)=>a+b,0) / times.length) : 0
  const min = times.length ? Math.min(...times) : 0
  const max = times.length ? Math.max(...times) : 0

  // Status code distribution
  const statusCounts = {}
  results.forEach(r => {
    const code = r.status || 'Error'
    statusCounts[code] = (statusCounts[code] || 0) + 1
  })

  return { total, successCount: success, failCount: fail, totalTime, avgTime: avg, minTime: min, maxTime: max, statusCounts }
}
