const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { encryptPhoneNumber, encryptAddress, decryptUserData } = require("../utils/encryption");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your email!"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
    select: false,
  },
  phoneNumber: {
    type: String, // Đổi từ Number sang String để lưu dữ liệu đã mã hóa
  },
  addresses: [
    {
      country: {
        type: String,
        default: "VietNam", // Default to VietNam
      },
      province: {
        type: String, // Vietnamese provinces
        required: true,
      },
      address: {
        type: String, // Sẽ được mã hóa
        required: true,
      },
      addressType: {
        type: String,
        required: true,
      },
    },
  ],
  role: {
    type: String,
    default: "user",
  },
  avatar: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    },
    // --- New field for Payment PIN ---
    paymentPin: {
        type: String,
        select: false, // Crucial: Do not return paymentPin by default
        default: null, // Allow it to be null initially
    },
  resetPasswordToken: String,
  resetPasswordTime: Date,

  devices: [
    {
      deviceId: String,
      userAgent: String,
      lastLogin: Date,
      ip: String,
    }
  ],
});
//  Hash password
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    // Hash paymentPin only if it's modified and not null
    if (this.isModified("paymentPin") && this.paymentPin) {
        this.paymentPin = await bcrypt.hash(this.paymentPin, 10);
    }
    
    // Mã hóa phoneNumber
    if (this.isModified("phoneNumber") && this.phoneNumber) {
        this.phoneNumber = encryptPhoneNumber(this.phoneNumber);
    }
    
    // Mã hóa addresses
    if (this.isModified("addresses") && this.addresses) {
        this.addresses = this.addresses.map(addr => ({
            ...addr,
            address: encryptAddress(addr.address)
        }));
    }
    
    next();
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- New method to compare payment PIN ---
userSchema.methods.comparePaymentPin = async function (enteredPin) {
    // Ensure that the paymentPin field is selected when querying the user if needed
    // For example: User.findById(userId).select('+paymentPin')
    if (!this.paymentPin) {
        return false; // No PIN set
    }
    return await bcrypt.compare(enteredPin, this.paymentPin);
};

// Method để giải mã user data khi trả về
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    return decryptUserData(user);
};

module.exports = mongoose.model("User", userSchema);
