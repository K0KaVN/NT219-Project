const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const User = require("../model/user");
const { decryptAmount } = require("../utils/encryption");
const ErrorHandler = require("../utils/ErrorHandler");

// Import OQS Signature utility
const { verifyOrderSignature } = require('../utils/oqsSignature');

// --- Create New Order (with Payment PIN verification and frontend ML-DSA signature) ---
router.post(
    "/create-order",
    isAuthenticated, // User must be authenticated to create an order
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { cart, shippingAddress, user, paymentInfo, paymentPin, mlDsaSignature, mlDsaPublicKey, mlDsaAlgorithm } = req.body;

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

            // --- ML-DSA Verification Step ---
            if (!mlDsaSignature || !mlDsaPublicKey || !mlDsaAlgorithm) {
                return next(new ErrorHandler("ML-DSA signature, public key, and algorithm are required.", 400));
            }

            // Convert hex strings to Buffers if they're strings
            let signatureBuffer = mlDsaSignature;
            let publicKeyBuffer = mlDsaPublicKey;

            if (typeof mlDsaSignature === 'string') {
                signatureBuffer = Buffer.from(mlDsaSignature, 'hex');
            }
            if (typeof mlDsaPublicKey === 'string') {
                publicKeyBuffer = Buffer.from(mlDsaPublicKey, 'hex');
            }

            // Prepare order data for verification (same as frontend signing)
            const orderDataForVerification = {
                cart: cart,
                shippingAddress: shippingAddress,
                user: user ? { _id: user._id } : null,
                totalPrice: req.body.totalPrice,
            };

            // Verify the frontend-generated signature
            const isSignatureValid = verifyOrderSignature(
                orderDataForVerification,
                signatureBuffer,
                publicKeyBuffer
            );

            if (!isSignatureValid) {
                return next(new ErrorHandler("Invalid ML-DSA signature. Order cannot be processed.", 400));
            }
            // --- End ML-DSA Verification ---

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
                    mlDsaPublicKey: publicKeyBuffer,
                    mlDsaSignature: signatureBuffer,
                    mlDsaAlgorithm: mlDsaAlgorithm,
                    isMlDsaVerified: true, // Mark as verified since we just verified it
                });
                orders.push(order);
            }

            res.status(201).json({
                success: true,
                orders,
                message: "Order created and ML-DSA signature verified successfully!",
            });
        } catch (error) {
            console.error("Error creating order with ML-DSA verification:", error);
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

// Update seller balance when order is delivered
router.put(
    "/update-seller-balance/:orderId",
    isAuthenticated,
    isAdmin,
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { orderId } = req.params;
            
            const order = await Order.findById(orderId);
            if (!order) {
                return next(new ErrorHandler("Order not found", 404));
            }

            // Lấy thông tin totalPrice đã được giải mã tự động
            const orderData = order.toJSON();
            const orderAmount = orderData.totalPrice;

            // Tìm tất cả shops liên quan đến order
            const uniqueShopIds = [...new Set(order.cart.map(item => item.shopId))];

            for (const shopId of uniqueShopIds) {
                // Tính toán amount cho shop này
                const shopItems = order.cart.filter(item => item.shopId === shopId);
                const shopAmount = shopItems.reduce((total, item) => {
                    return total + (item.price * item.qty);
                }, 0);

                // Cập nhật balance của shop
                const shop = await Shop.findById(shopId);
                if (shop) {
                    // Giải mã balance hiện tại
                    const currentBalance = decryptAmount(shop.availableBalance) || 0;
                    const newBalance = currentBalance + shopAmount;

                    // Cập nhật balance (sẽ được mã hóa tự động)
                    shop.availableBalance = newBalance;

                    // Thêm transaction record
                    shop.transections.push({
                        amount: shopAmount, // Sẽ được mã hóa tự động
                        status: "Credit",
                        createdAt: new Date(),
                        orderId: orderId
                    });

                    await shop.save();
                }
            }

            // Cập nhật order status
            order.status = "Delivered";
            order.deliveredAt = new Date();
            await order.save();

            res.status(200).json({
                success: true,
                message: "Seller balances updated successfully",
                order: order.toJSON() // Tự động giải mã khi trả về
            });

        } catch (error) {
            console.error("Error updating seller balance:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

module.exports = router;
