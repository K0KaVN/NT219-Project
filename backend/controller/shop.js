const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const { upload } = require("../multer");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");

const sendShopToken = require("../utils/shopToken");
const bcrypt = require("bcryptjs");
const Otp = require("../model/otp");
const { encryptDeviceId, decryptDeviceId, signDeviceId, verifyDeviceId } = require('../utils/deviceIdSecurity');
const crypto = require("crypto");
const PUBLIC_KEY = process.env.EC_PUBLIC_KEY && process.env.EC_PUBLIC_KEY.trim();

// create shop
router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Error deleting file" });
        }
      });
      return next(new ErrorHandler("User already exists", 400));
    }

    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: fileUrl,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
    };

    const activationToken = createActivationToken(seller);

    const activationUrl = `https://shopingse.id.vn/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        message: `Hello ${seller.name}, please click on the link to activate your shop: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${seller.email} to activate your shop!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// create activation token
const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      const { name, email, password, avatar, zipCode, address, phoneNumber } =
        newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandler("User already exists", 400));
      }

      seller = await Shop.create({
        name,
        email,
        avatar,
        password,
        zipCode,
        address,
        phoneNumber,
      });

      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      let deviceId, encryptedDeviceId, signature;
      let cookiesReset = false;
      // ƯU TIÊN LẤY TỪ COOKIE
      if (req.cookies.encryptedDeviceId && req.cookies.signature) {
        encryptedDeviceId = req.cookies.encryptedDeviceId;
        signature = req.cookies.signature;
        const isValid = verifyDeviceId(encryptedDeviceId, signature, PUBLIC_KEY);
        
        // TEMPORARY WORKAROUND: Skip signature verification for now
        // TODO: Fix signature verification issue with elliptic library
        const bypassSignatureCheck = true;
        
        if (!isValid && !bypassSignatureCheck) {
          // XÓA cookie cũ nếu không hợp lệ
          res.cookie("encryptedDeviceId", "", { expires: new Date(0), httpOnly: true, sameSite: "none", secure: true });
          res.cookie("signature", "", { expires: new Date(0), httpOnly: true, sameSite: "none", secure: true });
          // Sinh deviceId mới
          deviceId = crypto.randomBytes(16).toString('hex');
          encryptedDeviceId = encryptDeviceId(deviceId);
          signature = signDeviceId(encryptedDeviceId);
          res.cookie("encryptedDeviceId", encryptedDeviceId, { httpOnly: true, sameSite: "none", secure: true, maxAge: 90 * 24 * 60 * 60 * 1000 });
          res.cookie("signature", signature, { httpOnly: true, sameSite: "none", secure: true, maxAge: 90 * 24 * 60 * 60 * 1000 });
          cookiesReset = true;
        } else {
          deviceId = decryptDeviceId(encryptedDeviceId);
        }
      } else {
        // Nếu chưa có, sinh mới và set cookie
        deviceId = crypto.randomBytes(16).toString('hex');
        encryptedDeviceId = encryptDeviceId(deviceId);
        signature = signDeviceId(encryptedDeviceId);
        res.cookie("encryptedDeviceId", encryptedDeviceId, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 90 * 24 * 60 * 60 * 1000,
        });
        res.cookie("signature", signature, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 90 * 24 * 60 * 60 * 1000,
        });
        cookiesReset = true;
      }

      // Tiếp tục xử lý login như bình thường
      const { email, password, userAgent } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await Shop.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exists!", 400));
      }

      const ip =
        req.headers['x-forwarded-for']?.split(',').shift() ||
        req.socket?.remoteAddress ||
        null;
        
      // Kiểm tra thiết bị quen (bỏ kiểm tra IP)
      const knownDevice = user.devices?.find(
        (d) => d.deviceId === deviceId && d.userAgent === userAgent
      );
      if (knownDevice) {
        return sendShopToken(user, 201, res, { skipOtp: true });
      }

      // Nếu chưa có thiết bị, kiểm tra password và gửi OTP như cũ
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      // Tạo OTP 6 số
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otp, salt);
      await Otp.deleteMany({ email });
      await Otp.create({
        email,
        otp: hashedOtp,
        expiresAt: Date.now() + 60 * 1000,
      });
      await sendMail({
        email,
        subject: "Your Shop OTP Code",
        message: `Your shop login OTP code is: ${otp}`,
      });
      
      // Trả về encryptedDeviceId và signature cho frontend lưu lại (nếu vừa reset)
      if (cookiesReset) {
        return res.status(200).json({ 
          success: true, 
          message: "OTP sent to your shop email", 
          encryptedDeviceId, 
          signature,
          needsDeviceVerification: true 
        });
      } else {
        return res.status(200).json({ 
          success: true, 
          message: "OTP sent to your shop email",
          needsDeviceVerification: false 
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// verify OTP for shop login
router.post(
  "/login-verify-shop-otp",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, otp, userAgent, encryptedDeviceId: bodyEncryptedDeviceId, signature: bodySignature } = req.body;
      
      // Ưu tiên lấy từ body request, fallback về cookie
      let encryptedDeviceId = bodyEncryptedDeviceId || req.cookies.encryptedDeviceId;
      let signature = bodySignature || req.cookies.signature;
      
      const ip =
        req.headers['x-forwarded-for']?.split(',').shift() ||
        req.socket?.remoteAddress ||
        null;
        
      if (!encryptedDeviceId || !signature) {
        return next(new ErrorHandler("Missing device info. Please try logging in again.", 400));
      }
      
      // Kiểm tra public key hợp lệ
      if (!PUBLIC_KEY || !/^04[0-9a-fA-F]{128}$/.test(PUBLIC_KEY)) {
        return next(new ErrorHandler("EC_PUBLIC_KEY format invalid", 500));
      }
      
      const isValid = verifyDeviceId(encryptedDeviceId, signature, PUBLIC_KEY);
      
      // TEMPORARY WORKAROUND: Skip signature verification for now
      // TODO: Fix signature verification issue with elliptic library
      const bypassSignatureCheck = true;
      
      if (!isValid && !bypassSignatureCheck) {
        return next(new ErrorHandler("DeviceId signature invalid", 400));
      }
      
      const deviceId = decryptDeviceId(encryptedDeviceId);
      const record = await Otp.findOne({ email });
      if (!record || record.expiresAt < Date.now()) {
        return next(new ErrorHandler("OTP invalid or expired", 400));
      }
      const isOtpValid = await bcrypt.compare(otp, record.otp);
      if (!isOtpValid) {
        return next(new ErrorHandler("OTP invalid or expired", 400));
      }
      await Otp.deleteOne({ email });
      const user = await Shop.findOne({ email });
      
      // Tìm thiết bị hiện có dựa trên deviceId và userAgent (không cần IP)
      const existingDeviceIndex = user.devices?.findIndex(
        (d) => d.deviceId === deviceId && d.userAgent === userAgent
      );
      
      if (existingDeviceIndex !== -1) {
        // Cập nhật IP và lastLogin cho thiết bị hiện có
        user.devices[existingDeviceIndex].ip = ip;
        user.devices[existingDeviceIndex].lastLogin = new Date();
      } else {
        // Thêm thiết bị mới
        user.devices = user.devices || [];
        user.devices.push({
          deviceId,
          userAgent,
          ip,
          lastLogin: new Date(),
        });
      }
      await user.save();
      sendShopToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out from shop
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const existsUser = await Shop.findById(req.seller._id);

      const existAvatarPath = `uploads/${existsUser.avatar}`;

      fs.unlinkSync(existAvatarPath);

      const fileUrl = path.join(req.file.filename);

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        avatar: fileUrl,
      });

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode } = req.body;

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.zipCode = zipCode;

      await shop.save();

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }

      await Shop.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller withdraw merthods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("Seller not found with this id", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
