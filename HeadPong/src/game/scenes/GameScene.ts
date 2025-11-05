import Phaser from 'phaser';
import { WORLD_BOUNDS, UI_PANEL_WIDTH, PLAYFIELD_BOUNDS } from '../config/gameConfig';
import { getTheme, initThemeFromURL } from '../../theme/Theme';
import { BrickWall } from '../objects/BrickWall';
import { KeyboardHead } from '../../input/KeyboardHead';

const BALL_SPEED = 360;
const PADDLE_WIDTH = 160;
const PADDLE_HEIGHT = 24;
const PADDLE_Y_OFFSET = 60;
const MIN_BRICK_SCORE = 50;

interface GameState {
  score: number;
  lives: number;
  isRunning: boolean;
  bricksRemaining: number;
}

export class GameScene extends Phaser.Scene {
  private paddle!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
  private ball!: Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
  private brickWall!: BrickWall;
  // Use a loose type to allow lazy-loading the camera tracker without static import
  private headInput?: any;
  private targetNormalizedX = 0.5;
  private readonly smoothingFactor = 0.25;
  private panelWidth = UI_PANEL_WIDTH;
  private playWidth = PLAYFIELD_BOUNDS.width;
  private playHeight = WORLD_BOUNDS.height;
  private outerMargin = 12;
  private playfieldBorder?: Phaser.GameObjects.Graphics;
  private bgGraphics?: Phaser.GameObjects.Graphics;
  private frameCount = 0;
  private paddleWidth = PADDLE_WIDTH;
  private powerUpActive = false;
  private powerUpTimer?: Phaser.Time.TimerEvent;
  private powerUpTween?: Phaser.Tweens.Tween;
  private cameraActive = false;
  private state: GameState = {
    score: 0,
    lives: 1,
    isRunning: false,
    bricksRemaining: 0
  };
  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!this.headInput?.isActive()) {
      const gutter = Math.max(8, Math.floor(this.scale.width * 0.01));
      const px = Phaser.Math.Clamp(pointer.x - (this.outerMargin + this.panelWidth + gutter), 0, this.playWidth);
      this.targetNormalizedX = Phaser.Math.Clamp(px / this.playWidth, 0, 1);
    }
  };
  private readonly handleRestartInput = () => {
    if (this.state.isRunning) {
      return;
    }
    this.resetGame();
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    initThemeFromURL();
    this.setupLayout();
    this.createBackground();
    this.createPaddle();
    this.createBall();
    this.createBricks();
    this.registerCollisions();
    this.scene.launch('UIScene', { state: this.state });
    // Determine mode synchronously for accurate notification
    const mode = new URLSearchParams(window.location.search).get('input')?.toLowerCase();
    const useCamera = mode ? /(cam|camera|head)/.test(mode) : false;
    void this.initHeadInput(useCamera);
    this.events.emit(
      'notification',
      useCamera
        ? 'Align your head within the camera view to control the paddle.'
        : 'Keyboard mode: Use Left/Right or A/D to steer.'
    );
    this.registerInputHandlers();
    // Start in paused state until user presses Start
    this.physics.pause();
    this.state.isRunning = false;
    this.ball.body.setVelocity(0, 0);
    // Listen to UI scene events for control
    this.events.on('start-game', this.startGame, this);
    this.events.on('restart-game', this.restartGame, this);
    this.events.on('end-game', this.endGame, this);
    this.events.on('stop-camera', this.stopCamera, this);
    this.scale.on('resize', this.handleResize, this);
  }

  update(): void {
    // Always allow paddle to move with head/keyboard before the game starts
    this.updatePaddlePosition();

    if (!this.state.isRunning) {
      return;
    }

    this.constrainBall();

    // Spawn a small trail dot behind the ball every few frames
    this.frameCount += 1;
    if (this.frameCount % 3 === 0) {
      this.spawnTrailDot(this.ball.x, this.ball.y);
    }

    if (this.ball.y > this.playHeight + 20) {
      this.gameOver();
    }

    if (this.state.bricksRemaining <= 0 && this.ball.y < 0) {
      this.victory();
    }
  }

  private async initHeadInput(useCamera: boolean): Promise<void> {
    if (useCamera) {
      const module = await import('../../input/HeadTracker');
      const HeadTracker = module.HeadTracker;
      this.headInput = new HeadTracker();
    } else {
      this.headInput = new KeyboardHead({ wander: true });
    }

    this.headInput.on('position', ({ x }: { x: number }) => {
      this.targetNormalizedX = Phaser.Math.Clamp(x, 0, 1);
    });

    this.headInput.on('error', (error: Error) => {
      // eslint-disable-next-line no-console
      console.warn('Head input error', error);
      if (!this.usingKeyboardInput()) {
        this.events.emit('notification', 'Head tracking unavailable. Use mouse or touch to play.');
      }
    });

    this.headInput.on('tracking-lost', () => {
      if (!this.usingKeyboardInput()) {
        this.events.emit('notification', 'Head tracking lost. Hold still or recenter.');
      }
    });

    this.headInput.start().catch((error) => {
      this.events.emit('head-input-error', error);
      if (!this.usingKeyboardInput()) {
        this.events.emit('notification', 'Head tracking unavailable. Use mouse or touch to play.');
      }
    });

    // Emit initial camera state after attempting to start
    this.cameraActive = !this.usingKeyboardInput();
    this.events.emit('camera-state', { active: this.cameraActive });
  }

  private spawnTrailDot(x: number, y: number): void {
    const dot = this.add.circle(x, y, 6, getTheme().accent, 0.5).setDepth(5);
    this.tweens.add({
      targets: dot,
      alpha: 0,
      scale: 0,
      duration: 320,
      ease: 'Sine.easeOut',
      onComplete: () => dot.destroy()
    });
  }

  private impactBurst(x: number, y: number): void {
    const count = 10;
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, 180);
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      const p = this.add.circle(x, y, 4, getTheme().danger, 0.9).setDepth(8);
      this.tweens.add({
        targets: p,
        x: x + dx * 0.3,
        y: y + dy * 0.3,
        alpha: 0,
        scale: 0,
        duration: 420,
        ease: 'Sine.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private usingKeyboardInput(): boolean {
    return this.headInput instanceof KeyboardHead;
  }

  private registerInputHandlers(): void {
    this.input.on('pointermove', this.handlePointerMove);
    this.input.on('pointerdown', this.handleRestartInput);
    this.input.keyboard?.on('keydown-SPACE', this.handleRestartInput);
    this.input.keyboard?.on('keydown-ENTER', this.handleRestartInput);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.headInput?.destroy();
      this.brickWall.destroy();
      this.input.off('pointermove', this.handlePointerMove);
      this.input.off('pointerdown', this.handleRestartInput);
      this.input.keyboard?.off('keydown-SPACE', this.handleRestartInput);
      this.input.keyboard?.off('keydown-ENTER', this.handleRestartInput);
      this.events.off('start-game', this.startGame, this);
      this.events.off('restart-game', this.restartGame, this);
      this.events.off('end-game', this.endGame, this);
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private setupLayout(): void {
    // Compute uniform margin around content and a gutter between panels
    this.outerMargin = Math.max(12, Math.floor(this.scale.width * 0.02));
    const gutter = Math.max(8, Math.floor(this.scale.width * 0.01));
    const innerWidth = Math.max(1, this.scale.width - this.outerMargin * 2);
    const innerHeight = Math.max(1, this.scale.height - this.outerMargin * 2);
    this.panelWidth = Math.floor(innerWidth * 0.2);
    this.playWidth = Math.max(1, innerWidth - this.panelWidth - gutter);
    this.playHeight = innerHeight;
    // Offset the game camera to the right to reserve space for the left UI panel, gutter, and margins
    this.cameras.main.setViewport(this.outerMargin + this.panelWidth + gutter, this.outerMargin, this.playWidth, this.playHeight);
    // Physics world to match play area size
    this.physics.world.setBounds(0, 0, this.playWidth, this.playHeight);
    // Disable collision with the bottom world bound so the ball doesn't bounce back up
    this.physics.world.setBoundsCollision(true, true, true, false);

    // Draw or update a bold border around the playfield (right 80%)
    if (!this.playfieldBorder) {
      this.playfieldBorder = this.add.graphics();
      this.playfieldBorder.setDepth(1000);
    }
    const g = this.playfieldBorder;
    const theme = getTheme();
    g.clear();
    g.lineStyle(4, theme.accent, 1);
    // Draw border aligned exactly to the playfield viewport
    g.strokeRect(0, 0, Math.max(0, this.playWidth), Math.max(0, this.playHeight));
  }

  private createBackground(): void {
    const theme = getTheme();
    // Soft gradient background inside the playfield
    if (!this.bgGraphics) {
      this.bgGraphics = this.add.graphics();
      this.bgGraphics.setDepth(-10);
    }
    const g = this.bgGraphics;
    g.clear();
    // Draw two translucent rectangles to fake a gradient overlay
    g.fillStyle(theme.bgTop, 1);
    g.fillRect(0, 0, this.playWidth, this.playHeight);
    g.fillStyle(theme.bgBottom, 0.65);
    g.fillRect(0, this.playHeight * 0.4, this.playWidth, this.playHeight * 0.6);

    // No particle managers (removed in Phaser 3.60); we'll use lightweight circle tweens for FX
  }

  private handleResize = (): void => {
    const prevPlayWidth = this.playWidth;
    this.setupLayout();
    // Update bricks to new play width
    if (this.brickWall) {
      this.brickWall.setPlaySize(this.playWidth, this.playHeight);
      this.brickWall.reset();
      this.state.bricksRemaining = this.brickWall.brickCount;
    }
    // Reposition paddle and ball proportionally
    const normPaddle = Phaser.Math.Clamp((this.paddle?.x || 0) / (prevPlayWidth || 1), 0.05, 0.95);
    const newPaddleX = normPaddle * this.playWidth;
    if (this.paddle) {
      const halfW = this.paddleWidth / 2;
      this.paddle.body.x = newPaddleX - halfW;
      this.paddle.x = newPaddleX;
    }
    if (this.ball) {
      const normBall = Phaser.Math.Clamp(this.ball.x / (prevPlayWidth || 1), 0.05, 0.95);
      this.ball.x = normBall * this.playWidth;
    }
  };

  private createPaddle(): void {
    this.paddleWidth = PADDLE_WIDTH;
    const paddle = this.add.rectangle(
      this.playWidth / 2,
      this.playHeight - PADDLE_Y_OFFSET,
      this.paddleWidth,
      PADDLE_HEIGHT,
      0x38bdf8
    );
    this.physics.add.existing(paddle, false); // dynamic body
    this.paddle = paddle as typeof this.paddle;
    this.paddle.body.setImmovable(true);
    this.paddle.body.setCollideWorldBounds(true);
  }

  private createBall(): void {
    const ball = this.add.circle(this.playWidth / 2, this.playHeight / 2, 12, 0xf97316);
    this.physics.add.existing(ball);
    this.ball = ball as typeof this.ball;
    this.ball.body.setCollideWorldBounds(true, 1, 1);
    this.ball.body.setBounce(1, 1);
    // No particle follow; trail is spawned manually in update
  }

  private createBricks(): void {
    this.brickWall = new BrickWall(this, this.playWidth, this.playHeight);
    this.state.bricksRemaining = this.brickWall.brickCount;
  }

  private registerCollisions(): void {
    this.physics.add.collider(this.ball, this.paddle, this.handlePaddleCollision, undefined, this);
    this.physics.add.collider(this.ball, this.brickWall.group, this.handleBrickCollision, undefined, this);
  }

  private updatePaddlePosition(): void {
    const halfWidth = this.paddleWidth / 2;
    const minNorm = Math.max(0, halfWidth / this.playWidth);
    const maxNorm = Math.min(1, 1 - halfWidth / this.playWidth);
    const currentX = this.paddle.x / this.playWidth;
    const nextX = Phaser.Math.Linear(currentX, Phaser.Math.Clamp(this.targetNormalizedX, 0, 1), this.smoothingFactor);
    const clampedX = Phaser.Math.Clamp(nextX, minNorm, maxNorm);
    const absoluteX = clampedX * this.playWidth;
    // For dynamic bodies, move via body position (top-left) and mirror to display
    this.paddle.body.x = absoluteX - halfWidth;
    this.paddle.x = absoluteX;
  }

  private constrainBall(): void {
    const velocity = this.ball.body.velocity;
    if (Math.abs(velocity.x) < 140) {
      const direction = Math.sign(velocity.x) || Phaser.Math.RND.sign();
      velocity.x = direction * 140;
    }
  }

  private resetBallAndPaddle(): void {
    this.targetNormalizedX = 0.5;
    this.paddle.setPosition(this.playWidth / 2, this.playHeight - PADDLE_Y_OFFSET);
    this.paddle.body.updateFromGameObject();
    this.ball.setPosition(this.playWidth / 2, this.playHeight / 2);
    this.ball.body.setVelocity(0, 0);
  }

  private resetGame(): void {
    this.brickWall.reset();
    this.state.score = 0;
    this.state.lives = 1;
    this.state.bricksRemaining = this.brickWall.brickCount;
    this.state.isRunning = false;
    this.events.emit('score-changed', this.state.score);
    this.events.emit(
      'notification',
      this.usingKeyboardInput()
        ? 'Keyboard mode: Use Left/Right or A/D to steer.'
        : 'Align your head within the camera view to control the paddle.'
    );
    this.deactivatePaddlePowerUp();
    this.resetBallAndPaddle();
    // Stay paused until Start is clicked
    this.physics.pause();
    this.ball.body.setVelocity(0, 0);
  }

  private handlePaddleCollision = (ball: Phaser.GameObjects.GameObject, paddle: Phaser.GameObjects.GameObject) => {
    const ballBody = (ball as Phaser.GameObjects.Arc).body as Phaser.Physics.Arcade.Body;
    const paddleBody = (paddle as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.Body;

    const relativeIntersect = (ballBody.x + ballBody.halfWidth) - (paddleBody.x + paddleBody.halfWidth);
    const normalized = Phaser.Math.Clamp(relativeIntersect / (this.paddleWidth / 2), -1, 1);
    const bounceAngle = normalized * Phaser.Math.DegToRad(60);
    const speed = BALL_SPEED;

    ballBody.setVelocity(
      speed * Math.sin(bounceAngle),
      -Math.abs(speed * Math.cos(bounceAngle))
    );

    // Small impact burst and subtle camera shake
    this.cameras.main.shake(100, 0.003);
    this.impactBurst(ballBody.x + ballBody.halfWidth, ballBody.y + ballBody.halfHeight);
  };

  private handleBrickCollision = (_ball: Phaser.GameObjects.GameObject, brick: Phaser.GameObjects.GameObject) => {
    const brickRectangle = brick as Phaser.GameObjects.Rectangle & { body?: Phaser.Physics.Arcade.StaticBody | Phaser.Physics.Arcade.Body };
    if (brickRectangle.body) {
      brickRectangle.body.destroy();
    }
    // Add score based on brick's assigned difficulty
    const brickScore: number = (brick as any).getData?.('score') ?? MIN_BRICK_SCORE;
    const isPower: boolean = !!(brick as any).getData?.('power');
    brickRectangle.destroy();
    this.state.score += brickScore;
    this.state.bricksRemaining -= 1;
    this.events.emit('score-changed', this.state.score);
    // Audio: brick break pop
    this.playSound('brick');

    // Impact burst at brick position
    const bx = (brick as any).x ?? this.ball.x;
    const by = (brick as any).y ?? this.ball.y;
    this.impactBurst(bx, by);

    if (isPower) {
      this.activatePaddlePowerUp();
    }

    if (this.state.bricksRemaining <= 0) {
      this.ball.body.velocity.y = -Math.abs(this.ball.body.velocity.y);
    }
  };

  private launchBall(): void {
    const initialAngle = Phaser.Math.FloatBetween(-0.4, 0.4);
    const velocityX = BALL_SPEED * Math.sin(initialAngle * Math.PI);
    const velocityY = -Math.abs(BALL_SPEED * Math.cos(initialAngle * Math.PI));
    this.ball.body.setVelocity(velocityX, velocityY);
  }

  private startGame = (): void => {
    if (this.state.isRunning) return;
    this.physics.resume();
    this.state.isRunning = true;
    this.launchBall();
    this.events.emit('notification', '');
    this.events.emit('game-started');
  };

  private restartGame = (): void => {
    this.resetGame();
    this.startGame();
  };

  private endGame = (): void => {
    this.resetGame();
    this.events.emit('game-ended');
  };

  private gameOver(): void {
    this.state.isRunning = false;
    this.physics.pause();
    this.ball.body.setVelocity(0, 0);
    // Audio: lose sting
    this.playSound('lose');
    this.events.emit('game-over', { score: this.state.score });
    this.events.emit('notification', '');
  }

  private victory(): void {
    this.state.isRunning = false;
    this.physics.pause();
    this.ball.body.setVelocity(0, 0);
    // Audio: win arpeggio
    this.playSound('win');
    this.events.emit('game-win', { score: this.state.score });
    this.events.emit('notification', '');
  }

  private setPaddleWidth(width: number): void {
    this.paddleWidth = Math.max(20, Math.floor(width));
    this.paddle.width = this.paddleWidth;
    this.paddle.displayWidth = this.paddleWidth;
    this.paddle.body.setSize(this.paddleWidth, PADDLE_HEIGHT, true);
    this.paddle.body.updateFromGameObject();
  }

  private activatePaddlePowerUp(): void {
    if (this.powerUpActive) return;
    this.powerUpActive = true;
    // Enlarge to 1.5x
    this.setPaddleWidth(PADDLE_WIDTH * 1.5);
    // Flashing effect on paddle
    this.powerUpTween?.stop();
    this.paddle.setAlpha(1);
    this.powerUpTween = this.tweens.add({
      targets: this.paddle,
      alpha: 0.4,
      duration: 120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // Victory sound on activation
    this.playSound('win');
    // Timer to revert after 15 seconds
    this.powerUpTimer?.remove(false);
    this.powerUpTimer = this.time.addEvent({ delay: 15000, callback: this.deactivatePaddlePowerUp, callbackScope: this });
  }

  private deactivatePaddlePowerUp = (): void => {
    if (!this.powerUpActive) return;
    this.powerUpActive = false;
    this.powerUpTimer?.remove(false);
    this.powerUpTimer = undefined;
    if (this.powerUpTween) {
      this.powerUpTween.stop();
      this.powerUpTween = undefined;
    }
    this.paddle.setAlpha(1);
    this.setPaddleWidth(PADDLE_WIDTH);
  };

  // --- Lightweight procedural sound (no assets) ---
  private canPlayAudio(): boolean {
    const sm: any = this.sound as any;
    return !!(this.sound && sm && sm.context && !this.sound.locked);
  }

  private scheduleBeep(opts: { freq: number; duration: number; when: number; type?: OscillatorType; volume?: number }): void {
    const sm: any = this.sound as any;
    const ctx: any = sm.context;
    if (!ctx) return;
    const now: number = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, now + opts.when);
    const vol = Math.max(0, Math.min(1, opts.volume ?? 0.05));
    gain.gain.setValueAtTime(vol, now + opts.when);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.when + opts.duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + opts.when);
    osc.stop(now + opts.when + opts.duration / 1000 + 0.02);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* noop */
      }
    };
  }

  private playSound(kind: 'brick' | 'lose' | 'win'): void {
    if (!this.canPlayAudio()) return;
    const vol = 0.06;
    if (kind === 'brick') {
      this.scheduleBeep({ freq: 520, duration: 60, when: 0, type: 'square', volume: vol * 0.8 });
      return;
    }
    if (kind === 'lose') {
      this.scheduleBeep({ freq: 330, duration: 180, when: 0.0, type: 'sine', volume: vol });
      this.scheduleBeep({ freq: 220, duration: 260, when: 0.18, type: 'sine', volume: vol * 0.9 });
      return;
    }
    if (kind === 'win') {
      this.scheduleBeep({ freq: 440, duration: 140, when: 0.0, type: 'triangle', volume: vol });
      this.scheduleBeep({ freq: 660, duration: 140, when: 0.15, type: 'triangle', volume: vol });
      this.scheduleBeep({ freq: 880, duration: 200, when: 0.32, type: 'triangle', volume: vol });
    }
  }

  private stopCamera = (): void => {
    if (this.usingKeyboardInput()) {
      return;
    }
    try {
      this.headInput?.stop?.();
      this.headInput?.destroy?.();
    } catch {
      // ignore
    }
    this.headInput = new KeyboardHead({ wander: true });
    this.cameraActive = false;
    this.events.emit('camera-state', { active: false });
    this.events.emit('notification', 'Camera off. Keyboard/mouse control.');
  };
}
