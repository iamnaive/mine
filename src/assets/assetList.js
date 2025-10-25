// Asset list for the game - optimized for faster loading
export const GAME_ASSETS = [
  // Essential assets first (critical for gameplay start)
  {
    name: 'stone',
    src: '/images/b4.png',
    type: 'block',
    priority: 'critical'
  },
  {
    name: 'special',
    src: '/images/b5.png',
    type: 'block',
    priority: 'critical'
  },
  {
    name: 'pickaxe',
    src: '/images/pickaxe.png',
    type: 'tool',
    priority: 'critical'
  },
  
  // Player idle frames (most important for immediate gameplay)
  {
    name: 'player_walk_left_0',
    src: '/images/Left/egg_l_0.png',
    type: 'player',
    priority: 'high'
  },
  {
    name: 'player_walk_right_0',
    src: '/images/Right/egg_r_0.png',
    type: 'player',
    priority: 'high'
  },
  
  // Pickaxe idle frames
  {
    name: 'pickaxe_left_0',
    src: '/images/pickaxe_l/Pickaxe_l_00000.png',
    type: 'tool',
    priority: 'high'
  },
  {
    name: 'pickaxe_right_0',
    src: '/images/pickaxe_r/Pickaxe_r_00000.png',
    type: 'tool',
    priority: 'high'
  },
  
  // UI Graphics (high priority for immediate display)
  {
    name: 'ui_best',
    src: '/images/Best.png',
    type: 'ui',
    priority: 'high'
  },
  {
    name: 'ui_connect',
    src: '/images/Connect.png',
    type: 'ui',
    priority: 'high'
  },
  {
    name: 'ui_howplay',
    src: '/images/HowPlay.png',
    type: 'ui',
    priority: 'high'
  },
  {
    name: 'ui_points',
    src: '/images/points.png',
    type: 'ui',
    priority: 'high'
  },
  {
    name: 'ui_start',
    src: '/images/start.png',
    type: 'ui',
    priority: 'high'
  },
  {
    name: 'ui_tickets',
    src: '/images/tickets.png',
    type: 'ui',
    priority: 'high'
  },
  {
    name: 'ui_rank',
    src: '/images/rank.png',
    type: 'ui',
    priority: 'high'
  },
  
  // Background (can load in background)
  {
    name: 'background',
    src: '/images/mine_bg.png',
    type: 'background',
    priority: 'low'
  }
];

// Additional animation assets (loaded after essential ones)
export const ANIMATION_ASSETS = [
  // Player walking animations (loaded progressively)
  {
    name: 'player_walk_left_1',
    src: '/images/Left/egg_l_1.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_left_2',
    src: '/images/Left/egg_l_2.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_left_3',
    src: '/images/Left/egg_l_3.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_left_4',
    src: '/images/Left/egg_l_4.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_left_5',
    src: '/images/Left/egg_l_5.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_left_6',
    src: '/images/Left/egg_l_6.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_left_7',
    src: '/images/Left/egg_l_7.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_right_1',
    src: '/images/Right/egg_r_1.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_right_2',
    src: '/images/Right/egg_r_2.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_right_3',
    src: '/images/Right/egg_r_3.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_right_4',
    src: '/images/Right/egg_r_4.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_right_5',
    src: '/images/Right/egg_r_5.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_right_6',
    src: '/images/Right/egg_r_6.png',
    type: 'player',
    priority: 'medium'
  },
  {
    name: 'player_walk_right_7',
    src: '/images/Right/egg_r_7.png',
    type: 'player',
    priority: 'medium'
  },
  
  // Pickaxe animation frames
  {
    name: 'pickaxe_left_1',
    src: '/images/pickaxe_l/Pickaxe_l_00001.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_left_2',
    src: '/images/pickaxe_l/Pickaxe_l_00002.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_left_3',
    src: '/images/pickaxe_l/Pickaxe_l_00003.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_left_4',
    src: '/images/pickaxe_l/Pickaxe_l_00004.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_left_5',
    src: '/images/pickaxe_l/Pickaxe_l_00005.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_right_1',
    src: '/images/pickaxe_r/Pickaxe_r_00001.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_right_2',
    src: '/images/pickaxe_r/Pickaxe_r_00002.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_right_3',
    src: '/images/pickaxe_r/Pickaxe_r_00003.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_right_4',
    src: '/images/pickaxe_r/Pickaxe_r_00004.png',
    type: 'tool',
    priority: 'medium'
  },
  {
    name: 'pickaxe_right_5',
    src: '/images/pickaxe_r/Pickaxe_r_00005.png',
    type: 'tool',
    priority: 'medium'
  }
];

