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

  const userDbPath = path.join(__dirname, 'users.json');
  const originalUsersJson = fs.existsSync(userDbPath) ? fs.readFileSync(userDbPath, 'utf8') : null;

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
                          appJsContent.includes('tabAudioSourceNode.connect(cableMixGain)') &&
                          appJsContent.includes('tabMusicGain');
    const hasCloudRecordRouting = appJsContent.includes('isUsingDirectYtAudio && !isTabAudioActive') &&
                                  appJsContent.includes('cableGain.connect(destRecordTest);');
    const hasServerCloudFallback = serverJsContent.includes('fetchUpstreamFallbackStream') &&
                                   serverJsContent.includes('pipeDirectAudioStream');
    const hasUnmuteSafety = appJsContent.includes('isDirectOrTab') &&
                            appJsContent.includes('ytPlayer.unMute()');

    if (hasTabCapture && hasCloudRecordRouting && hasServerCloudFallback && hasUnmuteSafety) {
      console.log('  ✅ Passed: Cloud audio pipeline, Tab Audio volume scaling & server fallbacks verified');
      passed++;
    } else {
      console.error('  ❌ Failed: Cloud audio or tab audio invariants missing');
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 9 Error:', err.message);
    failed++;
  }

  // Edge Case 10: Auth Tier Gating, Pro Pack Upgrade & Subscription Expiration
  try {
    console.log('\n[Edge Case 10] Testing Auth Tier Gating, Pro Pack Upgrade & Expiry...');
    const testUname = `edge_user_${Date.now()}`;
    const regRes = await postJson(`http://127.0.0.1:${testPort}/api/auth/register`, {
      username: testUname,
      password: 'password123'
    });

    const loginRes = await postJson(`http://127.0.0.1:${testPort}/api/auth/login`, {
      username: testUname,
      password: 'password123'
    });

    const upRes = await postJson(`http://127.0.0.1:${testPort}/api/auth/upgrade-pro`, {
      username: testUname
    });

    // Test expiration enforcement
    const expRes = await postJson(`http://127.0.0.1:${testPort}/api/auth/save-profile`, {
      username: testUname,
      tier: 'pro',
      proExpiresAt: Date.now() - 5000 // already expired
    });

    if (
      regRes.status === 200 && regRes.data.user.tier === 'free' &&
      loginRes.status === 200 && loginRes.data.user.tier === 'free' &&
      upRes.status === 200 && upRes.data.tier === 'pro' &&
      expRes.status === 200 && expRes.data.tier === 'free'
    ) {
      console.log('  ✅ Passed: Auth lifecycle, 30-day Pro Pack activation & expiration successfully enforced');
      passed++;
    } else {
      console.error('  ❌ Failed: Auth lifecycle or expiration enforcement failed:', {
        reg: regRes.data,
        login: loginRes.data,
        up: upRes.data,
        exp: expRes.data
      });
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 10 Error:', err.message);
    failed++;
  }

  // Edge Case 11: Priority Queue Server Security Gating (Enforces hostTier === 'pro')
  try {
    console.log('\n[Edge Case 11] Testing Priority Queue gating based on host subscription tier...');
    // A: Free Room must reject priority insertion (appends to end)
    await postJson(`http://127.0.0.1:${testPort}/api/room/create`, {
      roomCode: 'FREE-Q',
      hostName: 'FreeHost',
      hostTier: 'free'
    });
    await postJson(`http://127.0.0.1:${testPort}/api/room/FREE-Q/queue`, {
      track: { id: 'dQw4w9WgXcQ', title: 'Song 1' },
      addedBy: 'User 1'
    });
    await postJson(`http://127.0.0.1:${testPort}/api/room/FREE-Q/queue`, {
      track: { id: 'oJ7cV4LcYQg', title: 'Song 2 (Sneaky Priority)' },
      addedBy: 'User 2',
      priority: true // Attacker attempting priority bypass on free room
    });
    const freeRoom = await fetchJson(`http://127.0.0.1:${testPort}/api/room/FREE-Q`);
    const freeBypassPrevented = freeRoom.data.queue[0].id === 'dQw4w9WgXcQ' && freeRoom.data.queue[1].id === 'oJ7cV4LcYQg';

    // B: Pro Room must honor priority insertion (unshifts to top)
    await postJson(`http://127.0.0.1:${testPort}/api/room/create`, {
      roomCode: 'PRO-Q',
      hostName: 'ProHost',
      hostTier: 'pro'
    });
    await postJson(`http://127.0.0.1:${testPort}/api/room/PRO-Q/queue`, {
      track: { id: 'dQw4w9WgXcQ', title: 'Song 1' },
      addedBy: 'User 1'
    });
    await postJson(`http://127.0.0.1:${testPort}/api/room/PRO-Q/queue`, {
      track: { id: 'oJ7cV4LcYQg', title: 'Song 2 (VIP Priority)' },
      addedBy: 'VIP User',
      priority: true
    });
    const proRoom = await fetchJson(`http://127.0.0.1:${testPort}/api/room/PRO-Q`);
    const proPriorityHonored = proRoom.data.queue[0].id === 'oJ7cV4LcYQg' && proRoom.data.queue[1].id === 'dQw4w9WgXcQ';

    if (freeBypassPrevented && proPriorityHonored) {
      console.log('  ✅ Passed: Priority queue server security gating verified (Free appends, Pro unshifts)');
      passed++;
    } else {
      console.error('  ❌ Failed: Priority queue server gating broken:', { freeBypassPrevented, proPriorityHonored });
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 11 Error:', err.message);
    failed++;
  }

  // Edge Case 12: Web Audio Graph Clean Routing & Anti-Duplication Invariants
  try {
    console.log('\n[Edge Case 12] Verifying Web Audio clean routing & anti-duplication invariants...');
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');

    // Invariant 1: No duplicate destRecordTest connections from soundboard or doubler
    const noDupSfxRecord = !appJsContent.includes('soundboardGain.connect(destRecordTest)');
    const noDupDoublerRecord = !appJsContent.includes('doublerGain.connect(destRecordTest)');

    // Invariant 2: Static vocal chain wired once & media stream cleanup on mic switch
    const hasVocalChainGuard = appJsContent.includes('isVocalChainWired') &&
                               appJsContent.includes('micStream.getTracks().forEach');

    // Invariant 3: XSS immunity in showHostToast using textContent
    const hasSecureToast = appJsContent.includes('pill.textContent = msg');

    if (noDupSfxRecord && noDupDoublerRecord && hasVocalChainGuard && hasSecureToast) {
      console.log('  ✅ Passed: Clean broadcast routing, anti-duplication guards & secure toast verified');
      passed++;
    } else {
      console.error('  ❌ Failed: Audio routing invariants or secure toast check failed', {
        noDupSfxRecord,
        noDupDoublerRecord,
        hasVocalChainGuard,
        hasSecureToast
      });
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 12 Error:', err.message);
    failed++;
  }

  // Edge Case 13: Concurrency Locks, Hardware Mic Switching Guards & Mobile Remote Perm Selector
  try {
    console.log('\n[Edge Case 13] Verifying Concurrency Locks, Hardware Mic Switch Guards & Remote Sync...');
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const remoteHtmlContent = fs.readFileSync(path.join(__dirname, 'public', 'remote.html'), 'utf8');

    // Invariant 1: initAudioPromise mutex to prevent concurrent AudioContext creation
    const hasAudioMutex = appJsContent.includes('initAudioPromise') &&
                          appJsContent.includes('if (initAudioPromise) {') &&
                          appJsContent.includes('return initAudioPromise;');

    // Invariant 2: currentMicRequestId to cancel stale getUserMedia streams on rapid device switching
    const hasMicSwitchGuard = appJsContent.includes('currentMicRequestId') &&
                              appJsContent.includes('requestId !== currentMicRequestId') &&
                              appJsContent.includes('stream.getTracks().forEach(t => t.stop())');

    // Invariant 3: Pro Pack settings change listeners for persistent rehydration
    const hasProPersistence = appJsContent.includes("sfxVol.addEventListener('change'") &&
                              appJsContent.includes("eqMidSlider.addEventListener('change'") &&
                              appJsContent.includes("doublerMix.addEventListener('change'");

    // Invariant 4: Correct playback controls selector in remote.html for allowRemoteControl
    const hasRemoteSelector = remoteHtmlContent.includes("querySelector('.playback-bar')");

    // Invariant 5: Desktop queue bounds (max 100 tracks & removeFromQueue bounds check)
    const hasQueueBounds = appJsContent.includes('queue.length >= 100') &&
                           appJsContent.includes('idx >= 0 && idx < queue.length');

    if (hasAudioMutex && hasMicSwitchGuard && hasProPersistence && hasRemoteSelector && hasQueueBounds) {
      console.log('  ✅ Passed: Concurrency locks, mic switch guards, Pro persistence & remote sync verified');
      passed++;
    } else {
      console.error('  ❌ Failed: Edge Case 13 invariant check failed:', {
        hasAudioMutex,
        hasMicSwitchGuard,
        hasProPersistence,
        hasRemoteSelector,
        hasQueueBounds
      });
      failed++;
    }
  } catch (err) {
    console.error('  ❌ Edge Case 13 Error:', err.message);
    failed++;
  }

  if (testProcess) testProcess.kill();

  if (originalUsersJson) {
    try { fs.writeFileSync(userDbPath, originalUsersJson, 'utf8'); } catch (e) {}
  }

  console.log('\n====================================================');
  console.log(`📊 EDGE CASE REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

runEdgeCaseTests();
