export default class GameEngine {
  constructor(canvas, { onRunEnd }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onRunEnd = onRunEnd;
    
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Размер блока (2-2.5x больше игрока)
    this.blockSize = 40;
    this.playerSize = 16;
    
    // Сетка блоков
    this.gridWidth = Math.ceil(this.width / this.blockSize);
    this.gridHeight = Math.ceil(this.height / this.blockSize);
    
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: this.playerSize,
      onGround: false
    };
    
    // 2D массив блоков (true = есть блок, false = пусто)
    this.blocks = [];
    this.particles = [];
    this.score = 0;
    this.timeLeft = 180; // 3 minutes
    this.chestFound = false;
    
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    
    this.generateWorld();
    this.setupEvents();
    this.gameLoop();
  }
  
  generateWorld() {
    // Заполняем всю сетку блоками
    this.blocks = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.blocks[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Все блоки заполнены (плотная структура)
        this.blocks[y][x] = {
          type: this.getBlockType(x, y),
          mined: false
        };
      }
    }
    
    // Спавним игрока в случайном месте
    this.spawnPlayer();
  }
  
  getBlockType(x, y) {
    // Разные типы блоков в зависимости от глубины
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
    // Спавним игрока в середине шахты
    this.player.gridX = Math.floor(this.gridWidth / 2);
    this.player.gridY = Math.floor(this.gridHeight / 2);
    
    // Выкапываем блок под игроком для спавна
    this.blocks[this.player.gridY][this.player.gridX].mined = true;
    
    // Конвертируем в пиксели
    this.player.x = this.player.gridX * this.blockSize + this.blockSize / 2;
    this.player.y = this.player.gridY * this.blockSize + this.blockSize / 2;
    
    // Сбрасываем скорость
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = false;
  }
  
  setupEvents() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    
    // Mouse
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.handleMining();
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
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
    
    // Проверяем, что блок не выкопан и рядом с игроком
    if (!block.mined && this.isNearPlayer(gridX, gridY)) {
      block.mined = true;
      
      // Добавляем очки в зависимости от типа блока
      const points = this.getBlockPoints(block.type);
      this.score += points;
      
      // Проверяем на сундук (только с 2 по 3 минуту)
      if (this.timeLeft <= 120 && this.timeLeft > 0 && !this.chestFound) {
        const chestChance = this.getChestChance();
        if (Math.random() < chestChance) {
          this.chestFound = true;
          this.showChestFound();
        }
      }
      
      // Создаем частицы
      this.createParticles(gridX, gridY, block.type);
    }
  }
  
  isNearPlayer(gridX, gridY) {
    const playerGridX = Math.floor(this.player.x / this.blockSize);
    const playerGridY = Math.floor(this.player.y / this.blockSize);
    
    // Можно копать только соседние блоки
    return Math.abs(gridX - playerGridX) <= 1 && Math.abs(gridY - playerGridY) <= 1;
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
    // С 2 по 3 минуту шанс растет от 0% до 100%
    const timeInChestPeriod = Math.max(0, 120 - this.timeLeft);
    const maxChestTime = 120; // 2 минуты
    return Math.min(1, timeInChestPeriod / maxChestTime);
  }
  
  showChestFound() {
    // Показываем уведомление о найденном сундуке
    console.log('🎁 Сундук найден!');
    // TODO: Добавить UI уведомление
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
      default: return '#6B7280';
    }
  }
  
  
  update() {
    // Player movement
    this.player.vx = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.vx = -4;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.vx = 4;
    
    // Jumping
    if ((this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp']) && this.player.onGround) {
      this.player.vy = -12;
      this.player.onGround = false;
    }
    
    // Gravity
    this.player.vy += 0.8;
    
    // Сохраняем старую позицию для коллизий
    const oldX = this.player.x;
    const oldY = this.player.y;
    
    // Update position
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    
    // Проверяем коллизии с блоками
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
      this.generateWorld(); // Регенерируем мир
      this.particles = [];
    }
  }
  
  checkBlockCollisions(oldX, oldY) {
    const playerLeft = this.player.x - this.playerSize/2;
    const playerRight = this.player.x + this.playerSize/2;
    const playerTop = this.player.y - this.playerSize/2;
    const playerBottom = this.player.y + this.playerSize/2;
    
    // Проверяем коллизии с блоками
    let onGround = false;
    
    // Проверяем блоки вокруг игрока
    for (let y = Math.floor(playerTop / this.blockSize); y <= Math.floor(playerBottom / this.blockSize); y++) {
      for (let x = Math.floor(playerLeft / this.blockSize); x <= Math.floor(playerRight / this.blockSize); x++) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          const block = this.blocks[y][x];
          if (!block.mined) {
            const blockLeft = x * this.blockSize;
            const blockRight = (x + 1) * this.blockSize;
            const blockTop = y * this.blockSize;
            const blockBottom = (y + 1) * this.blockSize;
            
            // Проверяем пересечение
            if (playerRight > blockLeft && playerLeft < blockRight && 
                playerBottom > blockTop && playerTop < blockBottom) {
              
              // Определяем направление коллизии
              const overlapLeft = playerRight - blockLeft;
              const overlapRight = blockRight - playerLeft;
              const overlapTop = playerBottom - blockTop;
              const overlapBottom = blockBottom - playerTop;
              
              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
              
              if (minOverlap === overlapTop && this.player.vy > 0) {
                // Коллизия сверху (игрок падает на блок)
                this.player.y = blockTop - this.playerSize/2;
                this.player.vy = 0;
                onGround = true;
              } else if (minOverlap === overlapBottom && this.player.vy < 0) {
                // Коллизия снизу (игрок ударяется о блок сверху)
                this.player.y = blockBottom + this.playerSize/2;
                this.player.vy = 0;
              } else if (minOverlap === overlapLeft && this.player.vx > 0) {
                // Коллизия слева
                this.player.x = blockLeft - this.playerSize/2;
                this.player.vx = 0;
              } else if (minOverlap === overlapRight && this.player.vx < 0) {
                // Коллизия справа
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
    
    // Draw blocks
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const block = this.blocks[y][x];
        if (!block.mined) {
          const blockX = x * this.blockSize;
          const blockY = y * this.blockSize;
          
          // Block color based on type
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
    
    // Draw UI
    this.ctx.fillStyle = '#e6eefc';
    this.ctx.font = '16px monospace';
    this.ctx.fillText(`Score: ${this.score}`, 10, 25);
    this.ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 10, 45);
    
    // Показываем шанс сундука (если в периоде 2-3 минуты)
    if (this.timeLeft <= 120 && this.timeLeft > 0) {
      const chestChance = this.getChestChance();
      this.ctx.fillText(`Chest chance: ${Math.round(chestChance * 100)}%`, 10, 65);
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