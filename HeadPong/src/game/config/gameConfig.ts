import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
export const UI_PANEL_WIDTH = Math.floor(GAME_WIDTH * 0.2);

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#030712',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene, UIScene]
};

export const WORLD_BOUNDS = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT
};

export const PLAYFIELD_BOUNDS = {
  width: GAME_WIDTH - UI_PANEL_WIDTH,
  height: GAME_HEIGHT
};
