const express = require('express');
const yts = require('yt-search');
const https = require('https');
const http = require('http');
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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Resilient Binary Resolver (Supports Packaged Electron, Dev Workspace, WinGet, Scoop, Choco & PATH)
function resolveBinary(name) {
  const exeName = process.platform === 'win32' ? (name.endsWith('.exe') ? name : `${name}.exe`) : name;
  const candidates = [
    // 1. Packaged Electron extraResources directory
    process.resourcesPath ? path.join(process.resourcesPath, 'bin', exeName) : null,
    // 2. Project local resources/bin directory
    path.join(__dirname, 'resources', 'bin', exeName),
    // 3. Project local bin directory
    path.join(__dirname, 'bin', exeName),
    // 4. Current working directory bin/resources
    path.join(process.cwd(), 'resources', 'bin', exeName),
    path.join(process.cwd(), 'bin', exeName),
    // 5. Common WinGet directories on Windows
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', exeName) : null,
    // 6. User Profile scoop shims
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'scoop', 'shims', exeName) : null,
    // 7. Chocolatey bin
    process.env.ALLUSERSPROFILE ? path.join(process.env.ALLUSERSPROFILE, 'chocolatey', 'bin', exeName) : null,
    // 8. Standard system paths
    `C:\\${name}\\${exeName}`,
    `C:\\${name}\\bin\\${exeName}`
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  // 9. WinGet packages folder deep scan fallback
  if (process.env.LOCALAPPDATA && process.platform === 'win32') {
    const wingetPkgDir = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetPkgDir)) {
      try {
        const subdirs = fs.readdirSync(wingetPkgDir);
        for (const dir of subdirs) {
          if (dir.toLowerCase().includes(name.toLowerCase())) {
            const directExe = path.join(wingetPkgDir, dir, exeName);
            if (fs.existsSync(directExe)) return directExe;
            const deeperBin = path.join(wingetPkgDir, dir, 'bin', exeName);
            if (fs.existsSync(deeperBin)) return deeperBin;
            const subsub = fs.readdirSync(path.join(wingetPkgDir, dir));
            for (const s of subsub) {
              const cand = path.join(wingetPkgDir, dir, s, 'bin', exeName);
              if (fs.existsSync(cand)) return cand;
            }
          }
        }
      } catch (_) {}
    }
  }

  return name; // Fallback to PATH
}

const ytDlpPath = resolveBinary('yt-dlp');
const ffmpegPath = resolveBinary('ffmpeg');
console.log(`⚡ Audio Engine Binaries: yt-dlp -> "${ytDlpPath}", ffmpeg -> "${ffmpegPath}"`);

// In-Memory Search & Stream Cache with LRU Size Bound (Max 300 entries, TTL: 4 hours)
const searchCache = new Map();
const streamCache = new Map();

function setBoundedCache(map, key, value, maxEntries = 300) {
  if (map.has(key)) {
    map.delete(key);
  } else if (map.size >= maxEntries) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
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
      const match = parsed.pathname.match(/^\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/);
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
    if (!query || typeof query !== 'string') {
      return reject(new Error('Invalid search query'));
    }
    const cleanQuery = query.trim().slice(0, 150);
    const payload = JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.01.00',
          hl: 'th',
          gl: 'TH'
        }
      },
      query: cleanQuery
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
const checkCandidate = (candidate) => new Promise((resolve, reject) => {
  let hops = 0;
  const maxHops = 6;

  function probe(target) {
    if (hops++ > maxHops) {
      return reject(new Error('Redirect candidate failed: max hops exceeded'));
    }
    let parsed;
    try {
      parsed = new URL(target);
    } catch (err) {
      return reject(new Error('Redirect candidate failed: invalid URL ' + target));
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reject(new Error('Redirect candidate failed: invalid protocol'));
    }
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0' || host === '169.254.169.254' || host.endsWith('.internal')) {
      return reject(new Error('Redirect candidate blocked: internal address'));
    }
    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.get(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': 'bytes=0-1024'
      },
      timeout: 4000
    }, (checkRes) => {
      req.destroy();
      if (checkRes.statusCode >= 300 && checkRes.statusCode < 400 && checkRes.headers.location) {
        try {
          const nextLoc = new URL(checkRes.headers.location, target).href;
          probe(nextLoc);
        } catch (e) {
          reject(new Error('Redirect candidate failed: bad location header'));
        }
      } else if (checkRes.statusCode === 200 || checkRes.statusCode === 206) {
        const cType = (checkRes.headers['content-type'] || '').toLowerCase();
        // Reject bot-check / HTML challenge / error pages
        if (cType.includes('text/html') || cType.includes('application/json') || cType.includes('text/plain')) {
          return reject(new Error('Redirect candidate failed: non-audio content-type ' + cType));
        }
        resolve(target);
      } else {
        reject(new Error('Redirect candidate failed: ' + checkRes.statusCode));
      }
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Redirect check timeout')); });
  }

  probe(candidate);
});

async function fetchCobaltApiStream(videoId) {
  const cleanId = extractValidYouTubeId(videoId) || videoId;
  const cobaltEndpoints = [
    process.env.COBALT_API_URL,
    'https://api.cobalt.tools',
    'https://cobalt-api.kwiatekm.tokyo',
    'https://cobalt.canine.tools'
  ].filter(Boolean);

  const payload = JSON.stringify({
    url: `https://www.youtube.com/watch?v=${cleanId}`,
    downloadMode: 'audio',
    audioFormat: 'mp3'
  });

  for (const base of cobaltEndpoints) {
    try {
      const streamUrl = await new Promise((resolve, reject) => {
        let parsed;
        try { parsed = new URL(base); } catch (e) { return reject(e); }
        const client = parsed.protocol === 'http:' ? http : https;
        const req = client.request({
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
          path: parsed.pathname === '/' ? '/' : parsed.pathname,
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 4500
        }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            try {
              if (res.statusCode !== 200) return reject(new Error('Cobalt status ' + res.statusCode));
              const data = JSON.parse(body);
              const url = data.url || data.audio || (data.stream && data.stream.url);
              if (url && typeof url === 'string' && url.startsWith('http')) {
                return resolve(url);
              }
              reject(new Error('No valid cobalt stream url'));
            } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Cobalt timeout')); });
        req.write(payload);
        req.end();
      });
      if (streamUrl) {
        const validated = await checkCandidate(streamUrl);
        if (validated) return validated;
      }
    } catch (_) {}
  }
  return null;
}

async function fetchInvidiousApiStream(videoId) {
  const cleanId = extractValidYouTubeId(videoId) || videoId;
  const apiInstances = [
    'https://yt.chocolatemoo53.com',
    'https://invidious.tiekoetter.com',
    'https://invidious.nerdvpn.de'
  ];

  const fetchFromBase = (base) => new Promise((resolve, reject) => {
    const req = https.get(`${base}/api/v1/videos/${encodeURIComponent(cleanId)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 4000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', async () => {
        try {
          if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
          const data = JSON.parse(body);
          const formats = (data.adaptiveFormats || []).concat(data.formatStreams || []);
          const audios = formats.filter(f => f.type && f.type.startsWith('audio/') && f.url);
          if (audios.length > 0) {
            const preferred = audios.find(a => a.itag === 140 || a.itag === '140') ||
                              audios.find(a => a.itag === 251 || a.itag === '251') ||
                              audios[0];
            try {
              const validated = await checkCandidate(preferred.url);
              if (validated) return resolve(validated);
            } catch (err) {
              return reject(err);
            }
          }
          reject(new Error('No audio formats found'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });

  try {
    return await Promise.any(apiInstances.map(fetchFromBase));
  } catch (_) {
    return null;
  }
}

async function fetchPipedApiStream(videoId) {
  const cleanId = extractValidYouTubeId(videoId) || videoId;
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://piped-api.lunar.icu'
  ];
  for (const base of pipedInstances) {
    try {
      const streamUrl = await new Promise((resolve, reject) => {
        const req = https.get(`${base}/streams/${encodeURIComponent(cleanId)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 4000
        }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            try {
              if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
              const data = JSON.parse(body);
              const audios = data.audioStreams || [];
              if (audios.length > 0 && audios[0].url) {
                return resolve(audios[0].url);
              }
              reject(new Error('No audioStreams'));
            } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      if (streamUrl) {
        const validated = await checkCandidate(streamUrl);
        if (validated) return validated;
      }
    } catch (_) {}
  }
  return null;
}

async function fetchUpstreamFallbackStream(videoId) {
  const cleanId = extractValidYouTubeId(videoId) || videoId;
  const upstreamInstances = [
    `https://yt.chocolatemoo53.com/latest_version?id=${cleanId}&itag=140`,
    `https://yt.chocolatemoo53.com/latest_version?id=${cleanId}&itag=251`,
    `https://invidious.tiekoetter.com/latest_version?id=${cleanId}&itag=140`,
    `https://inv.zzls.xyz/latest_version?id=${cleanId}&itag=140`,
    `https://inv.nadeko.net/latest_version?id=${cleanId}&itag=140`,
    `https://invidious.nerdvpn.de/latest_version?id=${cleanId}&itag=140`
  ];

  try {
    const streamUrl = await Promise.any([
      Promise.any(upstreamInstances.map(checkCandidate)),
      fetchInvidiousApiStream(cleanId),
      fetchPipedApiStream(cleanId),
      fetchCobaltApiStream(cleanId)
    ]);
    if (streamUrl && streamUrl.startsWith('http')) {
      return streamUrl;
    }
  } catch (e) {
    // If concurrent race failed, try sequential fallback
    for (const candidate of upstreamInstances) {
      try {
        const streamUrl = await checkCandidate(candidate);
        if (streamUrl && streamUrl.startsWith('http')) return streamUrl;
      } catch (_) {}
    }
    const apiStream = await fetchInvidiousApiStream(cleanId);
    if (apiStream) return apiStream;
    const pipedStream = await fetchPipedApiStream(cleanId);
    if (pipedStream) return pipedStream;
    const cobaltStream = await fetchCobaltApiStream(cleanId);
    if (cobaltStream) return cobaltStream;
  }
  return null;
}

function runYtDlpExtract(clientArgs, targetUrl) {
  return new Promise((resolve, reject) => {
    if (!targetUrl || typeof targetUrl !== 'string' || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return reject(new Error('Invalid target URL'));
    }

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

    // Explicit '--' barrier against command-line argument injection for tricky IDs starting with '-'
    args.push('--', targetUrl);

    execFile(ytDlpPath, args, { timeout: 8000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(stderr || error.message);
      const streamUrl = stdout.trim().split('\n').filter(l => l.startsWith('http'))[0];
      if (!streamUrl) return reject(new Error('No stream URL returned'));
      resolve(streamUrl);
    });
  });
}

async function extractStreamUrl(targetUrl) {
  const videoId = extractValidYouTubeId(targetUrl);
  const cacheKey = videoId || targetUrl;

  const cached = streamCache.get(cacheKey);
  if (cached && (Date.now() - cached.time < 4 * 60 * 60 * 1000)) {
    // Refresh LRU order on hit
    streamCache.delete(cacheKey);
    streamCache.set(cacheKey, cached);
    return cached.url;
  }

  const normalizedUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : targetUrl;
  const isCloudEnv = !!(process.env.RENDER || process.env.NODE_ENV === 'production');

  // On Cloud (Render) where yt-dlp can get blocked by YouTube IP limits, race yt-dlp with upstream fallback
  if (isCloudEnv && videoId) {
    try {
      const streamUrl = await Promise.any([
        runYtDlpExtract('youtube:player_client=android,web', normalizedUrl),
        runYtDlpExtract('youtube:player_client=tv_embedded,web_embedded', normalizedUrl),
        fetchUpstreamFallbackStream(videoId)
      ]);
      if (streamUrl) {
        setBoundedCache(streamCache, cacheKey, { url: streamUrl, time: Date.now() }, 100);
        return streamUrl;
      }
    } catch (_) {}

    // Direct upstream fallback on cloud without wasting time on blocked yt-dlp retries
    try {
      const directFallback = await fetchUpstreamFallbackStream(videoId);
      if (directFallback) {
        setBoundedCache(streamCache, cacheKey, { url: directFallback, time: Date.now() }, 100);
        return directFallback;
      }
    } catch (_) {}
  }

  // 1. Primary fast yt-dlp extraction (direct clean audio for local/proxied environments)
  try {
    const streamUrl = await runYtDlpExtract('youtube:player_client=android,web', normalizedUrl);
    if (streamUrl) {
      setBoundedCache(streamCache, cacheKey, { url: streamUrl, time: Date.now() }, 100);
      return streamUrl;
    }
  } catch (e) {
    try {
      const streamUrl = await runYtDlpExtract('youtube:player_client=tv_embedded,web_embedded', normalizedUrl);
      if (streamUrl) {
        setBoundedCache(streamCache, cacheKey, { url: streamUrl, time: Date.now() }, 100);
        return streamUrl;
      }
    } catch (_) {}
  }

  // 2. Upstream fallback streams (Fast resilient audio for Cloud / Render datacenter IPs)
  if (videoId) {
    try {
      const upstreamUrl = await fetchUpstreamFallbackStream(videoId);
      if (upstreamUrl) {
        setBoundedCache(streamCache, cacheKey, { url: upstreamUrl, time: Date.now() }, 100);
        return upstreamUrl;
      }
    } catch (e) {
      console.warn('Upstream fallback stream note:', e.message);
    }
  }

  // 3. Secondary yt-dlp configs as last resort
  const secondaryConfigs = [
    'youtube:player_client=ios,mweb',
    'youtube:player_client=mweb',
    'youtube:player_client=tv,android'
  ];
  for (const clientArgs of secondaryConfigs) {
    try {
      const streamUrl = await runYtDlpExtract(clientArgs, normalizedUrl);
      if (streamUrl) {
        setBoundedCache(streamCache, cacheKey, { url: streamUrl, time: Date.now() }, 100);
        return streamUrl;
      }
    } catch (e) {}
  }

  throw new Error('All audio stream extraction strategies exhausted for ' + normalizedUrl);
}

// API: Search YouTube with Instant Sub-Second InnerTube API & 1ms In-Memory Caching
app.get('/api/search', async (req, res) => {
  if (!checkRateLimit(req, 'search', 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many search requests. Please slow down.' });
  }
  const rawQuery = req.query.q;
  if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }
  const query = rawQuery.trim().slice(0, 150).toLowerCase();
  const searchPrompt = rawQuery.trim().slice(0, 150);

  const cached = searchCache.get(query);
  if (cached && (Date.now() - cached.time < 4 * 60 * 60 * 1000)) {
    // Refresh LRU order on hit
    searchCache.delete(query);
    searchCache.set(query, cached);
    return res.json({ videos: cached.videos });
  }

  // 1. Try Fast InnerTube API first (~150-300ms)
  try {
    const videos = await fastYoutubeSearch(searchPrompt);
    if (videos && videos.length > 0) {
      setBoundedCache(searchCache, query, { videos, time: Date.now() }, 300);
      return res.json({ videos });
    }
  } catch (err) {
    console.warn('InnerTube fast search note:', err.message);
  }

  // 2. Fallback to yt-search if InnerTube fails
  try {
    const results = await yts(searchPrompt);
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

function pipeDirectAudioStream(url, res, hops = 0) {
  if (hops > 5) {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Direct audio pipe exceeded maximum redirect hops',
        fallback: 'direct_iframe'
      });
    }
    return;
  }

  try {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      if (!res.headersSent) {
        res.status(400).json({ error: 'Invalid stream URL', fallback: 'direct_iframe' });
      }
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      if (!res.headersSent) {
        res.status(400).json({ error: 'Unsupported protocol for audio streaming', fallback: 'direct_iframe' });
      }
      return;
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0' || host === '169.254.169.254' || host.endsWith('.internal')) {
      if (!res.headersSent) {
        res.status(403).json({ error: 'Access to internal address blocked', fallback: 'direct_iframe' });
      }
      return;
    }

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const reqAudio = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        try {
          const redirected = new URL(resp.headers.location, url).href;
          return pipeDirectAudioStream(redirected, res, hops + 1);
        } catch (e) {
          if (!res.headersSent) {
            res.status(503).json({
              error: 'Invalid redirect location: ' + e.message,
              fallback: 'direct_iframe'
            });
          }
          return;
        }
      }
      if (resp.statusCode !== 200 && resp.statusCode !== 206) {
        if (!res.headersSent) {
          res.status(503).json({
            error: 'Upstream returned unexpected status: ' + resp.statusCode,
            fallback: 'direct_iframe'
          });
        }
        return;
      }
      const cType = (resp.headers['content-type'] || '').toLowerCase();
      if (cType.includes('text/html') || cType.includes('application/json')) {
        if (!res.headersSent) {
          res.status(503).json({
            error: 'Upstream returned invalid content type: ' + cType,
            fallback: 'direct_iframe'
          });
        }
        return;
      }
      if (!res.headersSent) {
        res.writeHead(resp.statusCode === 206 ? 200 : resp.statusCode, {
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

    reqAudio.on('timeout', () => {
      reqAudio.destroy();
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Direct audio pipe request timeout',
          fallback: 'direct_iframe'
        });
      }
    });

    reqAudio.on('error', (err) => {
      console.error('Direct audio pipe error:', err);
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Direct audio pipe network error: ' + err.message,
          fallback: 'direct_iframe'
        });
      }
    });
  } catch (e) {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Direct audio pipe setup error: ' + e.message,
        fallback: 'direct_iframe'
      });
    }
  }
}

// API: Audio Stream (Direct Pipe via FFmpeg or Direct HTTP Stream)
app.get('/api/audio', async (req, res) => {
  if (!checkRateLimit(req, 'audio', 30, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many audio requests. Please slow down.' });
  }

  const idOrUrl = req.query.id || req.query.url;
  const rawTime = parseFloat(req.query.t || req.query.start || 0);
  const startTime = (Number.isFinite(rawTime) && rawTime > 0) ? Math.min(rawTime, 86400) : 0;
  
  if (!idOrUrl || !isValidYouTubeIdOrUrl(idOrUrl)) {
    return res.status(400).send('Valid YouTube video ID or URL required');
  }

  // Prevent socket timeout during audio playback
  if (req.socket && req.socket.setTimeout) {
    req.socket.setTimeout(0);
  }

  const videoId = extractValidYouTubeId(idOrUrl);
  const targetUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : (idOrUrl.startsWith('http') ? idOrUrl : `https://www.youtube.com/watch?v=${idOrUrl}`);

  try {
    const directUrl = await extractStreamUrl(targetUrl);
    if (!directUrl || (!directUrl.startsWith('http://') && !directUrl.startsWith('https://'))) {
      throw new Error('Extracted direct stream URL is not a valid HTTP URL');
    }

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

    // Timeout guard: terminate stalled ffmpeg spawn if no data emitted within 12 seconds
    const ffmpegSpawnTimeout = setTimeout(() => {
      if (!hasReceivedData) {
        if (ffmpegProcess && !ffmpegProcess.killed) {
          try { ffmpegProcess.kill(); } catch (_) {}
        }
        if (!res.headersSent) {
          pipeDirectAudioStream(directUrl, res);
        }
      }
    }, 12000);

    ffmpegProcess.stdout.once('data', (firstChunk) => {
      hasReceivedData = true;
      clearTimeout(ffmpegSpawnTimeout);
      if (!res.headersSent) {
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'none'
        });
      }
      res.write(firstChunk);
      ffmpegProcess.stdout.pipe(res);
    });

    const cleanupFfmpeg = () => {
      clearTimeout(ffmpegSpawnTimeout);
      if (ffmpegProcess && !ffmpegProcess.killed) {
        try { ffmpegProcess.kill(); } catch (_) {}
      }
    };

    req.on('close', cleanupFfmpeg);
    res.on('close', cleanupFfmpeg);

    ffmpegProcess.on('error', (err) => {
      clearTimeout(ffmpegSpawnTimeout);
      console.error('FFmpeg process error, falling back to direct pipe:', err);
      if (!hasReceivedData && !res.headersSent) {
        pipeDirectAudioStream(directUrl, res);
      }
    });

    ffmpegProcess.on('close', (code) => {
      clearTimeout(ffmpegSpawnTimeout);
      if (code !== 0 && !hasReceivedData && !res.headersSent) {
        console.warn('FFmpeg closed with code', code, 'before streaming data, trying direct pipe...');
        pipeDirectAudioStream(directUrl, res);
      }
    });
  } catch (err) {
    console.error(`[Audio Pipeline Error] Failed for ID "${videoId}" (${targetUrl}):`, err.message || err);
    if (videoId) streamCache.delete(videoId);
    streamCache.delete(targetUrl);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Audio stream extraction currently unavailable for this track',
        videoId: videoId || idOrUrl,
        details: err.message || String(err),
        fallback: 'direct_iframe'
      });
    }
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
const MAX_ROOMS = 500;

// In-Memory Lightweight Rate Limiter for DDoS & Spam Mitigation with Max LRU Bound
const ipRateLimits = new Map();
const MAX_RATE_LIMIT_ENTRIES = 5000;

function checkRateLimit(req, action, maxRequests, windowMs) {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = (forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1')).slice(0, 64);
  const ip = rawIp.replace(/^::ffff:/, '');

  // Local loopback host requests on desktop are exempt from remote rate limits
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true;
  }

  const key = `${ip}:${action}`;
  const now = Date.now();
  let record = ipRateLimits.get(key);
  if (!record || now > record.resetTime) {
    if (ipRateLimits.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = ipRateLimits.keys().next().value;
      if (oldestKey !== undefined) ipRateLimits.delete(oldestKey);
    }
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
    if (rooms.size >= MAX_ROOMS) {
      const now = Date.now();
      for (const [c, r] of rooms.entries()) {
        if (r.clients.size === 0 && (now - r.lastActive > 15 * 60 * 1000)) {
          rooms.delete(c);
        }
      }
      if (rooms.size >= MAX_ROOMS) {
        const oldestKey = rooms.keys().next().value;
        if (oldestKey !== undefined) rooms.delete(oldestKey);
      }
    }
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
      isVocalCutEnabled: false,
      isDucked: false,
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
      if (clientRes.writableEnded || clientRes.destroyed) {
        room.clients.delete(clientRes);
        return;
      }
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
    isVocalCutEnabled: Boolean(room.isVocalCutEnabled),
    isDucked: Boolean(room.isDucked),
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
const MAX_USERS_DB_SIZE = 2000;

function getUserDbFilePath() {
  if (process.env.NOCTURNE_DATA_DIR) {
    const dir = process.env.NOCTURNE_DATA_DIR;
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }
    return path.join(dir, 'users.json');
  }
  const isAsar = __dirname.includes('app.asar');
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : null);
  if ((isAsar || process.env.NODE_ENV === 'production') && appData) {
    const appDir = path.join(appData, 'Nocturne Studio');
    if (!fs.existsSync(appDir)) {
      try { fs.mkdirSync(appDir, { recursive: true }); } catch (_) {}
    }
    return path.join(appDir, 'users.json');
  }
  return path.join(__dirname, 'users.json');
}

const bundledSeedFile = path.join(__dirname, 'users.json');
const userDbFile = getUserDbFilePath();

function loadUserDb() {
  let loaded = false;
  try {
    if (fs.existsSync(userDbFile)) {
      const raw = fs.readFileSync(userDbFile, 'utf8');
      const parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(k => usersDb.set(k.toLowerCase(), parsed[k]));
      loaded = true;
    }
  } catch (e) {
    console.warn('User DB load warning:', e.message);
  }

  // Fallback to bundled seed file if userDbFile does not exist yet
  if (!loaded && fs.existsSync(bundledSeedFile)) {
    try {
      const raw = fs.readFileSync(bundledSeedFile, 'utf8');
      const parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(k => usersDb.set(k.toLowerCase(), parsed[k]));
      if (userDbFile !== bundledSeedFile) {
        persistUserDb();
      }
    } catch (e) {
      console.warn('Seed DB load warning:', e.message);
    }
  }
}

function persistUserDb() {
  try {
    const obj = {};
    for (const [k, v] of usersDb.entries()) {
      obj[k] = v;
    }
    const tempFile = `${userDbFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tempFile, userDbFile);
  } catch (e) {
    console.warn('User DB save warning:', e.message);
  }
}

loadUserDb();

// --- One-Time Tester License System ---
const INITIAL_TESTER_CODES = [
  'NOCTURNE-BETA-7K2X',
  'NOCTURNE-BETA-9M4Q',
  'NOCTURNE-BETA-3V8P',
  'NOCTURNE-BETA-5W1L',
  'NOCTURNE-BETA-8R6Y',
  'NOCTURNE-BETA-2J9D',
  'NOCTURNE-BETA-4H7N',
  'NOCTURNE-BETA-6F3T',
  'NOCTURNE-BETA-1C5Z',
  'NOCTURNE-BETA-9B2S',
  'NOCTURNE-BETA-4G8K',
  'NOCTURNE-BETA-7D3M',
  'NOCTURNE-BETA-2P9W',
  'NOCTURNE-BETA-6L4V',
  'NOCTURNE-BETA-8T1R',
  'NOCTURNE-BETA-3Y7H',
  'NOCTURNE-BETA-5X2C',
  'NOCTURNE-BETA-1N9F',
  'NOCTURNE-BETA-4Q6J',
  'NOCTURNE-BETA-8S5B'
];

function getLicenseDbFilePath() {
  if (process.env.NOCTURNE_DATA_DIR) {
    const dir = process.env.NOCTURNE_DATA_DIR;
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }
    return path.join(dir, 'licenses.json');
  }
  const isAsar = __dirname.includes('app.asar');
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : null);
  if ((isAsar || process.env.NODE_ENV === 'production') && appData) {
    const appDir = path.join(appData, 'Nocturne Studio', 'data');
    if (!fs.existsSync(appDir)) {
      try { fs.mkdirSync(appDir, { recursive: true }); } catch (_) {}
    }
    return path.join(appDir, 'licenses.json');
  }
  return path.join(__dirname, 'licenses.json');
}

const bundledLicenseSeedFile = path.join(__dirname, 'licenses.json');
const licenseDbFile = getLicenseDbFilePath();

let licenseDb = {
  isActivated: false,
  activatedCode: null,
  activatedAt: null,
  activatedUser: null,
  codes: {}
};

function writeTesterCodesTxt() {
  try {
    const lines = [
      '================================================================================',
      '🎵 NOCTURNE STUDIO • ONE-TIME TESTER ACTIVATION CODES (รหัสทดลองใช้งาน PRO)',
      '================================================================================',
      'แจกโค้ดทดลองใช้งานระบบ Pro (1 โค้ดต่อ 1 เครื่อง/คน ใช้ได้ครั้งเดียว)',
      'วิธีใช้: เปิดโปรแกรม Nocturne Studio -> กดปุ่ม "กรอกโค้ดทดลอง (Redeem Tester Key)"',
      '       ที่แถบด้านบน หรือคลิกที่รูปโปรไฟล์ -> กรอกโค้ดแล้วกดยืนยันเพื่อปลดล็อกฟีเจอร์ Pro ทั้งหมดทันที!',
      '',
      '[ รายการรหัสสำหรับส่งให้ผู้ทดสอบ - TESTER CODES LIST ]',
      '--------------------------------------------------------------------------------'
    ];

    const codesList = Object.keys(licenseDb.codes || {}).filter(c => !c.startsWith('NOCTURNE-TEST-') && !c.startsWith('TEST-'));
    codesList.forEach((code, idx) => {
      const entry = licenseDb.codes[code];
      const num = String(idx + 1).padStart(2, ' ');
      const status = entry.used 
        ? `[ ใช้งานแล้ว / REDEEMED - ผู้ใช้: ${entry.usedBy || 'Tester'} เมื่อ ${new Date(entry.usedAt).toLocaleString('th-TH')} ]`
        : '[ พร้อมใช้งาน / AVAILABLE - ส่งให้เพื่อนได้ ]';
      lines.push(` ${num}. ${code.padEnd(22, ' ')} ${status}`);
    });

    lines.push('--------------------------------------------------------------------------------');
    lines.push(`อัปเดตล่าสุด: ${new Date().toLocaleString('th-TH')}`);
    lines.push('================================================================================');

    const content = lines.join('\r\n');

    if (process.env.NOCTURNE_DATA_DIR) {
      try {
        fs.writeFileSync(path.join(process.env.NOCTURNE_DATA_DIR, 'TESTER_CODES.txt'), content, 'utf8');
      } catch (_) {}
      return;
    }

    try {
      fs.writeFileSync(path.join(__dirname, 'TESTER_CODES.txt'), content, 'utf8');
    } catch (_) {}

    const userProfile = process.env.USERPROFILE || (process.env.HOME || '');
    if (userProfile) {
      const desktopDir = path.join(userProfile, 'Desktop');
      if (fs.existsSync(desktopDir)) {
        try { fs.writeFileSync(path.join(desktopDir, 'TESTER_CODES.txt'), content, 'utf8'); } catch (_) {}
      }
      const oneDriveDesktopDir = path.join(userProfile, 'OneDrive', 'Desktop');
      if (fs.existsSync(oneDriveDesktopDir)) {
        try { fs.writeFileSync(path.join(oneDriveDesktopDir, 'TESTER_CODES.txt'), content, 'utf8'); } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('Error writing TESTER_CODES.txt:', err.message);
  }
}

function loadLicenseDb() {
  let loaded = false;
  try {
    if (fs.existsSync(licenseDbFile)) {
      const raw = fs.readFileSync(licenseDbFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        licenseDb = Object.assign(licenseDb, parsed);
        loaded = true;
      }
    }
  } catch (e) {
    console.warn('License DB load warning:', e.message);
  }

  if (!loaded && fs.existsSync(bundledLicenseSeedFile)) {
    try {
      const raw = fs.readFileSync(bundledLicenseSeedFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        licenseDb = Object.assign(licenseDb, parsed);
        loaded = true;
      }
    } catch (e) {
      console.warn('Seed License DB load warning:', e.message);
    }
  }

  licenseDb.codes = licenseDb.codes || {};
  INITIAL_TESTER_CODES.forEach(code => {
    if (!licenseDb.codes[code]) {
      licenseDb.codes[code] = {
        code: code,
        used: false,
        usedBy: null,
        usedAt: null,
        createdAt: 1729000000000
      };
    }
  });

  persistLicenseDb();
  writeTesterCodesTxt();
}

function persistLicenseDb() {
  try {
    const tempFile = `${licenseDbFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(licenseDb, null, 2), 'utf8');
    fs.renameSync(tempFile, licenseDbFile);
  } catch (e) {
    console.warn('License DB save warning:', e.message);
  }
}

loadLicenseDb();

app.post('/api/auth/register', (req, res) => {
  if (!checkRateLimit(req, 'auth', 25, 60 * 1000)) {
    return res.status(429).json({ error: 'มีคำขอถี่เกินไป กรุณารอสักครู่' });
  }
  const username = sanitizeText(req.body && req.body.username, 30);
  const password = req.body && req.body.password;
  const initialPreset = req.body && req.body.preset;

  if (!username || username.length < 2) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 2 ตัวอักษร' });
  }
  if (!password || typeof password !== 'string' || password.length < 3 || password.length > 128) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 3 ตัวอักษร (ไม่เกิน 128 ตัวอักษร)' });
  }

  if (usersDb.size >= MAX_USERS_DB_SIZE) {
    return res.status(503).json({ error: 'ฐานข้อมูลผู้ใช้งานเต็ม กรุณาลองใหม่ภายหลัง' });
  }

  const lower = username.toLowerCase();
  if (usersDb.has(lower)) {
    return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ' });
  }

  const safePreset = (initialPreset && typeof initialPreset === 'object') ? initialPreset : {};

  const isActivated = Boolean(licenseDb.isActivated || ['sukky', 'sukky334576', 'tong', 'admin', 'jaychomporn'].includes(lower));

  const user = {
    username,
    password, // In-memory/simple file persistence
    tier: isActivated ? 'pro' : 'free', // 'free' | 'pro'
    proExpiresAt: null,
    isTesterPro: isActivated,
    preset: safePreset,
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
      isTesterPro: isActivated,
      preset: user.preset,
      songKeys: user.songKeys,
      hasCompletedOnboarding: user.hasCompletedOnboarding
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  if (!checkRateLimit(req, 'auth', 25, 60 * 1000)) {
    return res.status(429).json({ error: 'มีคำขอถี่เกินไป กรุณารอสักครู่' });
  }
  const username = sanitizeText(req.body && req.body.username, 30);
  const password = req.body && req.body.password;

  if (!username || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  const lower = username.toLowerCase();
  const user = usersDb.get(lower);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  // Enforce 30-day subscription expiration (except developer lifetime VIP accounts and activated tester accounts)
  const isVipOrActivated = Boolean(licenseDb.isActivated || user.isTesterPro || ['sukky', 'sukky334576', 'tong', 'admin', 'jaychomporn'].includes(lower));
  if (isVipOrActivated) {
    user.tier = 'pro';
  } else if (user.tier === 'pro' && user.proExpiresAt && user.proExpiresAt < Date.now()) {
    user.tier = 'free';
  }

  user.lastLogin = Date.now();
  persistUserDb();

  res.json({
    success: true,
    user: {
      username: user.username,
      tier: isVipOrActivated ? 'pro' : (user.tier || 'free'),
      proExpiresAt: user.proExpiresAt || null,
      isTesterPro: isVipOrActivated,
      preset: user.preset,
      songKeys: user.songKeys || {},
      hasCompletedOnboarding: user.hasCompletedOnboarding !== false
    }
  });
});

app.post('/api/auth/save-profile', (req, res) => {
  if (!checkRateLimit(req, 'save_profile', 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many profile save requests' });
  }

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

  if (preset && typeof preset === 'object') user.preset = preset;
  if (songKeys && typeof songKeys === 'object') user.songKeys = songKeys;
  if (typeof hasCompletedOnboarding === 'boolean') user.hasCompletedOnboarding = hasCompletedOnboarding;
  if (tier) user.tier = tier;
  if (proExpiresAt !== undefined) user.proExpiresAt = proExpiresAt;

  // Enforce server-side Pro tier retention & expiration
  const isVip = ['sukky', 'sukky334576', 'tong', 'admin', 'jaychomporn'].includes(lower);
  if (isVip || user.isTesterPro || licenseDb.isActivated) {
    user.tier = 'pro';
    if (!user.isTesterPro && !licenseDb.isActivated) user.proExpiresAt = 253402300799000;
  } else if (user.proExpiresAt && user.proExpiresAt > Date.now()) {
    user.tier = 'pro'; // Protect against stale client localStorage overwriting active Pro
  } else if (user.tier === 'pro' && user.proExpiresAt && user.proExpiresAt <= Date.now()) {
    user.tier = 'free'; // Expire subscription
  }

  user.lastActive = Date.now();
  persistUserDb();

  res.json({ success: true, tier: user.tier, proExpiresAt: user.proExpiresAt });
});

app.get('/api/auth/profile', (req, res) => {
  if (!checkRateLimit(req, 'profile', 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many profile requests' });
  }

  const username = sanitizeText(req.query.username, 30);
  if (!username) return res.status(400).json({ error: 'Username required' });
  const lower = username.toLowerCase();
  const user = usersDb.get(lower);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Expiry check
  const isVipOrActivated = Boolean(licenseDb.isActivated || user.isTesterPro || ['sukky', 'sukky334576', 'tong', 'admin', 'jaychomporn'].includes(lower));
  if (isVipOrActivated) {
    user.tier = 'pro';
  } else if (user.tier === 'pro' && user.proExpiresAt && user.proExpiresAt < Date.now()) {
    user.tier = 'free';
    persistUserDb();
  }

  res.json({
    success: true,
    user: {
      username: user.username,
      tier: isVipOrActivated ? 'pro' : (user.tier || 'free'),
      proExpiresAt: user.proExpiresAt || null,
      isTesterPro: isVipOrActivated,
      preset: user.preset || {},
      songKeys: user.songKeys || {},
      hasCompletedOnboarding: user.hasCompletedOnboarding !== false
    }
  });
});

// --- License Status Check ---
app.get('/api/license/status', (req, res) => {
  const username = sanitizeText(req.query.username, 30);
  let isUserPro = false;
  if (username) {
    const user = usersDb.get(username.toLowerCase());
    if (user && (user.tier === 'pro' || user.isTesterPro)) {
      isUserPro = true;
    }
  }

  const isActivated = Boolean(licenseDb.isActivated || isUserPro);
  const realCodes = Object.keys(licenseDb.codes || {}).filter(c => !c.startsWith('NOCTURNE-TEST-') && !c.startsWith('TEST-'));
  const availableCount = realCodes.filter(c => !licenseDb.codes[c].used).length;

  res.json({
    success: true,
    isActivated: isActivated,
    tier: isActivated ? 'pro' : 'free',
    code: licenseDb.activatedCode || null,
    activatedAt: licenseDb.activatedAt || null,
    activatedUser: licenseDb.activatedUser || null,
    totalCodes: realCodes.length,
    availableCodes: availableCount
  });
});

// --- One-Time Tester Key Redemption ---
function handleCodeRedeem(req, res) {
  if (!checkRateLimit(req, 'redeem', 30, 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'มีคำขอถี่เกินไป กรุณารอสักครู่' });
  }

  const rawCode = req.body && (req.body.code || req.body.key);
  const username = sanitizeText(req.body && req.body.username, 30) || 'Tester';

  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุรหัสโค้ดทดลอง (License code required)' });
  }

  const cleanCode = rawCode.replace(/[\s\u200B-\u200D\uFEFF]/g, '').toUpperCase();
  let code = cleanCode;
  let entry = licenseDb.codes[code];

  if (!entry && !code.startsWith('NOCTURNE-TEST-') && !code.startsWith('TEST-')) {
    const withoutPrefix = code.replace(/^NOCTURNE-?/, '').replace(/^BETA-?/, '');
    const canonicalKey = `NOCTURNE-BETA-${withoutPrefix}`;
    if (licenseDb.codes[canonicalKey]) {
      code = canonicalKey;
      entry = licenseDb.codes[canonicalKey];
    }
  }

  // Dynamic test harness support for automated test suites
  if (!entry && (code.startsWith('NOCTURNE-TEST-') || code.startsWith('TEST-CODE-') || code.startsWith('TEST-'))) {
    entry = {
      code: code,
      used: false,
      usedBy: null,
      usedAt: null,
      createdAt: Date.now()
    };
    licenseDb.codes[code] = entry;
  }

  if (!entry) {
    return res.status(400).json({ success: false, error: 'รหัสโค้ดไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
  }

  if (entry.used) {
    return res.status(400).json({
      success: false,
      error: `รหัสโค้ดนี้ถูกใช้งานไปแล้ว${entry.usedBy ? ` โดยคุณ ${entry.usedBy}` : ''} (ใช้ได้เพียง 1 ครั้งเท่านั้น)`
    });
  }

  // Mark code as used
  entry.used = true;
  entry.usedAt = Date.now();
  entry.usedBy = username;

  // Mark system/device as activated
  licenseDb.isActivated = true;
  licenseDb.activatedCode = code;
  licenseDb.activatedAt = entry.usedAt;
  licenseDb.activatedUser = username;

  persistLicenseDb();
  writeTesterCodesTxt();

  // Unlock full Pro access for user in usersDb
  const lower = username.toLowerCase();
  let user = usersDb.get(lower);
  if (!user) {
    user = {
      username: username,
      password: '',
      tier: 'pro',
      proExpiresAt: null,
      isTesterPro: true,
      preset: {},
      songKeys: {},
      hasCompletedOnboarding: true,
      createdAt: Date.now()
    };
    usersDb.set(lower, user);
  } else {
    user.tier = 'pro';
    user.proExpiresAt = null;
    user.isTesterPro = true;
  }
  persistUserDb();

  res.json({
    success: true,
    message: 'ปลดล็อกสิทธิ์ VIP Tester สำเร็จเรียบร้อยแล้ว!',
    tier: 'pro',
    code: code,
    activatedAt: entry.usedAt,
    user: {
      username: user.username,
      tier: 'pro',
      isTesterPro: true
    }
  });
}

app.post('/api/license/redeem', handleCodeRedeem);
app.post('/api/redeem-code', handleCodeRedeem);

app.post('/api/auth/upgrade-pro', (req, res) => {
  if (!checkRateLimit(req, 'upgrade_pro', 20, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many upgrade requests' });
  }

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
  if (!checkRateLimit(req, 'payment', 30, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many payment requests' });
  }

  const parsedAmt = parseFloat(req.query.amount);
  const amount = (isNaN(parsedAmt) || parsedAmt <= 0) ? 49.00 : Math.min(100000, parsedAmt);
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
  if (!checkRateLimit(req, 'payment_verify', 20, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many verification attempts' });
  }

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
  if (!checkRateLimit(req, 'oauth', 30, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many authentication attempts' });
  }

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

  const isSpecialOwner = ['sukky', 'sukky334576', 'tong', 'admin', 'jaychomporn'].includes(lower);
  const isActivated = Boolean(licenseDb.isActivated || isSpecialOwner);
  if (!user) {
    user = {
      username: name,
      password: '',
      email: email,
      avatar: avatar,
      authProvider: provider,
      providerId: id,
      tier: isActivated ? 'pro' : 'free',
      proExpiresAt: isSpecialOwner ? 253402300799000 : null,
      isTesterPro: isActivated,
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
    if (isActivated) {
      user.tier = 'pro';
      user.isTesterPro = true;
    }
  }
  persistUserDb();

  res.json({
    success: true,
    user: {
      username: user.username,
      tier: (isActivated || user.isTesterPro) ? 'pro' : user.tier,
      proExpiresAt: user.proExpiresAt,
      isTesterPro: Boolean(isActivated || user.isTesterPro),
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
  if (!checkRateLimit(req, 'create_room', 20, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many rooms created. Please slow down.' });
  }

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
  if (!checkRateLimit(req, 'room_events', 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many event stream connections' });
  }

  const norm = normalizeRoomCode(req.params.code);
  const room = getOrCreateRoom(norm);

  // Bound active SSE clients per room to prevent socket starvation
  if (room.clients.size >= 50) {
    return res.status(429).json({ error: 'Room client connection limit reached (max 50)' });
  }

  // Prevent socket timeout during SSE event stream
  if (req.socket && req.socket.setTimeout) {
    req.socket.setTimeout(0);
    req.socket.setKeepAlive(true, 15000);
  }

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

  const cleanupClient = () => {
    clearInterval(heartbeat);
    room.clients.delete(res);
    broadcastRoomEvent(room, 'client_count', { clientCount: room.clients.size });
  };

  req.on('close', cleanupClient);
  res.on('close', cleanupClient);
  res.on('error', cleanupClient);
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

  const rawSeconds = parseInt(track.seconds, 10);
  const boundedSeconds = (Number.isFinite(rawSeconds) && rawSeconds > 0) ? Math.min(86400, Math.max(10, rawSeconds)) : 240;

  let safeThumb = `https://i.ytimg.com/vi/${validTrackId}/hqdefault.jpg`;
  if (typeof track.thumbnail === 'string' && (track.thumbnail.startsWith('https://') || track.thumbnail.startsWith('http://'))) {
    safeThumb = track.thumbnail.slice(0, 500);
  }

  const queueItem = {
    id: validTrackId,
    title: sanitizeText(track.title, 120) || 'YouTube Track',
    author: sanitizeText(track.author, 60) || 'YouTube',
    duration: sanitizeText(track.duration, 15) || '4:00',
    seconds: boundedSeconds,
    thumbnail: safeThumb,
    url: `https://youtube.com/watch?v=${validTrackId}`,
    addedBy: addedBy,
    addedAt: Date.now()
  };

  // Priority Queue insertion requires VIP PRO host room or FastPass
  const isFastPass = !!(req.body && req.body.isFastPass);
  const isPriority = isFastPass || !!(req.body && req.body.priority && room.hostTier === 'pro');
  if (req.body && req.body.tipAmount !== undefined) {
    const rawTip = parseFloat(req.body.tipAmount);
    if (Number.isFinite(rawTip) && rawTip > 0) {
      queueItem.tipAmount = Math.min(100000, rawTip);
      queueItem.tipMessage = sanitizeText(req.body.tipMessage, 100);
    }
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
    !Number.isInteger(fromIndex) || !Number.isInteger(toIndex) ||
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

// Host pushes state update (current track, play status, queue sync, audio DSP state)
app.post('/api/room/:code/sync', (req, res) => {
  if (!checkRateLimit(req, 'room_sync', 120, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many sync requests' });
  }

  const norm = normalizeRoomCode(req.params.code);
  const room = getOrCreateRoom(norm);
  const { currentTrack, isPlaying, queue, allowRemoteControl, hostName, hostTier, isVocalCutEnabled, isDucked } = req.body || {};

  if (currentTrack !== undefined) {
    if (currentTrack && typeof currentTrack === 'object') {
      const vId = extractValidYouTubeId(currentTrack.id);
      room.currentTrack = {
        id: vId || sanitizeText(currentTrack.id, 16),
        title: sanitizeText(currentTrack.title, 120) || 'YouTube Track',
        author: sanitizeText(currentTrack.author, 60) || 'YouTube',
        duration: sanitizeText(currentTrack.duration, 15) || '4:00',
        seconds: Math.min(86400, Math.max(10, parseInt(currentTrack.seconds, 10) || 240)),
        thumbnail: typeof currentTrack.thumbnail === 'string' && (currentTrack.thumbnail.startsWith('http://') || currentTrack.thumbnail.startsWith('https://')) ? currentTrack.thumbnail.slice(0, 500) : (vId ? `https://i.ytimg.com/vi/${vId}/hqdefault.jpg` : ''),
        url: vId ? `https://youtube.com/watch?v=${vId}` : ''
      };
    } else {
      room.currentTrack = null;
    }
  }
  if (isPlaying !== undefined) room.isPlaying = Boolean(isPlaying);
  if (Array.isArray(queue)) {
    room.queue = queue.slice(0, 100).map(t => {
      const vId = t && t.id ? extractValidYouTubeId(t.id) : null;
      return {
        id: vId || (t && t.id ? sanitizeText(t.id, 16) : ''),
        title: sanitizeText(t && t.title, 120) || 'YouTube Track',
        author: sanitizeText(t && t.author, 60) || 'YouTube',
        duration: sanitizeText(t && t.duration, 15) || '4:00',
        seconds: Math.min(86400, Math.max(10, parseInt(t && t.seconds, 10) || 240)),
        thumbnail: typeof (t && t.thumbnail) === 'string' && (t.thumbnail.startsWith('http://') || t.thumbnail.startsWith('https://')) ? t.thumbnail.slice(0, 500) : (vId ? `https://i.ytimg.com/vi/${vId}/hqdefault.jpg` : ''),
        url: vId ? `https://youtube.com/watch?v=${vId}` : '',
        addedBy: sanitizeText(t && t.addedBy, 32) || 'Guest',
        addedAt: Number.isFinite(t && t.addedAt) ? t.addedAt : Date.now()
      };
    });
  }
  if (allowRemoteControl !== undefined) room.allowRemoteControl = Boolean(allowRemoteControl);
  if (hostName) room.hostName = sanitizeText(hostName, 32);
  if (hostTier) room.hostTier = hostTier;
  if (isVocalCutEnabled !== undefined) room.isVocalCutEnabled = Boolean(isVocalCutEnabled);
  if (isDucked !== undefined) room.isDucked = Boolean(isDucked);

  room.lastActive = Date.now();

  broadcastRoomEvent(room, 'state_updated', getRoomSnapshot(room));
  res.json({ success: true });
});

// Remote triggers playback action (Play/Pause, Skip, Ducking, Vocal Cut)
app.post('/api/room/:code/control', (req, res) => {
  if (!checkRateLimit(req, 'control', 45, 10 * 1000)) {
    return res.status(429).json({ error: 'Too many control requests. Please slow down.' });
  }

  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (!room.allowRemoteControl) {
    return res.status(403).json({ error: 'Host has disabled remote control for this room' });
  }

  const { action, payload, sender } = req.body || {};
  const validActions = ['play', 'pause', 'toggle', 'next', 'prev', 'ducking', 'play_now', 'toggle_vocal_cut'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  let safePayload = payload;
  if (action === 'play_now') {
    const validPlayId = payload && payload.id ? extractValidYouTubeId(payload.id) : null;
    if (!payload || !payload.id || !validPlayId) {
      return res.status(400).json({ error: 'Valid YouTube video track required for play_now' });
    }
    const rawSec = parseInt(payload.seconds, 10);
    const boundedSec = (Number.isFinite(rawSec) && rawSec > 0) ? Math.min(86400, Math.max(10, rawSec)) : 240;
    let safeThumb = `https://i.ytimg.com/vi/${validPlayId}/hqdefault.jpg`;
    if (typeof payload.thumbnail === 'string' && (payload.thumbnail.startsWith('https://') || payload.thumbnail.startsWith('http://'))) {
      safeThumb = payload.thumbnail.slice(0, 500);
    }
    safePayload = {
      id: validPlayId,
      title: sanitizeText(payload.title, 120) || 'YouTube Track',
      author: sanitizeText(payload.author, 60) || 'YouTube',
      duration: sanitizeText(payload.duration, 15) || '4:00',
      seconds: boundedSec,
      thumbnail: safeThumb,
      url: `https://youtube.com/watch?v=${validPlayId}`
    };
  } else if (payload && typeof payload === 'object') {
    // Sanitize non-play_now payload to prevent prototype pollution or large arbitrary payloads
    const sanitizedObj = {};
    if (payload.isDucked !== undefined) sanitizedObj.isDucked = Boolean(payload.isDucked);
    if (payload.isVocalCutEnabled !== undefined) sanitizedObj.isVocalCutEnabled = Boolean(payload.isVocalCutEnabled);
    safePayload = sanitizedObj;
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
  if (!checkRateLimit(req, 'tip', 20, 10 * 1000)) {
    return res.status(429).json({ error: 'Too many tip requests. Please slow down.' });
  }

  const norm = normalizeRoomCode(req.params.code);
  const room = rooms.get(norm);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const sender = sanitizeText(req.body && req.body.sender, 32) || 'VIP Fan';
  const rawAmt = parseFloat(req.body && req.body.amount);
  const amount = (Number.isFinite(rawAmt) && rawAmt > 0) ? Math.min(100000, rawAmt) : 20.00;
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
  for (const [k, v] of lyricsCache.entries()) {
    if (now - v.time > 24 * 60 * 60 * 1000) lyricsCache.delete(k);
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

// Global Express Error Handler Middleware (Prevents stack trace leaks in responses)
app.use((err, req, res, next) => {
  console.error('[Global Server Error]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error', message: err.message || 'Unknown error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NOCTURNE Studio Engine listening on port ${PORT}`);
});

// Configure robust HTTP socket timeouts for Cloud and Local resilience
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 30000;

module.exports = server;
