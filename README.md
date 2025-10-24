# 🏗️ Crypto Mine Game

A Web3 mining game where players connect their crypto wallets to mine blocks and collect tickets. Built with real wallet integration using WalletConnect and Web3.

## 🎮 Game Features

### Core Gameplay
- **2D Mining Adventure**: Navigate through procedurally generated worlds
- **Block Mining System**: Mine different types of blocks (stone, iron, gold, diamond)
- **Chest System**: Find chests with increasing drop rates over time
- **Ticket Economy**: Collect tickets based on your mining performance

### Wallet Integration
- **RainbowKit Integration**: Modern, beautiful wallet connection UI
- **Multiple Wallets**: MetaMask, Phantom, Coinbase Wallet, Trust Wallet, Rainbow, and more
- **WalletConnect Support**: QR code connection for mobile wallets
- **Monad Testnet Only**: Exclusively runs on Monad Testnet (Chain ID: 10143)
- **Secure Transactions**: All wallet interactions are secure and non-custodial

### Game Mechanics
- **3-Day Event**: Game runs for 3 days with daily resets
- **1 Run Per Day**: Each player gets one mining run per day
- **3-Minute Sessions**: Each run lasts exactly 3 minutes
- **Progressive Difficulty**: Chest spawn rates increase over time
- **4 Visual Layers**: Background, base blocks, rare blocks, and Halloween decorations

### Controls
- **Desktop**: WASD/Arrow keys to move, Space to jump, Mouse click to mine
- **Mobile**: Virtual joystick and touch controls
- **Responsive Design**: Works on all devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- A crypto wallet (MetaMask, Phantom, etc.)
- Vercel account for deployment

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd crypto-mine-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your values:
   ```env
   POSTGRES_URL=your_postgresql_connection_string
   VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   ```

4. **Get WalletConnect Project ID**
   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Create a new project
   - Copy your Project ID to the environment file

5. **Set up Monad Testnet**
   - Add Monad Testnet to your wallet:
     - **Network Name**: Monad Testnet
     - **RPC URL**: https://testnet-rpc.monad.xyz
     - **Chain ID**: 10143
     - **Currency Symbol**: MON
     - **Block Explorer**: http://testnet.monadexplorer.com
   - Get test MON tokens from the [Monad Testnet Faucet](https://testnet.monad.xyz/)

6. **Set up Database**
   - Create a PostgreSQL database (recommended: [Neon](https://neon.tech/) or [Supabase](https://supabase.com/))
   - Add the connection string to your environment variables

7. **Run locally**
   ```bash
   npm run dev
   ```

8. **Deploy to Vercel**
   ```bash
   npm run deploy
   ```

## 🗄️ Database Schema

The game uses PostgreSQL with the following main table:

```sql
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  tickets INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  current_day INTEGER DEFAULT 1,
  runs_left INTEGER DEFAULT 1,
  total_runs INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  inventory JSONB DEFAULT '{}',
  achievements JSONB DEFAULT '[]',
  last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 Game Rules

### Ticket System
- **Mining Score**: Earn points by mining blocks
- **Ticket Conversion**: 100 points = 1 ticket
- **Daily Limit**: 1 run per day for 3 days
- **Chest Bonuses**: Find chests for additional tickets

### Block Types
- **Stone**: Basic blocks (2 points)
- **Iron**: Common ore (10 points)
- **Gold**: Rare ore (25 points)
- **Diamond**: Epic ore (100 points)
- **Decorations**: Halloween-themed blocks with special rewards

### Chest System
- **Base Chance**: 10% chance to spawn
- **Progressive Increase**: +30% per minute
- **Max Chance**: 100% after 3 minutes
- **Chest Types**: Common, Rare, Epic, Legendary

## 🔧 API Endpoints

### Player Management
- `GET /api/players/:address` - Get player data
- `POST /api/players` - Create new player
- `PUT /api/players/:address` - Update player data

### Leaderboards
- `GET /api/leaderboard?type=score&limit=10` - Get leaderboard
- `GET /api/leaderboard?type=tickets&limit=10` - Get tickets leaderboard

### Statistics
- `GET /api/stats` - Get game statistics

## 🎨 Customization

### Adding New Block Types
1. Update `js/world.js` - Add block type to `createBlock()`
2. Update `js/block-system.js` - Add rendering logic
3. Update `js/player.js` - Add inventory handling

### Modifying Game Balance
- Edit `js/game-engine.js` settings object
- Adjust block values, mining times, and spawn rates
- Modify chest system in `js/chest-system.js`

### Styling
- Main styles: `styles.css`
- Game-specific styles: `game-styles.css`
- Responsive design included

## 📱 Mobile Support

The game includes full mobile support:
- Touch controls with virtual joystick
- Responsive design for all screen sizes
- Mobile-optimized wallet connections
- Touch-friendly UI elements

## 🔒 Security

- All wallet connections are client-side only
- No private keys are stored or transmitted
- Database only stores public wallet addresses
- CORS enabled for API endpoints
- Input validation on all API routes

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms
- **Netlify**: Works with static build
- **Railway**: Supports Node.js and PostgreSQL
- **Heroku**: Requires buildpack configuration

## 🛠️ Development

### Project Structure
```
├── api/                 # Vercel API routes
├── src/                 # React application
│   ├── components/      # React components
│   ├── game/           # Game logic components
│   ├── App.jsx         # Main app component
│   └── main.jsx        # React entry point
├── index.html          # Main HTML file
├── src/index.css       # Global styles
└── package.json        # Dependencies and scripts
```

### Key Files
- `src/App.jsx` - Main React app with RainbowKit setup
- `src/components/GameApp.jsx` - Main game application component
- `src/components/PlayerStats.jsx` - Player statistics modal
- `src/game/GameEngine.jsx` - Game engine React component
- `api/players.js` - Player data API
- `api/leaderboard.js` - Leaderboard API
- `api/stats.js` - Game statistics API

## 🎉 Features Implemented

✅ **RainbowKit Wallet Integration**
- Beautiful, modern wallet connection UI
- MetaMask, Phantom, Coinbase Wallet, Trust Wallet, Rainbow
- WalletConnect for mobile wallets
- Monad Testnet exclusive support

✅ **Complete Game Engine**
- 2D world generation with noise
- Block mining system
- Player movement and physics
- Chest spawning with progressive rates

✅ **Database Integration**
- PostgreSQL with Vercel
- Player data persistence
- Leaderboards and statistics
- Offline fallback with localStorage

✅ **Mobile Support**
- Touch controls and virtual joystick
- Responsive design
- Mobile wallet connections

✅ **Ticket System**
- 3-day event structure
- 1 run per day limit
- 3-minute sessions
- Score-based ticket rewards

## 🔮 Future Enhancements

- [ ] NFT rewards for top players on Monad mainnet
- [ ] Multiplayer mining competitions
- [ ] Additional block types and biomes
- [ ] Achievement system
- [ ] Social features and sharing
- [ ] Tournament mode
- [ ] Mobile app versions
- [ ] Integration with Monad ecosystem projects

## 📄 License

MIT License - feel free to use this project for your own games!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

---

**Happy Mining! ⛏️💎**
