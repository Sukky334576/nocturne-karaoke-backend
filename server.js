const express = require('express');
const yts = require('yt-search');
const https = require('https');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3300;

// Global Permissive CORS for Cloud / Vercel / Render and Cross-Origin Streaming
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Determine path to local binaries
const localYtDlp = path.join(__dirname, 'bin', 'yt-dlp.exe');
const ytDlpPath = fs.existsSync(localYtDlp) ? localYtDlp : 'yt-dlp';

const localFfmpeg = path.join(__dirname, 'bin', 'ffmpeg.exe');
const ffmpegPath = fs.existsSync(localFfmpeg) ? localFfmpeg : 'ffmpeg';

// In-Memory Search & Stream Cache with LRU Size Bound (Max 300 entries, TTL: 4 hours)
const searchCache = new Map();
const streamCache = new Map();

function setBoundedCache(map, key, value, maxEntries = 300) {
  if (map.size >= maxEntries) {
    const firstKey = map.keys().next().value;
    map.delete(firstKey);
  }
  map.set(key, value);
}

// Input Validator for YouTube IDs and URLs (Defense-in-Depth against argument injection)
function isValidYouTubeIdOrUrl(str) {
  if (!str || typeof str !== 'string') return false;
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return true;
  if (/^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(str)) return true;
  return false;
}

// Ultra-Fast YouTube Search via Direct InnerTube API (~150-300ms)
function fastYoutubeSearch(query) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.01.00',
          hl: 'th',
          gl: 'TH'
        }
      },
      query: query
    });

    const req = https.request({
      hostname: 'www.youtube.com',
      path: '/youtubei/v1/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 7500
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const secList = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
          const videos = [];
          secList.forEach(s => {
            const items = s.itemSectionRenderer?.contents || [];
            items.forEach(it => {
              const v = it.videoRenderer;
              if (v && v.videoId) {
                const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || '';
                const author = v.ownerText?.runs?.map(r => r.text).join('') || '';
                const duration = v.lengthText?.simpleText || '4:00';
                const parts = duration.split(':').map(Number);
                let seconds = 240;
                if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
                else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                const thumb = v.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
                videos.push({ id: v.videoId, title, url: `https://youtube.com/watch?v=${v.videoId}`, duration, seconds, author, thumbnail: thumb });
              }
            });
          });
          if (videos.length > 0) return resolve(videos.slice(0, 15));
          reject(new Error('No videos found in InnerTube response'));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('InnerTube search timeout')); });
    req.on('error', err => reject(err));
    req.write(payload);
    req.end();
  });
}

// Upstream Fallback Audio Stream Finder (for Cloud / Render datacenter IPs)
async function fetchUpstreamFallbackStream(videoId) {
  const upstreamInstances = [
    `https://yt.chocolatemoo53.com/latest_version?id=${videoId}&itag=140`,
    `https://invidious.tiekoetter.com/latest_version?id=${videoId}&itag=140`,
    `https://inv.nadeko.net/latest_version?id=${videoId}&itag=140`,
    `https://invidious.nerdvpn.de/latest_version?id=${videoId}&itag=140`,
    `https://inv.zzls.xyz/latest_version?id=${videoId}&itag=140`
  ];

  for (const candidate of upstreamInstances) {
    try {
      const streamUrl = await new Promise((resolve, reject) => {
        const req = https.get(candidate, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          timeout: 3500
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = new URL(res.headers.location, candidate).href;
            resolve(loc);
          } else if (res.statusCode === 200) {
            resolve(candidate);
          } else {
            reject(new Error('Status ' + res.statusCode));
          }
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      if (streamUrl && streamUrl.startsWith('http')) {
        return streamUrl;
      }
    } catch (e) {
      // try next candidate
    }
  }
  return null;
}

function runYtDlpExtract(clientArgs, targetUrl) {
  return new Promise((resolve, reject) => {
    const args = [
      '--no-update',
      '--js-runtimes', 'node',
      '--extractor-args', clientArgs,
      '--geo-bypass',
      '-f', '18/ba/b',
      '-g',
      '--no-playlist'
    ];

    const proxy = process.env.YOUTUBE_PROXY || process.env.PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      args.push('--proxy', proxy);
    }

    if (process.env.PO_TOKEN) {
      args.push('--extractor-args', `youtube:po_token=${process.env.PO_TOKEN}`);
    }

    if (process.env.COOKIES_FILE && fs.existsSync(process.env.COOKIES_FILE)) {
      args.push('--cookies', process.env.COOKIES_FILE);
    }

    args.push('--', targetUrl);

    execFile(ytDlpPath, args, { timeout: 8000 }, (error, stdout, stderr) => {
      if (error) return reject(stderr || error.message);
      const streamUrl = stdout.trim().split('\n').filter(l => l.startsWith('http'))[0];
      if (!streamUrl) return reject(new Error('No stream URL returned'));
      resolve(streamUrl);
    });
  });
}

async function extractStreamUrl(targetUrl) {
  const cached = streamCache.get(targetUrl);
  if (cached && (Date.now() - cached.time < 4 * 60 * 60 * 1000)) {
    return cached.url;
  }

  // 1. Try resilient client configs with yt-dlp
  const clientConfigs = [
    'youtube:player_client=android,web',
    'youtube:player_client=android_vr,web_embedded,android,web',
    'youtube:player_client=android_embedded,android,web',
    'youtube:player_client=ios,mweb',
    'youtube:player_client=tv,android'
  ];

  for (const clientArgs of clientConfigs) {
    try {
      const streamUrl = await runYtDlpExtract(clientArgs, targetUrl);
      if (streamUrl) {
        setBoundedCache(streamCache, targetUrl, { url: streamUrl, time: Date.now() }, 100);
        return streamUrl;
      }
    } catch (e) {
      // try next config
    }
  }

  // 2. If yt-dlp encounters datacenter blocks on Cloud, try upstream fallback streams
  const match = targetUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    try {
      const upstreamUrl = await fetchUpstreamFallbackStream(match[1]);
      if (upstreamUrl) {
        setBoundedCache(streamCache, targetUrl, { url: upstreamUrl, time: Date.now() }, 100);
        return upstreamUrl;
      }
    } catch (e) {
      console.warn('Upstream fallback stream note:', e.message);
    }
  }

  throw new Error('All audio stream extraction strategies exhausted for ' + targetUrl);
}

// API: Search YouTube with Instant Sub-Second InnerTube API & 1ms In-Memory Caching
app.get('/api/search', async (req, res) => {
  const rawQuery = req.query.q;
  if (!rawQuery) return res.status(400).json({ error: 'Query parameter q is required' });
  const query = rawQuery.trim().toLowerCase();

  const cached = searchCache.get(query);
  if (cached && (Date.now() - cached.time < 4 * 60 * 60 * 1000)) {
    return res.json({ videos: cached.videos });
  }

  // 1. Try Fast InnerTube API first (~150-300ms)
  try {
    const videos = await fastYoutubeSearch(rawQuery);
    if (videos && videos.length > 0) {
      setBoundedCache(searchCache, query, { videos, time: Date.now() }, 300);
      return res.json({ videos });
    }
  } catch (err) {
    console.warn('InnerTube fast search note:', err.message);
  }

  // 2. Fallback to yt-search if InnerTube fails
  try {
    const results = await yts(rawQuery);
    const videos = (results.videos || []).slice(0, 15).map(v => ({
      id: v.videoId,
      title: v.title,
      url: v.url,
      duration: v.duration ? v.duration.timestamp : '',
      seconds: v.duration ? v.duration.seconds : 240,
      author: v.author ? v.author.name : '',
      thumbnail: v.thumbnail
    }));

    setBoundedCache(searchCache, query, { videos, time: Date.now() }, 300);
    res.json({ videos });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search YouTube: ' + err.message });
  }
});

function pipeDirectAudioStream(url, res) {
  try {
    const protocol = url.startsWith('https') ? https : http;
    const reqAudio = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        const redirected = new URL(resp.headers.location, url).href;
        return pipeDirectAudioStream(redirected, res);
      }
      if (resp.statusCode !== 200) {
        if (!res.headersSent) res.status(resp.statusCode).send('Audio stream returned ' + resp.statusCode);
        return;
      }
      if (!res.headersSent) {
        res.writeHead(200, {
          'Content-Type': resp.headers['content-type'] || 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'none'
        });
      }
      resp.pipe(res);
    });

    res.on('close', () => {
      if (reqAudio && !reqAudio.destroyed) reqAudio.destroy();
    });

    reqAudio.on('error', (err) => {
      console.error('Direct audio pipe error:', err);
      if (!res.headersSent) res.status(500).send('Direct audio pipe failed: ' + err.message);
    });
  } catch (e) {
    if (!res.headersSent) res.status(500).send('Direct audio pipe failed: ' + e.message);
  }
}

// API: Audio Stream (Direct Pipe via FFmpeg or Direct HTTP Stream)
app.get('/api/audio', async (req, res) => {
  const idOrUrl = req.query.id || req.query.url;
  const startTime = Math.max(0, parseFloat(req.query.t || req.query.start || 0));
  
  if (!idOrUrl || !isValidYouTubeIdOrUrl(idOrUrl)) {
    return res.status(400).send('Valid YouTube video ID or URL required');
  }

  const targetUrl = idOrUrl.startsWith('http') ? idOrUrl : `https://www.youtube.com/watch?v=${idOrUrl}`;

  try {
    const directUrl = await extractStreamUrl(targetUrl);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'none');

    const ffmpegArgs = [
      '-fflags', 'nobuffer',
      '-flags', 'low_delay',
      '-probesize', '64k',
      '-analyzeduration', '0',
      '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n'
    ];

    if (startTime > 0) {
      ffmpegArgs.push('-ss', startTime.toString());
    }

    ffmpegArgs.push(
      '-i', directUrl,
      '-vn',
      '-f', 'mp3',
      '-acodec', 'libmp3lame',
      '-b:a', '192k',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1'
    );

    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    let hasReceivedData = false;
    ffmpegProcess.stdout.on('data', () => {
      hasReceivedData = true;
    });

    ffmpegProcess.stdout.pipe(res);

    req.on('close', () => {
      if (ffmpegProcess && !ffmpegProcess.killed) {
        ffmpegProcess.kill();
      }
    });

    ffmpegProcess.on('error', (err) => {
      console.error('FFmpeg process error, falling back to direct pipe:', err);
      if (!hasReceivedData && !res.headersSent) {
        pipeDirectAudioStream(directUrl, res);
      }
    });

    ffmpegProcess.on('close', (code) => {
      if (code !== 0 && !hasReceivedData && !res.headersSent) {
        console.warn('FFmpeg closed with code', code, 'before streaming data, trying direct pipe...');
        pipeDirectAudioStream(directUrl, res);
      }
    });
  } catch (err) {
    console.error('Audio stream error:', err);
    if (!res.headersSent) res.status(500).send('Error streaming audio: ' + err);
  }
});

// Helper: Get Local IPv4 network addresses for mobile pairing on LAN
function getLocalIpAddresses() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// ==========================================================================
// 📱 SHARED ROOM REMOTE QUEUEING ENGINE (Real-Time SSE + REST)
// ==========================================================================
const rooms = new Map(); // roomCode -> Room Object

function sanitizeText(str, maxLen = 120) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

function normalizeRoomCode(code) {
  if (!code || typeof code !== 'string') return '';
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16);
  if (cleaned === 'NEW') return '';
  return cleaned;
}

function generateRoomCode() {
  const prefixes = ['NOCT', 'KARA', 'SING', 'VOX', 'BEAT', 'STAR'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

function getOrCreateRoom(code, hostName = 'Host') {
  const norm = normalizeRoomCode(code) || generateRoomCode();
  let room = rooms.get(norm);
  if (!room) {
    room = {
      code: norm,
      hostName: sanitizeText(hostName, 32) || 'Host',
      createdAt: Date.now(),
      lastActive: Date.now(),
      currentTrack: null,
      isPlaying: false,
      queue: [],
      allowRemoteControl: true,
      clients: new Set()
    };
    rooms.set(norm, room);
  } else {
    room.lastActive = Date.now();
    if (hostName && hostName !== 'Host') {
      room.hostName = sanitizeText(hostName, 32);
    }
  }
  return room;
}

function broadcastRoomEvent(room, eventName, data) {
  if (!room || !room.clients) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  room.clients.forEach(clientRes => {
    try {
      clientRes.write(payload);
    } catch (e) {
      room.clients.delete(clientRes);
    }
  });
}

function getRoomSnapshot(room) {
  return {
    code: room.code,
    hostName: room.hostName,
    currentTrack: room.currentTrack,
    isPlaying: room.isPlaying,
    queue: room.queue,
    allowRemoteControl: room.allowRemoteControl,
    clientCount: room.clients.size
  };
}

// Serve Mobile Remote UI
app.get('/remote', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

// Network information for QR code & LAN pairing
app.get('/api/network-info', (req, res) => {
  res.json({
    localIps: getLocalIpAddresses(),
    port: PORT,
    renderUrl: 'https://nocturne-karaoke-backend.onrender.com'
  });
});

// Create or Register Room
app.post('/api/room/create', (req, res) => {
  const requestedCode = req.body && req.body.roomCode ? req.body.roomCode : generateRoomCode();
  const hostName = (req.body && req.body.hostName) ? req.body.hostName : 'Host';
  const room = getOrCreateRoom(requestedCode, hostName);
  res.json({
    roomCode: room.code,
    hostName: room.hostName,
    localIps: getLocalIpAddresses(),
    port: PORT,
    renderUrl: 'https://nocturne-karaoke-backend.onrender.com'
  });
});

// Get Room State
app.get('/api/room/:code', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(getRoomSnapshot(room));
});

// Real-Time Server-Sent Events (SSE) stream for instant sync
app.get('/api/room/:code/events', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = getOrCreateRoom(norm);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  room.clients.add(res);
  room.lastActive = Date.now();

  // Send immediate initial state
  res.write(`event: init\ndata: ${JSON.stringify(getRoomSnapshot(room))}\n\n`);

  // Broadcast updated client count
  broadcastRoomEvent(room, 'client_count', { clientCount: room.clients.size });

  // Keep-alive heartbeat every 15s to prevent cloud proxy disconnects
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (e) {
      clearInterval(heartbeat);
      room.clients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    room.clients.delete(res);
    broadcastRoomEvent(room, 'client_count', { clientCount: room.clients.size });
  });
});

// Add Song to Room Queue (from Mobile or Host)
app.post('/api/room/:code/queue', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = getOrCreateRoom(norm);
  const track = req.body && req.body.track;
  const addedBy = sanitizeText(req.body && req.body.addedBy, 32) || 'Guest Mobile';

  if (!track || !track.id || !isValidYouTubeIdOrUrl(track.id)) {
    return res.status(400).json({ error: 'Valid YouTube video track is required' });
  }

  // Prevent queue spam (Max 100 songs in queue)
  if (room.queue.length >= 100) {
    return res.status(400).json({ error: 'Song queue is full (max 100 tracks)' });
  }

  const queueItem = {
    id: track.id,
    title: sanitizeText(track.title, 120) || 'YouTube Track',
    author: sanitizeText(track.author, 60) || 'YouTube',
    duration: sanitizeText(track.duration, 15) || '4:00',
    seconds: Math.max(10, parseInt(track.seconds) || 240),
    thumbnail: track.thumbnail || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`,
    url: track.url || `https://youtube.com/watch?v=${track.id}`,
    addedBy: addedBy,
    addedAt: Date.now()
  };

  room.queue.push(queueItem);
  room.lastActive = Date.now();

  broadcastRoomEvent(room, 'queue_updated', {
    queue: room.queue,
    addedTrack: queueItem,
    addedBy: addedBy
  });

  res.json({
    success: true,
    queue: room.queue,
    position: room.queue.length
  });
});

// Remove Song from Room Queue
app.delete('/api/room/:code/queue/:index', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const idx = parseInt(req.params.index, 10);
  if (isNaN(idx) || idx < 0 || idx >= room.queue.length) {
    return res.status(400).json({ error: 'Invalid queue index' });
  }

  const removed = room.queue.splice(idx, 1)[0];
  room.lastActive = Date.now();

  broadcastRoomEvent(room, 'queue_updated', {
    queue: room.queue,
    removedTrack: removed
  });

  res.json({ success: true, queue: room.queue });
});

// Reorder Song in Room Queue
app.post('/api/room/:code/queue/move', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { fromIndex, toIndex } = req.body || {};
  if (
    typeof fromIndex !== 'number' || typeof toIndex !== 'number' ||
    fromIndex < 0 || fromIndex >= room.queue.length ||
    toIndex < 0 || toIndex >= room.queue.length
  ) {
    return res.status(400).json({ error: 'Invalid move indices' });
  }

  const item = room.queue.splice(fromIndex, 1)[0];
  room.queue.splice(toIndex, 0, item);
  room.lastActive = Date.now();

  broadcastRoomEvent(room, 'queue_updated', { queue: room.queue });
  res.json({ success: true, queue: room.queue });
});

// Clear Entire Room Queue
app.post('/api/room/:code/queue/clear', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  room.queue = [];
  room.lastActive = Date.now();

  broadcastRoomEvent(room, 'queue_updated', { queue: [] });
  res.json({ success: true, queue: [] });
});

// Host pushes state update (current track, play status, queue sync)
app.post('/api/room/:code/sync', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = getOrCreateRoom(norm);
  const { currentTrack, isPlaying, queue, allowRemoteControl, hostName } = req.body || {};

  if (currentTrack !== undefined) room.currentTrack = currentTrack;
  if (isPlaying !== undefined) room.isPlaying = Boolean(isPlaying);
  if (Array.isArray(queue)) room.queue = queue.slice(0, 100);
  if (allowRemoteControl !== undefined) room.allowRemoteControl = Boolean(allowRemoteControl);
  if (hostName) room.hostName = sanitizeText(hostName, 32);

  room.lastActive = Date.now();

  broadcastRoomEvent(room, 'state_updated', getRoomSnapshot(room));
  res.json({ success: true });
});

// Remote triggers playback action (Play/Pause, Skip, Ducking)
app.post('/api/room/:code/control', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (!room.allowRemoteControl) {
    return res.status(403).json({ error: 'Host has disabled remote control for this room' });
  }

  const { action, payload, sender } = req.body || {};
  const validActions = ['play', 'pause', 'toggle', 'next', 'prev', 'ducking', 'play_now'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  let safePayload = payload;
  if (action === 'play_now') {
    if (!payload || !payload.id || !isValidYouTubeIdOrUrl(payload.id)) {
      return res.status(400).json({ error: 'Valid YouTube video track required for play_now' });
    }
    safePayload = {
      id: payload.id,
      title: sanitizeText(payload.title, 120) || 'YouTube Track',
      author: sanitizeText(payload.author, 60) || 'YouTube',
      duration: sanitizeText(payload.duration, 15) || '4:00',
      seconds: Math.max(10, parseInt(payload.seconds) || 240),
      thumbnail: payload.thumbnail || `https://i.ytimg.com/vi/${payload.id}/hqdefault.jpg`,
      url: payload.url || `https://youtube.com/watch?v=${payload.id}`
    };
  }

  broadcastRoomEvent(room, 'host_command', {
    action,
    payload: safePayload,
    sender: sanitizeText(sender, 32) || 'Remote'
  });

  res.json({ success: true, action });
});

// Periodic LRU & Stale Room Garbage Collection (every 15 mins)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of searchCache.entries()) {
    if (now - v.time > 4 * 60 * 60 * 1000) searchCache.delete(k);
  }
  for (const [k, v] of streamCache.entries()) {
    if (now - v.time > 4 * 60 * 60 * 1000) streamCache.delete(k);
  }
  for (const [code, r] of rooms.entries()) {
    if (r.clients.size === 0 && (now - r.lastActive > 24 * 60 * 60 * 1000)) {
      rooms.delete(code);
    }
  }
}, 15 * 60 * 1000);

// Health check endpoint (for Cloud keep-alive)
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Pre-warm Popular Songs Cache asynchronously on boot
const POPULAR_QUERIES = ['รัก', 'ใจสั่งมา', 'แพ้ทาง', 'พบรัก', 'สภาวะทิ้งตัว', 'แคนวาส', 'Perfect', 'วาฬเกยตื้น', 'คาราโอเกะ'];
setTimeout(() => {
  POPULAR_QUERIES.forEach(q => {
    fastYoutubeSearch(q).then(videos => {
      if (videos && videos.length > 0) setBoundedCache(searchCache, q.toLowerCase(), { videos, time: Date.now() }, 300);
    }).catch(() => {});
  });
}, 2000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NOCTURNE Studio Engine listening on port ${PORT}`);
});
