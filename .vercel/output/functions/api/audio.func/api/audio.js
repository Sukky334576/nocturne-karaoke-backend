const https = require('https');
const http = require('http');

// Free Invidious / Piped API mirrors for serverless audio resolving
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.private.coffee',
  'https://invidious.jing.rocks',
  'https://yt.drgnz.club'
];

async function fetchFromInvidious(videoId) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}`;
      const data = await new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 }, res => {
          if (res.statusCode !== 200) return reject('Status ' + res.statusCode);
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject('timeout'); });
      });

      if (data && data.adaptiveFormats) {
        const audioFormats = data.adaptiveFormats
          .filter(f => f.type && f.type.startsWith('audio/'))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        
        if (audioFormats.length > 0 && audioFormats[0].url) {
          return audioFormats[0].url;
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query.id || req.query.v;
  if (!id) return res.status(400).send('Video ID required');

  try {
    const streamUrl = await fetchFromInvidious(id);
    if (streamUrl) {
      // 302 Redirect directly to Google CDN audio chunk stream
      res.writeHead(302, { Location: streamUrl });
      return res.end();
    }

    res.status(500).send('Unable to resolve audio stream for Vercel serverless');
  } catch (err) {
    console.error('Audio resolve error:', err);
    res.status(500).send('Error resolving audio stream');
  }
};
