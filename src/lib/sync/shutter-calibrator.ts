/**
 * Lapis 2: Hardware Shutter Lag Calibration (PRD §9.2)
 * Measures capture pipeline delay (promise -> frame extraction) via 3 automated dry-runs.
 * Saves median as device_lag_ms for anticipatory trigger scheduling.
 */

export interface CalibrationResult {
  medianLagMs: number;
  frameGrabLagMs: number;
  takephotoLagMs: number | null;
  activeCaptureMode: 'grab' | 'takephoto';
  samples: number[];
  deviceClass: 'ios' | 'android-flagship' | 'android-mid' | 'android-entry' | 'desktop';
  recommendation: {
    mode: 'standard' | 'stable';
    downscaleResolution: number;
  };
}

export async function calibrateDeviceShutterLag(
  videoElement: HTMLVideoElement,
  testRounds = 5
): Promise<CalibrationResult> {
  const grabSamples: number[] = [];

  // Temporary lightweight canvas for test frame extraction (Mode A: frame grab)
  const testCanvas = document.createElement('canvas');
  testCanvas.width = 320;
  testCanvas.height = 240;
  const ctx = testCanvas.getContext('2d');

  for (let i = 0; i < testRounds; i++) {
    const tTrigger = performance.now();

    await new Promise<void>((resolve) => {
      if ('requestVideoFrameCallback' in videoElement) {
        (videoElement as any).requestVideoFrameCallback(() => {
          if (ctx) ctx.drawImage(videoElement, 0, 0, 320, 240);
          resolve();
        });
      } else {
        requestAnimationFrame(() => {
          if (ctx) ctx.drawImage(videoElement, 0, 0, 320, 240);
          resolve();
        });
      }
    });

    const tReady = performance.now();
    const lag = tReady - tTrigger;
    grabSamples.push(lag);

    await new Promise((r) => setTimeout(r, 60));
  }

  // Calculate median frame grab lag
  grabSamples.sort((a, b) => a - b);
  const frameGrabLagMs = Math.round(grabSamples[Math.floor(grabSamples.length / 2)]);

  // Clean up test canvas
  testCanvas.width = 0;
  testCanvas.height = 0;

  // Test Mode B: ImageCapture.takePhoto() if supported
  let takephotoLagMs: number | null = null;
  let activeCaptureMode: 'grab' | 'takephoto' = 'grab';

  try {
    const stream = videoElement.srcObject as MediaStream;
    const videoTrack = stream?.getVideoTracks?.()[0];
    if (typeof window !== 'undefined' && 'ImageCapture' in window && videoTrack) {
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      const tpStart = performance.now();
      // Test one dry-run shot
      const testBlob = await Promise.race([
        imageCapture.takePhoto(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
      ]);

      if (testBlob) {
        const tpLag = performance.now() - tpStart;
        takephotoLagMs = Math.round(tpLag);
        // Only use takephoto if lag <= 600ms, otherwise lock to grab to prevent desync & memory spikes
        if (tpLag <= 600) {
          activeCaptureMode = 'takephoto';
        }
      }
    }
  } catch {
    takephotoLagMs = null;
    activeCaptureMode = 'grab';
  }

  // Determine device class & heuristics
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);

  let deviceClass: CalibrationResult['deviceClass'] = 'desktop';
  if (isIOS) {
    deviceClass = 'ios';
  } else if (isAndroid) {
    if (frameGrabLagMs < 120) {
      deviceClass = 'android-flagship';
    } else if (frameGrabLagMs <= 300) {
      deviceClass = 'android-mid';
    } else {
      deviceClass = 'android-entry';
    }
  }

  const effectiveLag = activeCaptureMode === 'takephoto' && takephotoLagMs !== null ? takephotoLagMs : frameGrabLagMs;
  const isLowPower = effectiveLag > 350 || (navigator as any).deviceMemory <= 2;

  return {
    medianLagMs: Math.max(10, effectiveLag),
    frameGrabLagMs,
    takephotoLagMs,
    activeCaptureMode,
    samples: grabSamples,
    deviceClass,
    recommendation: {
      mode: isLowPower ? 'stable' : 'standard',
      downscaleResolution: isLowPower ? 1280 : 1920,
    },
  };
}

