const mongoose = require("mongoose");

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
    type: Number,
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

module.exports = mongoose.model("Order", orderSchema);
