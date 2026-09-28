const WebSocket = require('ws')

const PORT = process.env.PORT || 8080
const wss = new WebSocket.Server({ port: PORT })

console.log('='.repeat(55))
console.log(`🚀 Relay WebSocket Test Server is running!`)
console.log(`👉 Address: ws://localhost:${PORT}`)
console.log(`👉 Features:`)
console.log(`   - Handshake headers inspection`)
console.log(`   - Automatic Echo of sent text / JSON messages`)
console.log(`   - Periodic ticker message every 5s`)
console.log(`   - Ping / Pong frame support`)
console.log('='.repeat(55))

let clientCount = 0

wss.on('connection', (ws, req) => {
  clientCount++
  const clientId = clientCount
  const clientIp = req.socket.remoteAddress
  console.log(`\n[+] Client #${clientId} connected from ${clientIp}`)

  // Log incoming handshake headers
  if (req.headers) {
    console.log(`    Headers:`, {
      authorization: req.headers['authorization'],
      'sec-websocket-protocol': req.headers['sec-websocket-protocol'],
      cookie: req.headers['cookie'],
      'user-agent': req.headers['user-agent']
    })
  }

  // Send a welcome message
  ws.send(
    JSON.stringify({
      event: 'welcome',
      message: '🎉 Successfully connected to Relay Local WebSocket Test Server!',
      clientId,
      receivedHeaders: {
        authorization: req.headers['authorization'] || null,
        protocol: req.headers['sec-websocket-protocol'] || null,
        cookie: req.headers['cookie'] || null
      },
      timestamp: Date.now()
    })
  )

  // Start a periodic ticker message every 5 seconds so client can see real-time stream
  const tickerInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          event: 'ticker',
          serverTime: new Date().toLocaleTimeString(),
          msgCount: ws._msgCount || 0,
          timestamp: Date.now()
        })
      )
    }
  }, 5000)

  // Receive message
  ws.on('message', (message) => {
    ws._msgCount = (ws._msgCount || 0) + 1
    const rawStr = message.toString()
    console.log(`[Message from #${clientId}]:`, rawStr)

    let parsed = null
    try {
      parsed = JSON.parse(rawStr)
    } catch {
      // plain text
    }

    // Echo back with metadata
    if (parsed) {
      ws.send(
        JSON.stringify({
          event: 'echo',
          original: parsed,
          serverTime: new Date().toLocaleTimeString(),
          timestamp: Date.now()
        })
      )
    } else {
      ws.send(
        JSON.stringify({
          event: 'echo',
          text: rawStr,
          serverTime: new Date().toLocaleTimeString(),
          timestamp: Date.now()
        })
      )
    }
  })

  // Ping frame
  ws.on('ping', (data) => {
    console.log(`[Ping from #${clientId}]:`, data.toString())
  })

  // Disconnect
  ws.on('close', (code, reason) => {
    clearInterval(tickerInterval)
    console.log(`[-] Client #${clientId} disconnected (code: ${code}, reason: "${reason.toString()}")`)
  })

  ws.on('error', (err) => {
    console.error(`[!] Error from Client #${clientId}:`, err.message)
  })
})

process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket test server...')
  wss.close(() => {
    process.exit(0)
  })
})
