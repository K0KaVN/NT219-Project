const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const Shop = require("../model/shop");

// Check if user is authenticated or not
exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token, encryptedDeviceId, signature } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ErrorHandler("User not found", 401));
  }

  // Lấy deviceId, userAgent, IP hiện tại
  const deviceId = encryptedDeviceId && signature
    ? require("../utils/deviceIdSecurity").decryptDeviceId(encryptedDeviceId)
    : null;
  const userAgent = req.headers['user-agent'];
  const ip =
    req.headers['x-forwarded-for']?.split(',').shift() ||
    req.socket?.remoteAddress ||
    null;

  // Kiểm tra deviceId, userAgent, IP có khớp với user.devices không
  const matchedDevice = user.devices?.find(
    (d) => d.deviceId === deviceId && d.userAgent === userAgent && d.ip === ip
  );
  if (!matchedDevice) {
    return next(new ErrorHandler("Thiết bị hoặc môi trường không hợp lệ", 401));
  }

  req.user = user;
  next();
});

exports.isSeller = catchAsyncErrors(async (req, res, next) => {
  const { seller_token } = req.cookies;
  if (!seller_token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  const decoded = jwt.verify(seller_token, process.env.JWT_SECRET_KEY);

  req.seller = await Shop.findById(decoded.id);

  next();
});

exports.isAdmin = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(`${req.user.role} can not access this resources!`)
      );
    }
    next();
  };
};

// Why this auth?
// This auth is for the user to login and get the token
// This token will be used to access the protected routes like create, update, delete, etc. (autharization)
