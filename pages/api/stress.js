export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { url, method = 'GET', total, concurrency, timeout = 10000, headers = {}, body } = req.body

  if (!url || !total || !concurrency) {
    return res.status(400).json({ message: 'url, total, concurrency wajib diisi' })
  }

  const maxTotal = 500
  const maxConcurrency = 100
  const maxBodyLength = 100000 // 100KB

  if (total < 1 || total > maxTotal) {
    return res.status(400).json({ message: `total request antara 1 - ${maxTotal}` })
  }
  if (concurrency < 1 || concurrency > maxConcurrency) {
    return res.status(400).json({ message: `concurrency antara 1 - ${maxConcurrency}` })
  }
  if (body && body.length > maxBodyLength) {
    return res.status(400).json({ message: `Body terlalu besar (maks ${maxBodyLength / 1000}KB)` })
  }

  // Valid method
  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  if (!allowedMethods.includes(method)) {
    return res.status(400).json({ message: 'Method tidak dikenali' })
  }

  const results = []
  let completed = 0
  const startTime = Date.now()

  async function worker() {
    while (completed < total) {
      const current = completed++
      if (current >= total) break

      const reqStart = Date.now()
      try {
        const fetchOptions = {
          method,
          headers: { ...headers },
          signal: AbortSignal.timeout(timeout)
        }

        // Hanya tambahkan body jika method mengizinkan dan body ada
        if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
          fetchOptions.body = body
        }

        const response = await fetch(url, fetchOptions)
        const reqEnd = Date.now()
        results.push({
          status: response.status,
          time: reqEnd - reqStart,
          success: response.ok,
          error: null
        })
      } catch (err) {
        results.push({
          status: 0,
          time: Date.now() - reqStart,
          success: false,
          error: err.message || 'Unknown error'
        })
      }
    }
  }

  // Jalankan worker sebanyak concurrency
  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
  await Promise.all(workers)

  const endTime = Date.now()
  const totalTime = endTime - startTime

  res.status(200).json({
    totalTime,
    results
  })
}
