export default class GameEngine {
  constructor(canvas, { onRunEnd }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onRunEnd = onRunEnd;
    
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      size: 16,
      onGround: false
    };
    
    this.blocks = [];
    this.particles = [];
    this.score = 0;
    this.timeLeft = 180; // 3 minutes
    
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    
    this.generateWorld();
    this.setupEvents();
    this.gameLoop();
  }
  
  generateWorld() {
    // Generate simple block pattern
    for (let x = 0; x < this.width; x += 32) {
      for (let y = this.height - 64; y < this.height; y += 32) {
        this.blocks.push({
          x, y, width: 32, height: 32,
          type: Math.random() < 0.1 ? 'diamond' : 'stone',
          mined: false
        });
      }
    }
    
    // Add some floating blocks
    for (let i = 0; i < 20; i++) {
      this.blocks.push({
        x: Math.random() * (this.width - 32),
        y: Math.random() * (this.height - 200),
        width: 32, height: 32,
        type: Math.random() < 0.2 ? 'gold' : 'stone',
        mined: false
      });
    }
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
    const block = this.blocks.find(b => 
      !b.mined &&
      this.mouse.x >= b.x && this.mouse.x <= b.x + b.width &&
      this.mouse.y >= b.y && this.mouse.y <= b.y + b.height &&
      Math.abs(this.player.x - (b.x + b.width/2)) < 50 &&
      Math.abs(this.player.y - (b.y + b.height/2)) < 50
    );
    
    if (block) {
      block.mined = true;
      this.score += block.type === 'diamond' ? 100 : block.type === 'gold' ? 50 : 10;
      
      // Create particles
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: block.x + block.width/2,
          y: block.y + block.height/2,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 30,
          color: block.type === 'diamond' ? '#3B82F6' : block.type === 'gold' ? '#F59E0B' : '#6B7280'
        });
      }
    }
  }
  
  update() {
    // Player movement
    this.player.vx = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.vx = -3;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.vx = 3;
    
    // Jumping
    if ((this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp']) && this.player.onGround) {
      this.player.vy = -8;
      this.player.onGround = false;
    }
    
    // Gravity
    this.player.vy += 0.5;
    
    // Update position
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    
    // Ground collision
    if (this.player.y + this.player.size >= this.height - 64) {
      this.player.y = this.height - 64 - this.player.size;
      this.player.vy = 0;
      this.player.onGround = true;
    }
    
    // Boundaries
    this.player.x = Math.max(0, Math.min(this.width - this.player.size, this.player.x));
    
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
      this.blocks.forEach(b => b.mined = false);
      this.particles = [];
    }
  }
  
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#0b0f1a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw blocks
    this.blocks.forEach(block => {
      if (!block.mined) {
        this.ctx.fillStyle = block.type === 'diamond' ? '#3B82F6' : 
                           block.type === 'gold' ? '#F59E0B' : '#6B7280';
        this.ctx.fillRect(block.x, block.y, block.width, block.height);
        
        // Block border
        this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(block.x, block.y, block.width, block.height);
      }
    });
    
    // Draw particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    
    // Draw player
    this.ctx.fillStyle = '#8B5CF6';
    this.ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
    
    // Draw UI
    this.ctx.fillStyle = '#e6eefc';
    this.ctx.font = '16px monospace';
    this.ctx.fillText(`Score: ${this.score}`, 10, 25);
    this.ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 10, 45);
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