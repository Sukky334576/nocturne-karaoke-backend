// Edge Cases & Security Hardening Unit Test Suite for Nocturne Studio
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let testPort = 3398;
let testProcess = null;

function postJson(url, body, customHeaders = {}) {
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
        'Content-Length': Buffer.byteLength(data),
        'Connection': 'close',
        ...customHeaders
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
    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
    req.write(data);
    req.end();
  });
}

function fetchJson(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Connection': 'close',
        ...customHeaders
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, error: e.message });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
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
  const os = require('os');
  const tempEdgeDataDir = path.join(os.tmpdir(), 'nocturne-edge-test-' + Date.now());
  fs.mkdirSync(tempEdgeDataDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'licenses.json'), path.join(tempEdgeDataDir, 'licenses.json'));
  if (originalUsersJson) {
    fs.writeFileSync(path.join(tempEdgeDataDir, 'users.json'), originalUsersJson, 'utf8');
  }

  testProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(testPort), NOCTURNE_DATA_DIR: tempEdgeDataDir },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  testProcess.on('exit', (code, sig) => {
    if (code !== null && code !== 0) console.log(`[Test Server Exit] code: ${code}, signal: ${sig}`);
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

  if (originalUsersJson) {
    try { fs.writeFileSync(userDbPath, originalUsersJson, 'utf8'); } catch (e) {}
  }

  // Edge Case 14: PromptPay Payload Generation & Vocal Cut DSP / Key Shift Failover Invariants
  try {
    console.log('\n[Edge Case 14] Verifying PromptPay EMVCo Payload, Vocal Cut Routing & Key Failover Invariants...');
    const appJs = fs.readFileSync('public/app.js', 'utf8');
    const srvJs = fs.readFileSync('server.js', 'utf8');
    const indexHtml = fs.readFileSync('public/index.html', 'utf8');
    const remoteHtml = fs.readFileSync('public/remote.html', 'utf8');

    // 14a. EMVCo PromptPay Generator in server.js
    if (!srvJs.includes('generatePromptPayPayload') || !srvJs.includes('0016A000000677010111')) {
      throw new Error('EMVCo PromptPay generator tag not found in server.js');
    }

    // 14b. Vocal Cut Invariant (Biquad Bass Sum + MS Phase cancellation)
    if (!appJs.includes('vocalCutBassFilter') || !appJs.includes('vocalCutBassSum') || !appJs.includes('vocalCutSubL')) {
      throw new Error('Vocal Cut audio graph nodes missing in public/app.js');
    }

    // 14c. Vocal Cut UI elements in index.html and remote.html
    if (!indexHtml.includes('vocalCutBtn') || !remoteHtml.includes('btnVocalCut')) {
      throw new Error('vocalCutBtn missing in index.html or remote.html');
    }

    // 14d. Key Shift auto-failover restoration
    if (!appJs.includes('isUsingDirectYtAudio = false') || !appJs.includes('playTrack(currentTrack, curTime)')) {
      throw new Error('Key Shift failover recovery missing in public/app.js');
    }

    // 14e. PromptPay Modal DOM in index.html
    if (!indexHtml.includes('promptPayModal') || !indexHtml.includes('promptPayQrImg')) {
      throw new Error('promptPayModal DOM missing in public/index.html');
    }

    console.log('  ✅ Passed: EMVCo PromptPay payload, Vocal Cut DSP graph & Key Shift failover recovery verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Edge Case 14 Error:', err.message);
    failed++;
  }

  // Edge Case 15: Flagship Suite Invariants (Tube Warmth, De-Esser, Teleprompter, Scoring & Reactions)
  try {
    console.log('\n[Edge Case 15] Verifying Flagship Invariants: Tube Warmth, De-Esser, Teleprompter & Scoring...');
    const appJs = fs.readFileSync('public/app.js', 'utf8');
    const srvJs = fs.readFileSync('server.js', 'utf8');
    const indexHtml = fs.readFileSync('public/index.html', 'utf8');
    const remoteHtml = fs.readFileSync('public/remote.html', 'utf8');

    // 15a. Tube Warmth WaveShaper & Curve Generator
    if (!appJs.includes('makeTubeDistortionCurve') || !appJs.includes('tubeWarmthNode = audioCtx.createWaveShaper()')) {
      throw new Error('Tube Warmth WaveShaper node missing in app.js');
    }

    // 15b. Dynamic De-Esser peaking filter
    if (!appJs.includes('vocalDeEsserFilter = audioCtx.createBiquadFilter()') || !appJs.includes('isDeEsserEnabled')) {
      throw new Error('Dynamic De-Esser filter missing in app.js');
    }

    // 15c. Synced Lyrics Teleprompter & Karaoke Score Modal in index.html
    if (!indexHtml.includes('lyricsOverlay') || !indexHtml.includes('karaokeScoreModal') || !indexHtml.includes('reactionCanvas')) {
      throw new Error('Lyrics overlay, Karaoke Score modal or Reaction Canvas missing in index.html');
    }

    // 15d. Mobile Remote Reaction Dock & Lyrics in remote.html
    if (!remoteHtml.includes('remote-reaction-dock') || !remoteHtml.includes('panelLyrics') || !remoteHtml.includes('sendRemoteReaction')) {
      throw new Error('Reaction dock or remote lyrics missing in remote.html');
    }

    // 15e. Server Synced Lyrics & Reaction endpoints
    if (!srvJs.includes('/api/lyrics') || !srvJs.includes('/api/room/:code/reaction') || !srvJs.includes('/api/room/:code/tip')) {
      throw new Error('Flagship server routes missing in server.js');
    }

    console.log('  ✅ Passed: Tube Warmth, De-Esser, Synced Lyrics Teleprompter, Scoring & Reactions verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Edge Case 15 Error:', err.message);
    failed++;
  }

  // Edge Case 16: Focus-First Workspace Architecture (Stage, Party, Studio & Collapsible Rack)
  try {
    console.log('\n[Edge Case 16] Verifying Focus-First Architecture & Workspace Modes...');
    const appJs = fs.readFileSync('public/app.js', 'utf8');
    const indexHtml = fs.readFileSync('public/index.html', 'utf8');
    const styleCss = fs.readFileSync('public/style.css', 'utf8');

    // 16a. Mode Bar and Buttons in index.html
    if (!indexHtml.includes('workspace-mode-bar') || !indexHtml.includes('modeKaraokeBtn') || !indexHtml.includes('modePartyBtn') || !indexHtml.includes('modeStudioBtn')) {
      throw new Error('Workspace mode bar or mode buttons missing in index.html');
    }

    // 16b. Song Queue elevated before DSP container
    const queueIdx = indexHtml.indexOf('id="karaokeQueueCard"');
    const dspIdx = indexHtml.indexOf('id="studioDspModulesContainer"');
    if (queueIdx === -1 || dspIdx === -1 || queueIdx > dspIdx) {
      throw new Error('karaokeQueueCard must exist and appear before studioDspModulesContainer in index.html');
    }

    // 16c. Studio Drawer and Quick Mic Card
    if (!indexHtml.includes('toggleStudioDrawerBtn') || !indexHtml.includes('quickMicStatusCard')) {
      throw new Error('toggleStudioDrawerBtn or quickMicStatusCard missing in index.html');
    }

    // 16d. CSS Mode-based visibility rules
    if (!styleCss.includes('body.mode-karaoke #studioDspModulesContainer') || !styleCss.includes('.studio-module.collapsible')) {
      throw new Error('Focus-first mode CSS rules missing in style.css');
    }

    // 16e. JS Controller in app.js
    if (!appJs.includes('initWorkspaceController') || !appJs.includes('setWorkspaceMode') || !appJs.includes('toggleStudioDrawer')) {
      throw new Error('Workspace controller functions missing in app.js');
    }

    console.log('  ✅ Passed: Stage/Party/Studio Modes, Elevated Queue & Collapsible Studio Rack verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Edge Case 16 Error:', err.message);
    failed++;
  }

  // Edge Case 17: Video IDs with Leading Hyphen, Underscores & Tricky URLs Hardening Invariants
  try {
    console.log('\n[Edge Case 17] Verifying Leading Hyphen, Underscores & Tricky Audio Stream Hardening...');
    const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    const appCode = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const vercelAudioCode = fs.readFileSync(path.join(__dirname, 'api', 'audio.js'), 'utf8');

    // 17a. Server defense against CLI option injection for IDs starting with hyphens
    const hasCliDefense = serverCode.includes("args.push('--', targetUrl);") ||
                          serverCode.includes("args.push('--', normalizedUrl);");
    const hasStrictIdRegex = serverCode.includes('/^[a-zA-Z0-9_-]{11}$/');

    // 17b. Multi-hop redirect traversal, candidate race, and Cobalt cascading
    const hasMultiHopRedirect = serverCode.includes('maxHops') && serverCode.includes('probe(nextLoc);');
    const hasMultiSourceFallback = serverCode.includes('fetchInvidiousApiStream') &&
                                   serverCode.includes('fetchPipedApiStream') &&
                                   serverCode.includes('fetchCobaltApiStream') &&
                                   serverCode.includes('checkRes.statusCode === 200 || checkRes.statusCode === 206');
    const hasContentTypeFilter = serverCode.includes("cType.includes('text/html')");
    const hasSafeFfmpegPipe = serverCode.includes("ffmpegProcess.stdout.once('data'");

    // 17c. Frontend exponential backoff retry and user feedback
    const hasToastFailover = appCode.includes('showHostToast') && appCode.includes('activateYtAudioFailover();');
    const hasRetryBackoff = appCode.includes('audioErrorRetries < 3') && appCode.includes('audioRetryTimeout = setTimeout');

    // 17d. Vercel serverless audio endpoint handles 206 Partial Content and 503 fallback
    const hasVercel206Support = vercelAudioCode.includes('resp.statusCode !== 200 && resp.statusCode !== 206');
    const hasVercel503Fallback = vercelAudioCode.includes('res.status(503).json');

    if (hasCliDefense && hasStrictIdRegex && hasMultiHopRedirect && hasMultiSourceFallback &&
        hasContentTypeFilter && hasSafeFfmpegPipe && hasToastFailover && hasRetryBackoff &&
        hasVercel206Support && hasVercel503Fallback) {
      console.log('  ✅ Passed: CLI injection defense, Cobalt cascading, content-type filter, safe FFmpeg piping & 503 fallback verified!');
      passed++;
    } else {
      throw new Error('Missing CLI defense, Cobalt, content-type filter, safe FFmpeg piping or 503 fallback invariants');
    }
  } catch (err) {
    console.error('  ❌ Edge Case 17 Error:', err.message);
    failed++;
  }

  // Edge Case 18: Testing toggle_vocal_cut action, Rate Limiter & PromptPay Amount Clamping
  try {
    console.log('\n[Edge Case 18] Testing toggle_vocal_cut remote action, Rate Limiter & Clamped Payment...');
    
    // 18a. toggle_vocal_cut remote action is accepted by server
    const cutRes = await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/control`, {
      action: 'toggle_vocal_cut',
      sender: 'MobileRemote'
    });
    if (cutRes.status !== 200 || !cutRes.data || !cutRes.data.success) {
      throw new Error(`toggle_vocal_cut failed: ${JSON.stringify(cutRes)}`);
    }

    // 18b. Rate limiter triggers 429 when control requests flood
    let got429 = false;
    for (let i = 0; i < 48; i++) {
      const floodRes = await postJson(`http://127.0.0.1:${testPort}/api/room/SEC-001/control`, {
        action: 'next',
        sender: 'Spammer'
      }, { 'x-forwarded-for': '203.0.113.88' });
      if (floodRes && floodRes.status === 429) {
        got429 = true;
        break;
      }
    }
    if (!got429) {
      throw new Error('Rate limiter failed to block rapid control flood');
    }

    // 18c. PromptPay negative/zero amount is clamped safely
    const qrRes = await fetchJson(`http://127.0.0.1:${testPort}/api/payment/promptpay-qr?amount=-50`);
    if (qrRes.status !== 200 || qrRes.data.amount !== 49.00) {
      throw new Error(`PromptPay amount not clamped: ${JSON.stringify(qrRes)}`);
    }

    console.log('  ✅ Passed: toggle_vocal_cut accepted, rate limiting enforced & PromptPay amount clamped safely');
    passed++;
  } catch (err) {
    console.error('  ❌ Edge Case 18 Error:', err.message);
    failed++;
  }

  // Edge Case 20: Verifying Bidirectional Remote DSP Sync & Production Hardening
  try {
    console.log('\n[Edge Case 20] Verifying Bidirectional Remote DSP Sync & Production Hardening...');

    // 20a. Bidirectional Vocal Cut & Ducking Sync
    const syncRes1 = await postJson(`http://127.0.0.1:${testPort}/api/room/SYNC-20/sync`, {
      isVocalCutEnabled: true,
      isDucked: true,
      hostName: 'TestHost'
    });
    if (syncRes1.status !== 200) throw new Error(`Host sync failed: ${JSON.stringify(syncRes1)}`);

    const snapRes1 = await fetchJson(`http://127.0.0.1:${testPort}/api/room/SYNC-20`);
    if (snapRes1.status !== 200 || snapRes1.data.isVocalCutEnabled !== true || snapRes1.data.isDucked !== true) {
      throw new Error(`Snapshot failed to reflect vocal cut / ducking: ${JSON.stringify(snapRes1)}`);
    }

    const syncRes2 = await postJson(`http://127.0.0.1:${testPort}/api/room/SYNC-20/sync`, {
      isVocalCutEnabled: false,
      isDucked: false
    });
    if (syncRes2.status !== 200) throw new Error(`Host sync 2 failed: ${JSON.stringify(syncRes2)}`);

    const snapRes2 = await fetchJson(`http://127.0.0.1:${testPort}/api/room/SYNC-20`);
    if (snapRes2.status !== 200 || snapRes2.data.isVocalCutEnabled !== false || snapRes2.data.isDucked !== false) {
      throw new Error(`Snapshot failed to clear vocal cut / ducking: ${JSON.stringify(snapRes2)}`);
    }

    // 20b. Localhost host requests exempt from rate limit
    let hostExempt = true;
    for (let i = 0; i < 50; i++) {
      const res = await postJson(`http://127.0.0.1:${testPort}/api/room/SYNC-20/control`, {
        action: 'ducking',
        sender: 'LocalHost'
      });
      if (res.status === 429) {
        hostExempt = false;
        break;
      }
    }
    if (!hostExempt) throw new Error('Localhost host was unexpectedly rate limited');

    // 20c. Code invariant checks: ASAR DB path, Headphone virtual exclusion, Pass 4 USB mic, Setup-Windows-Audio.bat, and socket timeout
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const serverJsContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    const remoteHtmlContent = fs.readFileSync(path.join(__dirname, 'public', 'remote.html'), 'utf8');
    const batContent = fs.readFileSync(path.join(__dirname, 'public', 'Setup-Windows-Audio.bat'), 'utf8');

    const hasAsarDbRouting = serverJsContent.includes('getUserDbFilePath') && serverJsContent.includes('app.asar');
    const hasHeadphoneVirtualExclusion = appJsContent.includes("const isVirtual = text.includes('cable') || text.includes('nocturne')");
    const hasPass4UsbMic = appJsContent.includes('Pass 4: Any physical audio input that is NOT loopback/cable/nocturne');
    const hasRemoteDuckingSync = remoteHtmlContent.includes('state.isDucked !== undefined') &&
                                 remoteHtmlContent.includes("btnDucking.classList.toggle('active', !!state.isDucked)");
    const hasBatAntiEchoNotice = batContent.includes('เอาติ๊กถูกออก ห้ามเปิด');
    const hasReqAudioTimeout = serverJsContent.includes("reqAudio.on('timeout'");

    if (hasAsarDbRouting && hasHeadphoneVirtualExclusion && hasPass4UsbMic && hasRemoteDuckingSync && hasBatAntiEchoNotice && hasReqAudioTimeout) {
      console.log('  ✅ Passed: Bidirectional DSP sync, ASAR safe DB, headphone cable isolation, USB mic Pass 4, and anti-echo BAT verified!');
      passed++;
    } else {
      throw new Error('Missing one or more invariants: ' + JSON.stringify({
        hasAsarDbRouting,
        hasHeadphoneVirtualExclusion,
        hasPass4UsbMic,
        hasRemoteDuckingSync,
        hasBatAntiEchoNotice,
        hasReqAudioTimeout
      }));
    }
  } catch (err) {
    console.error('  ❌ Edge Case 20 Error:', err.message);
    failed++;
  }

  if (testProcess) {
    try { testProcess.kill(); } catch (_) {}
  }

  // Edge Case 19: Verifying Loopback Feedback Elimination & YouTube Live / Shorts extraction invariants
  try {
    console.log('\n[Edge Case 19] Verifying Loopback Feedback Elimination & Live/Shorts extraction invariants...');
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const serverJsContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

    // 19a. Loopback guard excludes "nocturne" from physical mic selection across passes
    const hasNocturneMicExclusion = appJsContent.includes("text.includes('nocturne')") &&
                                    appJsContent.includes("isLoop");
    const hasNocturneMicWarning = appJsContent.includes("micLabel.toLowerCase().includes('nocturne studio mic')");

    // 19b. YouTube Live stream ID extraction support
    const hasLiveStreamRegex = serverJsContent.includes('(?:embed|v|shorts|live)');

    // 19c. Atomic database persistence via temporary file
    const hasAtomicDbPersistence = serverJsContent.includes('.tmp') && serverJsContent.includes('fs.renameSync');

    // 19d. Native Electron IPC external link security
    const mainJsContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const hasSecureIpcExternal = mainJsContent.includes("ipcMain.on('open-external'") &&
                                 mainJsContent.includes("parsed.protocol === 'http:' || parsed.protocol === 'https:'");

    if (hasNocturneMicExclusion && hasNocturneMicWarning && hasLiveStreamRegex && hasAtomicDbPersistence && hasSecureIpcExternal) {
      console.log('  ✅ Passed: Anti-loopback mic guards, Live/Shorts extraction, atomic DB & secure IPC verified!');
      passed++;
    } else {
      throw new Error('Missing anti-loopback guards, Live extraction, atomic DB, or secure IPC');
    }
  } catch (err) {
    console.error('  ❌ Edge Case 19 Error:', err.message);
    failed++;
  }

  // Edge Case 21: Verifying One-Time Tester License Key System Invariants
  try {
    console.log('\n[Edge Case 21] Verifying One-Time Tester License Key Architecture Invariants...');
    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const serverJsContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

    // 21a. License status and redeem API in server.js
    const hasLicenseEndpoints = serverJsContent.includes('/api/license/status') &&
                                serverJsContent.includes('/api/license/redeem') &&
                                serverJsContent.includes('/api/redeem-code');

    // 21b. AppData and ASAR-safe license DB path
    const hasLicenseDbPath = serverJsContent.includes('getLicenseDbFilePath') &&
                             serverJsContent.includes('licenses.json');

    // 21c. Header redeem key button and modal in index.html
    const hasRedeemDom = indexHtmlContent.includes('id="redeemTesterBtn"') &&
                         indexHtmlContent.includes('id="gateRedeemBtn"') &&
                         indexHtmlContent.includes('id="redeemModal"') &&
                         indexHtmlContent.includes('id="redeemCodeInput"') &&
                         indexHtmlContent.includes('id="submitRedeemBtn"');

    // 21d. Controller logic in app.js
    const hasRedeemLogic = appJsContent.includes('openRedeemModal') &&
                           appJsContent.includes('/api/license/redeem') &&
                           appJsContent.includes('/api/license/status');

    // 21e. Strict DOM tag integrity check (no broken div tags)
    const openDivs = (indexHtmlContent.match(/<div[\s>]/gi) || []).length;
    const closeDivs = (indexHtmlContent.match(/<\/div>/gi) || []).length;
    if (openDivs !== closeDivs) {
      throw new Error(`HTML div tag mismatch: ${openDivs} open vs ${closeDivs} close`);
    }

    // 21f. Seed licenses.json must be clean and unactivated
    const seedLicenses = JSON.parse(fs.readFileSync(path.join(__dirname, 'licenses.json'), 'utf8'));
    if (seedLicenses.isActivated !== false || seedLicenses.activatedCode !== null) {
      throw new Error('Seed licenses.json is tainted or pre-activated');
    }
    const betaCodes = Object.keys(seedLicenses.codes || {});
    if (betaCodes.length !== 20 || betaCodes.some(c => !c.startsWith('NOCTURNE-BETA-') || seedLicenses.codes[c].used)) {
      throw new Error(`Seed licenses.json must have 20 unused NOCTURNE-BETA- codes, got ${betaCodes.length}`);
    }

    if (hasLicenseEndpoints && hasLicenseDbPath && hasRedeemDom && hasRedeemLogic) {
      console.log('  ✅ Passed: One-Time Tester Key architecture, AppData persistence, UI redeem modal & API verified!');
      passed++;
    } else {
      throw new Error('Missing license endpoints, ASAR-safe path, redeem DOM, or controller logic');
    }
  } catch (err) {
    console.error('  ❌ Edge Case 21 Error:', err.message);
    failed++;
  }

  // Edge Case 22: Copyright Compliance, Multi-Res Bespoke Icon, Procedural Acoustic Mesh & VB-Audio Technical Attribution
  try {
    console.log('\n[Edge Case 22] Verifying Bespoke Icon, Acoustic Mesh, Zero Colorlib Assets & VB-Audio Attribution...');
    
    // 1. Icon verification
    const iconPath = path.join(__dirname, 'resources', 'icon.ico');
    const iconPngPath = path.join(__dirname, 'resources', 'icon.png');
    if (!fs.existsSync(iconPath) || !fs.existsSync(iconPngPath)) {
      throw new Error('resources/icon.ico or resources/icon.png does not exist');
    }
    const icoBuffer = fs.readFileSync(iconPath);
    if (icoBuffer.length < 6 || icoBuffer.readUInt16LE(0) !== 0 || icoBuffer.readUInt16LE(2) !== 1) {
      throw new Error('resources/icon.ico is not a valid Windows ICO header');
    }
    const imageCount = icoBuffer.readUInt16LE(4);
    if (imageCount < 6) {
      throw new Error(`resources/icon.ico expected at least 6 resolutions, got ${imageCount}`);
    }
    const entryWidths = [];
    for (let i = 0; i < imageCount; i++) {
      const w = icoBuffer.readUInt8(6 + i * 16) || 256;
      entryWidths.push(w);
    }
    const expectedSizes = [16, 32, 48, 64, 128, 256];
    for (const size of expectedSizes) {
      if (!entryWidths.includes(size)) {
        throw new Error(`resources/icon.ico missing expected resolution: ${size}x${size}`);
      }
    }

    // 2. Retired Colorlib assets verification
    const bg1Path = path.join(__dirname, 'public', 'img', 'bg-1.jpg');
    const bg2Path = path.join(__dirname, 'public', 'img', 'bg-2.jpg');
    if (fs.existsSync(bg1Path) || fs.existsSync(bg2Path)) {
      throw new Error('Colorlib stock images (bg-1.jpg / bg-2.jpg) still exist on disk');
    }

    // 3. CSS verification
    const styleCss = fs.readFileSync(path.join(__dirname, 'public', 'style.css'), 'utf8');
    if (styleCss.includes('bg-1.jpg') || styleCss.includes('bg-2.jpg')) {
      throw new Error('public/style.css still references retired Colorlib background images');
    }
    if (!styleCss.includes('repeating-radial-gradient') || !styleCss.includes('radial-gradient')) {
      throw new Error('public/style.css missing procedural acoustic mesh radial gradient');
    }

    // 4. Branding & Crest verification in index.html
    const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    if (indexHtml.includes('ONE <span class="brand-accent">MUSIC</span>') || indexHtml.includes('One Music Home')) {
      throw new Error('public/index.html still contains legacy ONE MUSIC header branding');
    }
    if (!indexHtml.includes('NOCTURNE <span class="brand-accent">STUDIO</span>') || !indexHtml.includes('nocturne-crest-svg')) {
      throw new Error('public/index.html missing NOCTURNE STUDIO title or bespoke crest SVG');
    }
    if (indexHtml.includes('btn-onemusic-primary')) {
      throw new Error('public/index.html still contains legacy btn-onemusic-primary class');
    }

    // 5. VB-Audio CABLE Driver Technical Attribution
    const requiredAttribution = 'Virtual Audio Subsystem powered by <strong>VB-Audio CABLE Technology</strong> (Donationware / OEM Evaluation)';
    if (!indexHtml.includes(requiredAttribution)) {
      throw new Error('public/index.html missing required VB-Audio Driver technical attribution');
    }
    if (!indexHtml.includes('dispatcher-driver-attribution') || !indexHtml.includes('footer-driver-attribution')) {
      throw new Error('VB-Audio attribution must be present in both dispatcher and footer sections');
    }

    console.log('  ✅ Passed: Bespoke multi-res icon, acoustic mesh, zero Colorlib assets & VB-Audio attribution verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Edge Case 22 Error:', err.message);
    failed++;
  }

  // Edge Case 23: YouTube Lyrics Video Embed Protection & Apple Frosted Glass Multi-Theme Invariants
  try {
    console.log('\n[Edge Case 23] Verifying YouTube Lyrics Video Embed Protection & Apple Frosted Glass Multi-Theme Invariants...');
    const appJs = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(__dirname, 'public', 'style.css'), 'utf8');

    // 23a. YouTube Lyrics Video Embed Resilience
    if (appJs.includes("ytPlayerDiv.classList.add('hidden');") && appJs.includes("โหมดสตูดิโอเสียงคมชัด 100%")) {
      throw new Error('app.js still contains aggressive video hiding or static placeholder thumbnail in onError');
    }
    if (!appJs.includes('youtube-nocookie.com/embed/') || !appJs.includes('widget_referrer')) {
      throw new Error('app.js missing resilient nocookie fallback or widget_referrer parameters');
    }

    // 23b. Electron Header Manipulation for YouTube Embed Restrictions
    if (!mainJs.includes("lower === 'content-security-policy'") || !mainJs.includes("lower === 'x-frame-options'")) {
      throw new Error('main.js must strip both Content-Security-Policy and X-Frame-Options');
    }
    if (!mainJs.includes("Referer'] = 'https://www.youtube.com/'") || !mainJs.includes('CHROME_UA')) {
      throw new Error('main.js missing YouTube Referer override or standard Chrome Desktop User-Agent');
    }

    // 23c. Multi-Theme UI Selector in index.html
    if (!indexHtml.includes('headerThemeDropdownWrap') || !indexHtml.includes('headerThemeMenuBtn')) {
      throw new Error('index.html missing headerThemeDropdownWrap or headerThemeMenuBtn');
    }
    if (!indexHtml.includes('data-theme-id="apple-frosted"') ||
        !indexHtml.includes('data-theme-id="apple-light"') ||
        !indexHtml.includes('data-theme-id="nocturne-dark"')) {
      throw new Error('index.html missing one of the 3 required theme selection options');
    }

    // 23d. Theme Controller in app.js
    if (!appJs.includes('STUDIO_THEMES') || !appJs.includes('applyStudioTheme') || !appJs.includes('cycleStudioTheme')) {
      throw new Error('app.js missing STUDIO_THEMES or theme controller functions');
    }
    if (!appJs.includes('nocturne_theme')) {
      throw new Error('app.js missing localStorage persistence for nocturne_theme');
    }

    // 23e. Triple-Theme CSS Styling in style.css
    if (!styleCss.includes('[data-theme="apple-frosted"]') ||
        !styleCss.includes('[data-theme="apple-light"]') ||
        !styleCss.includes('[data-theme="nocturne-dark"]')) {
      throw new Error('style.css missing CSS blocks for apple-frosted, apple-light, or nocturne-dark');
    }
    if (!styleCss.includes('blur(30px) saturate(180%)')) {
      throw new Error('style.css missing Apple Cupertino Frosted Glass blur(30px) saturate(180%) filter');
    }

    console.log('  ✅ Passed: Live YouTube video lyrics preservation, bypass headers, and Apple Frosted Glass multi-theme verified!');
    passed++;
  } catch (err) {
    console.error('  ❌ Edge Case 23 Error:', err.message);
    failed++;
  }

  if (testProcess) {
    try { testProcess.kill(); } catch (_) {}
  }
  if (tempEdgeDataDir && fs.existsSync(tempEdgeDataDir)) {
    try { fs.rmSync(tempEdgeDataDir, { recursive: true, force: true }); } catch (_) {}
  }
  if (originalUsersJson) {
    try { fs.writeFileSync(userDbPath, originalUsersJson, 'utf8'); } catch (_) {}
  }

  console.log('\n====================================================');
  console.log(`📊 EDGE CASE REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

runEdgeCaseTests();
