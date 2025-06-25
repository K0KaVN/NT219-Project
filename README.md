# NT219 - Project: Nâng cấp bảo mật nền tảng thương mại điện tử

## Mô tả dự án
Dự án này là một nền tảng thương mại điện tử đa nhà cung cấp (multi-vendor) được nâng cấp với các tính năng bảo mật tiên tiến. Hệ thống bao gồm:
- **Backend**: API server sử dụng Node.js và Express
- **Frontend**: Ứng dụng React với Material-UI
- **Socket**: Hệ thống real-time messaging

## Yêu cầu hệ thống
- Node.js phiên bản 18.16.0 hoặc cao hơn
- MongoDB
- Git

## Hướng dẫn cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd NT219-Project
```

### 2. Cài đặt Backend
```bash
cd backend
npm install
```

#### Cấu hình Backend
1. Tạo file `.env` trong thư mục `backend/`:
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/eshop
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
ACTIVATION_SECRET=your_activation_secret
SMPT_HOST=smtp.gmail.com
SMPT_PORT=587
SMPT_PASSWORD=your_email_password
SMPT_MAIL=your_email@gmail.com
STRIPE_API_KEY=your_stripe_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

2. Khởi chạy server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 3. Cài đặt Frontend
```bash
cd frontend
npm install
```

#### Khởi chạy Frontend
```bash
# Development mode
npm start

# Build for production
npm run build
```

### 4. Cài đặt Socket Server
```bash
cd socket
npm install
```

#### Cấu hình Socket Server
1. Tạo file `.env` trong thư mục `socket/`:
```env
PORT=4000
```

2. Khởi chạy socket server:
```bash
npm start
```

## Khởi chạy toàn bộ hệ thống

### Cách 1: Khởi chạy từng service riêng biệt
1. **Terminal 1** - Backend:
```bash
cd backend
npm run dev
```

2. **Terminal 2** - Frontend:
```bash
cd frontend
npm start
```

3. **Terminal 3** - Socket:
```bash
cd socket
npm start
```

## Tính năng bảo mật nâng cao
- Xác thực JWT với thời gian hết hạn
- Mã hóa mật khẩu với bcrypt
- Bảo vệ CORS
- Validation dữ liệu đầu vào
- Hệ thống OTP cho xác thực
- Chữ ký số OQS (Open Quantum Safe)
