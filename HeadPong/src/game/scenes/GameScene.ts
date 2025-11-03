import Phaser from 'phaser';
import { WORLD_BOUNDS } from '../config/gameConfig';
import { BrickWall } from '../objects/BrickWall';
import { HeadTracker } from '../../input/HeadTracker';

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
  private headTracker = new HeadTracker();
  private targetNormalizedX = 0.5;
  private readonly smoothingFactor = 0.18;
  private state: GameState = {
    score: 0,
    lives: 1,
    isRunning: false,
    bricksRemaining: 0
  };
  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!this.headTracker.isActive()) {
      this.targetNormalizedX = Phaser.Math.Clamp(pointer.x / WORLD_BOUNDS.width, 0, 1);
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
    this.createBounds();
    this.createPaddle();
    this.createBall();
    this.createBricks();
    this.registerCollisions();
    this.launchBall();
    this.scene.launch('UIScene', { state: this.state });
    this.initHeadTracking();
    this.events.emit('notification', 'Align your head within the camera view to control the paddle.');
    this.registerInputHandlers();
  }

  update(): void {
    if (!this.state.isRunning) {
      return;
    }

    this.updatePaddlePosition();
    this.constrainBall();

    if (this.ball.y > WORLD_BOUNDS.height + 20) {
      this.gameOver();
    }

    if (this.state.bricksRemaining <= 0 && this.ball.y < 0) {
      this.victory();
    }
  }

  private initHeadTracking(): void {
    this.headTracker.on('position', ({ x }) => {
      this.targetNormalizedX = Phaser.Math.Clamp(x, 0, 1);
    });

    this.headTracker.on('error', (error: Error) => {
      // eslint-disable-next-line no-console
      console.warn('Head tracking error', error);
      this.events.emit('notification', 'Head tracking unavailable. Use mouse or touch to play.');
    });

    this.headTracker.on('tracking-lost', () => {
      this.events.emit('notification', 'Head tracking lost. Hold still or recenter.');
    });

    this.headTracker.start().catch((error) => {
      this.events.emit('head-tracker-error', error);
      this.events.emit('notification', 'Head tracking unavailable. Use mouse or touch to play.');
    });
  }

  private registerInputHandlers(): void {
    this.input.on('pointermove', this.handlePointerMove);
    this.input.on('pointerdown', this.handleRestartInput);
    this.input.keyboard?.on('keydown-SPACE', this.handleRestartInput);
    this.input.keyboard?.on('keydown-ENTER', this.handleRestartInput);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.headTracker.destroy();
      this.brickWall.destroy();
      this.input.off('pointermove', this.handlePointerMove);
      this.input.off('pointerdown', this.handleRestartInput);
      this.input.keyboard?.off('keydown-SPACE', this.handleRestartInput);
      this.input.keyboard?.off('keydown-ENTER', this.handleRestartInput);
    });
  }

  private createBounds(): void {
    this.physics.world.setBounds(0, 0, WORLD_BOUNDS.width, WORLD_BOUNDS.height);
  }

  private createPaddle(): void {
    const paddle = this.add.rectangle(WORLD_BOUNDS.width / 2, WORLD_BOUNDS.height - PADDLE_Y_OFFSET, PADDLE_WIDTH, PADDLE_HEIGHT, 0x38bdf8);
    this.physics.add.existing(paddle, true);
    this.paddle = paddle as typeof this.paddle;
    this.paddle.body.setCollideWorldBounds(true);
  }

  private createBall(): void {
    const ball = this.add.circle(WORLD_BOUNDS.width / 2, WORLD_BOUNDS.height / 2, 12, 0xf97316);
    this.physics.add.existing(ball);
    this.ball = ball as typeof this.ball;
    this.ball.body.setCollideWorldBounds(true, 1, 1);
    this.ball.body.setBounce(1, 1);
  }

  private createBricks(): void {
    this.brickWall = new BrickWall(this);
    this.state.bricksRemaining = this.brickWall.brickCount;
  }

  private registerCollisions(): void {
    this.physics.add.collider(this.ball, this.paddle, this.handlePaddleCollision, undefined, this);
    this.physics.add.collider(this.ball, this.brickWall.group, this.handleBrickCollision, undefined, this);
  }

  private updatePaddlePosition(): void {
    const currentX = this.paddle.x / WORLD_BOUNDS.width;
    const nextX = Phaser.Math.Linear(currentX, this.targetNormalizedX, this.smoothingFactor);
    const clampedX = Phaser.Math.Clamp(nextX, 0.05, 0.95);
    const absoluteX = clampedX * WORLD_BOUNDS.width;
    this.paddle.setX(absoluteX);
    this.paddle.body.updateFromGameObject();
  }

  private constrainBall(): void {
    const velocity = this.ball.body.velocity;
    if (Math.abs(velocity.x) < 140) {
      const direction = Phaser.Math.Sign(velocity.x) || Phaser.Math.RND.sign();
      velocity.x = direction * 140;
    }
  }

  private resetBallAndPaddle(): void {
    this.targetNormalizedX = 0.5;
    this.paddle.setPosition(WORLD_BOUNDS.width / 2, WORLD_BOUNDS.height - PADDLE_Y_OFFSET);
    this.paddle.body.updateFromGameObject();
    this.ball.setPosition(WORLD_BOUNDS.width / 2, WORLD_BOUNDS.height / 2);
    this.ball.body.setVelocity(0, 0);
  }

  private resetGame(): void {
    this.brickWall.reset();
    this.state.score = 0;
    this.state.lives = 1;
    this.state.bricksRemaining = this.brickWall.brickCount;
    this.state.isRunning = false;
    this.events.emit('score-changed', this.state.score);
    this.events.emit('notification', 'Align your head within the camera view to control the paddle.');
    this.resetBallAndPaddle();
    this.launchBall();
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
  };

  private handleBrickCollision = (_ball: Phaser.GameObjects.GameObject, brick: Phaser.GameObjects.GameObject) => {
    const brickRectangle = brick as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
    brickRectangle.disableBody(true, true);
    this.state.score += SCORE_PER_BRICK;
    this.state.bricksRemaining -= 1;
    this.events.emit('score-changed', this.state.score);

    if (this.state.bricksRemaining <= 0) {
      this.ball.body.velocity.y = -Math.abs(this.ball.body.velocity.y);
    }
  };

  private launchBall(): void {
    this.physics.resume();
    this.state.isRunning = true;
    const initialAngle = Phaser.Math.FloatBetween(-0.4, 0.4);
    const velocityX = BALL_SPEED * Math.sin(initialAngle * Math.PI);
    const velocityY = -Math.abs(BALL_SPEED * Math.cos(initialAngle * Math.PI));
    this.ball.body.setVelocity(velocityX, velocityY);
  }

  private gameOver(): void {
    this.state.isRunning = false;
    this.physics.pause();
    this.ball.body.setVelocity(0, 0);
    this.events.emit('notification', 'Game over! The ball slipped past your header. Press Space or tap to try again.');
  }

  private victory(): void {
    this.state.isRunning = false;
    this.physics.pause();
    this.ball.body.setVelocity(0, 0);
    this.events.emit('notification', 'Victory! You broke through the wall! Press Space or tap to play again.');
  }
}
