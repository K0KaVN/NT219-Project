const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
// Import OQS Signature utility
const { signOrderData, verifyOrderSignature, getPublicKey, getAlgorithm } = require('../utils/oqsSignature');

// --- Helper function to prepare order data for signing/verification consistently ---
// This function is CRUCIAL for ML-DSA. The data used for signing MUST EXACTLY match
// the data used for verification, byte for byte.
const prepareOrderDataForSignature = (order) => {
    // Normalize fields: Convert ObjectIds to strings to ensure consistent representation
    // as JSON.stringify might output different string representations if not handled.
    // Only include fields that are essential for the integrity of the order and
    // will be consistently available at both signing and verification time.
    return {
        // User ID is part of the core identity of the order
        userId: order.user._id ? order.user._id.toString() : order.user.toString(), // Handle both populated and non-populated user objects

        // Cart items: Only include critical fields like productId, quantity, price, and shopId
        // Do NOT include 'name' or other display-only fields unless they are part of the core integrity
        cart: order.cart.map(item => ({
            // Use item.productId if populated, otherwise use item._id (if it's a direct reference)
            // Ensure it's converted to a string for consistent hashing
            productId: item.productId ? item.productId.toString() : (item._id ? item._id.toString() : undefined),
            qty: item.qty,
            price: item.price,
            shopId: item.shopId,
        })).filter(item => item.productId !== undefined), // Filter out items if productId is somehow missing

        totalPrice: order.totalPrice,

        // Shipping address: Include all fields that are critical for the order
        // Assuming shippingAddress is an object and its structure is consistent
        shippingAddress: {
            address1: order.shippingAddress.address1 || null,
            address2: order.shippingAddress.address2 || null,
            zipCode: order.shippingAddress.zipCode || null,
            country: order.shippingAddress.country || null,
            city: order.shippingAddress.city || null,
            // Add any other specific fields from shippingAddress you want to include
        },

        // Payment info: Include critical payment-related fields for order integrity
        paymentInfo: {
            id: order.paymentInfo.id || null,
            status: order.paymentInfo.status || null,
            type: order.paymentInfo.type || null,
        },
        // Do NOT include dynamic fields like 'status', 'paidAt', 'deliveredAt', 'createdAt',
        // or the ML-DSA specific fields themselves ('mlDsaPublicKey', 'mlDsaSignature', 'mlDsaAlgorithm', 'isMlDsaVerified')
        // as these change after initial creation or are part of the signature process.
    };
};

// create new order
router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { cart, shippingAddress, user, totalPrice, paymentInfo } = req.body;

      //   group cart items by shopId
      const shopItemsMap = new Map();

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);
      }

      // create an order for each shop
      const orders = [];

      for (const [shopId, items] of shopItemsMap) {
            // Prepare data for ML-DSA signature
            // Ensure 'user' object for signature includes '_id' as a string to match schema and verification
            const orderDataForSignature = prepareOrderDataForSignature({
                user: { _id: user._id ? user._id.toString() : user.toString() }, // Ensure user._id is a string here
                cart: items,
                totalPrice: shopTotalPrice,
                shippingAddress: shippingAddress,
                paymentInfo: paymentInfo,
            });

            // Generate ML-DSA signature using the prepared data
            const signature = signOrderData(orderDataForSignature);
            const publicKey = getPublicKey();
            const algorithm = getAlgorithm();

            if (!signature || !publicKey || !algorithm) {
                return next(new ErrorHandler("Failed to generate OQS signature or retrieve keys. OQS module might not be initialized correctly.", 500));
            }

        const order = await Order.create({
            cart: items,
            shippingAddress,
            user,
            totalPrice,
            paymentInfo,
            mlDsaPublicKey: publicKey, // Store the public key (Buffer)
            mlDsaSignature: signature, // Store the signature (Buffer)
            mlDsaAlgorithm: algorithm, // Store the algorithm name (e.g., "Dilithium3")
            isMlDsaVerified: true, // Mark as verified since it's signed by our server at creation
        });
        orders.push(order);
      }

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of user
router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

        const ordersWithVerificationStatus = orders.map(order => {
            let isSignatureValid = false;
            let verificationMessage = "ML-DSA info missing.";

            if (order.mlDsaPublicKey && order.mlDsaSignature && order.mlDsaAlgorithm) {
                try {
                    // Re-prepare the order data exactly as it was signed
                    const orderDataForVerification = prepareOrderDataForSignature(order);

                    isSignatureValid = verifyOrderSignature(
                        orderDataForVerification,
                        order.mlDsaSignature,
                        order.mlDsaPublicKey
                    );
                    verificationMessage = isSignatureValid ? "ML-DSA signature is valid." : "ML-DSA signature is invalid.";

                    // Update verification status in DB if it has changed (non-blocking)
                    if (order.isMlDsaVerified !== isSignatureValid) {
                        order.isMlDsaVerified = isSignatureValid;
                        order.save({ validateBeforeSave: false }).catch(saveErr => console.error("Error updating order verification status:", saveErr));
                    }
                } catch (verifyError) {
                    console.error(`Error verifying signature for order ${order._id}:`, verifyError);
                    isSignatureValid = false;
                    verificationMessage = `Verification error: ${verifyError.message}`;
                }
            } else {
                verificationMessage = "Order does not contain ML-DSA signature information.";
            }
            return { ...order.toObject(), isSignatureValid, verificationMessage };
        });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

        const ordersWithVerificationStatus = orders.map(order => {
            let isSignatureValid = false;
            let verificationMessage = "ML-DSA info missing.";

            if (order.mlDsaPublicKey && order.mlDsaSignature && order.mlDsaAlgorithm) {
                try {
                    const orderDataForVerification = prepareOrderDataForSignature(order);

                    isSignatureValid = verifyOrderSignature(
                        orderDataForVerification,
                        order.mlDsaSignature,
                        order.mlDsaPublicKey
                    );
                    verificationMessage = isSignatureValid ? "ML-DSA signature is valid." : "ML-DSA signature is invalid.";

                    if (order.isMlDsaVerified !== isSignatureValid) {
                        order.isMlDsaVerified = isSignatureValid;
                        order.save({ validateBeforeSave: false }).catch(saveErr => console.error("Error updating order verification status:", saveErr));
                    }
                } catch (verifyError) {
                    console.error(`Error verifying signature for order ${order._id}:`, verifyError);
                    isSignatureValid = false;
                    verificationMessage = `Verification error: ${verifyError.message}`;
                }
            } else {
                verificationMessage = "Order does not contain ML-DSA signature information.";
            }
            return { ...order.toObject(), isSignatureValid, verificationMessage };
        });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller    ---------------(product)
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }
      if (req.body.status === "Transferred to delivery partner") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      order.status = req.body.status;

      if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";
        const serviceCharge = order.totalPrice * 0.1;
        await updateSellerInfo(order.totalPrice - serviceCharge);
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
      });

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock -= qty;
        product.sold_out += qty;

        await product.save({ validateBeforeSave: false });
      }

      async function updateSellerInfo(amount) {
        const seller = await Shop.findById(req.seller.id);

        seller.availableBalance = amount;

        await seller.save();
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// give a refund ----- user
router.put(
  "/order-refund/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Order Refund Request successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// accept the refund ---- seller
router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save();

      res.status(200).json({
        success: true,
        message: "Order Refund successfull!",
      });

      if (req.body.status === "Refund Success") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock += qty;
        product.sold_out -= qty;

        await product.save({ validateBeforeSave: false });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all orders --- for admin
router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });

        const ordersWithVerificationStatus = orders.map(order => {
            let isSignatureValid = false;
            let verificationMessage = "ML-DSA info missing.";

            if (order.mlDsaPublicKey && order.mlDsaSignature && order.mlDsaAlgorithm) {
                try {
                    const orderDataForVerification = prepareOrderDataForSignature(order);

                    isSignatureValid = verifyOrderSignature(
                        orderDataForVerification,
                        order.mlDsaSignature,
                        order.mlDsaPublicKey
                    );
                    verificationMessage = isSignatureValid ? "ML-DSA signature is valid." : "ML-DSA signature is invalid.";

                    if (order.isMlDsaVerified !== isSignatureValid) {
                        order.isMlDsaVerified = isSignatureValid;
                        order.save({ validateBeforeSave: false }).catch(saveErr => console.error("Error updating order verification status:", saveErr));
                    }
                } catch (verifyError) {
                    console.error(`Error verifying signature for order ${order._id}:`, verifyError);
                    isSignatureValid = false;
                    verificationMessage = `Verification error: ${verifyError.message}`;
                }
            } else {
                verificationMessage = "Order does not contain ML-DSA signature information.";
            }
            return { ...order.toObject(), isSignatureValid, verificationMessage };
        });

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
