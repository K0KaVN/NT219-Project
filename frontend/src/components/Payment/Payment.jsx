import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/styles";
import { useSelector } from "react-redux";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import mldsaHandler from "../../utils/mldsaHandler";

const Payment = () => {
    const [orderData, setOrderData] = useState({});
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();

    // States for Payment PIN
    const [paymentPin, setPaymentPin] = useState('');
    const [hasPinSet, setHasPinSet] = useState(false); // State to check if PIN is set
    const [loading, setLoading] = useState(false); // Loading state for payment processing
    
    // States for ML-DSA
    const [mldsaKeyPair, setMldsaKeyPair] = useState(null);
    const [generatingKeys, setGeneratingKeys] = useState(false);

    useEffect(() => {
        // Load order data from local storage
        const storedOrderData = localStorage.getItem("latestOrder");
        
        if (storedOrderData && storedOrderData !== "null" && storedOrderData !== "undefined") {
            try {
                const parsedData = JSON.parse(storedOrderData);
                // Validate parsed data
                if (parsedData && typeof parsedData === 'object' && parsedData.cart) {
                    setOrderData(parsedData);
                } else {
                    console.warn('Invalid order data in localStorage');
                    setOrderData({});
                    toast.error('No valid order data found. Please go back to checkout.');
                    navigate('/checkout');
                }
            } catch (error) {
                console.error('Error parsing order data:', error);
                setOrderData({});
                toast.error('Error loading order data. Please go back to checkout.');
                navigate('/checkout');
            }
        } else {
            setOrderData({});
            toast.error('No order data found. Please go back to checkout.');
            navigate('/checkout');
        }

        // Check user's PIN setup status
        const checkPinStatus = async () => {
            try {
                const response = await axios.get(`${server}/user/has-payment-pin`, { withCredentials: true });
                setHasPinSet(response.data.hasPin);
            } catch (error) {
                console.error('Error checking PIN status:', error);
                toast.error('Failed to check PIN status. Please try again later.');
            }
        };
        checkPinStatus();

        // Generate ML-DSA key pair for order signing
        const generateMLDSAKeys = async () => {
            setGeneratingKeys(true);
            try {
                const keyPair = await mldsaHandler.generateKeyPair();
                console.log('Generated ML-DSA key pair:', {
                    hasPublicKey: !!keyPair.publicKey,
                    hasPrivateKey: !!keyPair.privateKey,
                    publicKeyLength: keyPair.publicKey ? keyPair.publicKey.length : 0,
                    privateKeyLength: keyPair.privateKey ? keyPair.privateKey.length : 0
                });
                setMldsaKeyPair(keyPair);
                console.log('ML-DSA key pair generated successfully');
            } catch (error) {
                console.error('Error generating ML-DSA keys:', error);
                toast.error('Failed to generate cryptographic keys. Please refresh the page.');
            } finally {
                setGeneratingKeys(false);
            }
        };
        generateMLDSAKeys();
    }, []);

    // Check if user is authenticated
    useEffect(() => {
        if (!user) {
            toast.error('Please login to access payment page.');
            navigate('/login');
        }
    }, [user, navigate]);

    // Helper function to create order object with ML-DSA signature
    const createOrderObjectWithSignature = async () => {
        // Validate orderData before creating order
        if (!orderData || !orderData.cart || !orderData.shippingAddress) {
            toast.error('Order data is missing. Please go back to checkout.');
            navigate('/checkout');
            return null;
        }

        if (!mldsaKeyPair) {
            toast.error('Cryptographic keys not ready. Please wait or refresh the page.');
            return null;
        }

        const orderObj = {
            cart: orderData.cart,
            shippingAddress: orderData.shippingAddress,
            user: user ? { _id: user._id } : null,
            totalPrice: orderData.totalPrice,
        };

        try {
            // Sign the order data
            const signature = await mldsaHandler.signOrderData(orderObj, mldsaKeyPair.privateKey);
            
            console.log('Generated signature:', signature ? signature.substring(0, 50) + '...' : 'null');
            console.log('Public key:', mldsaKeyPair.publicKey ? mldsaKeyPair.publicKey.substring(0, 50) + '...' : 'null');
            console.log('Signature length:', signature ? signature.length : 'null');
            console.log('Public key length:', mldsaKeyPair.publicKey ? mldsaKeyPair.publicKey.length : 'null');
            
            // Add ML-DSA fields to order
            orderObj.mlDsaSignature = signature;
            orderObj.mlDsaPublicKey = mldsaKeyPair.publicKey;
            orderObj.mlDsaAlgorithm = mldsaHandler.algorithm;
            
            return orderObj;
        } catch (error) {
            console.error('Error signing order:', error);
            toast.error('Failed to sign order. Please try again.');
            return null;
        }
    };

    // Helper function for PIN validation
    const validatePin = (pin) => {
        if (!hasPinSet) {
            toast.error('Please set up your payment PIN in profile settings before proceeding to payment.');
            return false;
        }
        if (!pin) {
            toast.error('Payment PIN is required for this transaction.');
            return false;
        }
        if (!/^\d{6}$/.test(pin)) {
            toast.error('Payment PIN must be a 6-digit number.');
            return false;
        }
        return true;
    };

    // Helper function to save order verification information
    const saveOrderVerificationInfo = async (orderData, createdOrders) => {
        try {
            if (!mldsaKeyPair) return;

            const verificationInfo = mldsaHandler.generateOrderVerificationInfo(
                orderData,
                orderData.mlDsaSignature,
                orderData.mlDsaPublicKey
            );

            // Add created order IDs
            verificationInfo.orderIds = createdOrders.map(order => order._id);
            verificationInfo.orderCount = createdOrders.length;

            // Save to localStorage for user reference
            const existingVerifications = JSON.parse(localStorage.getItem('orderVerifications') || '[]');
            existingVerifications.push(verificationInfo);
            localStorage.setItem('orderVerifications', JSON.stringify(existingVerifications));

            // Create downloadable JSON file
            const blob = new Blob([JSON.stringify(verificationInfo, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `order-verification-${Date.now()}.json`;
            
            // Auto-download the verification file
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('Order verification info saved:', verificationInfo);
        } catch (error) {
            console.error('Error saving verification info:', error);
        }
    };

    // Direct payment handler - all payments are processed directly without third-party
    const directPaymentHandler = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!validatePin(paymentPin)) {
            setLoading(false);
            return;
        }

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
            withCredentials: true, // Important for sending cookies
        };

        try {
            // Simple payment process - always succeeds (for demo purposes)
            const totalPrice = orderData?.totalPrice || 0;
            const { data } = await axios.post(
                `${server}/payment/process`, // This is your mock payment processing endpoint
                { amount: Math.round(Number(totalPrice) * 100) },
                config
            );

            if (data.success) {
                const order = await createOrderObjectWithSignature();
                if (!order) {
                    setLoading(false);
                    return;
                }
                
                order.paymentInfo = {
                    id: data.payment_id,
                    status: "succeeded",
                    type: "Direct Payment",
                };

                // Send order data including paymentPin to create-order endpoint
                order.paymentPin = paymentPin; // Add the payment pin to the order object

                await axios
                    .post(`${server}/order/create-order`, order, config)
                    .then(async (res) => {
                        // Save order verification info
                        await saveOrderVerificationInfo(order, res.data.orders);
                        
                        navigate("/order/success");
                        toast.success("Payment successful!");
                        localStorage.setItem("cartItems", JSON.stringify([])); // Clear cart
                        localStorage.setItem("latestOrder", JSON.stringify([])); // Clear latest order
                        window.location.reload(); // Reload to reflect changes
                    });
            } else {
                toast.error(data.message || "Payment processing failed.");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Payment failed");
            console.error("Direct payment error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Cash on Delivery Handler (COD)
    const cashOnDeliveryHandler = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!validatePin(paymentPin)) {
            setLoading(false);
            return;
        }

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
            withCredentials: true,
        };

        const order = await createOrderObjectWithSignature();
        if (!order) {
            setLoading(false);
            return;
        }
        
        order.paymentInfo = {
            type: "Cash On Delivery",
        };
        order.paymentPin = paymentPin; // Add the payment pin for COD as well

        try {
            await axios
                .post(`${server}/order/create-order`, order, config)
                .then(async (res) => {
                    // Save order verification info
                    await saveOrderVerificationInfo(order, res.data.orders);
                    
                    navigate("/order/success");
                    toast.success("Order successful!");
                    localStorage.setItem("cartItems", JSON.stringify([]));
                    localStorage.setItem("latestOrder", JSON.stringify([]));
                    window.location.reload();
                });
        } catch (error) {
            toast.error(error.response?.data?.message || "Order creation failed.");
            console.error("Cash on Delivery error:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full flex flex-col items-center py-8">
            {/* Show loading state while checking order data */}
            {Object.keys(orderData).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-600">Loading payment information...</p>
                </div>
            ) : (
                <div className="w-[90%] 1000px:w-[70%] block 800px:flex">
                    <div className="w-full 800px:w-[65%]">
                        {/* ML-DSA Key Generation Status */}
                        <div className="me-11 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                🔐 Cryptographic Security Status
                            </h3>
                            {generatingKeys ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                    <span className="text-blue-700">Generating ML-DSA keys for secure order signing...</span>
                                </div>
                            ) : mldsaKeyPair ? (
                                <div className="flex items-center">
                                    <span className="text-green-600 mr-2">✅</span>
                                    <span className="text-green-700">ML-DSA keys ready. Your orders will be cryptographically signed.</span>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <span className="text-red-600 mr-2">❌</span>
                                    <span className="text-red-700">Failed to generate keys. Please refresh the page.</span>
                                </div>
                            )}
                            <p className="text-sm text-blue-600 mt-1">
                                This ensures order integrity and authenticity using post-quantum cryptography.
                            </p>
                        </div>

                        <PaymentInfo
                            user={user}
                            directPaymentHandler={directPaymentHandler}
                            cashOnDeliveryHandler={cashOnDeliveryHandler}
                            paymentPin={paymentPin}
                            setPaymentPin={setPaymentPin}
                            hasPinSet={hasPinSet}
                            loading={loading || generatingKeys || !mldsaKeyPair} // Disable if still generating keys
                            mldsaReady={mldsaKeyPair && !generatingKeys}
                        />
                    </div>
                    <div className="w-full 800px:w-[35%] 800px:mt-0 mt-8">
                        <CartData
                            orderData={orderData}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const PaymentInfo = ({
    user,
    directPaymentHandler,
    cashOnDeliveryHandler,
    paymentPin,
    setPaymentPin,
    hasPinSet,
    loading,
    mldsaReady,
}) => {
    const [select, setSelect] = useState(1);
    const navigate = useNavigate(); // For navigating to profile settings

    return (
        <div className="w-full 800px:w-[95%] bg-[#fff] rounded-md p-5 pb-8">
            {/* Payment Method Selection */}
            <div>
                {/* Direct Payment Option */}
                <div className="flex w-full pb-5 border-b mb-2">
                    <div
                        className="w-[25px] h-[25px] rounded-full bg-transparent border-[3px] border-[#1d1a1ab4] relative flex items-center justify-center cursor-pointer"
                        onClick={() => setSelect(1)}
                    >
                        {select === 1 ? (
                            <div className="w-[13px] h-[13px] bg-[#1d1a1acb] rounded-full" />
                        ) : null}
                    </div>
                    <h4 className="text-[18px] pl-2 font-[600] text-[#000000b1]">
                        Direct Payment
                    </h4>
                </div>

                {/* Direct Payment Form (visible if selected) */}
                {select === 1 ? (
                    <div className="w-full flex border-b">
                        <form className="w-full" onSubmit={directPaymentHandler}>
                            <div className="w-full flex pb-3">
                                <div className="w-[50%]">
                                    <label className="block pb-2">Full Name</label>
                                    <input
                                        required
                                        value={user ? user.name : ""}
                                        className={`${styles.input} !w-[95%]`}
                                        readOnly
                                    />
                                </div>
                                <div className="w-[50%]">
                                    <label className="block pb-2">Email</label>
                                    <input
                                        required
                                        value={user ? user.email : ""}
                                        className={`${styles.input} !w-[95%]`}
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div className="w-full pb-3">
                                <label className="block pb-2">Payment Method</label>
                                <input
                                    required
                                    value="Direct Payment (Credit/Debit Card)"
                                    className={`${styles.input} !w-[100%]`}
                                    readOnly
                                />
                            </div>

                            {/* Payment PIN Input */}
                            <div>
                                <label htmlFor="paymentPin" className="block pb-2">
                                    Enter Your Payment PIN
                                </label>
                                <input
                                    type="password"
                                    id="paymentPin"
                                    value={paymentPin}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (/^\d*$/.test(value) && value.length <= 6) {
                                            setPaymentPin(value);
                                        }
                                    }}
                                    required
                                    maxLength="6"
                                    className={`${styles.input} !w-[100%]`}
                                    disabled={!hasPinSet || loading || !mldsaReady} // Disable if PIN is not set, loading, or ML-DSA not ready
                                />
                                {!hasPinSet && (
                                    <p className="mt-2 text-sm text-red-600">
                                        You have not set up a payment PIN. Please go to{' '}
                                        <span
                                            className="font-medium text-blue-600 cursor-pointer hover:underline"
                                            onClick={() => navigate('/profile?tab=security')}
                                        >
                                            Profile Settings
                                        </span>{' '}to set it up.
                                    </p>
                                )}
                                {!mldsaReady && hasPinSet && (
                                    <p className="mt-2 text-sm text-orange-600">
                                        Waiting for cryptographic keys to be generated...
                                    </p>
                                )}
                            </div>

                            <input
                                type="submit"
                                value={loading ? "Processing..." : "Pay Now"}
                                className={`${styles.button} !bg-[#f63b60] text-[#fff] h-[45px] rounded-[5px] cursor-pointer text-[18px] font-[600] ${(!hasPinSet || loading || !mldsaReady) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!hasPinSet || loading || !mldsaReady}
                            />
                        </form>
                    </div>
                ) : null}
            </div>

            <br />
            {/* Cash on Delivery Option */}
            <div>
                <div className="flex w-full pb-5 border-b mb-2">
                    <div
                        className="w-[25px] h-[25px] rounded-full bg-transparent border-[3px] border-[#1d1a1ab4] relative flex items-center justify-center cursor-pointer"
                        onClick={() => setSelect(2)}
                    >
                        {select === 2 ? (
                            <div className="w-[13px] h-[13px] bg-[#1d1a1acb] rounded-full" />
                        ) : null}
                    </div>
                    <h4 className="text-[18px] pl-2 font-[600] text-[#000000b1]">
                        Cash on Delivery
                    </h4>
                </div>

                {/* Cash on Delivery Form (visible if selected) */}
                {select === 2 ? (
                    <div className="w-full flex">
                        <form className="w-full" onSubmit={cashOnDeliveryHandler}>
                            <div className="w-full pb-3">
                                <p className="text-[14px] text-[#00000080]">
                                    Pay with cash when your order is delivered.
                                </p>
                            </div>
                            {/* Payment PIN Input for COD */}
                            <div>
                                <label htmlFor="paymentPinCOD" className="block pb-2">
                                    Enter Your Payment PIN
                                </label>
                                <input
                                    type="password"
                                    id="paymentPinCOD"
                                    value={paymentPin}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (/^\d*$/.test(value) && value.length <= 6) {
                                            setPaymentPin(value);
                                        }
                                    }}
                                    required
                                    maxLength="6"
                                    className={`${styles.input} !w-[100%]`}
                                    disabled={!hasPinSet || loading || !mldsaReady}
                                />
                                {!hasPinSet && (
                                    <p className="mt-2 text-sm text-red-600">
                                        You have not set up a payment PIN. Please go to{' '}
                                        <span
                                            className="font-medium text-blue-600 cursor-pointer hover:underline"
                                            onClick={() => navigate('/profile?tab=security')}
                                        >
                                            Profile Settings
                                        </span>{' '}to set it up.
                                    </p>
                                )}
                                {!mldsaReady && hasPinSet && (
                                    <p className="mt-2 text-sm text-orange-600">
                                        Waiting for cryptographic keys to be generated...
                                    </p>
                                )}
                            </div>
                            <input
                                type="submit"
                                value={loading ? "Confirming..." : "Confirm"}
                                className={`${styles.button} !bg-[#f63b60] text-[#fff] h-[45px] rounded-[5px] cursor-pointer text-[18px] font-[600] ${(!hasPinSet || loading || !mldsaReady) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!hasPinSet || loading || !mldsaReady}
                            />
                        </form>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const CartData = ({ orderData }) => {
    // Helper function to safely format price
    const formatPrice = (value) => {
        if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
            return '0.00';
        }
        const numericValue = Number(value);
        if (!isFinite(numericValue)) {
            return '0.00';
        }
        return numericValue.toFixed(2);
    };
    
    return (
        <div className="w-full bg-[#fff] rounded-md p-5 pb-8">
            <div className="flex justify-between">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Subtotal:</h3>
                <h5 className="text-[18px] font-[600]">
                    ${formatPrice(orderData?.subTotalPrice)}
                </h5>
            </div>
            <br />
            <div className="flex justify-between">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Shipping:</h3>
                <h5 className="text-[18px] font-[600]">${formatPrice(orderData?.shipping)}</h5>
            </div>
            <br />
            <div className="flex justify-between border-b pb-3">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Discount:</h3>
                <h5 className="text-[18px] font-[600]">
                    ${formatPrice(orderData?.discountPrice)}
                </h5>
            </div>
            <h5 className="text-[18px] font-[600] text-end pt-3">
                ${formatPrice(orderData?.totalPrice)}
            </h5>
            <br />
        </div>
    );
};

export default Payment;
