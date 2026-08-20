const yts = require('yt-search');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

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
    res.status(200).json({ videos });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search: ' + err.message });
  }
};
