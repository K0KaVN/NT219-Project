const mongoose = require("mongoose");
const { encryptAmount, decryptWithdrawData } = require("../utils/encryption");

const withdrawSchema = new mongoose.Schema({
  seller: {
    type: Object,
    required: true,
  },
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
});

// Middleware để mã hóa amount trước khi lưu
withdrawSchema.pre("save", async function (next) {
    if (this.isModified("amount") && this.amount) {
        this.amount = encryptAmount(this.amount);
    }
    next();
});

// Method để giải mã withdraw data khi trả về
withdrawSchema.methods.toJSON = function() {
    const withdraw = this.toObject();
    return decryptWithdrawData(withdraw);
};

module.exports = mongoose.model("Withdraw", withdrawSchema);
