import Phaser from 'phaser';

const BRICK_ROWS = 6;
const BRICK_COLUMNS = 12;
const BRICK_WIDTH = 64;
const BRICK_HEIGHT = 24;
const BRICK_PADDING = 8;
// Place bricks near the top of the playfield
const WALL_TOP_OFFSET = 40;
const WALL_BOTTOM_MARGIN = 80;

export class BrickWall {
  private readonly scene: Phaser.Scene;
  public readonly group: Phaser.Physics.Arcade.StaticGroup;
  public readonly brickCount: number = BRICK_ROWS * BRICK_COLUMNS;
  private playWidth: number;
  private playHeight: number;
  private powerBrick?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, playWidth: number, playHeight: number) {
    this.scene = scene;
    this.playWidth = playWidth;
    this.playHeight = playHeight;
    this.group = scene.physics.add.staticGroup();
    this.buildWall();
  }

  setPlaySize(width: number, height: number): void {
    this.playWidth = width;
    this.playHeight = height;
  }

  reset(): void {
    this.group.clear(true, true);
    this.buildWall();
  }

  destroy(): void {
    this.group.clear(true, true);
    this.group.destroy(true);
  }

  private buildWall(): void {
    // Compute effective brick size to ensure the wall fits within play panel (width and height band from top)
    // Add side margins so bricks don't touch the playfield border
    const sideMargin = Math.max(16, Math.floor(this.playWidth * 0.04));
    const availableWidth = Math.max(1, this.playWidth - sideMargin * 2);

    const hPaddingTotal = BRICK_PADDING * (BRICK_COLUMNS - 1);
    const maxWidthPerBrick = (availableWidth - hPaddingTotal) / BRICK_COLUMNS;
    const widthScale = Math.min(1, Math.max(0.1, Math.floor(maxWidthPerBrick) / BRICK_WIDTH));

    const playHeight = this.playHeight || this.scene.scale?.height || 540;
    const vPaddingTotal = BRICK_PADDING * (BRICK_ROWS - 1);
    const maxWallHeight = Math.max(40, playHeight - WALL_TOP_OFFSET - WALL_BOTTOM_MARGIN);
    const maxHeightPerBrick = (maxWallHeight - vPaddingTotal) / BRICK_ROWS;
    const heightScale = Math.min(1, Math.max(0.1, Math.floor(maxHeightPerBrick) / BRICK_HEIGHT));

    const scale = Math.max(0.1, Math.min(widthScale, heightScale));
    const effWidth = Math.max(8, Math.floor(BRICK_WIDTH * scale));
    const effHeight = Math.max(6, Math.floor(BRICK_HEIGHT * scale));

    const wallWidth = BRICK_COLUMNS * (effWidth + BRICK_PADDING) - BRICK_PADDING;
    const startX = sideMargin + (availableWidth - wallWidth) / 2 + effWidth / 2;
    const startY = WALL_TOP_OFFSET + effHeight / 2;

    // Score scaling per row: top row hardest => highest score
    const MIN_SCORE = 50;
    const MAX_SCORE = 150;
    const step = BRICK_ROWS > 1 ? (MAX_SCORE - MIN_SCORE) / (BRICK_ROWS - 1) : 0;

    for (let row = 0; row < BRICK_ROWS; row += 1) {
      for (let col = 0; col < BRICK_COLUMNS; col += 1) {
        const x = startX + col * (effWidth + BRICK_PADDING);
        const y = startY + row * (effHeight + BRICK_PADDING);
        const color = Phaser.Display.Color.GetColor(59 + row * 30, 130 + col * 4, 246 - row * 20);

        const brick = this.scene.add.rectangle(x, y, effWidth, effHeight, color, 1);
        // Assign score based on row difficulty (top rows yield more points)
        const rawScore = Math.round(MAX_SCORE - step * row);
        const score = Math.max(MIN_SCORE, rawScore);
        (brick as any).setData?.('score', score);
        this.scene.physics.add.existing(brick, true);
        this.group.add(brick);
        // Animate bricks in for a modern feel
        brick.setAlpha(0);
        this.scene.tweens.add({
          targets: brick,
          alpha: 1,
          duration: 280,
          delay: (row * BRICK_COLUMNS + col) * 8,
          ease: 'Sine.easeOut'
        });
      }
    }

    // Pick a random brick to be the power brick
    const bricks = this.group.getChildren() as Phaser.GameObjects.Rectangle[];
    if (bricks.length > 0) {
      const idx = Math.floor(Math.random() * bricks.length);
      const pb = bricks[idx];
      this.powerBrick = pb;
      (pb as any).setData?.('power', true);
      // Tint power brick by recreating with a distinctive color overlay
      pb.fillColor = Phaser.Display.Color.GetColor(255, 208, 0); // gold
    }
  }
}
