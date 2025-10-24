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
      
      // Проверяем, нужно ли уронить игрока
      this.checkPlayerFall();
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
  
  checkPlayerFall() {
    const playerGridX = Math.floor(this.player.x / this.blockSize);
    const playerGridY = Math.floor(this.player.y / this.blockSize);
    
    // Проверяем, есть ли блок под игроком
    if (playerGridY + 1 < this.gridHeight && 
        !this.blocks[playerGridY + 1][playerGridX].mined) {
      // Игрок падает вниз
      this.player.gridY++;
      this.player.y = this.player.gridY * this.blockSize + this.blockSize / 2;
      this.player.vy = 0;
    }
  }
  
  update() {
    // Player movement
    this.player.vx = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.vx = -3;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.vx = 3;
    
    // Jumping (только если есть блок под ногами и нет блока над головой)
    if ((this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp']) && this.player.onGround) {
      const playerGridX = Math.floor(this.player.x / this.blockSize);
      const playerGridY = Math.floor(this.player.y / this.blockSize);
      
      // Проверяем, есть ли блок над игроком
      let canJump = true;
      if (playerGridY > 0) {
        canJump = this.blocks[playerGridY - 1][playerGridX].mined;
      }
      
      if (canJump) {
        this.player.vy = -8;
        this.player.onGround = false;
      }
    }
    
    // Gravity
    this.player.vy += 0.5;
    
    // Update position
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    
    // Обновляем сеточные координаты игрока
    this.player.gridX = Math.floor(this.player.x / this.blockSize);
    this.player.gridY = Math.floor(this.player.y / this.blockSize);
    
    // Проверяем коллизии с блоками
    this.checkBlockCollisions();
    
    // Boundaries
    this.player.x = Math.max(0, Math.min(this.width - this.player.size, this.player.x));
    this.player.y = Math.max(0, Math.min(this.height - this.player.size, this.player.y));
    
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
  
  checkBlockCollisions() {
    const playerGridX = Math.floor(this.player.x / this.blockSize);
    const playerGridY = Math.floor(this.player.y / this.blockSize);
    
    // Проверяем, что игрок в пределах сетки
    if (playerGridX < 0 || playerGridX >= this.gridWidth || 
        playerGridY < 0 || playerGridY >= this.gridHeight) {
      return;
    }
    
    // Проверяем блок под игроком (для определения, на земле ли он)
    let onGround = false;
    if (playerGridY + 1 < this.gridHeight) {
      onGround = !this.blocks[playerGridY + 1][playerGridX].mined;
    }
    
    // Проверяем блоки по бокам (для горизонтальных коллизий)
    let canMoveLeft = true;
    let canMoveRight = true;
    
    if (playerGridX > 0) {
      canMoveLeft = this.blocks[playerGridY][playerGridX - 1].mined;
    }
    if (playerGridX < this.gridWidth - 1) {
      canMoveRight = this.blocks[playerGridY][playerGridX + 1].mined;
    }
    
    // Применяем коллизии
    if (onGround) {
      this.player.onGround = true;
      if (this.player.vy > 0) {
        this.player.vy = 0;
        // Выравниваем игрока по сетке
        this.player.y = playerGridY * this.blockSize + this.blockSize / 2;
      }
    } else {
      this.player.onGround = false;
    }
    
    // Горизонтальные коллизии
    if (!canMoveLeft && this.player.vx < 0) {
      this.player.vx = 0;
      this.player.x = playerGridX * this.blockSize + this.blockSize / 2;
    }
    if (!canMoveRight && this.player.vx > 0) {
      this.player.vx = 0;
      this.player.x = playerGridX * this.blockSize + this.blockSize / 2;
    }
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