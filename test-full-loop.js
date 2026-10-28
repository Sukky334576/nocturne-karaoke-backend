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

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: respData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function deleteReq(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'DELETE'
    }, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: respData });
        }
      });
    });
    req.on('error', reject);
    req.end();
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
      '/remote.html',
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
      console.log(`  ✅ Passed: All 9 critical static assets verified (200 OK)`);
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
    if (res4.status === 200 && res4.contentType && res4.contentType.includes('audio') && res4.bytesReceived > 0) {
      console.log(`  ✅ Passed: Clean Audio Stream connected! Received ${res4.bytesReceived} bytes (${res4.contentType})`);
      passed++;
    } else {
      console.error(`  ❌ Failed: Audio stream failed (Status: ${res4.status}, Content-Type: ${res4.contentType})`);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 4 Error:', err.message);
    failed++;
  }

  // Test 5: Shared Room Remote Queueing REST API & Network Info
  try {
    console.log('\n[Test 5] Testing Shared Room Remote Queueing & Network Info APIs...');
    // 5a. Network info
    const netRes = await fetchJson(`http://127.0.0.1:${testPort}/api/network-info`);
    if (netRes.status !== 200 || !netRes.data.port) {
      throw new Error(`Network info failed: status ${netRes.status}`);
    }

    // 5b. Create Room
    const createRes = await postJson(`http://127.0.0.1:${testPort}/api/room/create`, {
      roomCode: 'TEST-999',
      hostName: 'TestHost'
    });
    if (createRes.status !== 200 || createRes.data.roomCode !== 'TEST-999') {
      throw new Error(`Room creation failed: ${JSON.stringify(createRes)}`);
    }

    // 5c. Add Song to Queue from Remote
    const queueRes1 = await postJson(`http://127.0.0.1:${testPort}/api/room/TEST-999/queue`, {
      track: {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        author: 'Rick Astley',
        duration: '3:33',
        seconds: 213,
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      },
      addedBy: 'MobileGuest1'
    });
    if (queueRes1.status !== 200 || queueRes1.data.position !== 1) {
      throw new Error(`Queue add failed: ${JSON.stringify(queueRes1)}`);
    }

    // 5d. Add 2nd Song
    await postJson(`http://127.0.0.1:${testPort}/api/room/TEST-999/queue`, {
      track: {
        id: 'oJ7cV4LcYQg',
        title: 'Song 2',
        author: 'Artist 2',
        duration: '4:00',
        seconds: 240
      },
      addedBy: 'MobileGuest2'
    });

    // 5e. Move Song
    const moveRes = await postJson(`http://127.0.0.1:${testPort}/api/room/TEST-999/queue/move`, {
      fromIndex: 1,
      toIndex: 0
    });
    if (moveRes.status !== 200 || moveRes.data.queue[0].id !== 'oJ7cV4LcYQg') {
      throw new Error(`Queue move failed: ${JSON.stringify(moveRes)}`);
    }

    // 5f. Delete Song
    const delRes = await deleteReq(`http://127.0.0.1:${testPort}/api/room/TEST-999/queue/0`);
    if (delRes.status !== 200 || delRes.data.queue.length !== 1) {
      throw new Error(`Queue delete failed: ${JSON.stringify(delRes)}`);
    }

    // 5g. Host Sync
    const syncRes = await postJson(`http://127.0.0.1:${testPort}/api/room/TEST-999/sync`, {
      currentTrack: { id: 'dQw4w9WgXcQ', title: 'Rick Astley' },
      isPlaying: true,
      allowRemoteControl: true
    });
    if (syncRes.status !== 200) {
      throw new Error(`Host sync failed: ${JSON.stringify(syncRes)}`);
    }

    // 5h. Remote Control
    const ctrlRes = await postJson(`http://127.0.0.1:${testPort}/api/room/TEST-999/control`, {
      action: 'next',
      sender: 'MobileGuest1'
    });
    if (ctrlRes.status !== 200) {
      throw new Error(`Remote control failed: ${JSON.stringify(ctrlRes)}`);
    }

    console.log('  ✅ Passed: Room creation, queue addition, move, deletion, host sync & remote controls all verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Test 5 Error:', err.message);
    failed++;
  }

  // Test 6: Server-Sent Events (SSE) Real-Time Stream Verification
  try {
    console.log('\n[Test 6] Testing Room Real-Time SSE Stream (/api/room/TEST-999/events)...');
    const sseOk = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${testPort}/api/room/TEST-999/events`, (res) => {
        if (res.statusCode !== 200 || !res.headers['content-type']?.includes('text/event-stream')) {
          req.destroy();
          return resolve(false);
        }
        res.on('data', (chunk) => {
          const str = chunk.toString();
          if (str.includes('event: init') || str.includes('client_count')) {
            res.destroy();
            resolve(true);
          }
        });
      });
      req.on('error', () => resolve(false));
      setTimeout(() => { req.destroy(); resolve(false); }, 3000);
    });

    if (sseOk) {
      console.log('  ✅ Passed: SSE connection established with valid text/event-stream headers and init event');
      passed++;
    } else {
      console.error('  ❌ Failed: SSE stream did not emit init event or headers invalid');
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 6 Error:', err.message);
    failed++;
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
