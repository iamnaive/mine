// Asset list for the game - ordered by size (lightest first for better loading progress)
export const GAME_ASSETS = [
  {
    name: 'stone',
    src: '/images/b4.png',
    type: 'block',
    priority: 'high' // Small block texture - load first
  },
  {
    name: 'special',
    src: '/images/b5.png',
    type: 'block',
    priority: 'high' // Small block texture - load second
  },
  {
    name: 'background',
    src: '/images/mine_bg.png',
    type: 'background',
    priority: 'low' // Large background image - load last
  }
];

