const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const coupounCodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your coupoun code name!"],
    unique: true,
  },
  value: {
    type: Number,
    required: true,
  },
  minAmount: {
    type: Number,
  },
  maxAmount: {
    type: Number,
  },
  shopId: {
    type: String,
    required: true,
  },
  selectedProduct: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// Hash coupon name trước khi lưu
coupounCodeSchema.pre("save", async function (next) {
    if (this.isModified("name") && this.name) {
        this.name = await bcrypt.hash(this.name, 10);
    }
    next();
});

// Method để so sánh coupon name
coupounCodeSchema.methods.compareName = async function (enteredName) {
    return await bcrypt.compare(enteredName, this.name);
};

module.exports = mongoose.model("CoupounCode", coupounCodeSchema);
