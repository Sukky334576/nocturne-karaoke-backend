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
    const isTagFree = !qTrack.title.includes('<') && !qTrack.title.includes('>') &&
                      !qTrack.addedBy.includes('<') && !qTrack.addedBy.includes('>');
    if (qTrack && qTrack.title.length <= 120 && qTrack.addedBy.length <= 32 && isTagFree) {
      console.log('  ✅ Passed: XSS payload stripped of angle brackets & bounded, stored safely');
      passed++;
    } else {
      console.error('  ❌ Failed: Queue track contains unstripped tags or not bounded');
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

  // Edge Case 6: Reject Malicious / Invalid Track Payload in play_now Remote Command
  try {
    console.log('\n[Edge Case 6] Testing play_now control payload validation...');
    await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/sync`, {
      allowRemoteControl: true
    });
    const badPlayNow = await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/control`, {
      action: 'play_now',
      payload: { id: '; rm -rf / ; invalid' },
      sender: 'Guest'
    });
    if (badPlayNow.status === 400) {
      console.log('  ✅ Passed: Server rejected invalid video ID in play_now payload with 400 Bad Request');
      passed++;
    } else {
      console.error('  ❌ Failed: Server allowed invalid play_now payload:', badPlayNow.status);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 6 Error:', err.message);
    failed++;
  }

  // Edge Case 7: Room Code Refresh with 'NEW' Returns Fresh Generated Room Code
  try {
    console.log('\n[Edge Case 7] Testing room creation with "NEW" code sentinel...');
    const refreshRes = await postJson(`http://127.0.0.1:${testPort}/api/room/create`, {
      roomCode: 'NEW',
      hostName: 'Host'
    });
    if (refreshRes.status === 200 && refreshRes.data.roomCode && refreshRes.data.roomCode !== 'NEW' && refreshRes.data.roomCode.includes('-')) {
      console.log(`  ✅ Passed: Fresh room code successfully generated: ${refreshRes.data.roomCode}`);
      passed++;
    } else {
      console.error('  ❌ Failed: Room code refresh generated invalid or literal "NEW":', refreshRes.data?.roomCode);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 7 Error:', err.message);
    failed++;
  }

  // Edge Case 8: Additional Invariants (LAN Subnet recognition & Cloud Ducking)
  try {
    console.log('\n[Edge Case 8] Verifying LAN subnet recognition & Cloud Ducking in app.js...');
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const hasLanRegex = appJsContent.includes('192\\.168');
    const hasCloudDucking = appJsContent.includes('isUsingDirectYtAudio && typeof ytPlayer.setVolume');
    const hasEndedGuard = appJsContent.includes('isUsingDirectYtAudio') && appJsContent.includes('playNextInQueue()');

    if (hasLanRegex && hasCloudDucking && hasEndedGuard) {
      console.log('  ✅ Passed: LAN subnet detection, Cloud Ducking & Queue ended guards all verified');
      passed++;
    } else {
      console.error('  ❌ Failed: Invariants missing (hasLanRegex, hasCloudDucking, or hasEndedGuard)');
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 8 Error:', err.message);
    failed++;
  }

  // Edge Case 9: Verify Cloud Audio Routing & Tab Audio Capture Invariants
  try {
    console.log('\n[Edge Case 9] Verifying Cloud Audio & Tab Audio Capture Architecture...');
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const serverJsContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

    const hasTabCapture = appJsContent.includes('startTabAudioCapture') &&
                          appJsContent.includes('tabAudioSourceNode.connect(cableMixGain)');
    const hasCloudRecordRouting = appJsContent.includes('isUsingDirectYtAudio && !isTabAudioActive') &&
                                  appJsContent.includes('cableGain.connect(destRecordTest);');
    const hasServerCloudFallback = serverJsContent.includes('fetchUpstreamFallbackStream') &&
                                   serverJsContent.includes('pipeDirectAudioStream');

    if (hasTabCapture && hasCloudRecordRouting && hasServerCloudFallback) {
      console.log('  ✅ Passed: Cloud audio pipeline, Tab Audio routing to cableMixGain & server fallbacks verified');
      passed++;
    } else {
      console.error('  ❌ Failed: Cloud audio or tab audio invariants missing');
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 9 Error:', err.message);
    failed++;
  }

  if (testProcess) testProcess.kill();

  console.log('\n====================================================');
  console.log(`📊 EDGE CASE REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

runEdgeCaseTests();
