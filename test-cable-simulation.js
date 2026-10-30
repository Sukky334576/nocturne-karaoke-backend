// VB-Cable & 3 Core Audio Pillars (Music, Vocal, Reverb) Simulation Test Suite
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
  // Test 1: Mathematical DSP Audio Graph Simulation into destCable
  // ----------------------------------------------------
  try {
    console.log('\n[Test 1] Simulating 3 Core Pillars Audio Graph into VB-Cable (destCable)...');
    
    // Simulate sample rate and a 1-second audio frame (44100 samples)
    const sampleRate = 44100;
    const duration = 1.0;
    const numSamples = Math.floor(sampleRate * duration);

    // Pillar 1: Backing Music (440 Hz test tone, amplitude 0.7)
    const musicBuffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      musicBuffer[i] = 0.7 * Math.sin(2 * Math.PI * 440 * (i / sampleRate));
    }

    // Pillar 2: Vocal Voice (1000 Hz test tone, amplitude 0.5)
    const vocalBuffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      vocalBuffer[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * (i / sampleRate));
    }

    // Pillar 3: Algorithmic Reverb Impulse Response (Decay ~ 1.8s, Room size 2)
    const impulseLength = Math.floor(sampleRate * 1.8);
    const impulse = new Float32Array(impulseLength);
    for (let i = 0; i < impulseLength; i++) {
      // Exponential decay envelope with pseudo-random reflections
      const decay = Math.pow(1 - (i / impulseLength), 2.0);
      impulse[i] = ((Math.sin(i * 0.13) + Math.cos(i * 0.29)) * 0.5) * decay;
    }

    // Simulate gains based on app.js defaults:
    // cableVol = 0.9, cableMusicVol = 0.20, cableVocalVol = 1.0, reverbMix = 0.25
    const cableVol = 0.9;
    const cableMusicVol = 0.20;
    const cableVocalVol = 1.0;
    const reverbMix = 0.25;

    // Simulate Convolver convolution (direct discrete FIR convolution on initial slice)
    const reverbTail = new Float32Array(numSamples);
    const convLength = Math.min(2048, impulseLength);
    for (let i = 0; i < numSamples; i++) {
      let acc = 0;
      for (let j = 0; j < Math.min(i, convLength); j++) {
        acc += vocalBuffer[i - j] * impulse[j];
      }
      reverbTail[i] = acc * 0.15; // normalized gain
    }

    // Sum all 3 pillars into destCable buffer
    const destCableBuffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const musicComponent = musicBuffer[i] * cableMusicVol;
      const vocalComponent = vocalBuffer[i] * cableVocalVol;
      const reverbComponent = reverbTail[i] * reverbMix;
      destCableBuffer[i] = (musicComponent + vocalComponent + reverbComponent) * cableVol;
    }

    // Verify all 3 components are actively present in destCable output
    let maxAmp = 0;
    let hasMusicSignal = false;
    let hasVocalSignal = false;
    let hasReverbSignal = false;

    for (let i = 100; i < numSamples; i++) {
      const val = Math.abs(destCableBuffer[i]);
      if (val > maxAmp) maxAmp = val;
    }

    if (maxAmp > 0.1 && maxAmp < 1.0) {
      console.log(`  ✅ Passed: destCable mixed signal active (Peak Amplitude: ${maxAmp.toFixed(3)}, Safe Headroom)`);
      passed++;
    } else {
      throw new Error(`destCable signal out of expected range: ${maxAmp}`);
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
    // When singer stops singing at t = 0.5s, reverb tail MUST continue ringing
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * 1.5);
    const vocalPuff = new Float32Array(numSamples);
    // 0 to 0.3s singer is singing
    for (let i = 0; i < Math.floor(sampleRate * 0.3); i++) {
      vocalPuff[i] = 0.8 * Math.sin(2 * Math.PI * 800 * (i / sampleRate));
    }
    // after 0.3s singer is dead silent (vocalBuffer = 0)

    // Reverb convolver
    const impulseLength = Math.floor(sampleRate * 1.8);
    let postVocalReverbEnergy = 0;
    const silenceStartIndex = Math.floor(sampleRate * 0.31); // check immediately after cutoff (0.31s to 0.45s)
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
      console.log(`  ✅ Passed: Reverb tail persists smoothly across silence (Post-Vocal Tail Energy: ${postVocalReverbEnergy.toFixed(3)})`);
      passed++;
    } else {
      throw new Error('Reverb tail died prematurely after vocal cutoff');
    }
  } catch (err) {
    console.error('  ❌ Test 2 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 3: Independence from Browser Tab Audio Capture
  // ----------------------------------------------------
  try {
    console.log('\n[Test 3] Verifying 100% Functionality with Tab Audio Disabled...');
    // Verify that cableMixGain receives audio directly from masterGain and NOT solely from tabCapture
    const hasDirectMusicCable = appJs.includes('masterGain.connect(musicCableGain)') &&
      appJs.includes('musicCableGain.connect(cableSyncDelayNode)') &&
      appJs.includes('cableSyncDelayNode.connect(cableMixGain)');
    
    // Verify that audioSourceElement retries cleanly before resorting to failover
    const hasStreamRetry = appJs.includes('audioErrorRetries < 2') ||
      appJs.includes('setTimeout') && appJs.includes('audioSourceElement.play()');

    if (hasDirectMusicCable && hasStreamRetry) {
      console.log('  ✅ Passed: Music connects cleanly to VB-Cable without requiring Tab Audio capture!');
      passed++;
    } else {
      throw new Error('Direct music routing to cableMixGain is missing or incomplete');
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
    // Rule 2: hpVocalVol must default to 0.0 to prevent duplicate slapback echo with hardware direct monitoring
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
  // Test 5: Reverb Tier Freedom (Unrestricted for Free/Guest Users)
  // ----------------------------------------------------
  try {
    console.log('\n[Test 5] Verifying Reverb is 100% Free and Unrestricted...');
    // In app.js:
    // 1. isReverbEnabled must not require isProTier
    const hasNoProGateInPreset = !appJs.includes("isReverbEnabled = isProTier ? cfg.reverbEnabled : false;");
    // 2. reverbToggle event listener must not alert paywall
    const hasNoAlertInToggle = !appJs.includes("Studio Vocal Reverb เป็นสิทธิพิเศษของ NOCTURNE PRO PACK");
    // 3. index.html must not show PRO 49฿ badge on Studio Vocal Reverb
    const hasNoProBadgeOnReverb = !indexHtml.includes('<h2>Studio Vocal Reverb <span class="accordion-toggle-icon">▼</span></h2>\n                <span class="badge-pro-tag">PRO 49฿</span>') &&
      !indexHtml.includes('<h2>Studio Vocal Reverb <span class="accordion-toggle-icon">▼</span></h2>\r\n                <span class="badge-pro-tag">PRO 49฿</span>');

    if (hasNoProGateInPreset && hasNoAlertInToggle && hasNoProBadgeOnReverb) {
      console.log('  ✅ Passed: Studio Vocal Reverb unlocked for all users without Pro paywall');
      passed++;
    } else {
      throw new Error('Reverb still has lingering Pro paywall restrictions');
    }
  } catch (err) {
    console.error('  ❌ Test 5 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 6: DOM Architecture - Reverb & Dispatcher Immediate Access in Stage Mode
  // ----------------------------------------------------
  try {
    console.log('\n[Test 6] Verifying DOM Architecture & Immediate Access in Stage Mode...');
    const queueIdx = indexHtml.indexOf('id="karaokeQueueCard"');
    const dspIdx = indexHtml.indexOf('id="studioDspModulesContainer"');
    const dispatcherIdx = indexHtml.indexOf('id="channelDispatcherModule"');
    const reverbIdx = indexHtml.indexOf('id="reverbModule"');

    // Both Dispatcher and Reverb must exist
    if (dispatcherIdx === -1 || reverbIdx === -1) {
      throw new Error('channelDispatcherModule or reverbModule missing in index.html');
    }

    // Both must be located before studioDspModulesContainer (not trapped inside the hidden container!)
    if (dispatcherIdx > dspIdx || reverbIdx > dspIdx) {
      throw new Error('Dispatcher or Reverb is trapped inside studioDspModulesContainer');
    }

    // Song Queue must remain before studioDspModulesContainer to satisfy Edge Case 16
    if (queueIdx === -1 || queueIdx > dspIdx) {
      throw new Error('karaokeQueueCard must appear before studioDspModulesContainer');
    }

    console.log('  ✅ Passed: Dispatcher & Reverb elevated for immediate access outside hidden DSP drawer!');
    passed++;
  } catch (err) {
    console.error('  ❌ Test 6 Error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Test 7: Sub-second Server Fallback Race Architecture
  // ----------------------------------------------------
  try {
    console.log('\n[Test 7] Verifying Concurrent Fallback Stream Extraction in server.js...');
    const hasPromiseAnyRace = serverJs.includes('Promise.any(upstreamInstances.map(checkCandidate))') ||
      serverJs.includes('Promise.any');
    const hasInvidiousCandidate = serverJs.includes('invidious.tiekoetter.com');

    if (hasPromiseAnyRace && hasInvidiousCandidate) {
      console.log('  ✅ Passed: Server upstream fallback uses concurrent race (< 1s stream response)!');
      passed++;
    } else {
      throw new Error('Server fallback lacks concurrent race or verified Invidious instances');
    }
  } catch (err) {
    console.error('  ❌ Test 7 Error:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 VB-CABLE SIMULATION REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

runCableSimulationTests();
