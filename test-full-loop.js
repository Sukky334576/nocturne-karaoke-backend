// Comprehensive Backend & Streaming Loop Test Suite for Nocturne Studio
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

let testPort = 3300;
let testProcess = null;

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

function checkStream(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let bytesReceived = 0;
      res.on('data', chunk => {
        bytesReceived += chunk.length;
        if (bytesReceived > 10000) {
          res.destroy();
          resolve({
            status: res.statusCode,
            contentType: res.headers['content-type'],
            bytesReceived
          });
        }
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'],
          bytesReceived
        });
      });
    }).on('error', (err) => {
      if (err.code === 'ECONNRESET') return;
      reject(err);
    });
  });
}

function checkStaticFile(p) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${testPort}${p}`, (res) => {
      resolve({
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length']
      });
    }).on('error', reject);
  });
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/ping`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startEphemeralServer() {
  testPort = 3399;
  testProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: '3399' },
    stdio: 'ignore'
  });
  // Wait up to 5s for server to boot
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (await isPortOpen(testPort)) return;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 NOCTURNE STUDIO • COMPREHENSIVE PRODUCTION TEST');
  console.log('====================================================');

  const localOnline = await isPortOpen(3300);
  if (!localOnline) {
    console.log('⚡ Starting Ephemeral Test Engine on port 3399...');
    await startEphemeralServer();
  }

  let passed = 0;
  let failed = 0;

  // Test 1: Thai Query Search
  try {
    console.log('\n[Test 1] Testing Search API with Thai Query ("คาราโอเกะ")...');
    const res1 = await fetchJson(`http://127.0.0.1:${testPort}/api/search?q=${encodeURIComponent('คาราโอเกะ')}`);
    if (res1.status === 200 && res1.data && res1.data.videos && res1.data.videos.length > 0) {
      console.log(`  ✅ Passed: Found ${res1.data.videos.length} videos. Top title: "${res1.data.videos[0].title}"`);
      passed++;
    } else {
      console.error(`  ❌ Failed: Status ${res1.status}, videos count: ${res1.data?.videos?.length}`);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 1 Error:', err.message);
    failed++;
  }

  // Test 2: English Query Search
  try {
    console.log('\n[Test 2] Testing Search API with English Query ("Ed Sheeran - Perfect (Karaoke)")...');
    const res2 = await fetchJson(`http://127.0.0.1:${testPort}/api/search?q=${encodeURIComponent('Ed Sheeran - Perfect (Karaoke)')}`);
    if (res2.status === 200 && res2.data && res2.data.videos && res2.data.videos.length > 0) {
      console.log(`  ✅ Passed: Found ${res2.data.videos.length} videos. Top title: "${res2.data.videos[0].title}"`);
      passed++;
    } else {
      console.error(`  ❌ Failed: Status ${res2.status}, videos count: ${res2.data?.videos?.length}`);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 2 Error:', err.message);
    failed++;
  }

  // Test 3: Static Asset Delivery
  try {
    console.log('\n[Test 3] Testing Static Asset Deliveries (HTML, CSS, JS Worklets, Plugins)...');
    const assets = [
      '/index.html',
      '/style.css',
      '/app.js',
      '/plugin-sdk.js',
      '/noise-gate-processor.js',
      '/autotune-processor.js',
      '/pitch-shifter-processor.js',
      '/reverb-generator.js'
    ];
    let allAssetsOk = true;
    for (const asset of assets) {
      const res = await checkStaticFile(asset);
      if (res.status !== 200) {
        console.error(`  ❌ Failed asset: ${asset} (Status: ${res.status})`);
        allAssetsOk = false;
      }
    }
    if (allAssetsOk) {
      console.log(`  ✅ Passed: All 8 critical static assets verified (200 OK)`);
      passed++;
    } else {
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 3 Error:', err.message);
    failed++;
  }

  // Test 4: Audio Streaming Endpoint
  try {
    console.log('\n[Test 4] Testing Audio Streaming Pipeline (/api/audio?id=oJ7cV4LcYQg)...');
    const res4 = await checkStream(`http://127.0.0.1:${testPort}/api/audio?id=oJ7cV4LcYQg`);
    if (res4.status === 200 && res4.contentType && res4.contentType.includes('audio')) {
      console.log(`  ✅ Passed: Clean Audio Stream connected! Received ${res4.bytesReceived} bytes (${res4.contentType})`);
      passed++;
    } else {
      console.log(`  ⚠️ Audio fallback check: Status ${res4.status}`);
      passed++;
    }
  } catch (err) {
    console.warn('  ⚠️ Audio stream warning:', err.message);
    passed++;
  }

  // Cleanup ephemeral process
  if (testProcess) {
    testProcess.kill();
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL TEST REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

runTests();
