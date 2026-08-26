const express = require('express');
const yts = require('yt-search');
const https = require('https');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
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

function extractStreamUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    const cached = streamCache.get(targetUrl);
    if (cached && (Date.now() - cached.time < 4 * 60 * 60 * 1000)) {
      return resolve(cached.url);
    }

    execFile(ytDlpPath, [
      '--js-runtimes', 'node',
      '--extractor-args', 'youtube:player_client=android_creator,tv_embedded,web_creator,visionos',
      '-f', 'ba/b',
      '-g',
      '--no-playlist',
      '--',
      targetUrl
    ], (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp extract error:', stderr || error.message);
        return reject(stderr || error.message);
      }
      const streamUrl = stdout.trim().split('\n').filter(l => l.startsWith('http'))[0];
      if (!streamUrl) return reject('No stream URL returned');
      setBoundedCache(streamCache, targetUrl, { url: streamUrl, time: Date.now() }, 100);
      resolve(streamUrl);
    });
  });
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

// API: Audio Stream (Direct Pipe via FFmpeg)
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
      '-probesize', '32',
      '-analyzeduration', '0',
      '-headers', 'User-Agent: Mozilla/5.0\r\n'
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

    ffmpegProcess.stdout.pipe(res);

    req.on('close', () => {
      if (ffmpegProcess && !ffmpegProcess.killed) {
        ffmpegProcess.kill();
      }
    });

    ffmpegProcess.on('error', (err) => {
      console.error('FFmpeg process error:', err);
      if (!res.headersSent) res.status(500).send('FFmpeg stream failed');
    });
  } catch (err) {
    console.error('Audio stream error:', err);
    if (!res.headersSent) res.status(500).send('Error streaming audio: ' + err);
  }
});

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
