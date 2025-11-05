import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Preload minimal assets or generate at runtime.
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
