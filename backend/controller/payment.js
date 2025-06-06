const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

// Direct payment process
router.post(
  "/process",
  catchAsyncErrors(async (req, res, next) => {
    // Since we're removing third-party payment gateways, we'll always return success
    res.status(200).json({
      success: true,
      payment_id: "direct_" + Math.random().toString(36).substring(2, 15),
    });
  })
);

// No longer need API keys for payment
router.get(
  "/payment-methods",
  catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({ 
      success: true,
      methods: ["direct"] 
    });
  })
);

module.exports = router;
