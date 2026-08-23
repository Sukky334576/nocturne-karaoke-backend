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

// In-Memory Search & Stream Cache (TTL: 2 hours)
const searchCache = new Map();
const streamCache = new Map();

// Ultra-Fast YouTube Search via Direct InnerTube API (~150ms)
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
      timeout: 3500
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
    if (cached && (Date.now() - cached.time < 2 * 60 * 60 * 1000)) {
      return resolve(cached.url);
    }

    execFile(ytDlpPath, [
      '--extractor-args', 'youtube:player_client=ios,web,mweb,android,tv_embedded',
      '-f', 'ba/b',
      '-g',
      '--no-playlist',
      targetUrl
    ], (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp extract error:', stderr || error.message);
        return reject(stderr || error.message);
      }
      const streamUrl = stdout.trim().split('\n').filter(l => l.startsWith('http'))[0];
      if (!streamUrl) return reject('No stream URL returned');
      streamCache.set(targetUrl, { url: streamUrl, time: Date.now() });
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
  if (cached && (Date.now() - cached.time < 2 * 60 * 60 * 1000)) {
    return res.json({ videos: cached.videos });
  }

  // 1. Try Fast InnerTube API first (~150ms)
  try {
    const videos = await fastYoutubeSearch(rawQuery);
    if (videos && videos.length > 0) {
      searchCache.set(query, { videos, time: Date.now() });
      return res.json({ videos });
    }
  } catch (err) {
    console.warn('InnerTube fast search fallback:', err.message);
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

    searchCache.set(query, { videos, time: Date.now() });
    res.json({ videos });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search YouTube: ' + err.message });
  }
});

// API: Audio Stream (Direct Pipe via FFmpeg)
app.get('/api/audio', async (req, res) => {
  const idOrUrl = req.query.id || req.query.url;
  const startTime = parseFloat(req.query.t || req.query.start || 0);
  if (!idOrUrl) return res.status(400).send('id or url required');
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
      ffmpegProcess.kill('SIGKILL');
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NOCTURNE Studio Engine listening on port ${PORT}`);
});
