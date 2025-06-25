# NT219 Project - Secure E-Commerce Platform with Quantum-Resistant Cryptography

## 🔐 Advanced Security E-Commerce System

A modern, full-stack e-commerce platform implementing cutting-edge security features including quantum-resistant cryptography (ML-DSA/Dilithium3), advanced encryption, and multi-factor authentication for educational purposes in network security.

---

## 🚀 Key Features

### 🛡️ Advanced Security Implementation

- **Quantum-Resistant Cryptography**: Implementation of ML-DSA (Dilithium3) for future-proof digital signatures
- **End-to-End Encryption**: AES-256-CBC encryption for sensitive data storage
- **Multi-Factor Authentication**: Device fingerprinting with OTP verification
- **Payment PIN Security**: 6-digit PIN system for transaction authorization
- **Secure Device Management**: Elliptic curve cryptography for device authentication

### 🛒 E-Commerce Functionality

- **Multi-Vendor Marketplace**: Support for multiple sellers and shops
- **Product Management**: Complete CRUD operations for products
- **Order Processing**: Secure order creation with cryptographic signatures
- **Payment Integration**: Secure payment processing with ML-DSA verification
- **Admin Dashboard**: Comprehensive admin panel for system management

### 🔧 Technical Architecture

- **Frontend**: React.js with Redux for state management
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with encrypted data storage
- **Authentication**: JWT tokens with device verification
- **Real-time**: WebSocket integration for live updates

---

## 🏗️ Project Structure

### 1. Clone repository
```bash
git clone <repository-url>
cd NT219-Project
```
NT219-Project/
├── frontend/                    # React.js frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── redux/             # State management
│   │   ├── utils/             # Utility functions including ML-DSA handler
│   │   └── context/           # React context providers
│   └── build/                 # Production build files
├── backend/                    # Node.js backend server
│   ├── controller/            # Route controllers
│   ├── model/                 # Database models with encryption
│   ├── middleware/            # Custom middleware (auth, encryption, etc.)
│   ├── utils/                 # Utility functions and crypto modules
│   │   ├── oqs-addon/         # Native C++ addon for OQS integration
│   │   ├── oqsSignature.js    # ML-DSA signature utilities
│   │   ├── encryption.js      # AES encryption utilities
│   │   └── deviceIdSecurity.js # Device authentication utilities
│   └── config/                # Configuration files and keys
├── migrate-encryption.js      # Database migration for encryption
├── genkey.js                  # Key generation utility
└── README.md                  # This file
```

---

## 🔐 Security Features Deep Dive

### Quantum-Resistant Cryptography (ML-DSA)

This project implements **ML-DSA (Module-Lattice-Based Digital Signature Algorithm)**, also known as Dilithium3, which is a post-quantum cryptographic signature scheme:

- **Purpose**: Protect against future quantum computer attacks
- **Implementation**: Native C++ addon using Open Quantum Safe (OQS) library
- **Usage**: Digital signatures for order verification and data integrity
- **Key Sizes**: 
  - Public Key: 1952 bytes
  - Secret Key: 4000 bytes
  - Signature: 2420 bytes

### Data Encryption Strategy

- **Database Encryption**: All sensitive data encrypted with AES-256-CBC
- **Encrypted Fields**:
  - User phone numbers and addresses
  - Shop information and financial data
  - Order details and amounts
  - Payment information

### Multi-Layer Authentication

1. **JWT Token Authentication**: Standard token-based authentication
2. **Device Fingerprinting**: Unique device identification and verification
3. **OTP Verification**: Email-based one-time password system
4. **Payment PIN**: Additional layer for financial transactions

---

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18.16.0 or higher)
- MongoDB
- C++ compiler (for OQS addon compilation)
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd NT219-Project
```

### 2. Backend Setup

```bash
cd backend
npm install

# Generate encryption keys
cd ..
node genkey.js

# Set up environment variables
cp backend/config/.env.example backend/config/.env
# Edit .env file with your configuration
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Database Migration (if needed)

```bash
# Migrate existing data to encrypted format
node migrate-encryption.js
```

### 5. Start the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm start
```

---

## ⚙️ Environment Configuration

Create a `.env` file in `backend/config/` with the following variables:

```env
# Database
DB_URL=mongodb://localhost:27017/your-database

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_EXPIRES=7d

# AES Encryption Keys (Generated by genkey.js)
AES_KEY_DATABASE=your-32-byte-hex-key
AES_IV_DATABASE=your-16-byte-hex-key

# Device Security (Generated by genkey.js)
AES_KEY=your-device-aes-key
AES_IV=your-device-aes-iv
EC_PRIVATE_KEY=your-ec-private-key
EC_PUBLIC_KEY=your-ec-public-key

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SERVICE=your-email-service
SMTP_MAIL=your-email
SMTP_PASSWORD=your-email-password

# Server
PORT=8000
NODE_ENV=DEVELOPMENT
```

---

## 🔑 Key Generation

The project includes a key generation utility:

```bash
node genkey.js
```

This generates:
- AES-256 encryption keys for database
- Elliptic curve keys for device authentication
- ML-DSA key pairs are generated automatically by the OQS module

---

## 🧪 Security Testing

### ML-DSA Signature Verification

The system automatically verifies all order signatures using ML-DSA:

1. **Order Creation**: Frontend generates ML-DSA signature
2. **Backend Verification**: Server verifies signature before processing
3. **Admin Dashboard**: Shows signature verification status

### Encryption Testing

All sensitive data is automatically encrypted before database storage and decrypted when retrieved.

---

## 📱 User Roles & Permissions

### 👤 Customer Users
- Browse and purchase products
- Manage profile and addresses (encrypted)
- Track orders with cryptographic verification
- Set payment PIN for transactions

### 🏪 Sellers/Vendors
- Create and manage shops
- Add and manage products
- Process orders and manage inventory
- Withdraw earnings (encrypted amounts)

### 👨‍💼 Administrators
- System-wide management dashboard
- User and seller management
- Order verification and monitoring
- Security audit capabilities

---

## 🔧 API Endpoints

### Authentication
- `POST /api/v2/user/create-user` - User registration
- `POST /api/v2/user/login-user` - User login with device verification
- `POST /api/v2/user/login-verify-otp` - OTP verification

### Orders (with ML-DSA)
- `POST /api/v2/order/create-order` - Create order with signature verification
- `GET /api/v2/order/get-all-orders/:userId` - Get user orders
- `PUT /api/v2/order/update-order-status/:id` - Update order status

### Payment
- `POST /api/v2/payment/create-order` - Process payment with PIN verification

---

## 🔐 Security Best Practices Implemented

1. **Input Validation**: All inputs sanitized and validated
2. **SQL Injection Prevention**: MongoDB with parameterized queries
3. **XSS Protection**: Content Security Policy headers
4. **CSRF Protection**: SameSite cookie settings
5. **Rate Limiting**: Implemented on sensitive endpoints
6. **Secure Headers**: HTTPS-only in production
7. **Data Minimization**: Only necessary data collected and stored

---

## 🚧 Development Guidelines

### Code Security Standards

1. **Never commit sensitive data** (keys, passwords) to version control
2. **Use environment variables** for all configuration
3. **Implement proper error handling** without exposing system details
4. **Regular security audits** of dependencies
5. **Test encryption/decryption** thoroughly

### Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with security in mind
4. Test all security features
5. Submit pull request with detailed description

---

## 📚 Educational Purpose

This project is designed for **educational purposes** in network security coursework (NT219). It demonstrates:

- Implementation of post-quantum cryptography
- Secure coding practices
- Advanced encryption techniques
- Multi-factor authentication systems
- Secure e-commerce architecture

---

## ⚠️ Security Considerations

### Important Notes

1. **Development Only**: This implementation is for educational purposes
2. **Key Management**: In production, use hardware security modules (HSMs)
3. **Regular Updates**: Keep OQS library updated as standards evolve
4. **Audit Logs**: Implement comprehensive logging for security events
5. **Backup Strategy**: Secure backup of encryption keys

### Known Limitations

1. **Device Signature Verification**: Currently bypassed in some scenarios (marked with TODO)
2. **Frontend ML-DSA**: Uses simulated signatures (real implementation would use WebAssembly OQS)
3. **Key Storage**: Keys stored in files (production should use secure key management)

---

## 📞 Support & Documentation

### Technical Documentation

- **ML-DSA Implementation**: See `backend/utils/oqs-addon/`
- **Encryption Utilities**: See `backend/utils/encryption.js`
- **Security Middleware**: See `backend/middleware/`

### Troubleshooting

Common issues and solutions:

1. **OQS Compilation Issues**: Ensure C++ compiler and Python are installed
2. **Key Generation Errors**: Run `node genkey.js` to regenerate keys
3. **Database Connection**: Check MongoDB connection string in `.env`

---

## 📄 License

This project is created for educational purposes under the NT219 Network Security course.

---

## 🙏 Acknowledgments

- **Open Quantum Safe (OQS)** for post-quantum cryptography implementation
- **NIST** for ML-DSA standardization
- **Node.js** and **React.js** communities for excellent frameworks
- **MongoDB** for flexible database solutions

---

## 📊 Project Statistics

- **Languages**: JavaScript, C++, HTML, CSS
- **Security Features**: 5+ advanced implementations
- **Authentication Layers**: 4 different verification methods
- **Encryption Algorithms**: AES-256, ML-DSA (Dilithium3), ECDSA
- **Database Models**: 7 with full encryption support

---

*This project demonstrates cutting-edge security implementations suitable for modern e-commerce platforms while maintaining educational clarity for network security students.*