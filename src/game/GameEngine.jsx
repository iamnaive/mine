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
    
    // Debug logging
    console.log('GameEngine initialized:', {
      canvasWidth: this.width,
      canvasHeight: this.height,
      blockSize: this.blockSize,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      totalBlocks: this.gridWidth * this.gridHeight
    });
    
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
    this.debugMode = false; // Set to true to see grid lines
    
    // Camera system
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      followSpeed: 0.1 // How fast camera follows player (0.1 = smooth, 1.0 = instant)
    };
    
    // Background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = '/images/mine_bg.png';
    
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
    // Different block types depending on depth
    const depth = y / this.gridHeight;
    
    if (depth < 0.2) {
      return Math.random() < 0.05 ? 'diamond' : 'stone';
    } else if (depth < 0.5) {
      return Math.random() < 0.1 ? 'gold' : Math.random() < 0.3 ? 'iron' : 'stone';
    } else {
      return Math.random() < 0.2 ? 'iron' : 'stone';
    }
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
      // Add camera offset to get world coordinates
      this.mouse.x = (e.clientX - rect.left) * scaleX + this.camera.x;
      this.mouse.y = (e.clientY - rect.top) * scaleY + this.camera.y;
    });
    
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      
      // Update mouse coordinates immediately on click
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      // Add camera offset to get world coordinates
      this.mouse.x = (e.clientX - rect.left) * scaleX + this.camera.x;
      this.mouse.y = (e.clientY - rect.top) * scaleY + this.camera.y;
      
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
      // Add camera offset to get world coordinates
      this.mouse.x = (e.clientX - rect.left) * scaleX + this.camera.x;
      this.mouse.y = (e.clientY - rect.top) * scaleY + this.camera.y;
      
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
    
    // Debug logging
    console.log('Mining attempt:', {
      mouseX: this.mouse.x,
      mouseY: this.mouse.y,
      gridX,
      gridY,
      blockSize: this.blockSize,
      canvasWidth: this.width,
      canvasHeight: this.height,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight
    });
    
    // Проверяем, что клик в пределах сетки
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      console.log('Click outside grid bounds');
      return;
    }
    
    const block = this.blocks[gridY][gridX];
    
    // Check that block is not mined and near player
    if (!block.mined && this.isNearPlayer(gridX, gridY)) {
      console.log('Mining block at', gridX, gridY, 'type:', block.type);
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
    
    const isNear = distanceX <= 1 && distanceY <= 1;
    
    console.log('isNearPlayer check:', {
      targetGrid: [gridX, gridY],
      playerGrid: [playerGridX, playerGridY],
      playerPos: [this.player.x, this.player.y],
      distance: [distanceX, distanceY],
      isNear
    });
    
    // Allow mining blocks that are 1 block away in any direction
    return isNear;
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
      case 'diamond': return '#3B82F6';
      case 'gold': return '#F59E0B';
      case 'iron': return '#9CA3AF';
      case 'stone': return '#6B7280';
      case 'dirt': return '#8b4513';
      case 'coal': return '#2d3748';
      default: return '#6B7280';
    }
  }
  
  
  updateCamera() {
    // Set camera target to player position (centered on player)
    this.camera.targetX = this.player.x - this.width / 2;
    this.camera.targetY = this.player.y - this.height / 2;
    
    // Smooth camera movement
    this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.followSpeed;
    this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.followSpeed;
    
    // Keep camera within world bounds
    const maxCameraX = this.width - this.width;
    const maxCameraY = this.height - this.height;
    const minCameraX = 0;
    const minCameraY = 0;
    
    this.camera.x = Math.max(minCameraX, Math.min(maxCameraX, this.camera.x));
    this.camera.y = Math.max(minCameraY, Math.min(maxCameraY, this.camera.y));
  }

  update() {
    // Update camera first
    this.updateCamera();
    
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
    // Clear canvas
    this.ctx.fillStyle = '#0b0f1a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Save context for camera transform
    this.ctx.save();
    
    // Apply camera transform
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    // Draw background image
    if (this.backgroundImage.complete && this.backgroundImage.naturalWidth > 0) {
      // Tile the background image to cover the entire world
      const bgWidth = this.backgroundImage.naturalWidth;
      const bgHeight = this.backgroundImage.naturalHeight;
      
      for (let x = 0; x < this.width + bgWidth; x += bgWidth) {
        for (let y = 0; y < this.height + bgHeight; y += bgHeight) {
          this.ctx.drawImage(this.backgroundImage, x, y, bgWidth, bgHeight);
        }
      }
    }
    
    // Draw blocks
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const block = this.blocks[y][x];
        if (!block.mined) {
          const blockX = x * this.blockSize;
          const blockY = y * this.blockSize;
          
          // Draw block image if available, otherwise fallback to color
          const blockImage = this.blockImages[block.type];
          if (blockImage && blockImage.complete && blockImage.naturalWidth > 0) {
            this.ctx.drawImage(blockImage, blockX, blockY, this.blockSize, this.blockSize);
          } else {
            // Fallback to colored rectangle
            this.ctx.fillStyle = this.getBlockColor(block.type);
            this.ctx.fillRect(blockX, blockY, this.blockSize, this.blockSize);
            
            // Block border
            this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(blockX, blockY, this.blockSize, this.blockSize);
            
            // Block texture (простая текстура)
            this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
            this.ctx.fillRect(blockX + 2, blockY + 2, this.blockSize - 4, 2);
            this.ctx.fillRect(blockX + 2, blockY + 2, 2, this.blockSize - 4);
          }
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
    
    // Draw player
    this.ctx.fillStyle = '#8B5CF6';
    this.ctx.fillRect(this.player.x - this.player.size/2, this.player.y - this.player.size/2, this.player.size, this.player.size);
    
    // Player border
    this.ctx.strokeStyle = '#A855F7';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.player.x - this.player.size/2, this.player.y - this.player.size/2, this.player.size, this.player.size);
    
    // Draw debug grid (optional - can be removed later)
    if (this.debugMode) {
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
      this.ctx.lineWidth = 1;
      for (let x = 0; x <= this.gridWidth; x++) {
        this.ctx.beginPath();
        this.ctx.moveTo(x * this.blockSize, 0);
        this.ctx.lineTo(x * this.blockSize, this.height);
        this.ctx.stroke();
      }
      for (let y = 0; y <= this.gridHeight; y++) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y * this.blockSize);
        this.ctx.lineTo(this.width, y * this.blockSize);
        this.ctx.stroke();
      }
    }
    
    // Restore context (UI elements should not be affected by camera)
    this.ctx.restore();
    
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