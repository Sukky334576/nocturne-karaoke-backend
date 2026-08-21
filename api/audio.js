const https = require('https');

const BACKEND_TUNNELS = [
  'https://prep-tied-cables-accordance.trycloudflare.com',
  'https://nocturne-karaoke-backend.onrender.com'
];

async function streamFromTunnel(url, res) {
  return new Promise((resolve, reject) => {
    const reqT = https.get(url, { timeout: 8000 }, (resp) => {
      if (resp.statusCode !== 200) return reject('Status ' + resp.statusCode);
      res.writeHead(resp.statusCode, {
        'Content-Type': resp.headers['content-type'] || 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Accept-Ranges': 'none'
      });
      resp.pipe(res);
      resolve();
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

  const id = req.query.id || req.query.v || req.query.url;
  const t = req.query.t || 0;
  if (!id) return res.status(400).send('Video ID required');

  for (const backend of BACKEND_TUNNELS) {
    try {
      const streamUrl = `${backend}/api/audio?id=${encodeURIComponent(id)}&t=${t}`;
      await streamFromTunnel(streamUrl, res);
      return;
    } catch (e) {
      console.warn(`Backend ${backend} failed, trying next...`);
    }
  }

  res.status(500).send('All audio backends unavailable');
};
