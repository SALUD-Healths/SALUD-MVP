# 🏥 Salud - Privacy-Preserving Medical Records on Aleo

A decentralized health records management system built on the Aleo blockchain. Store, manage, and share your medical records with complete privacy and control.

![Salud Dashboard](https://img.shields.io/badge/Aleo-Blockchain-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF)

## 🌟 Features

- **🔐 Privacy-First**: All medical data is encrypted and stored as private records on Aleo
- **🔗 Blockchain-Powered**: Records are permanently stored on the Aleo blockchain
- **👨‍⚕️ Share with Doctors**: Generate temporary access tokens to share records with healthcare providers
- **⏰ Time-Limited Access**: Access grants automatically expire after a set duration
- **🔍 Transparent**: View access history and manage permissions
- **⚡ Fast UX**: Background blockchain syncing for seamless experience

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend      │──────▶│   Backend API    │──────▶│  Aleo Blockchain│
│   (React/Vite)  │◀──────│   (Node.js)      │◀──────│                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
       │                          │
       │                          │
       ▼                          ▼
┌─────────────────┐      ┌──────────────────┐
│  Local Storage  │      │  Aleo SDK        │
│  (Records Cache)│      │  (Blockchain)    │
└─────────────────┘      └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- An **Aleo private key** (see [Getting a Private Key](#-getting-a-private-key) below)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Salud
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=3001
ALEO_API_URL=https://api.explorer.provable.com/v1
PROGRAM_ID=salud_health_records_v2.aleo
DEMO_MODE=false
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Start the Backend

```bash
cd backend
npm start
```

The backend will start on `http://localhost:3001`

### 5. Start the Frontend

In a new terminal:
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### 6. Access the App

Open your browser and go to `http://localhost:5173`

## 🔑 Getting a Private Key

### 🤔 Why Can't I Just Connect My Wallet (Leo/Shield Wallet)?

**Great question!** You might be wondering why you can't just click "Connect Wallet" like on other dApps. Here's why:

#### The Technical Reason

Salud is different from typical dApps because it **encrypts your medical data BEFORE sending it to the blockchain**:

```
Other dApps:
Browser Wallet → Signs transaction → Blockchain
     ↑
   (Easy connection)

Salud:
Your Data → Encrypt with Private Key → Backend → Blockchain
                ↑
         (Needs private key for encryption)
```

**Why browser wallets don't work:**
1. **🔐 Data Encryption**: Your medical records are encrypted using your private key BEFORE leaving your browser. Browser wallets (Leo, Shield, etc.) don't expose the private key needed for this encryption.

2. **📝 Transaction Signing**: While browser wallets can sign transactions, Salud needs to:
   - Encrypt medical data client-side
   - Generate cryptographic proofs
   - Create access tokens for sharing
   
   These operations require direct access to cryptographic functions that browser wallets don't provide.

3. **🔒 Session Management**: The backend needs to maintain a session with your wallet to interact with the Aleo blockchain. Browser extensions can't maintain this server-side session.

#### The Privacy Benefit

**This design is actually MORE secure for your medical data:**
- ✅ **End-to-end encryption**: Data is encrypted in your browser before reaching any server
- ✅ **Zero-knowledge**: Even the backend can't read your medical records
- ✅ **You control the keys**: Only you can decrypt and view your health data
- ✅ **No browser extension vulnerabilities**: Avoids risks from compromised wallet extensions

#### Quick Comparison

| Feature | Regular dApp (Browser Wallet) | Salud (Private Key) |
|---------|------------------------------|---------------------|
| **Connection** | Click "Connect" | Paste private key |
| **Data Encryption** | ❌ Not encrypted | ✅ Encrypted with your key |
| **Medical Data Privacy** | ❌ Visible to dApp | ✅ Only you can decrypt |
| **Server Can Read Data** | ❌ Yes | ✅ No (zero-knowledge) |
| **Sharing with Doctors** | ❌ Not possible | ✅ Time-limited access tokens |
| **Security Level** | Standard | **HIPAA-grade encryption** |

**Bottom line**: Salud requires a private key because it provides **medical-grade privacy** that browser wallets can't offer. Your health data deserves the highest level of protection!

### Why Do I Need a Private Key?

Salud uses the **Aleo blockchain** to store your medical records. To interact with Aleo, you need a private key that:
- 🔐 **Proves ownership** of your wallet address
- 📝 **Signs transactions** when creating records or granting access
- 🔒 **Encrypts/decrypts** your medical data (critical for privacy!)
- 🎫 **Generates access tokens** when sharing with doctors

**Your private key never leaves your browser** - it's only used to establish a session with the backend, which then interacts with the Aleo blockchain on your behalf.

### How to Get a Private Key

**Good news!** You CAN use your existing wallets (Leo Wallet, Shield Wallet, etc.) - you just need to export your private key from them. Here's how:

#### Option 1: Use Leo Wallet (Recommended)

If you already have **Leo Wallet** installed:

1. Open Leo Wallet browser extension
2. Click on your account/avatar
3. Go to **Settings** → **Security & Privacy**
4. Click **"Export Private Key"**
5. Enter your password
6. Copy the private key (starts with `APrivateKey1...`)
7. Paste it into Salud's connect screen

#### Option 2: Use Shield Wallet

If you use **Shield Wallet**:

1. Open Shield Wallet extension
2. Go to **Account Settings**
3. Select **"Export Private Key"**
4. Authenticate with your password
5. Copy the private key
6. Paste it into Salud

#### Option 3: Generate a New Account (For Testing)

Don't have a wallet yet? No problem!

1. Go to the Salud app
2. Click **"Generate New"** button on the wallet connect screen
3. Save the generated private key securely
4. The app will automatically connect with this new account
5. **Tip**: You can later import this account into Leo Wallet using the private key

#### Option 4: Use an Existing Aleo Account

If you already have an Aleo account from:
- Aleo SDK
- Other Aleo dApps
- Previous Salud sessions

Simply use your existing private key (starts with `APrivateKey1...`)

### 💡 Using Your Existing Wallet?

**Yes, you can absolutely use Leo Wallet, Shield Wallet, or any other Aleo wallet!**

The private key you paste into Salud is the **same private key** that powers your Leo/Shield wallet. Think of it this way:

- **Leo Wallet** = A secure vault that stores your private key and lets you sign transactions
- **Salud** = A specialized medical app that needs your private key to encrypt health data

**You're not creating a new wallet** - you're just using your existing wallet's private key in a different interface. It's like using the same bank account on different banking apps.

**To use your existing wallet:**
1. Export your private key from Leo/Shield Wallet (see instructions above)
2. Paste it into Salud
3. You're connected! ✅

### ⚠️ Security Warning

**NEVER share your private key with anyone!**
- It's like the password to your bank account
- Anyone with your private key can access your records
- Store it in a secure password manager
- For production use, consider using hardware wallets

## 📁 Project Structure

```
Salud/
├── backend/                 # Node.js API server
│   ├── server.js           # Main server file
│   ├── package.json
│   └── .env               # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── store/         # Zustand state management
│   │   └── lib/           # Utilities and API clients
│   ├── package.json
│   └── .env              # Environment variables
├── salud_health_records/   # Aleo smart contract
│   ├── src/main.leo       # Leo program source
│   └── build/             # Compiled Aleo program
└── README.md
```

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev     # Uses nodemon for auto-restart
```

### Frontend Development

```bash
cd frontend
npm run dev     # Vite dev server with HMR
```

### Build for Production

**Backend:**
```bash
cd backend
npm start       # Production mode
```

**Frontend:**
```bash
cd frontend
npm run build   # Creates dist/ folder
```

## 🧪 Testing

### Demo Mode

To test without spending real Aleo credits, enable demo mode:

```env
# backend/.env
DEMO_MODE=true
```

In demo mode:
- ✅ All features work normally
- ✅ Records are stored in localStorage
- ✅ No real blockchain transactions
- ⚠️ Records won't persist across different browsers/devices

### Testnet vs Mainnet

Currently configured for **Aleo Testnet**:
- Free to use (test credits)
- Perfect for development and testing
- Records are real but use testnet tokens

To switch to mainnet (when available), update `ALEO_API_URL` in backend `.env`.

## 📝 API Documentation

### Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wallet/connect` | Connect wallet with private key |
| POST | `/api/wallet/generate` | Generate new Aleo account |
| GET | `/api/wallet/balance/:sessionId` | Get wallet balance |
| POST | `/api/records/create` | Create medical record |
| GET | `/api/records/fetch/:sessionId` | Fetch records from blockchain |
| POST | `/api/access/grant` | Grant access to doctor |
| GET | `/api/health` | Health check |

## 🎨 Features Guide

### Creating a Record

1. Click **"New Record"** button
2. Fill in title, description, and record type
3. Enter medical data (encrypted before sending)
4. Submit - record is stored on Aleo blockchain

### Sharing with a Doctor

1. Click on a record
2. Select **"Share with Doctor"**
3. Enter doctor's Aleo address
4. Set access duration (1 hour to 7 days)
5. Generate QR code or share access token

### Viewing Records

- Records are automatically synced from blockchain on login
- Click any record to view details and actions
- All data is decrypted locally in your browser

## 🔒 Security

- **End-to-End Encryption**: Medical data is encrypted before leaving your browser
- **Private Records**: Only you can see your record contents on the blockchain
- **Access Control**: You control who can access your records and for how long
- **No Data Storage**: Backend doesn't store medical data, only facilitates blockchain transactions
- **Session-Based**: Private keys are only kept in memory during active sessions

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on port 3001
- Check `VITE_API_URL` in frontend `.env`
- Verify no firewall blocking the connection

### "Invalid private key"
- Private key must start with `APrivateKey1...`
- Must be exactly 59 characters
- Generate a new one if unsure

### "Failed to create record"
- Check backend console for errors
- Ensure you have testnet credits (check balance)
- Try enabling DEMO_MODE for testing

### Records not appearing
- Records are fetched from blockchain on connect
- This may take 10-15 seconds
- Check browser console for sync status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

[MIT License](LICENSE)

## 🙏 Acknowledgments

- Built on [Aleo](https://aleo.org/) - Privacy-first blockchain
- Uses [Leo](https://leo-lang.org/) programming language
- Powered by [@provablehq/sdk](https://github.com/ProvableHQ)

## 📞 Support

- Create an issue for bugs or feature requests
- Check existing issues before creating new ones
- Join the Aleo community Discord for general questions

---

**Made with ❤️ for privacy-preserving healthcare**
