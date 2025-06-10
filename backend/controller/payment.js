const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const User = require("../model/user");

// Import OQS Signature utility
const { signOrderData, verifyOrderSignature, getPublicKey, getAlgorithm } = require('../utils/oqsSignature');

// Helper function to prepare order data for signing/verification consistently
const prepareOrderDataForSignature = (order) => {
    return {
        userId: order.user._id ? order.user._id.toString() : order.user.toString(),
        cart: order.cart.map(item => ({
            productId: item.productId ? item.productId.toString() : (item._id ? item._id.toString() : undefined),
            qty: item.qty,
            price: item.price,
            shopId: item.shopId,
        })).filter(item => item.productId !== undefined),
        totalPrice: order.totalPrice,
        shippingAddress: {
            address: order.shippingAddress.address || null,
            province: order.shippingAddress.province || null,
            country: order.shippingAddress.country || null,
        },
        paymentInfo: {
            id: order.paymentInfo.id || null,
            status: order.paymentInfo.status || null,
            type: order.paymentInfo.type || null,
        },
    };
};

// --- Create New Order (with Payment PIN verification) ---
router.post(
    "/create-order",
    isAuthenticated, // User must be authenticated to create an order
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { cart, shippingAddress, user, paymentInfo, paymentPin } = req.body; // Get paymentPin from request body

            // --- PIN Verification Step ---
            // Fetch the user, explicitly selecting the paymentPin field
            const currentUser = await User.findById(req.user.id).select("+paymentPin");

            if (!currentUser) {
                return next(new ErrorHandler("User not found.", 404));
            }

            if (!currentUser.paymentPin) {
                return next(new ErrorHandler("Payment PIN not set. Please set your PIN first.", 400));
            }

            if (!paymentPin) {
                return next(new ErrorHandler("Payment PIN is required for this transaction.", 400));
            }

            const isPinCorrect = await currentUser.comparePaymentPin(paymentPin);

            if (!isPinCorrect) {
                return next(new ErrorHandler("Incorrect payment PIN. Please try again.", 400));
            }
            // --- End PIN Verification ---

            // Group cart items by shopId (existing logic)
            const shopItemsMap = new Map();
            for (const item of cart) {
                const shopId = item.shopId;
                if (!shopItemsMap.has(shopId)) {
                    shopItemsMap.set(shopId, []);
                }
                shopItemsMap.get(shopId).push(item);
            }

            const orders = [];

            for (const [shopId, items] of shopItemsMap) {
                // Calculate totalPrice for the current shop's items
                // Cart items come from frontend with 'discountPrice' field, not 'price'
                const shopTotalPrice = items.reduce((acc, item) => {
                    const price = item.discountPrice || item.price || 0; // Handle both discountPrice and price
                    const qty = item.qty || 1;
                    return acc + (qty * price);
                }, 0);

                // Validate that we have a valid shopTotalPrice
                if (isNaN(shopTotalPrice) || shopTotalPrice <= 0) {
                    return next(new ErrorHandler(`Invalid total price calculation for shop ${shopId}. Please check cart items.`, 400));
                }

                // Prepare data for ML-DSA signature
                const orderDataForSignature = prepareOrderDataForSignature({
                    user: { _id: user._id ? user._id.toString() : user.toString() },
                    cart: items,
                    totalPrice: shopTotalPrice,
                    shippingAddress: shippingAddress,
                    paymentInfo: paymentInfo,
                });

                // Generate ML-DSA signature
                const signature = signOrderData(orderDataForSignature);
                const publicKey = getPublicKey();
                const algorithm = getAlgorithm();

                if (!signature || !publicKey || !algorithm) {
                    return next(new ErrorHandler("Failed to generate OQS signature or retrieve keys.", 500));
                }

                const order = await Order.create({
                    cart: items.map(item => ({
                        productId: item._id || item.productId, // Handle both _id and productId
                        name: item.name,
                        qty: item.qty,
                        price: item.discountPrice || item.price, // Handle both discountPrice and price
                        shopId: item.shopId
                    })),
                    shippingAddress,
                    user: { _id: user._id ? user._id.toString() : user.toString() },
                    totalPrice: shopTotalPrice,
                    paymentInfo,
                    mlDsaPublicKey: publicKey,
                    mlDsaSignature: signature,
                    mlDsaAlgorithm: algorithm,
                    isMlDsaVerified: true,
                });
                orders.push(order);
            }

            res.status(201).json({
                success: true,
                orders,
                message: "Order created and payment PIN verified successfully!",
            });
        } catch (error) {
            console.error("Error creating order with PIN verification:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

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
