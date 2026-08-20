const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

async function test() {
  console.log('Searching for "karaoke thai"...');
  const r = await yts('karaoke thai');
  const videos = r.videos.slice(0, 3);
  console.log('Found:', videos.map(v => ({ title: v.title, url: v.url, duration: v.duration.timestamp })));
  
  if (videos.length > 0) {
    console.log('Testing info extraction for:', videos[0].url);
    try {
      const info = await ytdl.getInfo(videos[0].url);
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      console.log('Audio formats found:', audioFormats.length, 'Best audio url available:', !!audioFormats[0]?.url);
    } catch (err) {
      console.error('ytdl error:', err.message);
    }
  }
}

test();
