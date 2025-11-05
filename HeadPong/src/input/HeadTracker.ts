import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';
import Phaser from 'phaser';

interface HeadPosition {
  x: number;
  y: number;
}

const SMOOTHING_ALPHA = 0.35;

export class HeadTracker extends Phaser.Events.EventEmitter {
  private detector?: faceLandmarksDetection.FaceLandmarksDetector;
  private videoElement?: HTMLVideoElement;
  private animationFrame?: number;
  private latestPosition: HeadPosition = { x: 0.5, y: 0.5 };
  private active = false;

  async start(): Promise<void> {
    if (this.active) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Media devices are not supported in this environment.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.srcObject = stream;

    await this.videoElement.play();

    if (tf.backend() !== 'webgl') {
      await tf.setBackend('webgl');
    }
    await tf.ready();

    this.detector = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      { runtime: 'tfjs', refineLandmarks: true, maxFaces: 1 }
    );
    this.active = true;
    this.processFrame();
  }

  stop(): void {
    this.active = false;
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    this.videoElement?.pause();
    if (this.videoElement?.srcObject instanceof MediaStream) {
      this.videoElement.srcObject.getTracks().forEach((track) => track.stop());
    }
    this.videoElement = undefined;
    this.detector?.dispose();
    this.detector = undefined;
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }

  isActive(): boolean {
    return this.active;
  }

  getPosition(): HeadPosition {
    return this.latestPosition;
  }

  private processFrame = async () => {
    if (!this.active) {
      return;
    }

    try {
      if (this.detector && this.videoElement) {
        const predictions = await this.detector.estimateFaces(this.videoElement, { flipHorizontal: true });

        this.handlePredictions(predictions);
      }
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Head tracking processing error'));
    }

    this.animationFrame = requestAnimationFrame(this.processFrame);
  };

  private handlePredictions(predictions: Array<any>): void {
    try {
      if (!predictions.length) {
        this.emit('tracking-lost');
        return;
      }
      const { videoElement } = this;
      if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        return;
      }

      // Support both old facemesh (scaledMesh) and new detector (keypoints)
      const mesh = (predictions[0] as any).keypoints ?? (predictions[0] as any).scaledMesh;

      const keyIndices = [1, 4, 9, 10];
      const { sum, count } = keyIndices.reduce(
        (acc, index) => {
          const landmark = mesh[index];
          if (!landmark) {
            return acc;
          }
          // keypoints: {x, y, z?}; scaledMesh: [x, y, z?]
          const x = typeof landmark.x === 'number' ? landmark.x : (landmark[0] as number);
          const y = typeof landmark.y === 'number' ? landmark.y : (landmark[1] as number);
          return {
            sum: {
              x: acc.sum.x + x / videoElement.videoWidth,
              y: acc.sum.y + y / videoElement.videoHeight
            },
            count: acc.count + 1
          };
        },
        { sum: { x: 0, y: 0 }, count: 0 }
      );

      if (count === 0) {
        this.emit('tracking-lost');
        return;
      }

      const normalized: HeadPosition = {
        x: sum.x / count,
        y: sum.y / count
      };

      this.latestPosition = {
        x: this.lerp(this.latestPosition.x, normalized.x, SMOOTHING_ALPHA),
        y: this.lerp(this.latestPosition.y, normalized.y, SMOOTHING_ALPHA)
      };

      this.emit('position', this.latestPosition);
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Unknown head tracking error'));
    }
  };

  private lerp(start: number, end: number, alpha: number): number {
    return start + (end - start) * alpha;
  }
}
