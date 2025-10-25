export default class GameEngine {
  constructor(canvas, { onRunEnd, onChestFound, onScoreUpdate, loadedAssets }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onRunEnd = onRunEnd;
    this.onChestFound = onChestFound;
    this.onScoreUpdate = onScoreUpdate;
    this.loadedAssets = loadedAssets || {};
    
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Block size (2-2.5x larger than player) - increased for larger canvas
    this.blockSize = 100;
    this.playerSize = 40;
    
    // Use loaded assets
    this.blockImages = this.loadedAssets;
    
    // Block grid
    this.gridWidth = Math.ceil(this.width / this.blockSize);
    this.gridHeight = Math.ceil(this.height / this.blockSize);
    
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: this.playerSize,
      onGround: false,
      jumping: false
    };
    
    // 2D array of blocks (true = block exists, false = empty)
    this.blocks = [];
    this.particles = [];
    this.score = 0;
    this.timeLeft = 180; // 3 minutes
    this.chestFound = false;
    this.chest = null; // Chest object with position and state
    
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    
    this.generateWorld();
    this.setupEvents();
    this.gameLoop();
  }
  

  generateWorld() {
    // Fill the entire grid with blocks
    this.blocks = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.blocks[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // All blocks are filled (dense structure)
        this.blocks[y][x] = {
          type: this.getBlockType(x, y),
          mined: false
        };
      }
    }
    
    // Spawn player in the middle
    this.spawnPlayer();
  }
  
  getBlockType(x, y) {
    // Different block types depending on depth with organic distribution
    const depth = y / this.gridHeight;
    const noise = this.getOrganicNoise(x * 10, y * 10, 0.1);
    
    // Add dirt layer on top
    if (depth < 0.1) {
      return 'dirt';
    } else if (depth < 0.2) {
      return Math.random() < 0.3 ? 'dirt' : 'stone';
    } else if (depth > 0.8) {
      // Deep layers with rare resources
      if (noise > 0.7) {
        return Math.random() < 0.05 ? 'diamond' : 'stone';
      } else if (noise > 0.5) {
        return Math.random() < 0.1 ? 'gold' : 'stone';
      } else {
        return Math.random() < 0.15 ? 'iron' : 'stone';
      }
    } else if (depth > 0.6) {
      // Medium depth with moderate resources
      if (noise > 0.6) {
        return Math.random() < 0.08 ? 'gold' : 'stone';
      } else if (noise > 0.3) {
        return Math.random() < 0.2 ? 'iron' : 'stone';
      } else {
        return Math.random() < 0.1 ? 'coal' : 'stone';
      }
    } else if (depth > 0.4) {
      // Shallow resources
      if (noise > 0.4) {
        return Math.random() < 0.25 ? 'iron' : 'stone';
      } else {
        return Math.random() < 0.2 ? 'coal' : 'stone';
      }
    }
    
    return 'stone';
  }
  
  spawnPlayer() {
    // Spawn player in the middle of the mine
    this.player.gridX = Math.floor(this.gridWidth / 2);
    this.player.gridY = Math.floor(this.gridHeight / 2);
    
    // Dig out the block under the player for spawn
    this.blocks[this.player.gridY][this.player.gridX].mined = true;
    
    // Convert to pixels
    this.player.x = this.player.gridX * this.blockSize + this.blockSize / 2;
    this.player.y = this.player.gridY * this.blockSize + this.blockSize / 2;
    
    // Reset velocity
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = false;
  }
  
  setupEvents() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // Prevent page scrolling when game is active
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    
    // Mouse
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      // Scale mouse coordinates to match canvas internal size
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    });
    
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      
      // Update mouse coordinates immediately on click
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
      
      this.handleMining();
      e.preventDefault(); // Prevent text selection
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    
    // Add click event as backup
    this.canvas.addEventListener('click', (e) => {
      // Update mouse coordinates immediately on click
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
      
      this.handleMining();
      e.preventDefault();
    });
    
    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // Focus canvas for keyboard events
    this.canvas.tabIndex = 0;
    this.canvas.focus();
  }
  
  handleMining() {
    // Конвертируем позицию мыши в координаты сетки
    const gridX = Math.floor(this.mouse.x / this.blockSize);
    const gridY = Math.floor(this.mouse.y / this.blockSize);
    
    // Проверяем, что клик в пределах сетки
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return;
    }
    
    const block = this.blocks[gridY][gridX];
    
    // Check that block is not mined and near player
    if (!block.mined && this.isNearPlayer(gridX, gridY)) {
      block.mined = true;
      
      // Add points depending on block type
      const points = this.getBlockPoints(block.type);
      this.score += points;
      
      // Send score update to server
      if (this.onScoreUpdate) {
        this.onScoreUpdate(points);
      }
      
      // Check for chest (only from 2nd to 3rd minute)
      if (this.timeLeft <= 120 && this.timeLeft > 0 && !this.chest && !this.chestFound) {
        const chestChance = this.getChestChance();
        if (Math.random() < chestChance) {
          // Create chest at the mined block position
          this.chest = {
            x: gridX * this.blockSize + this.blockSize / 2,
            y: gridY * this.blockSize + this.blockSize / 2,
            size: this.blockSize * 0.8,
            opened: false
          };
        }
      }
      
      // Create particles
      this.createParticles(gridX, gridY, block.type);
    }
  }
  
  isNearPlayer(gridX, gridY) {
    const playerGridX = Math.floor(this.player.x / this.blockSize);
    const playerGridY = Math.floor(this.player.y / this.blockSize);
    
    // Can mine only adjacent blocks (including diagonally adjacent)
    const distanceX = Math.abs(gridX - playerGridX);
    const distanceY = Math.abs(gridY - playerGridY);
    
    // Allow mining blocks that are 1 block away in any direction
    return distanceX <= 1 && distanceY <= 1;
  }
  
  getBlockPoints(type) {
    switch (type) {
      case 'diamond': return 100;
      case 'gold': return 50;
      case 'iron': return 25;
      case 'stone': return 10;
      default: return 10;
    }
  }
  
  getChestChance() {
    // Progressive chest chance from 0% to 100% over the last 2 minutes
    const timeInChestPeriod = Math.max(0, 120 - this.timeLeft);
    const maxChestTime = 120; // 2 minutes
    return Math.min(1, timeInChestPeriod / maxChestTime);
  }

  openChest() {
    if (this.chest && !this.chest.opened) {
      this.chest.opened = true;
      this.chestFound = true;
      
      // Award 1 ticket for opening chest
      this.score += 1000; // Bonus points for finding chest
      
      // Create celebration particles
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: this.chest.x,
          y: this.chest.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 60,
          color: '#fbbf24'
        });
      }
      
      if (this.onChestFound) {
        this.onChestFound(1); // Pass 1 ticket
      }
    }
  }
  
  createParticles(gridX, gridY, type) {
    const x = gridX * this.blockSize + this.blockSize / 2;
    const y = gridY * this.blockSize + this.blockSize / 2;
    
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 40,
        color: this.getBlockColor(type)
      });
    }
  }
  
  getBlockColor(type) {
    switch (type) {
      case 'diamond': return '#B0E0E6';  // Powder blue - diamond
      case 'gold': return '#FFD700';     // Gold - bright gold
      case 'iron': return '#CD853F';     // Peru - warm iron
      case 'stone': return '#8B4513';    // Saddle brown - warm stone
      case 'dirt': return '#A0522D';     // Sienna - rich dirt
      case 'coal': return '#2F1B14';     // Dark brown - coal
      default: return '#8B4513';         // Default to warm stone
    }
  }
  
  
  update() {
    // Player movement (reduced speed)
    this.player.vx = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.vx = -2;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.vx = 2;
    
    // Jumping (single press only) - fixed height jump
    if ((this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp']) && this.player.onGround && !this.player.jumping) {
      // Fixed jump height: 2.2 blocks (220 pixels with 100px blocks)
      // Calculate velocity needed to reach 2.2 blocks height
      // Using physics: v = sqrt(2 * g * h) where h = 2.2 * blockSize
      const jumpHeight = 2.2 * this.blockSize; // 220 pixels
      const gravity = 0.3;
      const jumpVelocity = Math.sqrt(2 * gravity * jumpHeight);
      
      this.player.vy = -jumpVelocity; // Approximately -11.5 for 2.2 block jump
      this.player.onGround = false;
      this.player.jumping = true;
    }
    
    // Reset jump flag when key is released
    if (!this.keys['Space'] && !this.keys['KeyW'] && !this.keys['ArrowUp']) {
      this.player.jumping = false;
    }
    
    // Check for chest opening with E key
    if (this.keys['KeyE'] && this.chest && !this.chest.opened) {
      const distance = Math.sqrt(
        Math.pow(this.player.x - this.chest.x, 2) + 
        Math.pow(this.player.y - this.chest.y, 2)
      );
      
      // If player is close to chest (within 2 blocks)
      if (distance < this.blockSize * 2) {
        this.openChest();
      }
    }
    
    // Gravity (even slower for smoother jump)
    this.player.vy += 0.3;
    
    // Save old position for collisions
    const oldX = this.player.x;
    const oldY = this.player.y;
    
    // Update position
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    
    // Check collisions with blocks
    this.checkBlockCollisions(oldX, oldY);
    
    // Boundaries
    this.player.x = Math.max(this.playerSize/2, Math.min(this.width - this.playerSize/2, this.player.x));
    this.player.y = Math.max(this.playerSize/2, Math.min(this.height - this.playerSize/2, this.player.y));
    
    // Update particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });
    
    // Timer
    this.timeLeft -= 1/60;
    if (this.timeLeft <= 0) {
      this.onRunEnd(this.score);
      this.timeLeft = 180;
      this.score = 0;
      this.chestFound = false;
      this.chest = null; // Reset chest
      this.generateWorld(); // Regenerate world
      this.particles = [];
    }
  }
  
  // Generate organic noise for block edges
  getOrganicNoise(x, y, scale = 0.1) {
    // Simple noise function for organic shapes
    const noise1 = Math.sin(x * scale) * Math.cos(y * scale);
    const noise2 = Math.sin(x * scale * 2.3) * Math.cos(y * scale * 1.7);
    const noise3 = Math.sin(x * scale * 0.7) * Math.cos(y * scale * 2.1);
    return (noise1 + noise2 + noise3) / 3;
  }

  // Draw cave floor (mined areas)
  drawCaveFloor() {
    this.ctx.fillStyle = '#8B4513'; // Saddle brown for cave floor
    this.ctx.beginPath();
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const block = this.blocks[y][x];
        if (block.mined) {
          const blockX = x * this.blockSize;
          const blockY = y * this.blockSize;
          
          // Create organic floor shape
          this.ctx.moveTo(blockX, blockY);
          this.ctx.lineTo(blockX + this.blockSize, blockY);
          this.ctx.lineTo(blockX + this.blockSize, blockY + this.blockSize);
          this.ctx.lineTo(blockX, blockY + this.blockSize);
          this.ctx.closePath();
        }
      }
    }
    this.ctx.fill();
    
    // Add floor texture
    this.ctx.fillStyle = '#A0522D'; // Sienna for texture
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const block = this.blocks[y][x];
        if (block.mined) {
          const blockX = x * this.blockSize;
          const blockY = y * this.blockSize;
          
          // Add small texture dots
          for (let i = 0; i < 3; i++) {
            const dotX = blockX + Math.random() * this.blockSize;
            const dotY = blockY + Math.random() * this.blockSize;
            this.ctx.beginPath();
            this.ctx.arc(dotX, dotY, 1 + Math.random() * 2, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }
    }
  }

  // Draw organic block with irregular edges
  drawOrganicBlock(x, y, type) {
    const blockX = x * this.blockSize;
    const blockY = y * this.blockSize;
    
    // Check if this block has any mined neighbors
    const hasMinedNeighbor = this.hasMinedNeighbor(x, y);
    
    if (hasMinedNeighbor) {
      // Draw organic block with irregular edges
      this.drawIrregularBlock(blockX, blockY, type);
    } else {
      // Draw normal block for interior blocks
      this.drawNormalBlock(blockX, blockY, type);
    }
  }

  // Check if block has any mined neighbors
  hasMinedNeighbor(x, y) {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
        if (this.blocks[ny][nx].mined) {
          return true;
        }
      }
    }
    return false;
  }

  // Draw irregular block with organic edges
  drawIrregularBlock(blockX, blockY, type) {
    const size = this.blockSize;
    const noiseScale = 0.3;
    
    // Create irregular polygon
    this.ctx.beginPath();
    
    // Top edge with noise
    this.ctx.moveTo(blockX, blockY + this.getOrganicNoise(blockX, blockY, noiseScale) * 8);
    for (let i = 0; i <= size; i += 4) {
      const noise = this.getOrganicNoise(blockX + i, blockY, noiseScale) * 8;
      this.ctx.lineTo(blockX + i, blockY + noise);
    }
    
    // Right edge with noise
    for (let i = 0; i <= size; i += 4) {
      const noise = this.getOrganicNoise(blockX + size, blockY + i, noiseScale) * 8;
      this.ctx.lineTo(blockX + size + noise, blockY + i);
    }
    
    // Bottom edge with noise
    for (let i = size; i >= 0; i -= 4) {
      const noise = this.getOrganicNoise(blockX + i, blockY + size, noiseScale) * 8;
      this.ctx.lineTo(blockX + i, blockY + size + noise);
    }
    
    // Left edge with noise
    for (let i = size; i >= 0; i -= 4) {
      const noise = this.getOrganicNoise(blockX, blockY + i, noiseScale) * 8;
      this.ctx.lineTo(blockX + noise, blockY + i);
    }
    
    this.ctx.closePath();
    
    // Fill with block color
    this.ctx.fillStyle = this.getBlockColor(type);
    this.ctx.fill();
    
    // Add texture
    this.addBlockTexture(blockX, blockY, type);
  }

  // Draw normal block for interior
  drawNormalBlock(blockX, blockY, type) {
    this.ctx.fillStyle = this.getBlockColor(type);
    this.ctx.fillRect(blockX, blockY, this.blockSize, this.blockSize);
    
    // Add subtle texture
    this.addBlockTexture(blockX, blockY, type);
  }

  // Add texture to blocks
  addBlockTexture(blockX, blockY, type) {
    const size = this.blockSize;
    
    // Add cracks and details
    this.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    this.ctx.lineWidth = 1;
    
    // Random cracks
    for (let i = 0; i < 2; i++) {
      const startX = blockX + Math.random() * size;
      const startY = blockY + Math.random() * size;
      const endX = startX + (Math.random() - 0.5) * size * 0.5;
      const endY = startY + (Math.random() - 0.5) * size * 0.5;
      
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
    
    // Add small details
    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 3; i++) {
      const dotX = blockX + Math.random() * size;
      const dotY = blockY + Math.random() * size;
      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, 1 + Math.random(), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // Draw player with glow effect
  drawPlayerWithGlow() {
    const playerX = this.player.x;
    const playerY = this.player.y;
    const playerSize = this.player.size;
    
    // Create glow effect
    const glowRadius = 40;
    const gradient = this.ctx.createRadialGradient(
      playerX, playerY, 0,
      playerX, playerY, glowRadius
    );
    gradient.addColorStop(0, 'rgba(255, 165, 0, 0.8)');  // Orange glow
    gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
    
    // Draw glow
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(playerX, playerY, glowRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw player body
    this.ctx.fillStyle = '#4169E1'; // Royal blue
    this.ctx.fillRect(
      playerX - playerSize/2,
      playerY - playerSize/2,
      playerSize,
      playerSize
    );
    
    // Draw player helmet (red)
    this.ctx.fillStyle = '#DC143C'; // Crimson
    this.ctx.fillRect(
      playerX - playerSize/2,
      playerY - playerSize/2,
      playerSize,
      playerSize * 0.4
    );
    
    // Draw player border
    this.ctx.strokeStyle = '#FFD700'; // Gold border
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      playerX - playerSize/2,
      playerY - playerSize/2,
      playerSize,
      playerSize
    );
  }

  checkBlockCollisions(oldX, oldY) {
    const playerLeft = this.player.x - this.playerSize/2;
    const playerRight = this.player.x + this.playerSize/2;
    const playerTop = this.player.y - this.playerSize/2;
    const playerBottom = this.player.y + this.playerSize/2;
    
    // Check collisions with blocks
    let onGround = false;
    
    // Check blocks around player
    for (let y = Math.floor(playerTop / this.blockSize); y <= Math.floor(playerBottom / this.blockSize); y++) {
      for (let x = Math.floor(playerLeft / this.blockSize); x <= Math.floor(playerRight / this.blockSize); x++) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          const block = this.blocks[y][x];
          if (!block.mined) {
            const blockLeft = x * this.blockSize;
            const blockRight = (x + 1) * this.blockSize;
            const blockTop = y * this.blockSize;
            const blockBottom = (y + 1) * this.blockSize;
            
            // Check intersection
            if (playerRight > blockLeft && playerLeft < blockRight && 
                playerBottom > blockTop && playerTop < blockBottom) {
              
              // Determine collision direction
              const overlapLeft = playerRight - blockLeft;
              const overlapRight = blockRight - playerLeft;
              const overlapTop = playerBottom - blockTop;
              const overlapBottom = blockBottom - playerTop;
              
              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
              
              if (minOverlap === overlapTop && this.player.vy >= 0) {
                // Collision from above (player falls on block)
                this.player.y = blockTop - this.playerSize/2;
                this.player.vy = 0;
                onGround = true;
              } else if (minOverlap === overlapBottom && this.player.vy <= 0) {
                // Collision from below (player hits block from above)
                this.player.y = blockBottom + this.playerSize/2;
                this.player.vy = 0;
              } else if (minOverlap === overlapLeft && this.player.vx >= 0) {
                // Collision from left
                this.player.x = blockLeft - this.playerSize/2;
                this.player.vx = 0;
              } else if (minOverlap === overlapRight && this.player.vx <= 0) {
                // Collision from right
                this.player.x = blockRight + this.playerSize/2;
                this.player.vx = 0;
              }
            }
          }
        }
      }
    }
    
    this.player.onGround = onGround;
  }
  
  render() {
    // Clear canvas with cave-like background
    this.ctx.fillStyle = '#1a0f0a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw cave floor (mined areas)
    this.drawCaveFloor();
    
    // Draw organic blocks
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const block = this.blocks[y][x];
        if (!block.mined) {
          this.drawOrganicBlock(x, y, block.type);
        }
      }
    }
    
    // Draw chest if exists
    if (this.chest) {
      const chestX = this.chest.x - this.chest.size / 2;
      const chestY = this.chest.y - this.chest.size / 2;
      
      // Chest body
      this.ctx.fillStyle = this.chest.opened ? '#8b5cf6' : '#fbbf24';
      this.ctx.fillRect(chestX, chestY, this.chest.size, this.chest.size);
      
      // Chest border
      this.ctx.strokeStyle = this.chest.opened ? '#a78bfa' : '#f59e0b';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(chestX, chestY, this.chest.size, this.chest.size);
      
      // Chest details
      this.ctx.fillStyle = this.chest.opened ? '#a78bfa' : '#f59e0b';
      this.ctx.fillRect(chestX + 5, chestY + 5, this.chest.size - 10, 8);
      this.ctx.fillRect(chestX + 5, chestY + this.chest.size - 13, this.chest.size - 10, 8);
      
      // Chest lock
      this.ctx.fillStyle = '#374151';
      this.ctx.fillRect(chestX + this.chest.size/2 - 4, chestY + this.chest.size/2 - 4, 8, 8);
      
      // Glow effect
      this.ctx.shadowColor = this.chest.opened ? '#8b5cf6' : '#fbbf24';
      this.ctx.shadowBlur = 20;
      this.ctx.fillRect(chestX, chestY, this.chest.size, this.chest.size);
      this.ctx.shadowBlur = 0;
    }
    
    // Draw particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    
    // Draw player with glow effect
    this.drawPlayerWithGlow();
    
    // Draw UI - larger and more visible
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 24px Inter, sans-serif';
    this.ctx.fillText(`Score: ${this.score}`, 20, 35);
    this.ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 20, 65);
    
    // Показываем шанс сундука (если в периоде 2-3 минуты)
    if (this.timeLeft <= 120 && this.timeLeft > 0) {
      const chestChance = this.getChestChance();
      this.ctx.fillText(`Chest chance: ${Math.round(chestChance * 100)}%`, 20, 95);
    }
    
    // Показываем найденный сундук
    if (this.chestFound) {
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.font = '24px monospace';
      this.ctx.fillText('🎁 CHEST FOUND!', this.width/2 - 100, this.height/2);
    }
  }
  
  gameLoop() {
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}