// Asset list for the game - ordered by size (lightest first for better loading progress)
export const GAME_ASSETS = [
  // Player walking animations (highest priority)
  {
    name: 'player_walk_left_0',
    src: '/images/Left/egg_l_0.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_left_1',
    src: '/images/Left/egg_l_1.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_left_2',
    src: '/images/Left/egg_l_2.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_left_3',
    src: '/images/Left/egg_l_3.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_left_4',
    src: '/images/Left/egg_l_4.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_left_5',
    src: '/images/Left/egg_l_5.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_left_6',
    src: '/images/Left/egg_l_6.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_left_7',
    src: '/images/Left/egg_l_7.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_0',
    src: '/images/Right/egg_r_0.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_1',
    src: '/images/Right/egg_r_1.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_2',
    src: '/images/Right/egg_r_2.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_3',
    src: '/images/Right/egg_r_3.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_4',
    src: '/images/Right/egg_r_4.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_5',
    src: '/images/Right/egg_r_5.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_6',
    src: '/images/Right/egg_r_6.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_7',
    src: '/images/Right/egg_r_7.png',
    type: 'player',
    priority: 'high'
  },
  // Block textures
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

