const mongoose = require("mongoose");
const { encryptPrice, encryptAddress, decryptOrderData } = require("../utils/encryption");

const orderSchema = new mongoose.Schema({
  cart: {
    type: Array,
    required: true,
  },
  shippingAddress: {
    type: Object,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
  totalPrice: {
    type: String, // Đổi từ Number sang String để lưu dữ liệu đã mã hóa
    required: true,
  },
  status: {
    type: String,
    default: "Processing",
  },
  paymentInfo: {
    id: {
      type: String,
    },
    status: {
      type: String,
    },
    type: {
      type: String,
    },
  },
  paidAt: {
    type: Date,
    default: Date.now(),
  },
  deliveredAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
    // --- Các trường cho Xác thực ML-DSA ---
    mlDsaPublicKey: {
        type: Buffer, // LƯU KHÓA CÔNG KHAI DƯỚI DẠNG BUFFER
        required: false, // Hoặc true nếu bạn muốn mọi đơn hàng đều phải có xác thực
    },
    mlDsaSignature: {
        type: Buffer, // LƯU CHỮ KÝ DƯỚI DẠNG BUFFER
        required: false, // Hoặc true
    },
    mlDsaAlgorithm: {
        type: String, // Ví dụ: "Dilithium3" - Tên thuật toán ML-DSA được sử dụng
        required: false, // Hoặc true
    },
    isMlDsaVerified: {
        type: Boolean, // Cờ để chỉ ra chữ ký có hợp lệ hay không
        default: false, // Mặc định là false, sẽ được cập nhật sau khi ký/xác minh
    },
});

// Middleware để mã hóa dữ liệu trước khi lưu
orderSchema.pre("save", async function (next) {
    // Mã hóa totalPrice
    if (this.isModified("totalPrice") && this.totalPrice) {
        this.totalPrice = encryptPrice(this.totalPrice);
    }
    
    // Mã hóa shippingAddress.address
    if (this.isModified("shippingAddress") && this.shippingAddress && this.shippingAddress.address) {
        this.shippingAddress.address = encryptAddress(this.shippingAddress.address);
    }
    
    next();
});

// Method để giải mã order data khi trả về
orderSchema.methods.toJSON = function() {
    const order = this.toObject();
    return decryptOrderData(order);
};

module.exports = mongoose.model("Order", orderSchema);
