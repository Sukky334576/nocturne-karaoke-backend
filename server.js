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

// Input Validator & Strict YouTube ID Extractor (Defense-in-Depth against argument injection)
function extractValidYouTubeId(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1).split('/')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (parsed.pathname === '/watch') {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      }
      const match = parsed.pathname.match(/^\/(?:embed|v|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) return match[1];
    }
  } catch (_) {}
  return null;
}

function isValidYouTubeIdOrUrl(str) {
  return extractValidYouTubeId(str) !== null;
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

// In-Memory Lightweight Rate Limiter for DDoS & Spam Mitigation
const ipRateLimits = new Map();

function checkRateLimit(req, action, maxRequests, windowMs) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1'));
  const key = `${ip}:${action}`;
  const now = Date.now();
  let record = ipRateLimits.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    ipRateLimits.set(key, record);
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}

function sanitizeText(str, maxLen = 120) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim()
    .slice(0, maxLen);
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

function getOrCreateRoom(code, hostName = null, hostTier = null) {
  const norm = normalizeRoomCode(code) || generateRoomCode();
  let room = rooms.get(norm);
  if (!room) {
    room = {
      code: norm,
      hostName: sanitizeText(hostName, 32) || 'Host',
      hostTier: hostTier || 'free',
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
    if (hostTier !== null && hostTier !== undefined) {
      room.hostTier = hostTier;
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
    hostTier: room.hostTier || 'free',
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

// Launch Windows Sound Control Panel directly on Recording tab for zero-latency setup verification
app.post('/api/open-sound-settings', (req, res) => {
  if (process.platform === 'win32') {
    try {
      spawn('rundll32.exe', ['shell32.dll,Control_RunDLL', 'mmsys.cpl,,1'], { detached: true, stdio: 'ignore' });
      return res.json({ success: true, message: 'Opened Windows Sound Control Panel (Recording tab)' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.status(400).json({ error: 'Sound control panel shortcut is only applicable on Windows' });
});

// --- In-Memory & File-Backed User Profiles Database ---
const usersDb = new Map();
const userDbFile = path.join(__dirname, 'users.json');

try {
  if (fs.existsSync(userDbFile)) {
    const raw = fs.readFileSync(userDbFile, 'utf8');
    const parsed = JSON.parse(raw);
    Object.keys(parsed).forEach(k => usersDb.set(k.toLowerCase(), parsed[k]));
  }
} catch (e) {
  console.warn('User DB load warning:', e.message);
}

function persistUserDb() {
  try {
    const obj = {};
    for (const [k, v] of usersDb.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(userDbFile, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('User DB save warning:', e.message);
  }
}

app.post('/api/auth/register', (req, res) => {
  const username = sanitizeText(req.body && req.body.username, 30);
  const password = req.body && req.body.password;
  const initialPreset = req.body && req.body.preset;

  if (!username || username.length < 2) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 2 ตัวอักษร' });
  }
  if (!password || password.length < 3) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 3 ตัวอักษร' });
  }

  const lower = username.toLowerCase();
  if (usersDb.has(lower)) {
    return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ' });
  }

  const user = {
    username,
    password, // In-memory/simple file persistence
    tier: 'free', // 'free' | 'pro'
    proExpiresAt: null,
    preset: initialPreset || {},
    songKeys: {},
    hasCompletedOnboarding: false,
    createdAt: Date.now(),
    lastLogin: Date.now()
  };

  usersDb.set(lower, user);
  persistUserDb();

  res.json({
    success: true,
    user: {
      username: user.username,
      tier: user.tier || 'free',
      proExpiresAt: user.proExpiresAt || null,
      preset: user.preset,
      songKeys: user.songKeys,
      hasCompletedOnboarding: user.hasCompletedOnboarding
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const username = sanitizeText(req.body && req.body.username, 30);
  const password = req.body && req.body.password;

  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  const lower = username.toLowerCase();
  const user = usersDb.get(lower);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  // Enforce 30-day subscription expiration (except developer lifetime VIP accounts)
  if (user.tier === 'pro' && user.proExpiresAt && user.proExpiresAt < Date.now()) {
    if (!['sukky', 'sukky334576', 'tong', 'admin'].includes(lower)) {
      user.tier = 'free';
    }
  }

  user.lastLogin = Date.now();
  persistUserDb();

  res.json({
    success: true,
    user: {
      username: user.username,
      tier: user.tier || 'free',
      proExpiresAt: user.proExpiresAt || null,
      preset: user.preset,
      songKeys: user.songKeys || {},
      hasCompletedOnboarding: user.hasCompletedOnboarding !== false
    }
  });
});

app.post('/api/auth/save-profile', (req, res) => {
  const username = sanitizeText(req.body && req.body.username, 30);
  const preset = req.body && req.body.preset;
  const songKeys = req.body && req.body.songKeys;
  const hasCompletedOnboarding = req.body && req.body.hasCompletedOnboarding;
  const tier = req.body && req.body.tier;
  const proExpiresAt = req.body && req.body.proExpiresAt;

  if (!username) return res.status(400).json({ error: 'Username required' });
  const lower = username.toLowerCase();
  let user = usersDb.get(lower);

  if (!user) {
    user = { username, password: '', tier: 'free', proExpiresAt: null, preset: {}, songKeys: {}, hasCompletedOnboarding: true, createdAt: Date.now() };
    usersDb.set(lower, user);
  }

  if (preset) user.preset = preset;
  if (songKeys) user.songKeys = songKeys;
  if (typeof hasCompletedOnboarding === 'boolean') user.hasCompletedOnboarding = hasCompletedOnboarding;
  if (tier) user.tier = tier;
  if (proExpiresAt !== undefined) user.proExpiresAt = proExpiresAt;

  // Enforce 30-day subscription expiration
  if (user.tier === 'pro' && user.proExpiresAt && user.proExpiresAt < Date.now()) {
    if (!['sukky', 'sukky334576', 'tong', 'admin'].includes(lower)) {
      user.tier = 'free';
    }
  }

  user.lastActive = Date.now();
  persistUserDb();

  res.json({ success: true, tier: user.tier, proExpiresAt: user.proExpiresAt });
});

app.post('/api/auth/upgrade-pro', (req, res) => {
  const username = sanitizeText(req.body && req.body.username, 30);
  if (!username) return res.status(400).json({ error: 'Username required' });
  const lower = username.toLowerCase();
  let user = usersDb.get(lower);

  if (!user) {
    user = { username, password: '', tier: 'free', preset: {}, songKeys: {}, hasCompletedOnboarding: true, createdAt: Date.now() };
    usersDb.set(lower, user);
  }

  // Activate 30-day Pro Pack subscription (49 THB/month)
  user.tier = 'pro';
  user.proExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  user.lastActive = Date.now();
  persistUserDb();

  res.json({
    success: true,
    tier: 'pro',
    proExpiresAt: user.proExpiresAt,
    message: 'อัปเกรดเป็น Pro Pack (49.-/เดือน) สำเร็จเรียบร้อยแล้ว!'
  });
});

// --- PromptPay EMVCo Generator ---
function generatePromptPayPayload(target, amount) {
  target = String(target || '0812345678').replace(/[^0-9]/g, '');
  let formattedTarget = '';
  let subTag = '';
  if (target.length >= 13) {
    subTag = '02'; // Tax ID / National ID
    formattedTarget = target;
  } else {
    subTag = '01'; // Mobile Phone
    if (target.startsWith('0')) target = target.slice(1);
    formattedTarget = '0066' + target;
  }
  const fTargetLen = String(formattedTarget.length).padStart(2, '0');
  const merchantInfo = '0016A000000677010111' + subTag + fTargetLen + formattedTarget;
  const merchantLen = String(merchantInfo.length).padStart(2, '0');

  let payload = '000201' +
                '010212' +
                '29' + merchantLen + merchantInfo +
                '5303764';

  if (amount && Number(amount) > 0) {
    const amtStr = Number(amount).toFixed(2);
    const amtLen = String(amtStr.length).padStart(2, '0');
    payload += '54' + amtLen + amtStr;
  }
  payload += '5802TH' + '6304';

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return payload + crc.toString(16).toUpperCase().padStart(4, '0');
}

// PromptPay QR Code Generation for Pro Pack (49 THB)
app.get('/api/payment/promptpay-qr', (req, res) => {
  const amount = parseFloat(req.query.amount) || 49.00;
  const username = sanitizeText(req.query.username, 30) || 'Guest';
  const promptpayId = process.env.PROMPTPAY_ID || '0812345678';
  const ref = `PRO-${Date.now().toString().slice(-6)}`;
  const qrPayload = generatePromptPayPayload(promptpayId, amount);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrPayload)}&color=08090d&bgcolor=ffffff&qzone=1`;

  res.json({
    success: true,
    ref: ref,
    amount: amount,
    promptpayId: promptpayId,
    qrPayload: qrPayload,
    qrImageUrl: qrImageUrl,
    username: username,
    expiresInSeconds: 900
  });
});

// PromptPay Slip / Auto-Approval Verification
app.post('/api/payment/verify', (req, res) => {
  const username = sanitizeText(req.body && req.body.username, 30);
  const ref = sanitizeText(req.body && req.body.ref, 20) || `PRO-${Date.now().toString().slice(-6)}`;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const lower = username.toLowerCase();
  let user = usersDb.get(lower);
  if (!user) {
    user = { username, password: '', tier: 'free', preset: {}, songKeys: {}, hasCompletedOnboarding: true, createdAt: Date.now() };
    usersDb.set(lower, user);
  }

  user.tier = 'pro';
  user.proExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  user.lastActive = Date.now();
  persistUserDb();

  res.json({
    success: true,
    ref: ref,
    tier: 'pro',
    proExpiresAt: user.proExpiresAt,
    message: 'ชำระเงินสำเร็จ ยืนยันสิทธิ์ Nocturne Pro Pack (49.-/เดือน) เรียบร้อยแล้ว!'
  });
});

// Social OAuth Login (Google, Facebook, Discord)
app.post('/api/auth/oauth', (req, res) => {
  const provider = sanitizeText(req.body && req.body.provider, 20) || 'google';
  const profile = req.body && req.body.profile ? req.body.profile : {};
  let name = sanitizeText(profile.name || profile.username, 30);
  const email = sanitizeText(profile.email, 60);
  const avatar = sanitizeText(profile.avatar, 255);
  const id = sanitizeText(profile.id || profile.sub, 64) || Date.now().toString();

  if (!name || name.length < 2) {
    name = `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;
  }

  const lower = name.toLowerCase();
  let user = usersDb.get(lower);

  if (!user) {
    const isSpecialOwner = ['sukky', 'sukky334576', 'tong', 'admin'].includes(lower);
    user = {
      username: name,
      password: '',
      email: email,
      avatar: avatar,
      authProvider: provider,
      providerId: id,
      tier: isSpecialOwner ? 'pro' : 'free',
      proExpiresAt: isSpecialOwner ? 253402300799000 : null,
      preset: { syncOffsetMs: 120, reverbMix: 0.25, reverbDecay: 1.8, roomSize: 2 },
      songKeys: {},
      hasCompletedOnboarding: false,
      createdAt: Date.now(),
      lastLogin: Date.now()
    };
    usersDb.set(lower, user);
  } else {
    user.lastLogin = Date.now();
    user.authProvider = provider;
    if (avatar) user.avatar = avatar;
    if (email) user.email = email;
  }
  persistUserDb();

  res.json({
    success: true,
    user: {
      username: user.username,
      tier: user.tier,
      proExpiresAt: user.proExpiresAt,
      preset: user.preset,
      songKeys: user.songKeys,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      authProvider: user.authProvider,
      avatar: user.avatar
    }
  });
});

// Create or Register Room
app.post('/api/room/create', (req, res) => {
  const requestedCode = req.body && req.body.roomCode ? req.body.roomCode : generateRoomCode();
  const hostName = (req.body && req.body.hostName) ? req.body.hostName : 'Host';
  const hostTier = (req.body && req.body.hostTier) ? req.body.hostTier : 'free';
  const room = getOrCreateRoom(requestedCode, hostName, hostTier);
  room.hostTier = hostTier;
  res.json({
    roomCode: room.code,
    hostName: room.hostName,
    hostTier: room.hostTier,
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

  // Keep-alive heartbeat every 25s to prevent cloud proxy disconnects
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {
      clearInterval(heartbeat);
      room.clients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    room.clients.delete(res);
    broadcastRoomEvent(room, 'client_count', { clientCount: room.clients.size });
  });
});

// Add Song to Room Queue (from Mobile or Host)
app.post('/api/room/:code/queue', (req, res) => {
  if (!checkRateLimit(req, 'queue', 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  const norm = normalizeRoomCode(req.params.code);
  const room = getOrCreateRoom(norm);
  const track = req.body && req.body.track;
  const addedBy = sanitizeText(req.body && req.body.addedBy, 32) || 'Guest Mobile';

  const validTrackId = track && track.id ? extractValidYouTubeId(track.id) : null;
  if (!track || !track.id || !validTrackId) {
    return res.status(400).json({ error: 'Valid YouTube video track is required' });
  }

  // Prevent queue spam (Max 100 songs in queue)
  if (room.queue.length >= 100) {
    return res.status(400).json({ error: 'Song queue is full (max 100 tracks)' });
  }

  const queueItem = {
    id: validTrackId,
    title: sanitizeText(track.title, 120) || 'YouTube Track',
    author: sanitizeText(track.author, 60) || 'YouTube',
    duration: sanitizeText(track.duration, 15) || '4:00',
    seconds: Math.max(10, parseInt(track.seconds) || 240),
    thumbnail: track.thumbnail || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`,
    url: track.url || `https://youtube.com/watch?v=${track.id}`,
    addedBy: addedBy,
    addedAt: Date.now()
  };

  // Priority Queue insertion requires VIP PRO host room or FastPass
  const isFastPass = !!(req.body && req.body.isFastPass);
  const isPriority = isFastPass || !!(req.body && req.body.priority && room.hostTier === 'pro');
  if (req.body && req.body.tipAmount) {
    queueItem.tipAmount = parseFloat(req.body.tipAmount);
    queueItem.tipMessage = sanitizeText(req.body.tipMessage, 100);
  }
  if (isPriority) {
    room.queue.unshift(queueItem);
  } else {
    room.queue.push(queueItem);
  }
  room.lastActive = Date.now();

  broadcastRoomEvent(room, 'queue_updated', {
    queue: room.queue,
    addedTrack: queueItem,
    addedBy: addedBy,
    isPriority: isPriority
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
  const { currentTrack, isPlaying, queue, allowRemoteControl, hostName, hostTier } = req.body || {};

  if (currentTrack !== undefined) room.currentTrack = currentTrack;
  if (isPlaying !== undefined) room.isPlaying = Boolean(isPlaying);
  if (Array.isArray(queue)) room.queue = queue.slice(0, 100);
  if (allowRemoteControl !== undefined) room.allowRemoteControl = Boolean(allowRemoteControl);
  if (hostName) room.hostName = sanitizeText(hostName, 32);
  if (hostTier) room.hostTier = hostTier;

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
    const validPlayId = payload && payload.id ? extractValidYouTubeId(payload.id) : null;
    if (!payload || !payload.id || !validPlayId) {
      return res.status(400).json({ error: 'Valid YouTube video track required for play_now' });
    }
    safePayload = {
      id: validPlayId,
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

// In-Memory Synced Lyrics Cache (Max 200 items, TTL: 24h)
const lyricsCache = new Map();

function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;

  for (const line of lines) {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseFloat(match[2]);
      const time = mins * 60 + secs;
      const text = match[3].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

// Synced Lyrics API (LRCLIB Integration with Fast Cache)
app.get('/api/lyrics', async (req, res) => {
  const q = sanitizeText(req.query.q || req.query.title, 120);
  const artist = sanitizeText(req.query.artist, 60) || '';
  if (!q) return res.status(400).json({ error: 'Search query or title required' });

  // Clean title: remove suffixes like [Karaoke], (Official Video), Cover, etc.
  const cleanQ = q.replace(/[\(\[][^\)\]]*(?:official|video|karaoke|cover|audio|mv|คีย์|ผู้ชาย|ผู้หญิง)[^\)\]]*[\)\]]/gi, '')
                  .replace(/[-|]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();

  const cacheKey = `${cleanQ}__${artist}`.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    const cached = lyricsCache.get(cacheKey);
    if (Date.now() - cached.time < 24 * 60 * 60 * 1000) {
      return res.json(cached.data);
    }
  }

  try {
    const encoded = encodeURIComponent(cleanQ + (artist ? ' ' + artist : ''));
    const lrclibUrl = `https://lrclib.net/api/search?q=${encoded}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const fetchRes = await fetch(lrclibUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NocturneStudio/2.0 (KaraokePlayer)' }
    });
    clearTimeout(timeout);

    if (fetchRes.ok) {
      const items = await fetchRes.json();
      if (Array.isArray(items) && items.length > 0) {
        // Find best match with syncedLyrics
        const syncedItem = items.find(it => it.syncedLyrics && it.syncedLyrics.length > 20) || items[0];
        if (syncedItem) {
          const parsed = syncedItem.syncedLyrics ? parseLrc(syncedItem.syncedLyrics) : [];
          const responseData = {
            success: true,
            title: syncedItem.name || cleanQ,
            artist: syncedItem.artistName || artist,
            isSynced: parsed.length > 0,
            lyrics: parsed.length > 0 ? parsed : (syncedItem.plainLyrics ? syncedItem.plainLyrics.split('\n').filter(Boolean).map((t, idx) => ({ time: idx * 4, text: t.trim() })) : []),
            rawPlain: syncedItem.plainLyrics || ''
          };
          setBoundedCache(lyricsCache, cacheKey, { data: responseData, time: Date.now() }, 200);
          return res.json(responseData);
        }
      }
    }
  } catch (err) {
    // Network or timeout note
  }

  const fallbackData = {
    success: false,
    title: cleanQ,
    artist: artist,
    isSynced: false,
    lyrics: [],
    message: 'ไม่พบเนื้อเพลงซิงค์สำหรับเพลงนี้'
  };
  res.json(fallbackData);
});

// Room Live Reaction Broadcast (Emoji / SFX from Remote to Host screen)
app.post('/api/room/:code/reaction', (req, res) => {
  if (!checkRateLimit(req, 'reaction', 30, 10 * 1000)) {
    return res.status(429).json({ error: 'Too many reactions. Please wait a moment.' });
  }

  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const emoji = sanitizeText(req.body && req.body.emoji, 10);
  const sfx = sanitizeText(req.body && req.body.sfx, 30);
  const sender = sanitizeText(req.body && req.body.sender, 32) || 'เพื่อนในห้อง';

  if (!emoji && !sfx) {
    return res.status(400).json({ error: 'Emoji or SFX required' });
  }

  broadcastRoomEvent(room, 'reaction', {
    emoji,
    sfx,
    sender,
    time: Date.now()
  });

  res.json({ success: true });
});

// Fast-Pass VIP Tip & Superchat Broadcast
app.post('/api/room/:code/tip', (req, res) => {
  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const sender = sanitizeText(req.body && req.body.sender, 32) || 'VIP Fan';
  const amount = parseFloat(req.body && req.body.amount) || 20.00;
  const message = sanitizeText(req.body && req.body.message, 140) || 'ขอเพลงเพราะๆ หน่อยค้าบ!';

  broadcastRoomEvent(room, 'tip_received', {
    sender,
    amount,
    message,
    time: Date.now()
  });

  res.json({ success: true, sender, amount, message });
});

// Periodic LRU & Stale Room Garbage Collection (every 10 mins)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of searchCache.entries()) {
    if (now - v.time > 4 * 60 * 60 * 1000) searchCache.delete(k);
  }
  for (const [k, v] of streamCache.entries()) {
    if (now - v.time > 4 * 60 * 60 * 1000) streamCache.delete(k);
  }
  for (const [code, r] of rooms.entries()) {
    // Sweep rooms with 0 connected clients inactive for > 1 hour
    if (r.clients.size === 0 && (now - r.lastActive > 60 * 60 * 1000)) {
      rooms.delete(code);
    }
  }
  for (const [k, v] of ipRateLimits.entries()) {
    if (now > v.resetTime) ipRateLimits.delete(k);
  }
}, 10 * 60 * 1000);

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
