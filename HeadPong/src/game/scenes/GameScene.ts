import Phaser from 'phaser';
import { WORLD_BOUNDS, UI_PANEL_WIDTH, PLAYFIELD_BOUNDS } from '../config/gameConfig';
import { Theme } from '../../theme/Theme';
import { BrickWall } from '../objects/BrickWall';
import { KeyboardHead } from '../../input/KeyboardHead';

const BALL_SPEED = 360;
const PADDLE_WIDTH = 160;
const PADDLE_HEIGHT = 24;
const PADDLE_Y_OFFSET = 60;
const SCORE_PER_BRICK = 50;

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
    this.scale.on('resize', this.handleResize, this);
  }

  update(): void {
    if (!this.state.isRunning) {
      return;
    }

    this.updatePaddlePosition();
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
  }

  private spawnTrailDot(x: number, y: number): void {
    const dot = this.add.circle(x, y, 6, 0x38bdf8, 0.5).setDepth(5);
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
      const p = this.add.circle(x, y, 4, 0xf97316, 0.9).setDepth(8);
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
    g.clear();
    g.lineStyle(4, 0x38bdf8, 1);
    // Draw border aligned exactly to the playfield viewport
    g.strokeRect(0, 0, Math.max(0, this.playWidth), Math.max(0, this.playHeight));
  }

  private createBackground(): void {
    // Soft gradient background inside the playfield
    if (!this.bgGraphics) {
      this.bgGraphics = this.add.graphics();
      this.bgGraphics.setDepth(-10);
    }
    const g = this.bgGraphics;
    g.clear();
    // Draw two translucent rectangles to fake a gradient overlay
    g.fillStyle(Theme.bgTop, 1);
    g.fillRect(0, 0, this.playWidth, this.playHeight);
    g.fillStyle(Theme.bgBottom, 0.65);
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
      const halfW = PADDLE_WIDTH / 2;
      this.paddle.body.x = newPaddleX - halfW;
      this.paddle.x = newPaddleX;
    }
    if (this.ball) {
      const normBall = Phaser.Math.Clamp(this.ball.x / (prevPlayWidth || 1), 0.05, 0.95);
      this.ball.x = normBall * this.playWidth;
    }
  };

  private createPaddle(): void {
    const paddle = this.add.rectangle(
      this.playWidth / 2,
      this.playHeight - PADDLE_Y_OFFSET,
      PADDLE_WIDTH,
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
    const currentX = this.paddle.x / this.playWidth;
    const nextX = Phaser.Math.Linear(currentX, this.targetNormalizedX, this.smoothingFactor);
    const clampedX = Phaser.Math.Clamp(nextX, 0.05, 0.95);
    const absoluteX = clampedX * this.playWidth;
    // For dynamic bodies, move via body position (top-left) and mirror to display
    const halfWidth = PADDLE_WIDTH / 2;
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
    this.resetBallAndPaddle();
    // Stay paused until Start is clicked
    this.physics.pause();
    this.ball.body.setVelocity(0, 0);
  }

  private handlePaddleCollision = (ball: Phaser.GameObjects.GameObject, paddle: Phaser.GameObjects.GameObject) => {
    const ballBody = (ball as Phaser.GameObjects.Arc).body as Phaser.Physics.Arcade.Body;
    const paddleBody = (paddle as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.Body;

    const relativeIntersect = (ballBody.x + ballBody.halfWidth) - (paddleBody.x + paddleBody.halfWidth);
    const normalized = Phaser.Math.Clamp(relativeIntersect / (PADDLE_WIDTH / 2), -1, 1);
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
    brickRectangle.destroy();
    this.state.score += SCORE_PER_BRICK;
    this.state.bricksRemaining -= 1;
    this.events.emit('score-changed', this.state.score);

    // Impact burst at brick position
    const bx = (brick as any).x ?? this.ball.x;
    const by = (brick as any).y ?? this.ball.y;
    this.impactBurst(bx, by);

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
    this.events.emit('game-over', { score: this.state.score });
    this.events.emit('notification', '');
  }

  private victory(): void {
    this.state.isRunning = false;
    this.physics.pause();
    this.ball.body.setVelocity(0, 0);
    this.events.emit('game-win', { score: this.state.score });
    this.events.emit('notification', '');
  }
}
