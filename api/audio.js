const https = require('https');

const BACKEND_TUNNELS = [
  'https://prep-tied-cables-accordance.trycloudflare.com',
  'https://nocturne-karaoke-backend.onrender.com'
];

async function streamFromTunnel(url, res) {
  return new Promise((resolve, reject) => {
    const reqT = https.get(url, { timeout: 8000 }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        const redirected = new URL(resp.headers.location, url).href;
        return streamFromTunnel(redirected, res).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200 && resp.statusCode !== 206) return reject(new Error('Status ' + resp.statusCode));
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

    res.on('close', () => {
      if (reqT && !reqT.destroyed) reqT.destroy();
    });

    reqT.on('error', reject);
    reqT.on('timeout', () => { reqT.destroy(); reject(new Error('timeout')); });
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

  // Upstream public proxy fallback for serverless cloud execution
  const upstreamInstances = [
    `https://yt.chocolatemoo53.com/latest_version?id=${encodeURIComponent(id)}&itag=140`,
    `https://yt.chocolatemoo53.com/latest_version?id=${encodeURIComponent(id)}&itag=251`,
    `https://invidious.tiekoetter.com/latest_version?id=${encodeURIComponent(id)}&itag=140`,
    `https://inv.zzls.xyz/latest_version?id=${encodeURIComponent(id)}&itag=140`,
    `https://inv.nadeko.net/latest_version?id=${encodeURIComponent(id)}&itag=140`
  ];

  for (const fallback of upstreamInstances) {
    try {
      await streamFromTunnel(fallback, res);
      return;
    } catch (e) {
      console.warn(`Upstream fallback ${fallback} note:`, e);
    }
  }

  res.status(500).send('All audio backends unavailable');
};
