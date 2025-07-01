# NT219 - Project Group 7: Nâng cấp hệ thống bảo mật cho nền tảng thương mại điện tử

## Mô tả dự án
Dự án này là một nền tảng thương mại điện tử đa nhà cung cấp (multi-vendor) được nâng cấp với các tính năng bảo mật tiên tiến. Hệ thống bao gồm:
- **Backend**: API server sử dụng Node.js và Express với các tính năng bảo mật nâng cao
- **Frontend**: Ứng dụng React với Redux state management và tính năng ký số client-side
- **Socket**: Hệ thống real-time messaging
- **OQS**: Tích hợp mã hóa hậu lượng tử (Post-Quantum Cryptography)

## Tính năng bảo mật chính
- ✅ **Xác thực thiết bị**: AES-256-GCM + ECDSA để bảo vệ deviceId
- ✅ **Ký số hậu lượng tử**: ML-DSA/Dilithium3 cho đơn hàng (cả backend và frontend)
- ✅ **Xác thực đa yếu tố**: OTP qua email cho thiết bị mới
- ✅ **PIN thanh toán**: Bảo vệ giao dịch với mã PIN 6 số
- ✅ **JWT bảo mật**: HTTPOnly cookies với SameSite=strict
- ✅ **File upload an toàn**: Kiểm tra định dạng, kích thước, quyền truy cập

## Yêu cầu hệ thống
- Node.js phiên bản 18.16.0 hoặc cao hơn
- MongoDB
- Git
- Python 3.x (cho việc build OQS addon)
- Visual Studio Build Tools (Windows) hoặc build-essential (Linux)

## Hướng dẫn cài đặt

### 1. Clone repository
```bash
git clone https://github.com/your-username/NT219-Project.git
cd NT219-Project
```

### 2. Cài đặt Backend

#### Bước 1: Cài đặt dependencies
```bash
cd backend
npm install
```

#### Bước 2: Build OQS Addon (Post-Quantum Cryptography)
```bash
cd utils/oqs-addon
npm install
npm run build
cd ../..
```

#### Bước 3: Cấu hình Backend
Tạo file `.env` trong thư mục `backend/`:
```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database
DB_URL=mongodb://localhost:27017/eshop

# JWT Configuration
JWT_SECRET_KEY=your_super_secret_jwt_key_here
JWT_EXPIRES=7d

# Email Configuration (Gmail)
ACTIVATION_SECRET=your_activation_secret_key
SMPT_HOST=smtp.gmail.com
SMPT_PORT=587
SMPT_PASSWORD=your_gmail_app_password
SMPT_MAIL=your_email@gmail.com

# Payment (Stripe)
STRIPE_API_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Cloud Storage (Cloudinary)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Security Keys
AES_KEY=your_32_byte_hex_aes_key_for_device_encryption
EC_PRIVATE_KEY=your_ecdsa_private_key_hex
EC_PUBLIC_KEY=your_ecdsa_public_key_hex
```

#### Bước 4: Tạo các khóa bảo mật
```bash
# Sinh khóa AES và ECDSA
node genkey.js

# Khóa sẽ được tạo tự động trong thư mục config/oqs_keys/
```

#### Bước 5: Khởi chạy Backend
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 3. Cài đặt Frontend

#### Bước 1: Cài đặt dependencies
```bash
cd frontend
npm install
```

#### Bước 2: Cấu hình Frontend
Tạo file `.env` trong thư mục `frontend/`:
```env
REACT_APP_API_URL=http://localhost:8000/api/v2
REACT_APP_SOCKET_URL=http://localhost:8800
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

#### Bước 3: Khởi chạy Frontend
```bash
# Development mode
npm start

# Build for production
npm run build
```

### 4. Cài đặt Socket Server

#### Bước 1: Cài đặt dependencies
```bash
cd socket
npm install
```

#### Bước 2: Cấu hình Socket
Tạo file `.env` trong thư mục `socket/`:
```env
PORT=8800
CORS_ORIGIN=http://localhost:3000
```

#### Bước 3: Khởi chạy Socket Server
```bash
npm start
```

### 5. Cài đặt Database (MongoDB)

#### Option 1: Local MongoDB
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# Windows - Download từ MongoDB website
# macOS
brew install mongodb-community
```

#### Option 2: MongoDB Atlas (Cloud)
1. Đăng ký tại https://cloud.mongodb.com
2. Tạo cluster mới
3. Lấy connection string và cập nhật vào `DB_URL` trong file `.env`

### 6. Thiết lập Email (Gmail)

1. Bật 2-Factor Authentication cho Gmail
2. Tạo App Password:
   - Vào Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Tạo password mới cho ứng dụng
3. Cập nhật `SMPT_PASSWORD` trong file `.env`

### 7. Thiết lập Stripe (Payment)

1. Đăng ký tại https://stripe.com
2. Lấy API keys từ Dashboard
3. Cập nhật `STRIPE_API_KEY` và `STRIPE_SECRET_KEY` trong file `.env`

## Khởi chạy toàn bộ hệ thống

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start

# Terminal 3 - Socket Server
cd socket && npm start
```

Truy cập:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Socket Server: http://localhost:8800

## Cấu trúc thư mục

```
NT219-Project/
├── backend/                 # Node.js/Express API Server
│   ├── controller/         # API Controllers
│   ├── middleware/         # Authentication, Error handling
│   ├── model/             # MongoDB Models
│   ├── utils/             # Utilities (OQS, JWT, Email, etc.)
│   │   └── oqs-addon/     # Post-Quantum Cryptography addon
│   ├── config/            # Configuration files
│   │   └── oqs_keys/      # ML-DSA keys storage
│   └── uploads/           # File uploads storage
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/    # React Components
│   │   ├── pages/         # Page Components
│   │   ├── redux/         # State Management
│   │   ├── utils/         # Frontend utilities
│   │   │   └── mldsaHandler.js  # Client-side ML-DSA signing
│   │   └── routes/        # Route Configuration
│   └── build/             # Production build
├── socket/                # Socket.io Server
└── README.md             # Project documentation
```

## Tính năng đặc biệt

### Post-Quantum Cryptography (ML-DSA)
- **Backend**: Sử dụng OQS native addon để ký số đơn hàng
- **Frontend**: Có thể tự sinh khóa và ký số trên client (mldsaHandler.js)
- **Thuật toán**: Dilithium3 (ML-DSA)

### Xác thực thiết bị
- Mỗi thiết bị có deviceId được mã hóa AES-256-GCM
- Chữ ký ECDSA để xác thực tính toàn vẹn
- OTP qua email cho thiết bị mới

### Bảo mật giao dịch
- PIN thanh toán 6 số (hash bcrypt)
- Chữ ký số cho mọi đơn hàng
- Xác thực đa lớp

## Troubleshooting

### Lỗi build OQS addon
```bash
# Cài đặt build tools
# Windows
npm install --global windows-build-tools

# Ubuntu/Debian  
sudo apt-get install build-essential

# macOS
xcode-select --install
```

### Lỗi kết nối MongoDB
```bash
# Kiểm tra MongoDB đang chạy
sudo systemctl status mongod

# Khởi động MongoDB
sudo systemctl start mongod
```

### Lỗi CORS
- Kiểm tra CORS_ORIGIN trong file `.env`
- Đảm bảo frontend và backend đang chạy đúng port

## Đóng góp

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Liên hệ

- **Team**: NT219 Group 7
- **University**: University of Information Technology (UIT)
- **Course**: Network Security (NT219)

---

**Lưu ý**: Đây là dự án học tập, một số tính năng mã hóa hậu lượng tử hiện đang ở dạng mô phỏng (simulation) cho mục đích demo.

