/**
 * Lapis 3: Pre-Roll Frame Ring Buffer (PRD §9.2)
 * Maintains a circular ring buffer of N=12 frames (~400ms @ 30fps).
 * Each frame tagged with local t_frame. When T triggers, selects the closest
 * frame to target time, with optional sharpness scoring.
 */

export interface BufferedFrame {
  bitmap: ImageBitmap;
  tFrame: number; // local monotonic timestamp
  sharpnessScore?: number;
}

/**
 * Computes Variance of Laplacian on a downsampled 320px frame (PRD §9.2 Lapis 4)
 * Evaluates edge sharpness to avoid motion blur and blink artifacts (<25ms execution).
 */
function computeLaplacianVariance(bitmap: ImageBitmap): number {
  if (typeof document === 'undefined') return 0;

  try {
    const targetW = 320;
    const targetH = Math.max(1, Math.round((bitmap.height / bitmap.width) * targetW));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;

    // Convert to grayscale luminance array
    const gray = new Float32Array(targetW * targetH);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 3x3 Laplacian edge convolution
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < targetH - 1; y++) {
      const rowOffset = y * targetW;
      for (let x = 1; x < targetW - 1; x++) {
        const idx = rowOffset + x;
        const lap =
          gray[idx - targetW] +
          gray[idx + targetW] +
          gray[idx - 1] +
          gray[idx + 1] -
          4 * gray[idx];
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    canvas.width = 0;
    canvas.height = 0;

    if (count === 0) return 0;
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    return variance;
  } catch {
    return 0;
  }
}

export class PreRollFrameBuffer {
  private buffer: BufferedFrame[] = [];
  private maxFrames: number;
  private isRunning = false;
  private animFrameId: number | null = null;
  private callbackHandle: number | null = null;
  private downscaleWidth: number;

  // Differential timestamp state (REC-01 for iOS Safari 15-16)
  private tVideoReady = 0;
  private videoStartTime = 0;
  private timestampTier: 'rvfc' | 'differential' | 'perf_now' = 'perf_now';

  constructor(maxFrames = 12, downscaleWidth = 960) {
    this.maxFrames = maxFrames;
    this.downscaleWidth = downscaleWidth; // 960px working resolution saves 90% memory (P1-02)
  }

  public getTimestampTier(): 'rvfc' | 'differential' | 'perf_now' {
    return this.timestampTier;
  }

  /**
   * Start grabbing frames continuously into the ring buffer
   */
  public start(videoElement: HTMLVideoElement): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Calibrate differential timestamp baseline (REC-01)
    this.tVideoReady = performance.now();
    this.videoStartTime = videoElement.currentTime || 0;

    const hasRvfc = 'requestVideoFrameCallback' in videoElement;
    this.timestampTier = hasRvfc ? 'rvfc' : 'differential';

    const grabLoop = async (now?: number, metadata?: any) => {
      if (!this.isRunning) return;

      // 3-Tier Timestamp Calculation (P0-01 & REC-01)
      let tFrame: number;
      if (metadata && typeof metadata.presentationTime === 'number') {
        tFrame = metadata.presentationTime;
        this.timestampTier = 'rvfc';
      } else if (typeof videoElement.currentTime === 'number' && videoElement.currentTime > 0) {
        // Tier 2: Differential timestamp from video clock baseline
        const elapsed = (videoElement.currentTime - this.videoStartTime) * 1000;
        tFrame = this.tVideoReady + elapsed;
        this.timestampTier = 'differential';
      } else {
        // Tier 3: Wall clock fallback
        tFrame = performance.now();
        this.timestampTier = 'perf_now';
      }

      if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
        try {
          // Calculate downscaled dimensions preserving aspect ratio (960px max width)
          const scale = Math.min(1, this.downscaleWidth / videoElement.videoWidth);
          const targetW = Math.round(videoElement.videoWidth * scale);
          const targetH = Math.round(videoElement.videoHeight * scale);

          // Use createImageBitmap directly from video element for fast off-thread decoding
          const bitmap = await createImageBitmap(videoElement, {
            resizeWidth: targetW,
            resizeHeight: targetH,
            resizeQuality: 'medium',
          });

          // If buffer is full, remove and close oldest frame
          if (this.buffer.length >= this.maxFrames) {
            const oldest = this.buffer.shift();
            if (oldest) {
              oldest.bitmap.close();
            }
          }

          this.buffer.push({ bitmap, tFrame });
        } catch {
          // Ignore occasional grab errors during resolution switch
        }
      }

      if (this.isRunning) {
        if (hasRvfc) {
          this.callbackHandle = (videoElement as any).requestVideoFrameCallback(grabLoop);
        } else {
          this.animFrameId = requestAnimationFrame(() => grabLoop());
        }
      }
    };

    if (hasRvfc) {
      this.callbackHandle = (videoElement as any).requestVideoFrameCallback(grabLoop);
    } else {
      this.animFrameId = requestAnimationFrame(() => grabLoop());
    }
  }

  /**
   * Stop ring buffer and close all stored ImageBitmaps
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;
    this.clear();
  }

  public clear(): void {
    for (const item of this.buffer) {
      try {
        item.bitmap.close();
      } catch {}
    }
    this.buffer = [];
  }

  /**
   * Select best frame closest to tTargetLocal with Laplacian variance scoring (PRD §9.2 Lapis 4).
   * Within [t_target - 150ms, t_target + 150ms], chooses frame with highest sharpness variance.
   * Releases all other bitmaps immediately to conserve memory.
   */
  public extractBestFrame(
    tTargetLocal: number
  ): { bitmap: ImageBitmap; tFrame: number; deltaMs: number; sharpnessScore?: number } | null {
    if (this.buffer.length === 0) return null;

    // Filter candidate frames within ±150ms tolerance window
    const candidates = this.buffer
      .map((frame, index) => ({
        index,
        frame,
        delta: Math.abs(frame.tFrame - tTargetLocal),
      }))
      .filter((item) => item.delta <= 150);

    let selectedIndex = 0;
    let selectedDelta = Math.abs(this.buffer[0].tFrame - tTargetLocal);
    let selectedScore = 0;

    if (candidates.length > 0) {
      // Score candidates with Laplacian variance
      let highestScore = -1;
      let bestCandidateIndex = candidates[0].index;
      let bestCandidateDelta = candidates[0].delta;

      for (const cand of candidates) {
        const score = computeLaplacianVariance(cand.frame.bitmap);
        cand.frame.sharpnessScore = score;
        if (score > highestScore) {
          highestScore = score;
          bestCandidateIndex = cand.index;
          bestCandidateDelta = cand.delta;
        }
      }

      selectedIndex = bestCandidateIndex;
      selectedDelta = bestCandidateDelta;
      selectedScore = highestScore;
    } else {
      // Fallback: frame with minimum absolute time delta
      for (let i = 1; i < this.buffer.length; i++) {
        const delta = Math.abs(this.buffer[i].tFrame - tTargetLocal);
        if (delta < selectedDelta) {
          selectedDelta = delta;
          selectedIndex = i;
        }
      }
    }

    const selected = this.buffer[selectedIndex];

    // Close all other frames in buffer immediately to free memory
    for (let i = 0; i < this.buffer.length; i++) {
      if (i !== selectedIndex) {
        try {
          this.buffer[i].bitmap.close();
        } catch {}
      }
    }
    this.buffer = [];

    return {
      bitmap: selected.bitmap,
      tFrame: selected.tFrame,
      deltaMs: selectedDelta,
      sharpnessScore: selectedScore,
    };
  }
}
