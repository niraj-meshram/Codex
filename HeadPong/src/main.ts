import Phaser from 'phaser';
import { gameConfig } from './game/config/gameConfig';

window.addEventListener('load', () => {
  // Mount Phaser game once the DOM is ready.
  // eslint-disable-next-line no-new
  new Phaser.Game(gameConfig);
});
