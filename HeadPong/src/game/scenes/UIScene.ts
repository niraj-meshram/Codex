import Phaser from 'phaser';
import { UI_PANEL_WIDTH, WORLD_BOUNDS } from '../config/gameConfig';
import { getTheme, initThemeFromURL } from '../../theme/Theme';

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
  private startButton?: Phaser.GameObjects.Text;
  private restartButton?: Phaser.GameObjects.Text;
  private endButton?: Phaser.GameObjects.Text;
  private panelBg?: Phaser.GameObjects.Rectangle;
  private gameOverTitle?: Phaser.GameObjects.Text;
  private gameOverScore?: Phaser.GameObjects.Text;
  private hasPlayed = false;
  private panelCam?: Phaser.Cameras.Scene2D.Camera;
  private overlayCam?: Phaser.Cameras.Scene2D.Camera;
  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private controlsHeader?: Phaser.GameObjects.Text;
  private controlsHelp?: Phaser.GameObjects.Text;
  private panelSeparator?: Phaser.GameObjects.Graphics;
  private panelDivider?: Phaser.GameObjects.Graphics;
  private cameraStatusText?: Phaser.GameObjects.Text;
  private stopCameraButton?: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(data: UISceneData): void {
    initThemeFromURL();
    // Two cameras: full-screen overlay and a left-side panel (20% width)
    this.overlayCam = this.cameras.main;
    const outerMargin = Math.max(12, Math.floor(this.scale.width * 0.02));
    const gutter = Math.max(8, Math.floor(this.scale.width * 0.01));
    const innerWidth = Math.max(1, this.scale.width - outerMargin * 2);
    const innerHeight = Math.max(1, this.scale.height - outerMargin * 2);
    const dynamicPanelWidth = Math.floor(innerWidth * 0.2);
    const playWidth = innerWidth - dynamicPanelWidth - gutter;
    // Overlay camera only covers the playfield (right 80% minus gutter) within margins
    this.overlayCam.setViewport(outerMargin + dynamicPanelWidth + gutter, outerMargin, playWidth, innerHeight);
    // Panel camera covers the left 20% within margins
    this.panelCam = this.cameras.add(outerMargin, outerMargin, dynamicPanelWidth, innerHeight);
    this.createScoreText(data.state.score);

    this.gameScene = this.scene.get('GameScene');
    this.gameScene.events.on('score-changed', this.updateScoreText, this);
    this.gameScene.events.on('notification', this.showNotification, this);
    this.gameScene.events.on('game-over', this.showGameOver, this);
    this.gameScene.events.on('game-started', this.onGameStarted, this);
    this.gameScene.events.on('game-ended', this.onGameEnded, this);
    this.gameScene.events.on('game-win', this.showWin, this);
    this.gameScene.events.on('camera-state', this.onCameraState, this);

    this.createPanelAndControls();
    // Prevent panel objects from drawing on the full overlay camera
    if (this.overlayCam && this.panelObjects.length) {
      this.overlayCam.ignore(this.panelObjects);
    }

    // Keyboard shortcut: 'A' starts (or restarts) the game
    this.input.keyboard?.on('keydown-A', () => {
      if (!this.hasPlayed) {
        this.gameScene?.events.emit('start-game');
      } else {
        this.gameScene?.events.emit('restart-game');
      }
    });

    if (data.notification) {
      this.showNotification(data.notification);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameScene?.events.off('score-changed', this.updateScoreText, this);
      this.gameScene?.events.off('notification', this.showNotification, this);
      this.gameScene?.events.off('game-over', this.showGameOver, this);
      this.gameScene?.events.off('game-started', this.onGameStarted, this);
      this.gameScene?.events.off('game-ended', this.onGameEnded, this);
      this.gameScene?.events.off('game-win', this.showWin, this);
      this.gameScene?.events.off('camera-state', this.onCameraState, this);
      this.input.keyboard?.off('keydown-A');
    });
  }

  private createPanelAndControls(): void {
    const outerMargin = Math.max(12, Math.floor(this.scale.width * 0.02));
    const innerWidth = Math.max(1, this.scale.width - outerMargin * 2);
    const panelWidth = Math.floor(innerWidth * 0.2);
    const pad = 12;
    // Panel background on left side
    this.panelBg = this.add.rectangle(0, 0, panelWidth, this.panelCam!.height, getTheme().panelBg, 0.88).setOrigin(0, 0);
    // Bold border for the panel
    this.panelBg.setStrokeStyle(4, getTheme().panelBorder, 1);
    this.panelBg.setDepth(9);
    this.panelObjects.push(this.panelBg);

    const t = getTheme();
    const buttonStyle = {
      fontFamily: t.fontFamily,
      fontSize: '14px',
      color: t.buttonText,
      backgroundColor: t.buttonBg
    } as Phaser.Types.GameObjects.Text.TextStyle;

    // Move score text into panel area
    if (this.scoreText) {
      this.scoreText.setPosition(panelWidth / 2, pad * 1.5);
      this.scoreText.setStyle({ align: 'center', color: t.textPrimary, fontFamily: t.fontFamily, wordWrap: { width: panelWidth - pad * 2 } });
      this.scoreText.setOrigin(0.5, 0);
      this.scoreText.setDepth(10);
      this.panelObjects.push(this.scoreText);
    }

    // Start button (initially visible)
    const buttonsTop = 100;
    this.startButton = this.add
      .text(panelWidth / 2, buttonsTop, 'Start', buttonStyle)
      .setPadding(10, 8)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.gameScene?.events.emit('start-game'));
    this.startButton.setDepth(10);
    this.panelObjects.push(this.startButton);

    // Restart button (hidden until a game has been played)
    this.restartButton = this.add
      .text(panelWidth / 2, buttonsTop, 'Restart', buttonStyle)
      .setPadding(10, 8)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.gameScene?.events.emit('restart-game'));
    this.restartButton.setDepth(10).setVisible(false);
    this.panelObjects.push(this.restartButton);

    // End Game button (hidden until a game has been played)
    this.endButton = this.add
      .text(panelWidth / 2, buttonsTop + 44, 'End Game', buttonStyle)
      .setPadding(10, 8)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.gameScene?.events.emit('end-game'));
    this.endButton.setDepth(10).setVisible(false);
    this.panelObjects.push(this.endButton);

    // Separator line below buttons
    this.panelSeparator = this.add.graphics();
    this.panelSeparator.lineStyle(2, 0x1e293b, 1);
    this.panelSeparator.beginPath();
    const sepY = buttonsTop + 44 + 40;
    this.panelSeparator.moveTo(pad, sepY);
    this.panelSeparator.lineTo(panelWidth - pad, sepY);
    this.panelSeparator.strokePath();
    this.panelSeparator.setDepth(9);
    this.panelObjects.push(this.panelSeparator);

    // Controls header and help text
    this.controlsHeader = this.add.text(panelWidth / 2, sepY + 12, 'Controls', {
      fontFamily: t.fontFamily,
      fontSize: '14px',
      color: t.textPrimary,
      align: 'center'
    }).setOrigin(0.5, 0);
    this.controlsHeader.setDepth(10);
    this.panelObjects.push(this.controlsHeader);

    const help = [
      'Move: \u2190 \u2192 or A/D',
      'Start/Restart: A',
      'Restart: Space/Enter'
    ].join('\n');
    this.controlsHelp = this.add.text(panelWidth / 2, sepY + 36, help, {
      fontFamily: t.fontFamily,
      fontSize: '12px',
      color: t.textSecondary,
      align: 'center',
      wordWrap: { width: panelWidth - pad * 2 }
    }).setOrigin(0.5, 0);
    this.controlsHelp.setDepth(10);
    this.panelObjects.push(this.controlsHelp);

    // Camera status and control
    const camY = sepY + 80;
    this.cameraStatusText = this.add.text(panelWidth / 2, camY, 'Camera: Off', {
      fontFamily: t.fontFamily,
      fontSize: '12px',
      color: t.textSecondary,
      align: 'center'
    }).setOrigin(0.5, 0);
    this.cameraStatusText.setDepth(10).setVisible(false);
    this.panelObjects.push(this.cameraStatusText);

    this.stopCameraButton = this.add
      .text(panelWidth / 2, camY + 24, 'Stop Camera', buttonStyle)
      .setPadding(8, 6)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.gameScene?.events.emit('stop-camera'));
    this.stopCameraButton.setDepth(10).setVisible(false);
    this.panelObjects.push(this.stopCameraButton);

    // Vertical divider line at the right edge of the score panel (into the gutter)
    this.panelDivider = this.add.graphics();
    this.panelDivider.lineStyle(2, getTheme().panelBorder, 1);
    this.panelDivider.beginPath();
    const lineX = panelWidth - 2; // stay within panel camera bounds
    this.panelDivider.moveTo(lineX, 0);
    this.panelDivider.lineTo(lineX, this.panelCam!.height);
    this.panelDivider.strokePath();
    this.panelDivider.setDepth(9);
    this.panelObjects.push(this.panelDivider);
  }

  private clearGameOver(): void {
    const title = this.gameOverTitle;
    const score = this.gameOverScore;
    this.gameOverTitle = undefined;
    this.gameOverScore = undefined;
    if (title) {
      this.tweens.add({
        targets: title,
        alpha: 0,
        duration: 200,
        ease: 'Sine.easeIn',
        onComplete: () => title.destroy()
      });
    }
    if (score) {
      this.tweens.add({
        targets: score,
        alpha: 0,
        duration: 200,
        ease: 'Sine.easeIn',
        onComplete: () => score.destroy()
      });
    }
  }

  private showGameOver = ({ score }: { score: number }): void => {
    this.hasPlayed = true;
    this.updateButtons();
    // Remove any existing overlay/notification
    this.notificationText?.destroy();
    this.notificationText = undefined;
    this.clearGameOver();

    const t = getTheme();
    const ov = this.overlayCam!;
    const cx = ov.scrollX + ov.width / 2;
    const cy = ov.scrollY + ov.height / 2;

    this.gameOverTitle = this.add.text(cx, cy - 30, 'GAME OVER', {
      fontFamily: t.fontFamily,
      fontSize: '48px',
      color: '#ef4444',
      align: 'center'
    }).setOrigin(0.5);

    this.gameOverScore = this.add.text(cx, cy + 24, `Score: ${score}`, {
      fontFamily: t.fontFamily,
      fontSize: '24px',
      color: t.textPrimary,
      align: 'center'
    }).setOrigin(0.5);

    // Ensure overlay text stays within playfield (overlay camera) bounds
    const maxOverlayWidth = Math.max(1, ov.width - 32);
    if (this.gameOverTitle.width > maxOverlayWidth) {
      this.gameOverTitle.setScale(maxOverlayWidth / this.gameOverTitle.width);
    }
    if (this.gameOverScore.width > maxOverlayWidth) {
      this.gameOverScore.setScale(Math.min(1, maxOverlayWidth / this.gameOverScore.width));
    }

    this.gameOverTitle.setDepth(30);
    this.gameOverScore.setDepth(30);
    // Do not draw overlay in the panel camera
    if (this.panelCam) {
      this.panelCam.ignore([this.gameOverTitle, this.gameOverScore]);
    }

    // Fade-in effect for overlay
    this.gameOverTitle.setAlpha(0);
    this.gameOverScore.setAlpha(0);
    this.tweens.add({ targets: this.gameOverTitle, alpha: 1, duration: 400, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.gameOverScore, alpha: 1, duration: 500, delay: 100, ease: 'Sine.easeOut' });
  };

  private showWin = ({ score }: { score: number }): void => {
    this.hasPlayed = true;
    this.updateButtons();
    // Remove any existing overlay/notification
    this.notificationText?.destroy();
    this.notificationText = undefined;
    this.clearGameOver();

    const t = getTheme();
    const ov = this.overlayCam!;
    const cx = ov.scrollX + ov.width / 2;
    const cy = ov.scrollY + ov.height / 2;

    this.gameOverTitle = this.add.text(cx, cy - 30, 'YOU WIN', {
      fontFamily: t.fontFamily,
      fontSize: '48px',
      color: '#22c55e',
      align: 'center'
    }).setOrigin(0.5);

    this.gameOverScore = this.add.text(cx, cy + 24, `Score: ${score}`, {
      fontFamily: t.fontFamily,
      fontSize: '24px',
      color: t.textPrimary,
      align: 'center'
    }).setOrigin(0.5);

    // Fit overlay text within playfield width
    const maxOverlayWidth2 = Math.max(1, ov.width - 32);
    if (this.gameOverTitle.width > maxOverlayWidth2) {
      this.gameOverTitle.setScale(maxOverlayWidth2 / this.gameOverTitle.width);
    }
    if (this.gameOverScore.width > maxOverlayWidth2) {
      this.gameOverScore.setScale(Math.min(1, maxOverlayWidth2 / this.gameOverScore.width));
    }

    this.gameOverTitle.setDepth(30);
    this.gameOverScore.setDepth(30);
    if (this.panelCam) {
      this.panelCam.ignore([this.gameOverTitle, this.gameOverScore]);
    }

    // Fade-in effect
    this.gameOverTitle.setAlpha(0);
    this.gameOverScore.setAlpha(0);
    this.tweens.add({ targets: this.gameOverTitle, alpha: 1, duration: 400, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.gameOverScore, alpha: 1, duration: 500, delay: 100, ease: 'Sine.easeOut' });
  };

  private onGameStarted = (): void => {
    this.hasPlayed = true;
    this.updateButtons();
    // Clear any game over overlay
    this.clearGameOver();
  };

  private onGameEnded = (): void => {
    this.hasPlayed = false;
    this.updateButtons();
    this.clearGameOver();
  };

  private updateButtons(): void {
    const played = this.hasPlayed;
    this.startButton?.setVisible(!played);
    this.restartButton?.setVisible(played);
    this.endButton?.setVisible(played);
  }

  private onCameraState = ({ active }: { active: boolean }): void => {
    if (!this.cameraStatusText || !this.stopCameraButton) return;
    const t = getTheme();
    this.cameraStatusText.setText(active ? 'Camera: On' : 'Camera: Off');
    this.cameraStatusText.setColor(active ? t.textPrimary : t.textSecondary);
    this.cameraStatusText.setVisible(true);
    this.stopCameraButton.setVisible(active);
  };

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
    const ov = this.overlayCam!;
    const nx = ov.scrollX + ov.width / 2;
    const ny = ov.scrollY + ov.height / 2;
    this.notificationText = this.add.text(nx, ny, trimmed, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      align: 'center',
      color: '#f97316',
      wordWrap: { width: ov.width * 0.9 }
    }).setOrigin(0.5);
    this.notificationText.setDepth(20);
    if (this.panelCam && this.notificationText) {
      this.panelCam.ignore(this.notificationText);
    }
  }
}
