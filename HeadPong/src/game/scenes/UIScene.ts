import Phaser from 'phaser';

interface UISceneData {
  state: {
    score: number;
    lives: number;
    isRunning: boolean;
    bricksRemaining: number;
  };
  notification?: string;
}

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private notificationText?: Phaser.GameObjects.Text;
  private gameScene?: Phaser.Scene;

  constructor() {
    super('UIScene');
  }

  create(data: UISceneData): void {
    this.createScoreText(data.state.score);

    this.gameScene = this.scene.get('GameScene');
    this.gameScene.events.on('score-changed', this.updateScoreText, this);
    this.gameScene.events.on('notification', this.showNotification, this);

    if (data.notification) {
      this.showNotification(data.notification);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameScene?.events.off('score-changed', this.updateScoreText, this);
      this.gameScene?.events.off('notification', this.showNotification, this);
    });
  }

  private createScoreText(initialScore: number): void {
    this.scoreText = this.add.text(16, 16, `Score: ${initialScore}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '18px',
      color: '#f8fafc'
    });
    this.scoreText.setDepth(10);
  }

  private updateScoreText(score: number): void {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${score}`);
    }
  }

  private showNotification(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) {
      this.notificationText?.destroy();
      this.notificationText = undefined;
      return;
    }

    this.notificationText?.destroy();
    this.notificationText = this.add.text(this.scale.width / 2, this.scale.height / 2, trimmed, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      align: 'center',
      color: '#f97316',
      wordWrap: { width: this.scale.width * 0.8 }
    }).setOrigin(0.5);
    this.notificationText.setDepth(20);
  }
}
