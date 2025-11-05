import Phaser from 'phaser';

interface HeadPosition {
  x: number;
  y: number;
}

const MOVE_SPEED = 1.2; // normalized units per second (snappier)
const WANDER_JITTER = 0.08; // max jitter per second when idle

export class KeyboardHead extends Phaser.Events.EventEmitter {
  private animationFrame?: number;
  private latestPosition: HeadPosition = { x: 0.5, y: 0.5 };
  private velocityX = 0; // -1..1 direction
  private active = false;
  private readonly wander: boolean;
  private lastTs = 0;

  constructor({ wander = true }: { wander?: boolean } = {}) {
    super();
    this.wander = wander;
  }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.lastTs = performance.now();
    this.loop();
  }

  stop(): void {
    this.active = false;
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
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

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
      e.preventDefault();
      this.velocityX = -1;
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.velocityX = 1;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key.toLowerCase() === 'a' ||
      e.key.toLowerCase() === 'd'
    ) {
      e.preventDefault();
      this.velocityX = 0;
    }
  };

  private loop = () => {
    if (!this.active) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTs) / 1000); // cap dt
    this.lastTs = now;

    let dx = this.velocityX * MOVE_SPEED * dt;
    if (this.velocityX === 0 && this.wander) {
      // gentle random wander when idle
      dx += (Math.random() * 2 - 1) * WANDER_JITTER * dt;
    }

    const nextX = Phaser.Math.Clamp(this.latestPosition.x + dx, 0, 1);
    this.latestPosition = { x: nextX, y: 0.5 };
    this.emit('position', this.latestPosition);

    this.animationFrame = requestAnimationFrame(this.loop);
  };
}
