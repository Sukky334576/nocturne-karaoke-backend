const express = require('express');
const yts = require('yt-search');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3300;

// Global Permissive CORS for Vercel and Browser cross-origin streaming
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

// In-Memory Stream URL Cache (TTL: 1 hour)
const streamCache = new Map();

function extractStreamUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    const cached = streamCache.get(targetUrl);
    if (cached && (Date.now() - cached.time < 60 * 60 * 1000)) {
      return resolve(cached.url);
    }

    execFile(ytDlpPath, [
      '--extractor-args', 'youtube:player_client=android,mweb',
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

// API: Search YouTube
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query parameter q is required' });

  try {
    const results = await yts(query);
    const videos = results.videos.slice(0, 15).map(v => ({
      id: v.videoId,
      title: v.title,
      url: v.url,
      duration: v.duration.timestamp,
      seconds: v.duration.seconds,
      author: v.author.name,
      thumbnail: v.thumbnail
    }));
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ NOCTURNE Studio Engine listening on port ${PORT}`);
});
