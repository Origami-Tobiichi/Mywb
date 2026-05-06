import { useState } from 'react'
import styles from '../styles/Home.module.css'

const METHODS = [
  { value: 'flood', label: 'Standard HTTP Flood' },
  { value: 'hashdos', label: 'Hash Collision DoS' },
  { value: 'slowread', label: 'Slow Read Attack' },
  { value: 'smuggle', label: 'HTTP Request Smuggling' },
  { value: 'paretoflood', label: 'Pareto Flood (bypass rate limit)' },
  { value: 'zipbomb', label: 'Decompression Bomb' },
  { value: 'rapidreset', label: 'Rapid Reset (HTTP/2)' },
  { value: 'pipeline', label: 'HTTP Pipelining' },
  { value: 'originbypass', label: 'Bypass CDN (origin IP)' },
  { value: 'tlsflood', label: 'TLS Handshake Flood' },
  { value: 'cachepoison', label: 'Cache Poison' },
  { value: 'apachekiller', label: 'Apache Killer' },
  { value: 'nginxkiller', label: 'NGINX Killer (Range overlapping)' },
  { value: 'randombrowser', label: 'Random Fingerprint' },
  { value: 'multivector', label: 'Multi-Vector (HTTP mix)' },
]

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']

export default function Home() {
  const [target, setTarget] = useState('')
  const [attackMethod, setAttackMethod] = useState('flood')
  const [httpMethod, setHttpMethod] = useState('GET')
  const [threads, setThreads] = useState(50)        // default 50
  const [duration, setDuration] = useState(60)       // default 60
  const [useProxy, setUseProxy] = useState(false)
  const [proxies, setProxies] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [liveStats, setLiveStats] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setLiveStats(null)

    const proxyList = useProxy ? proxies.split('\n').map(p => p.trim()).filter(Boolean) : []

    const body = {
      target,
      method: attackMethod,
      httpMethod,
      threads: Number(threads),
      duration: Number(duration),
      proxies: proxyList
    }

    try {
      const res = await fetch('/api/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            try {
              const data = JSON.parse(line.trim().slice(5))
              if (data.final) {
                setResult(data)
                setLiveStats(null)
              } else {
                setLiveStats(data)
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>⚡ Layer 7 Stress Tester</h1>
        <p className={styles.description}>
          Uji ketahanan server web dengan berbagai metode HTTP attack. <strong>Hanya untuk server yang Anda miliki izin.</strong>
        </p>
        <p className={styles.warning}>
          ⚠️ Layer 3/4 (SYN flood, UDP, ICMP, amplifikasi) tidak tersedia di Vercel karena keterbatasan serverless.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Target URL</label>
            <input type="url" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://example.com" required />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Attack Method</label>
              <select value={attackMethod} onChange={(e) => setAttackMethod(e.target.value)}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>HTTP Method</label>
              <select value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)}>
                {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Concurrency (threads) – Maks 500</label>
              <input type="number" min="1" max="500" value={threads} onChange={(e) => setThreads(Number(e.target.value))} required />
            </div>
            <div className={styles.inputGroup}>
              <label>Duration (detik) – Maks 3600</label>
              <input type="number" min="5" max="3600" value={duration} onChange={(e) => setDuration(Number(e.target.value))} required />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label>
              <input type="checkbox" checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} />
              Gunakan HTTP Proxy (rotasi)
            </label>
          </div>

          {useProxy && (
            <div className={styles.inputGroup}>
              <label>Daftar Proxy (satu per baris, format http://user:pass@host:port)</label>
              <textarea value={proxies} onChange={(e) => setProxies(e.target.value)} rows={4}
                placeholder="http://proxy1.com:8080&#10;http://proxy2.net:3128" />
            </div>
          )}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Menyerang...' : 'Mulai Stress Test'}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {liveStats && (
          <div className={styles.results}>
            <h2>Statistik Real-Time</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span>Total Request</span>
                <strong>{liveStats.total}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Sukses</span>
                <strong>{liveStats.success}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Gagal</span>
                <strong>{liveStats.failed}</strong>
              </div>
              <div className={styles.statCard}>
                <span>RPS</span>
                <strong>{liveStats.rps}</strong>
              </div>
              <div className={styles.statCard}>
                <span>Elapsed</span>
                <strong>{liveStats.elapsed}s</strong>
              </div>
            </div>
          </div>
        )}

        {result && !liveStats && (
          <div className={styles.results}>
            <h2>Hasil Akhir</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}><span>Total</span><strong>{result.total}</strong></div>
              <div className={styles.statCard}><span>Sukses</span><strong>{result.success}</strong></div>
              <div className={styles.statCard}><span>Gagal</span><strong>{result.failed}</strong></div>
              <div className={styles.statCard}><span>Durasi</span><strong>{result.duration}s</strong></div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
