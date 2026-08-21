const https = require('https');
const yts = require('yt-search');

const BACKEND_TUNNELS = [
  'https://prep-tied-cables-accordance.trycloudflare.com',
  'https://nocturne-karaoke-backend.onrender.com'
];

async function searchFromBackend(backendUrl, query) {
  return new Promise((resolve, reject) => {
    const url = `${backendUrl}/api/search?q=${encodeURIComponent(query)}`;
    const reqT = https.get(url, { timeout: 4000 }, (resp) => {
      if (resp.statusCode !== 200) return reject('Status ' + resp.statusCode);
      let body = '';
      resp.on('data', chunk => body += chunk);
      resp.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    reqT.on('error', reject);
    reqT.on('timeout', () => { reqT.destroy(); reject('timeout'); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  // 1. Direct yts search on Serverless (fastest & 0-dependency)
  try {
    const results = await yts(query);
    if (results && results.videos && results.videos.length > 0) {
      const videos = results.videos.slice(0, 15).map(v => ({
        id: v.videoId,
        title: v.title,
        url: v.url,
        duration: v.duration.timestamp,
        seconds: v.duration.seconds,
        author: v.author.name,
        thumbnail: v.thumbnail
      }));
      return res.status(200).json({ videos });
    }
  } catch (err) {
    console.warn('Direct yts search failed, trying backend tunnels:', err.message);
  }

  // 2. Tunnel fallback
  for (const backend of BACKEND_TUNNELS) {
    try {
      const data = await searchFromBackend(backend, query);
      if (data && data.videos) {
        return res.status(200).json(data);
      }
    } catch (e) {
      // try next
    }
  }

  res.status(500).json({ error: 'Failed to search YouTube' });
};
