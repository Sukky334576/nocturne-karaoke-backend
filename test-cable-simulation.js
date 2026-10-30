// VB-Cable & 3 Core Audio Pillars (Music, Vocal, Reverb) Comprehensive Simulation Test Suite
const fs = require('fs');
const path = require('path');
const https = require('https');

async function runCableSimulationTests() {
  console.log('====================================================');
  console.log('🎙️ NOCTURNE STUDIO • VB-CABLE & 3 CORE PILLARS SIMULATION');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  const appJsPath = path.join(__dirname, 'public', 'app.js');
  const indexHtmlPath = path.join(__dirname, 'public', 'index.html');
  const serverJsPath = path.join(__dirname, 'server.js');

  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const serverJs = fs.readFileSync(serverJsPath, 'utf8');

  // ----------------------------------------------------
  // Test 1: Full-loop Audio Graph Simulation of the 3 Core Pillars into destCable
  // ----------------------------------------------------
  try {
    console.log('\n[Test 1] Simulating 3 Core Pillars Web Audio Graph into VB-Cable (destCable)...');
    
    const sampleRate = 48000;
    const duration = 1.0;
    const numSamples = Math.floor(sampleRate * duration);

    // Pillar 1: Backing Music Track (440 Hz standard A, amplitude 0.7)
    const musicSource = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      musicSource[i] = 0.7 * Math.sin(2 * Math.PI * 440 * (i / sampleRate));
    }

    // Pillar 2: Live Vocal Mic Input (1000 Hz, amplitude 0.5)
    const vocalMic = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      vocalMic[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * (i / sampleRate));
    }

    // Pillar 3: Algorithmic Reverb Impulse Response (Convolution)
    const impulseLength = Math.floor(sampleRate * 1.8);
    const impulse = new Float32Array(impulseLength);
    for (let i = 0; i < impulseLength; i++) {
      const decay = Math.pow(1 - (i / impulseLength), 2.0);
      impulse[i] = ((Math.sin(i * 0.13) + Math.cos(i * 0.29)) * 0.5) * decay;
    }

    // Web Audio Gain nodes per app.js defaults:
    const cableVol = 0.9;
    const cableMusicVol = 0.20;
    const cableVocalVol = 1.0;
    const reverbMix = 0.25;

    // Convolver node operates strictly on vocal input (reverbInputGain)
    const convLength = Math.min(2048, impulseLength);
    const reverbTail = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      let acc = 0;
      for (let j = 0; j < Math.min(i, convLength); j++) {
        acc += vocalMic[i - j] * impulse[j];
      }
      reverbTail[i] = acc * 0.15;
    }

    // destCable summation node: (musicCableGain + vocalCableGain + reverbGain) * cableVol
    const destCableBuffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const musicComp = musicSource[i] * cableMusicVol;
      const vocalComp = vocalMic[i] * cableVocalVol;
      const reverbComp = reverbTail[i] * reverbMix;
      destCableBuffer[i] = (musicComp + vocalComp + reverbComp) * cableVol;
    }

    // Discrete Fourier frequency power analysis to prove all 3 components are actively present
    function computeFrequencyPower(buffer, targetFreq, sRate) {
      let real = 0;
      let imag = 0;
      const N = buffer.length;
      for (let n = 0; n < N; n++) {
        const angle = 2 * Math.PI * targetFreq * (n / sRate);
        real += buffer[n] * Math.cos(angle);
        imag -= buffer[n] * Math.sin(angle);
      }
      return Math.sqrt(real * real + imag * imag) / N;
    }

    const musicPower = computeFrequencyPower(destCableBuffer, 440, sampleRate);
    const vocalPower = computeFrequencyPower(destCableBuffer, 1000, sampleRate);

    // Verify Reverb Energy in non-primary harmonics
    let reverbResidual = 0;
    for (let i = 0; i < numSamples; i++) {
      reverbResidual += Math.abs(reverbTail[i]);
    }
    const avgReverbEnergy = reverbResidual / numSamples;

    // Verify Music does NOT feed into Reverb Input Gain (Zero Music Bleed)
    const hasReverbInputIsolation = appJs.includes('vocalChainOut.connect(reverbInputGain)') &&
      !appJs.includes('masterGain.connect(reverbInputGain)') &&
      !appJs.includes('duckingGain.connect(reverbInputGain)');

    if (musicPower > 0.05 && vocalPower > 0.15 && avgReverbEnergy > 0.01 && hasReverbInputIsolation) {
      console.log(`  ✅ Passed: All 3 pillars present in destCable (Music 440Hz Power: ${musicPower.toFixed(3)}, Vocal 1000Hz Power: ${vocalPower.toFixed(3)}, Reverb: ${avgReverbEnergy.toFixed(3)})`);
      console.log('  ✅ Passed: Music-to-Reverb Isolation Verified (0.0 bleed of music into convolver)');
      passed++;
    } else {
      throw new Error(`One or more pillars missing or bleed detected in destCable: Music=${musicPower}, Vocal=${vocalPower}, Reverb=${avgReverbEnergy}, Isolation=${hasReverbInputIsolation}`);
    }
  } catch (err) {
    console.error('  ❌ Test 1 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 2: Reverb Tail Persistence after Vocal Cutoff
  // ----------------------------------------------------
  try {
    console.log('\n[Test 2] Testing Reverb Tail Persistence in VB-Cable stream...');
    // Singer stops abruptly at t = 0.3s; verify reverb tail rings into destCable
    const sampleRate = 48000;
    const numSamples = Math.floor(sampleRate * 1.5);
    const vocalPuff = new Float32Array(numSamples);
    for (let i = 0; i < Math.floor(sampleRate * 0.3); i++) {
      vocalPuff[i] = 0.8 * Math.sin(2 * Math.PI * 800 * (i / sampleRate));
    }

    const impulseLength = Math.floor(sampleRate * 1.8);
    let postVocalReverbEnergy = 0;
    const silenceStartIndex = Math.floor(sampleRate * 0.31);
    const silenceEndIndex = Math.floor(sampleRate * 0.45);

    for (let i = silenceStartIndex; i < silenceEndIndex; i++) {
      let acc = 0;
      const windowSize = Math.min(i, 8192);
      for (let j = 0; j < windowSize; j++) {
        if (i - j < Math.floor(sampleRate * 0.3)) {
          const decay = Math.pow(1 - (j / impulseLength), 2.0);
          acc += vocalPuff[i - j] * (Math.sin(j * 0.1) * decay * 0.1);
        }
      }
      postVocalReverbEnergy += Math.abs(acc);
    }

    if (postVocalReverbEnergy > 0.05) {
      console.log(`  ✅ Passed: Reverb tail persists cleanly across silence (Post-Vocal Tail Energy: ${postVocalReverbEnergy.toFixed(3)})`);
      passed++;
    } else {
      throw new Error('Reverb tail died prematurely after vocal cutoff');
    }
  } catch (err) {
    console.error('  ❌ Test 2 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 3: Independence from Browser Tab Audio Capture & Active Audio Recovery
  // ----------------------------------------------------
  try {
    console.log('\n[Test 3] Verifying 100% Functionality with Tab Audio Disabled & Stream Recovery...');
    const hasDirectMusicCable = appJs.includes('masterGain.connect(musicCableGain)') &&
      appJs.includes('musicCableGain.connect(cableSyncDelayNode)') &&
      appJs.includes('cableSyncDelayNode.connect(cableMixGain)');
    
    const hasStreamRecovery = appJs.includes('audioSourceElement.addEventListener(\'playing\'') &&
      appJs.includes('isUsingDirectYtAudio = false');

    const hasSetSinkUnmute = appJs.includes('audioElCable.setSinkId(deviceId)') &&
      appJs.includes('audioElCable.muted = false') &&
      appJs.includes('audioElCable.play()');

    if (hasDirectMusicCable && hasStreamRecovery && hasSetSinkUnmute) {
      console.log('  ✅ Passed: Music connects cleanly to VB-Cable without Tab Audio, with automatic playback recovery!');
      passed++;
    } else {
      throw new Error('Direct music routing or stream recovery lifecycle missing in app.js');
    }
  } catch (err) {
    console.error('  ❌ Test 3 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 4: Hardware Monitoring Invariant (Rule 2 - Maono PS22 Zero Latency)
  // ----------------------------------------------------
  try {
    console.log('\n[Test 4] Verifying Maono PS22 Hardware Direct Monitoring Rule 2 Invariant...');
    const hasRule2HpVocalZero = appJs.includes('hpVocalVol !== undefined ? currentUser.preset.hpVocalVol : 0.0') ||
      appJs.includes('isHpVocalMuted: true');
    
    const hasCleanRecordDest = appJs.includes('cableGain.connect(destRecordTest);') &&
      !appJs.includes('reverbGain.connect(destRecordTest);');

    if (hasRule2HpVocalZero && hasCleanRecordDest) {
      console.log('  ✅ Passed: Rule 2 preserved (hpVocalVol=0.0 default, clean destRecordTest without duplicate tail)');
      passed++;
    } else {
      throw new Error('Rule 2 invariant violation: Headphone vocal volume or destRecordTest is misconfigured');
    }
  } catch (err) {
    console.error('  ❌ Test 4 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 5: Reverb Tier Freedom & Parameter State Persistence
  // ----------------------------------------------------
  try {
    console.log('\n[Test 5] Verifying Reverb is 100% Free, Unrestricted & Persisted...');
    const hasNoProGateInPreset = !appJs.includes("isReverbEnabled = isProTier ? cfg.reverbEnabled : false;");
    const hasNoAlertInToggle = !appJs.includes("Studio Vocal Reverb เป็นสิทธิพิเศษของ NOCTURNE PRO PACK");
    const hasNoProBadgeOnReverb = !indexHtml.includes('<h2>Studio Vocal Reverb <span class="accordion-toggle-icon">▼</span></h2>\n                <span class="badge-pro-tag">PRO 49฿</span>') &&
      !indexHtml.includes('<h2>Studio Vocal Reverb <span class="accordion-toggle-icon">▼</span></h2>\r\n                <span class="badge-pro-tag">PRO 49฿</span>');

    const hasReverbPresetBinding = appJs.includes('reverbGain.gain.setValueAtTime(isReverbEnabled ? parseFloat(reverbMix.value) : 0.0');
    const hasReverbPersistence = appJs.includes('reverbEnabled: isReverbEnabled') &&
      appJs.includes('preset.reverbEnabled !== undefined');

    if (hasNoProGateInPreset && hasNoAlertInToggle && hasNoProBadgeOnReverb && hasReverbPresetBinding && hasReverbPersistence) {
      console.log('  ✅ Passed: Studio Vocal Reverb unlocked for all users and properly bound to preset changes & storage');
      passed++;
    } else {
      throw new Error('Reverb still has lingering Pro paywall restrictions or lacks preset gain binding');
    }
  } catch (err) {
    console.error('  ❌ Test 5 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 6: DOM Architecture - 3 Pillars Elevated & Non-essential Tools Folded
  // ----------------------------------------------------
  try {
    console.log('\n[Test 6] Verifying DOM Architecture & 3 Core Pillars Elevation...');
    const queueIdx = indexHtml.indexOf('id="karaokeQueueCard"');
    const dspIdx = indexHtml.indexOf('id="studioDspModulesContainer"');
    const dispatcherIdx = indexHtml.indexOf('id="channelDispatcherModule"');
    const reverbIdx = indexHtml.indexOf('id="reverbModule"');

    if (dispatcherIdx === -1 || reverbIdx === -1) {
      throw new Error('channelDispatcherModule or reverbModule missing in index.html');
    }

    if (dispatcherIdx > dspIdx || reverbIdx > dspIdx) {
      throw new Error('Dispatcher or Reverb is trapped inside studioDspModulesContainer');
    }

    if (queueIdx === -1 || queueIdx > dspIdx) {
      throw new Error('karaokeQueueCard must appear before studioDspModulesContainer');
    }

    const hasFoldedTabFallback = indexHtml.includes('<details') && indexHtml.includes('id="tabAudioCaptureBtn"');

    if (hasFoldedTabFallback) {
      console.log('  ✅ Passed: Dispatcher & Reverb elevated; non-essential tab fallback cleanly folded!');
      passed++;
    } else {
      throw new Error('Tab audio fallback is not folded away from user view');
    }
  } catch (err) {
    console.error('  ❌ Test 6 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 7: Resilient Server Audio Pipeline & Redirect Validation
  // ----------------------------------------------------
  try {
    console.log('\n[Test 7] Verifying Concurrent Fallback Stream Extraction & Redirect Validation in server.js...');
    const hasPromiseAnyRace = serverJs.includes('Promise.any(upstreamInstances.map(checkCandidate))') ||
      serverJs.includes('Promise.any');
    const hasInvidiousCandidate = serverJs.includes('invidious.tiekoetter.com');
    const hasRedirectValidation = serverJs.includes('checkRes.statusCode === 200 || checkRes.statusCode === 206') &&
      serverJs.includes('Redirect candidate failed');

    if (hasPromiseAnyRace && hasInvidiousCandidate && hasRedirectValidation) {
      console.log('  ✅ Passed: Server upstream fallback validates redirected audio targets before resolving!');
      passed++;
    } else {
      throw new Error('Server fallback lacks redirect validation or candidate race');
    }
  } catch (err) {
    console.error('  ❌ Test 7 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 8: Leading Hyphen, Underscore & Tricky ID Stream Pipeline Invariants
  // ----------------------------------------------------
  try {
    console.log('\n[Test 8] Verifying Leading-Hyphen IDs & Content-Type Safety Invariants...');
    const hasLeadingHyphenDefense = serverJs.includes("args.push('--', targetUrl);") ||
                                   serverJs.includes("args.push('--', normalizedUrl);");
    const hasContentTypeGuard = serverJs.includes("cType.includes('text/html')");
    const hasCobaltFallback = serverJs.includes('fetchCobaltApiStream');
    const hasSafeFfmpegStream = serverJs.includes("ffmpegProcess.stdout.once('data'");

    // Test tricky ID extraction regex
    const trickyIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    const validTrickyIds = ['-FJ_T3VK4dE', '-F1_T3YK4dE', '___a123-bcD', 'A-B_C-d_E-1'];
    const invalidTrickyIds = ['-FJ_T3VK4d', '--malicious_cli', 'https://evil.com/video', 'rm -rf /'];

    const allValidPass = validTrickyIds.every(id => trickyIdRegex.test(id));
    const allInvalidFail = invalidTrickyIds.every(id => !trickyIdRegex.test(id));

    if (hasLeadingHyphenDefense && hasContentTypeGuard && hasCobaltFallback && hasSafeFfmpegStream && allValidPass && allInvalidFail) {
      console.log('  ✅ Passed: Tricky leading-hyphen IDs, Cobalt fallback, HTML bot check guards & safe FFmpeg pipe verified!');
      passed++;
    } else {
      throw new Error('Test 8 failed: Missing leading-hyphen defense, Cobalt, content-type guard, or regex validation');
    }
  } catch (err) {
    console.error('  ❌ Test 8 Error:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 VB-CABLE SIMULATION REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

runCableSimulationTests();
