const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const User = require("../model/user"); // Import User model to fetch user details for PIN verification
// Import OQS Signature utility functions
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
        // Simplified address structure
        shippingAddress: {
            address: order.shippingAddress.address || null,
            province: order.shippingAddress.province || null,
            country: order.shippingAddress.country || null,
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

// --- Create New Order ---
router.post(
    "/create-order",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { cart, shippingAddress, user, totalPrice, paymentInfo, paymentPin } = req.body; // Added paymentPin

            // --- Payment PIN Verification Step ---
            // Fetch the user, explicitly selecting the paymentPin field
            const currentUser = await User.findById(user._id).select("+paymentPin");

            if (!currentUser) {
                return next(new ErrorHandler("User not found.", 404));
            }

            if (!currentUser.paymentPin) {
                return next(new ErrorHandler("Payment PIN not set. Please set your PIN first in profile settings.", 400));
            }

            if (!paymentPin) {
                return next(new ErrorHandler("Payment PIN is required for this transaction.", 400));
            }

            const isPinCorrect = await currentUser.comparePaymentPin(paymentPin);

            if (!isPinCorrect) {
                return next(new ErrorHandler("Incorrect payment PIN. Please try again.", 400));
            }
            // --- End Payment PIN Verification ---

            // Group cart items by shopId
            const shopItemsMap = new Map();
            for (const item of cart) {
                const shopId = item.shopId;
                if (!shopItemsMap.has(shopId)) {
                    shopItemsMap.set(shopId, []);
                }
                shopItemsMap.get(shopId).push(item);
            }

            const orders = [];

            // Create an order for each shop
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
                    cart: items.map(item => ({ // Ensure cart items match schema for `productId`
                        productId: item._id || item.productId, // Handle both _id and productId
                        name: item.name,
                        qty: item.qty,
                        price: item.discountPrice || item.price, // Handle both discountPrice and price
                        shopId: item.shopId
                    })),
                    shippingAddress,
                    user: { _id: user._id ? user._id.toString() : user.toString() }, // Store user._id as a string in schema
                    totalPrice: shopTotalPrice, // Use the calculated total price for this shop's order
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
            console.error("Error creating order:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// --- Get All Orders of User ---
router.get(
    "/get-all-orders/:userId",
    catchAsyncErrors(async (req, res, next) => {
        try {
            // Populate 'user' and 'cart.productId' to get full details for verification
            const orders = await Order.find({ "user._id": req.params.userId })
                .populate('user') // Populate the user object (if user is referenced)
                .populate('cart.productId') // Populate product details within the cart
                .sort({ createdAt: -1 });

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
                orders: ordersWithVerificationStatus,
            });
        } catch (error) {
            console.error("Error getting all orders for user:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// --- Get All Orders of Seller ---
router.get(
    "/get-seller-all-orders/:shopId",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const orders = await Order.find({
                "cart.shopId": req.params.shopId,
            })
                .populate('user') // Populate the user object
                .populate('cart.productId') // Populate product details
                .sort({ createdAt: -1 });

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
                orders: ordersWithVerificationStatus,
            });
        } catch (error) {
            console.error("Error getting all orders for seller:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// --- Get Order Details by ID (New Route for specific order lookup and verification) ---
router.get(
    "/get-order-details/:id",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const order = await Order.findById(req.params.id)
                .populate('user') // Populate user details
                .populate('cart.productId'); // Populate product details

            if (!order) {
                return next(new ErrorHandler("Order not found with this id", 404));
            }

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
                // If ML-DSA fields are missing, assume invalid or unverified.
                verificationMessage = "Order does not contain ML-DSA signature information.";
            }

            res.status(200).json({
                success: true,
                order,
                isSignatureValid,
                verificationMessage,
            });
        } catch (error) {
            console.error("Error getting order details:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);


// --- Update Order Status for Seller (including product stock update) ---
router.put(
    "/update-order-status/:id",
    isSeller,
    catchAsyncErrors(async (req, res, next) => {
        try {
            const order = await Order.findById(req.params.id);

            if (!order) {
                return next(new ErrorHandler("Order not found with this id", 400));
            }

            // Check if status is transitioning to 'Transferred to delivery partner'
            if (req.body.status === "Transferred to delivery partner") {
                for (const o of order.cart) { // Iterate over cart items
                    // Use o.productId to reference the actual Product document
                    await updateOrderStock(o.productId, o.qty);
                }
            }

            order.status = req.body.status;

            // Update delivery info and seller balance on 'Delivered' status
            if (req.body.status === "Delivered") {
                order.deliveredAt = Date.now();
                // Ensure paymentInfo exists before accessing its properties
                if (order.paymentInfo) {
                    order.paymentInfo.status = "Succeeded";
                }
                const serviceCharge = order.totalPrice * 0.1; // 10% service charge
                // Use req.seller._id instead of req.seller.id
                await updateSellerInfo(req.seller._id, order.totalPrice - serviceCharge);
            }

            await order.save({ validateBeforeSave: false });

            res.status(200).json({
                success: true,
                order,
            });

            // Function to update product stock
            async function updateOrderStock(productId, qty) {
                const product = await Product.findById(productId);
                if (product) {
                    product.stock -= qty;
                    product.sold_out += qty;
                    await product.save({ validateBeforeSave: false });
                } else {
                    console.warn(`Product with ID ${productId} not found for stock update. This might indicate a data inconsistency.`);
                }
            }

            // Function to update seller's available balance
            async function updateSellerInfo(sellerId, amount) {
                const seller = await Shop.findById(sellerId);
                if (seller) {
                    // Ensure availableBalance is initialized if it's null/undefined
                    seller.availableBalance = (seller.availableBalance || 0) + amount;
                    await seller.save();
                } else {
                    console.warn(`Seller with ID ${sellerId} not found for balance update. This might indicate an authentication issue or data inconsistency.`);
                }
            }
        } catch (error) {
            console.error("Error updating order status:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// --- Give a Refund (User initiates) ---
router.put(
    "/order-refund/:id",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const order = await Order.findById(req.params.id);

            if (!order) {
                return next(new ErrorHandler("Order not found with this id", 400));
            }

            order.status = req.body.status; // E.g., "Processing Refund"

            await order.save({ validateBeforeSave: false });

            res.status(200).json({
                success: true,
                order,
                message: "Order Refund Request successfully!",
            });
        } catch (error) {
            console.error("Error initiating order refund:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// --- Accept the Refund (Seller approves) ---
router.put(
    "/order-refund-success/:id",
    isSeller,
    catchAsyncErrors(async (req, res, next) => {
        try {
            const order = await Order.findById(req.params.id);

            if (!order) {
                return next(new ErrorHandler("Order not found with this id", 400));
            }

            order.status = req.body.status; // E.g., "Refund Success"

            await order.save(); // Save the status change

            if (req.body.status === "Refund Success") {
                for (const o of order.cart) { // Iterate over cart items
                    // Use o.productId to reference the actual Product document
                    await updateOrderStockOnRefund(o.productId, o.qty);
                }
            }

            res.status(200).json({
                success: true,
                message: "Order Refund successful!",
            });

            // Function to update product stock on refund
            async function updateOrderStockOnRefund(productId, qty) {
                const product = await Product.findById(productId);
                if (product) {
                    product.stock += qty; // Add back to stock
                    product.sold_out -= qty; // Decrease sold_out count
                    await product.save({ validateBeforeSave: false });
                } else {
                    console.warn(`Product with ID ${productId} not found for stock update on refund. This might indicate a data inconsistency.`);
                }
            }
        } catch (error) {
            console.error("Error processing order refund success:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// --- All Orders (for Admin) ---
router.get(
    "/admin-all-orders",
    isAuthenticated,
    isAdmin("Admin"),
    catchAsyncErrors(async (req, res, next) => {
        try {
            const orders = await Order.find()
                .populate('user') // Populate user details
                .populate('cart.productId') // Populate product details
                .sort({ deliveredAt: -1, createdAt: -1 });

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
                orders: ordersWithVerificationStatus,
            });
        } catch (error) {
            console.error("Error getting all admin orders:", error);
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

module.exports = router;
