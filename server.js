const express = require('express')
const next = require('next')
const { createServer } = require('http')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()
  const httpServer = createServer(server)

  // Parse JSON bodies
  server.use(express.json())

  // Handle all routes through Next.js
  server.all('*', (req, res) => {
    return handle(req, res)
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`)
    
    // Log Redis connection status
    const redisUrl = process.env.REDIS_URL
    if (redisUrl && redisUrl !== 'optional') {
      console.log('> Redis URL configured for job queue')
    } else {
      console.log('> No Redis URL - using in-memory queue')
    }
  })
})