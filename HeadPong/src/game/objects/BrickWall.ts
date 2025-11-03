import Phaser from 'phaser';
import { WORLD_BOUNDS } from '../config/gameConfig';

const BRICK_ROWS = 6;
const BRICK_COLUMNS = 12;
const BRICK_WIDTH = 64;
const BRICK_HEIGHT = 24;
const BRICK_PADDING = 8;
const WALL_TOP_OFFSET = 80;

export class BrickWall {
  private readonly scene: Phaser.Scene;
  public readonly group: Phaser.Physics.Arcade.StaticGroup;
  public readonly brickCount: number = BRICK_ROWS * BRICK_COLUMNS;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
    this.buildWall();
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
    const totalWidth = BRICK_COLUMNS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    const startX = (WORLD_BOUNDS.width - totalWidth) / 2 + BRICK_WIDTH / 2;

    for (let row = 0; row < BRICK_ROWS; row += 1) {
      for (let col = 0; col < BRICK_COLUMNS; col += 1) {
        const x = startX + col * (BRICK_WIDTH + BRICK_PADDING);
        const y = WALL_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING);
        const color = Phaser.Display.Color.GetColor(59 + row * 30, 130 + col * 4, 246 - row * 20);

        const brick = this.scene.add.rectangle(x, y, BRICK_WIDTH, BRICK_HEIGHT, color, 1);
        this.group.add(brick);
      }
    }

    this.group.refresh();
  }
}
