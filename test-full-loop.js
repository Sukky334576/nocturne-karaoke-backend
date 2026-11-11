// Comprehensive Backend & Streaming Loop Test Suite for Nocturne Studio
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let testPort = 3300;
let testProcess = null;
let tempTestDataDir = null;

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
  const os = require('os');
  tempTestDataDir = path.join(os.tmpdir(), 'nocturne-test-' + Date.now());
  fs.mkdirSync(tempTestDataDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'licenses.json'), path.join(tempTestDataDir, 'licenses.json'));
  fs.copyFileSync(path.join(__dirname, 'users.json'), path.join(tempTestDataDir, 'users.json'));

  testProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: '3399', NOCTURNE_DATA_DIR: tempTestDataDir },
    stdio: 'inherit'
  });
  // Wait up to 5s for server to boot
  for (let i = 0; i < 100; i++) {
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
  const testRoomCode = 'TEST-' + Math.floor(1000 + Math.random() * 9000);
  try {
    console.log(`\n[Test 5] Testing Shared Room Remote Queueing & Network Info APIs (${testRoomCode})...`);
    // 5a. Network info
    const netRes = await fetchJson(`http://127.0.0.1:${testPort}/api/network-info`);
    if (netRes.status !== 200 || !netRes.data.port) {
      throw new Error(`Network info failed: status ${netRes.status}`);
    }

    // 5b. Create Room
    const createRes = await postJson(`http://127.0.0.1:${testPort}/api/room/create`, {
      roomCode: testRoomCode,
      hostName: 'TestHost'
    });
    if (createRes.status !== 200 || createRes.data.roomCode !== testRoomCode) {
      throw new Error(`Room creation failed: ${JSON.stringify(createRes)}`);
    }

    // 5c. Add Song to Queue from Remote
    const queueRes1 = await postJson(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/queue`, {
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
    await postJson(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/queue`, {
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
    const moveRes = await postJson(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/queue/move`, {
      fromIndex: 1,
      toIndex: 0
    });
    if (moveRes.status !== 200 || moveRes.data.queue[0].id !== 'oJ7cV4LcYQg') {
      throw new Error(`Queue move failed: ${JSON.stringify(moveRes)}`);
    }

    // 5f. Delete Song
    const delRes = await deleteReq(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/queue/0`);
    if (delRes.status !== 200 || delRes.data.queue.length !== 1) {
      throw new Error(`Queue delete failed: ${JSON.stringify(delRes)}`);
    }

    // 5g. Host Sync
    const syncRes = await postJson(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/sync`, {
      currentTrack: { id: 'dQw4w9WgXcQ', title: 'Rick Astley' },
      isPlaying: true,
      allowRemoteControl: true
    });
    if (syncRes.status !== 200) {
      throw new Error(`Host sync failed: ${JSON.stringify(syncRes)}`);
    }

    // 5h. Remote Control
    const ctrlRes = await postJson(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/control`, {
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
    console.log(`\n[Test 6] Testing Room Real-Time SSE Stream (/api/room/${testRoomCode}/events)...`);
    const sseOk = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/events`, (res) => {
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

  // Test 7: PromptPay QR Code Generation, Verification & Social OAuth
  try {
    console.log('\n[Test 7] Testing PromptPay QR Generator, Payment Verification & Social OAuth...');
    // 7a. PromptPay QR Generation
    const qrRes = await fetchJson(`http://127.0.0.1:${testPort}/api/payment/promptpay-qr?username=TestSinger&amount=49`);
    if (qrRes.status !== 200 || !qrRes.data.success || !qrRes.data.qrPayload || !qrRes.data.ref.startsWith('PRO-')) {
      throw new Error(`PromptPay QR generation failed: ${JSON.stringify(qrRes)}`);
    }

    // 7b. PromptPay Verification (Pro Upgrade)
    const verifyRes = await postJson(`http://127.0.0.1:${testPort}/api/payment/verify`, {
      username: 'TestSinger',
      ref: qrRes.data.ref
    });
    if (verifyRes.status !== 200 || !verifyRes.data.success || verifyRes.data.tier !== 'pro' || !verifyRes.data.proExpiresAt) {
      throw new Error(`PromptPay verification failed: ${JSON.stringify(verifyRes)}`);
    }

    // 7c. Social OAuth Login (Google, Facebook, Discord)
    const oauthRes = await postJson(`http://127.0.0.1:${testPort}/api/auth/oauth`, {
      provider: 'google',
      profile: {
        id: 'google-uid-12345',
        name: 'OAuth Rocker',
        email: 'rocker@example.com',
        avatar: 'https://example.com/avatar.jpg'
      }
    });
    if (oauthRes.status !== 200 || !oauthRes.data.success || oauthRes.data.user.username !== 'OAuth Rocker') {
      throw new Error(`OAuth login failed: ${JSON.stringify(oauthRes)}`);
    }

    console.log('  ✅ Passed: PromptPay QR generation, instant verification & Social OAuth verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Test 7 Error:', err.message);
    failed++;
  }

  // Test 8: Synced Lyrics API, Room Live Reactions & Fast-Pass Tips
  try {
    console.log('\n[Test 8] Testing Synced Lyrics API, Live Reactions & VIP Tip Superchat...');
    // 8a. Synced Lyrics API
    const lyricsRes = await fetchJson(`http://127.0.0.1:${testPort}/api/lyrics?q=LOSO+%E0%B9%83%E0%B8%88%E0%B8%AA%E0%B8%B1%E0%B9%88%E0%B8%87%E0%B8%A1%E0%B8%B2`);
    if (lyricsRes.status !== 200 || !lyricsRes.data) {
      throw new Error(`Lyrics query failed: ${JSON.stringify(lyricsRes)}`);
    }

    // 8b. Room Live Reaction Broadcast
    const reactionRes = await postJson(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/reaction`, {
      emoji: '🔥',
      sender: 'MobileRocker'
    });
    if (reactionRes.status !== 200 || !reactionRes.data.success) {
      throw new Error(`Reaction broadcast failed: ${JSON.stringify(reactionRes)}`);
    }

    // 8c. VIP Fast-Pass Tip & Superchat
    const tipRes = await postJson(`http://127.0.0.1:${testPort}/api/room/${testRoomCode}/tip`, {
      sender: 'VIP Fan',
      amount: 50,
      message: 'ขอเพลงร็อคหน่อยค้าบ!'
    });
    if (tipRes.status !== 200 || !tipRes.data.success || tipRes.data.amount !== 50) {
      throw new Error(`Tip broadcast failed: ${JSON.stringify(tipRes)}`);
    }

    console.log('  ✅ Passed: Synced Lyrics, Live Emoji Reactions & Fast-Pass VIP Superchats verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Test 8 Error:', err.message);
    failed++;
  }

  // Test 9: Video IDs with Leading Hyphen & Tricky Formats Stream Pipeline
  try {
    console.log('\n[Test 9] Testing Tricky Video ID & Leading Hyphen Audio Pipeline (/api/audio?id=-FJ_T3VK4dE)...');
    const res9 = await checkStream(`http://127.0.0.1:${testPort}/api/audio?id=-FJ_T3VK4dE&t=2`);
    if (res9.status === 200 && res9.contentType && res9.contentType.includes('audio') && res9.bytesReceived > 0) {
      console.log(`  ✅ Passed: Leading Hyphen Audio Stream connected! Received ${res9.bytesReceived} bytes (${res9.contentType})`);
      passed++;
    } else {
      console.error(`  ❌ Failed: Audio stream failed for -FJ_T3VK4dE (Status: ${res9.status}, Content-Type: ${res9.contentType})`);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Test 9 Error:', err.message);
    failed++;
  }

  // Test 10: One-Time Single-Use Tester License Key Redemption & Status API
  try {
    console.log('\n[Test 10] Testing One-Time Tester License Key System (/api/license/status & /api/license/redeem)...');
    
    // 10a. License Status Check (Pre-Activation)
    const statusBefore = await fetchJson(`http://127.0.0.1:${testPort}/api/license/status`);
    if (statusBefore.status !== 200 || !statusBefore.data.success || statusBefore.data.isActivated !== false || typeof statusBefore.data.availableCodes !== 'number') {
      throw new Error(`License status check failed: ${JSON.stringify(statusBefore)}`);
    }

    // 10b. Reject invalid / empty activation codes
    const invalidRes = await postJson(`http://127.0.0.1:${testPort}/api/license/redeem`, {
      code: 'TOTALLY-INVALID-KEY-1234',
      username: 'TesterBob'
    });
    if (invalidRes.status !== 400 || invalidRes.data.success) {
      throw new Error(`Expected invalid code to be rejected with 400, got: ${JSON.stringify(invalidRes)}`);
    }

    // 10c. Successfully redeem a clean test activation key
    const uniqueTestKey = `NOCTURNE-TEST-${Date.now()}`;
    const redeemRes = await postJson(`http://127.0.0.1:${testPort}/api/license/redeem`, {
      code: uniqueTestKey,
      username: 'TesterAlice'
    });
    if (redeemRes.status !== 200 || !redeemRes.data.success || redeemRes.data.tier !== 'pro' || !redeemRes.data.user.isTesterPro) {
      throw new Error(`Valid code redemption failed: ${JSON.stringify(redeemRes)}`);
    }

    // 10d. Reject already-used / replayed activation key
    const replayRes = await postJson(`http://127.0.0.1:${testPort}/api/license/redeem`, {
      code: uniqueTestKey,
      username: 'SneakyAttacker'
    });
    if (replayRes.status !== 400 || replayRes.data.success) {
      throw new Error(`Expected replayed code to be rejected, got: ${JSON.stringify(replayRes)}`);
    }

    // 10e. Alias endpoint test (/api/redeem-code)
    const aliasKey = `NOCTURNE-TEST-ALIAS-${Date.now()}`;
    const aliasRes = await postJson(`http://127.0.0.1:${testPort}/api/redeem-code`, {
      code: aliasKey,
      username: 'TesterCharlie'
    });
    if (aliasRes.status !== 200 || !aliasRes.data.success || aliasRes.data.tier !== 'pro') {
      throw new Error(`Alias endpoint /api/redeem-code failed: ${JSON.stringify(aliasRes)}`);
    }

    // 10f. License Status Check (Post-Activation)
    const statusAfter = await fetchJson(`http://127.0.0.1:${testPort}/api/license/status?username=TesterAlice`);
    if (statusAfter.status !== 200 || !statusAfter.data.isActivated || statusAfter.data.tier !== 'pro') {
      throw new Error(`Post-activation status failed: ${JSON.stringify(statusAfter)}`);
    }

    // 10g. Verify TESTER_CODES.txt exists
    const codesTxtPath = tempTestDataDir ? path.join(tempTestDataDir, 'TESTER_CODES.txt') : path.join(__dirname, 'TESTER_CODES.txt');
    if (!fs.existsSync(codesTxtPath) || !fs.readFileSync(codesTxtPath, 'utf8').includes('NOCTURNE-BETA-')) {
      throw new Error('TESTER_CODES.txt not generated or missing beta codes');
    }

    console.log('  ✅ Passed: One-Time Tester Key redemption, single-use enforcement, alias endpoint & TESTER_CODES.txt verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Test 10 Error:', err.message);
    failed++;
  }

  // Cleanup ephemeral process & temp directory
  if (testProcess) {
    testProcess.kill();
  }
  if (tempTestDataDir && fs.existsSync(tempTestDataDir)) {
    try { fs.rmSync(tempTestDataDir, { recursive: true, force: true }); } catch (_) {}
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL TEST REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

runTests();
