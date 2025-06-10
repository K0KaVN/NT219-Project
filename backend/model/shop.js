const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { encryptPhoneNumber, encryptAddress, encryptAmount, decryptShopData } = require("../utils/encryption");

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your shop name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your shop email address"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [6, "Password should be greater than 6 characters"],
    select: false,
  },
  description: {
    type: String,
  },
  address: {
    type: String, // Sẽ được mã hóa
    required: true,
  },
  phoneNumber: {
    type: String, // Đổi từ Number sang String để lưu dữ liệu đã mã hóa
    required: true,
  },
  role: {
    type: String,
    default: "Seller",
  },
  avatar: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  withdrawMethod: {
    type: Object,
  },
  availableBalance: {
    type: String, // Đổi từ Number sang String để lưu dữ liệu đã mã hóa
    default: "0",
  },
  transections: [
    {
      amount: {
        type: String, // Đổi từ Number sang String để lưu dữ liệu đã mã hóa
        required: true,
      },
      status: {
        type: String,
        default: "Processing",
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
      updatedAt: {
        type: Date,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
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

// Hash password
shopSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  // Mã hóa phoneNumber
  if (this.isModified("phoneNumber") && this.phoneNumber) {
    this.phoneNumber = encryptPhoneNumber(this.phoneNumber);
  }
  
  // Mã hóa address
  if (this.isModified("address") && this.address) {
    this.address = encryptAddress(this.address);
  }
  
  // Mã hóa availableBalance
  if (this.isModified("availableBalance") && this.availableBalance !== undefined) {
    this.availableBalance = encryptAmount(this.availableBalance);
  }
  
  // Mã hóa amount trong transactions
  if (this.isModified("transections") && this.transections) {
    this.transections = this.transections.map(transaction => ({
      ...transaction,
      amount: encryptAmount(transaction.amount)
    }));
  }
  
  next();
});

// jwt token
shopSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// comapre password
shopSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method để giải mã shop data khi trả về
shopSchema.methods.toJSON = function() {
  const shop = this.toObject();
  return decryptShopData(shop);
};

module.exports = mongoose.model("Shop", shopSchema);
