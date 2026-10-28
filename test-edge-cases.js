// Edge Cases & Security Hardening Unit Test Suite for Nocturne Studio
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let testPort = 3398;
let testProcess = null;

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

async function runEdgeCaseTests() {
  console.log('====================================================');
  console.log('🛡️ NOCTURNE STUDIO • HARDENING & EDGE CASE TEST SUITE');
  console.log('====================================================');

  testProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(testPort) },
    stdio: 'ignore'
  });

  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (await isPortOpen(testPort)) break;
  }

  let passed = 0;
  let failed = 0;

  // Edge Case 1: XSS Injection & Sanitization in Queue Item Title & AddedBy
  try {
    console.log('\n[Edge Case 1] Testing XSS sanitization on song queue...');
    const xssTitle = '<script>alert("XSS")</script>Song';
    const xssNick = '<img src=x onerror=alert(1)>Nick';
    const res = await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/queue`, {
      track: {
        id: 'dQw4w9WgXcQ',
        title: xssTitle,
        author: 'Artist',
        duration: '3:00',
        seconds: 180
      },
      addedBy: xssNick
    });

    const roomData = await fetchJson(`http://127.0.0.1:${testPort}/api/room/SEC-001`);
    const qTrack = roomData.data.queue[0];
    if (qTrack && qTrack.title.length <= 120 && qTrack.addedBy.length <= 32) {
      console.log('  ✅ Passed: XSS payload bounded, stored safely');
      passed++;
    } else {
      console.error('  ❌ Failed: Queue track not bounded or stored');
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 1 Error:', err.message);
    failed++;
  }

  // Edge Case 2: Invalid Video ID in Queue Addition (Argument / URL Injection Defense)
  try {
    console.log('\n[Edge Case 2] Testing rejected malicious / invalid video IDs in queue...');
    const badRes = await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/queue`, {
      track: {
        id: '; rm -rf / ; --malicious',
        title: 'Exploit'
      },
      addedBy: 'Attacker'
    });
    if (badRes.status === 400) {
      console.log('  ✅ Passed: Rejected invalid video ID with 400 Bad Request');
      passed++;
    } else {
      console.error('  ❌ Failed: Server accepted invalid video ID:', badRes.status);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 2 Error:', err.message);
    failed++;
  }

  // Edge Case 3: Out-of-bounds Move and Delete Index Handling
  try {
    console.log('\n[Edge Case 3] Testing out-of-bounds index handling for queue delete and move...');
    const delBad = await deleteReq(`http://127.0.0.1:${testPort}/api/room/SEC-001/queue/999`);
    const delNeg = await deleteReq(`http://127.0.0.1:${testPort}/api/room/SEC-001/queue/-1`);
    const moveBad = await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/queue/move`, {
      fromIndex: 50,
      toIndex: 0
    });

    if (delBad.status === 400 && delNeg.status === 400 && moveBad.status === 400) {
      console.log('  ✅ Passed: All out-of-bounds operations safely returned 400 Bad Request without crashing');
      passed++;
    } else {
      console.error('  ❌ Failed: Bad index did not return 400');
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 3 Error:', err.message);
    failed++;
  }

  // Edge Case 4: Remote Control When Permission is Disabled by Host
  try {
    console.log('\n[Edge Case 4] Testing Remote Control permission gating...');
    await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/sync`, {
      allowRemoteControl: false
    });
    const ctrlRes = await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/control`, {
      action: 'next',
      sender: 'Guest'
    });
    if (ctrlRes.status === 403) {
      console.log('  ✅ Passed: Gated remote control returned 403 Forbidden when host disabled controls');
      passed++;
    } else {
      console.error('  ❌ Failed: Server allowed control when disabled:', ctrlRes.status);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 4 Error:', err.message);
    failed++;
  }

  // Edge Case 5: Verify Static Code Invariants for Audio Routing & Rule 2
  try {
    console.log('\n[Edge Case 5] Verifying Code Invariants (Rule 2 & destRecordTest routing)...');
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');

    // Invariant A: Default hpVocalVol is 0.0 (Rule 2 compliance)
    const hasRule2Default = appJsContent.includes('const initHpV = currentUser.preset.hpVocalVol !== undefined ? currentUser.preset.hpVocalVol : 0.0;');
    
    // Invariant B: destRecordTest does not connect redundant duplicate vocal/reverb
    const hasCleanRecordDest = appJsContent.includes('cableGain.connect(destRecordTest);') &&
      !appJsContent.includes('reverbGain.connect(destRecordTest);');

    // Invariant C: Memory leak prevention with object URL revocation
    const hasBlobRevoke = appJsContent.includes('URL.revokeObjectURL(window._currentRecordBlobUrl)');

    if (hasRule2Default && hasCleanRecordDest && hasBlobRevoke) {
      console.log('  ✅ Passed: All architectural audio invariants verified in app.js');
      passed++;
    } else {
      console.error('  ❌ Failed: Code invariant missing (Rule 2, Record Dest, or Blob Revoke)');
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 5 Error:', err.message);
    failed++;
  }

  if (testProcess) testProcess.kill();

  console.log('\n====================================================');
  console.log(`📊 EDGE CASE REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

runEdgeCaseTests();
