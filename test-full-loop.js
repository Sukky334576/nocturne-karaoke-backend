// Comprehensive Backend & Streaming Loop Test Suite
const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, error: e.message });
        }
      });
    }).on('error', reject);
  });
}

function checkStreamHeader(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length']
      });
      res.destroy(); // close connection
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 STARTING COMPREHENSIVE FULL LOOP TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Search Thai songs
  try {
    console.log('[Test 1] Testing Search API with Thai Query ("คาราโอเกะ")...');
    const res1 = await fetchJson('http://localhost:3300/api/search?q=%E0%B8%84%E0%B8%B2%E0%B8%A3%E0%B8%B2%E0%B9%82%E0%B8%AD%E0%B9%80%E0%B8%81%E0%B8%B0');
    if (res1.status === 200 && res1.data.videos && res1.data.videos.length > 0) {
      console.log(`  ✅ Passed: Found ${res1.data.videos.length} videos. Top title: "${res1.data.videos[0].title}"`);
      passed++;
    } else {
      console.error('  ❌ Failed:', res1);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 1 Error:', err.message);
    failed++;
  }

  // Test 2: Search with Special Characters
  try {
    console.log('\n[Test 2] Testing Search API with Special Characters & English ("Ed Sheeran - Perfect (Karaoke) & #")...');
    const res2 = await fetchJson('http://localhost:3300/api/search?q=' + encodeURIComponent('Ed Sheeran - Perfect (Karaoke) & #'));
    if (res2.status === 200 && res2.data.videos && res2.data.videos.length > 0) {
      console.log(`  ✅ Passed: Found ${res2.data.videos.length} videos. Top title: "${res2.data.videos[0].title}"`);
      passed++;
    } else {
      console.error('  ❌ Failed:', res2);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 2 Error:', err.message);
    failed++;
  }

  // Test 3: Direct Stream URL extraction via Video ID
  let sampleId = 'niukZCvB67I'; // Loso Karaoke
  try {
    console.log(`\n[Test 3] Testing Stream URL Extraction by ID (${sampleId})...`);
    const start = Date.now();
    const res3 = await fetchJson(`http://localhost:3300/api/stream-url?id=${sampleId}`);
    const elapsed = Date.now() - start;
    if (res3.status === 200 && res3.data.streamUrl && res3.data.streamUrl.startsWith('http')) {
      console.log(`  ✅ Passed: Extracted in ${elapsed}ms. Stream format: ${res3.data.format}`);
      passed++;
    } else {
      console.error('  ❌ Failed:', res3);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 3 Error:', err.message);
    failed++;
  }

  // Test 4: Stream URL Cache verification (Sub-second response)
  try {
    console.log(`\n[Test 4] Testing Stream Cache Hit (${sampleId})...`);
    const start = Date.now();
    const res4 = await fetchJson(`http://localhost:3300/api/stream-url?id=${sampleId}`);
    const elapsed = Date.now() - start;
    if (res4.status === 200 && elapsed < 50) {
      console.log(`  ✅ Passed: Cached stream returned instantly in ${elapsed}ms!`);
      passed++;
    } else {
      console.error(`  ❌ Failed or too slow: ${elapsed}ms`, res4);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 4 Error:', err.message);
    failed++;
  }

  // Test 5: Full YouTube URL Input Parsing
  try {
    const fullUrl = 'https://www.youtube.com/watch?v=niukZCvB67I';
    console.log(`\n[Test 5] Testing Stream Extraction with Full URL (${fullUrl})...`);
    const res5 = await fetchJson(`http://localhost:3300/api/stream-url?url=${encodeURIComponent(fullUrl)}`);
    if (res5.status === 200 && res5.data.streamUrl) {
      console.log('  ✅ Passed: Full URL parsed and stream URL obtained successfully.');
      passed++;
    } else {
      console.error('  ❌ Failed:', res5);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 5 Error:', err.message);
    failed++;
  }

  // Test 6: Fallback Stream Pipe API
  try {
    console.log(`\n[Test 6] Testing Fallback Stream Pipe Endpoint (/api/stream?id=${sampleId})...`);
    const pipeRes = await checkStreamHeader(`http://localhost:3300/api/stream?id=${sampleId}`);
    if (pipeRes.statusCode === 200 && pipeRes.contentType === 'audio/webm') {
      console.log(`  ✅ Passed: Stream Pipe responding with status 200 and Content-Type: ${pipeRes.contentType}`);
      passed++;
    } else {
      console.error('  ❌ Failed:', pipeRes);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 6 Error:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runTests();
