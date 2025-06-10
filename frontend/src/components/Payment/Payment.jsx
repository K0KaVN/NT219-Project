import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/styles";
import { useSelector } from "react-redux";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";

const Payment = () => {
    console.log('Payment component is loading...');
    const [orderData, setOrderData] = useState({}); // Changed from [] to {}
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();
    
    console.log('User from Redux:', user);
    console.log('OrderData:', orderData);

    // States for Payment PIN
    const [paymentPin, setPaymentPin] = useState('');
    const [hasPinSet, setHasPinSet] = useState(false); // State to check if PIN is set
    const [loading, setLoading] = useState(false); // Loading state for payment processing

    useEffect(() => {
        // Load order data from local storage
        const storedOrderData = localStorage.getItem("latestOrder");
        console.log('Stored order data from localStorage:', storedOrderData);
        
        if (storedOrderData) {
            try {
                const parsedData = JSON.parse(storedOrderData);
                console.log('Parsed order data:', parsedData);
                setOrderData(parsedData);
            } catch (error) {
                console.error('Error parsing order data:', error);
                setOrderData({});
            }
        } else {
            console.log('No order data in localStorage, setting default');
            // Set default data for testing
            const defaultOrderData = {
                cart: [
                    {
                        _id: 'test-1',
                        name: 'Test Product',
                        qty: 1,
                        discountPrice: 100,
                        shopId: 'test-shop'
                    }
                ],
                totalPrice: 110,
                subTotalPrice: 100,
                shipping: 10,
                discountPrice: 0,
                shippingAddress: {
                    address1: 'Test Address 1',
                    address2: 'Test Address 2',
                    zipCode: '12345',
                    country: 'VN',
                    city: 'Ho Chi Minh'
                }
            };
            setOrderData(defaultOrderData);
            localStorage.setItem("latestOrder", JSON.stringify(defaultOrderData));
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
    }, []);

    // Create the order object to be sent to the backend
    const order = {
        cart: orderData?.cart,
        shippingAddress: orderData?.shippingAddress,
        user: user ? { _id: user._id } : null, // Ensure user ID is sent as an object property
        totalPrice: orderData?.totalPrice,
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
            const { data } = await axios.post(
                `${server}/payment/process`, // This is your mock payment processing endpoint
                { amount: Math.round(orderData?.totalPrice * 100) },
                config
            );

            if (data.success) {
                order.paymentInfo = {
                    id: data.payment_id,
                    status: "succeeded",
                    type: "Direct Payment",
                };

                // Send order data including paymentPin to create-order endpoint
                order.paymentPin = paymentPin; // Add the payment pin to the order object

                await axios
                    .post(`${server}/order/create-order`, order, config)
                    .then((res) => {
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

        order.paymentInfo = {
            type: "Cash On Delivery",
        };
        order.paymentPin = paymentPin; // Add the payment pin for COD as well

        try {
            await axios
                .post(`${server}/order/create-order`, order, config)
                .then((res) => {
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
            <div className="w-[90%] 1000px:w-[70%] block 800px:flex">
                <div className="w-full 800px:w-[65%]">
                    <PaymentInfo
                        user={user}
                        directPaymentHandler={directPaymentHandler}
                        cashOnDeliveryHandler={cashOnDeliveryHandler}
                        paymentPin={paymentPin}
                        setPaymentPin={setPaymentPin}
                        hasPinSet={hasPinSet}
                        loading={loading} // Pass loading state to disable buttons
                    />
                </div>
                <div className="w-full 800px:w-[35%] 800px:mt-0 mt-8">
                    <CartData
                        orderData={orderData}
                    />
                </div>
            </div>
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
                                <p className="text-[12px] text-[#00000080] mt-1">
                                    All payments are processed securely. No payment information is stored.
                                </p>
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
                                    disabled={!hasPinSet || loading} // Disable if PIN is not set or loading
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
                            </div>

                            <input
                                type="submit"
                                value={loading ? "Processing..." : "Pay Now"}
                                className={`${styles.button} !bg-[#f63b60] text-[#fff] h-[45px] rounded-[5px] cursor-pointer text-[18px] font-[600] ${(!hasPinSet || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!hasPinSet || loading}
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
                                    disabled={!hasPinSet || loading}
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
                            </div>
                            <input
                                type="submit"
                                value={loading ? "Confirming..." : "Confirm"}
                                className={`${styles.button} !bg-[#f63b60] text-[#fff] h-[45px] rounded-[5px] cursor-pointer text-[18px] font-[600] ${(!hasPinSet || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!hasPinSet || loading}
                            />
                        </form>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const CartData = ({ orderData }) => {
    const shipping = orderData?.shipping?.toFixed(2);
    return (
        <div className="w-full bg-[#fff] rounded-md p-5 pb-8">
            <div className="flex justify-between">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Subtotal:</h3>
                <h5 className="text-[18px] font-[600]">${orderData?.subTotalPrice?.toFixed(2) || '0.00'}</h5>
            </div>
            <br />
            <div className="flex justify-between">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Shipping:</h3>
                <h5 className="text-[18px] font-[600]">${shipping || '0.00'}</h5>
            </div>
            <br />
            <div className="flex justify-between border-b pb-3">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Discount:</h3>
                <h5 className="text-[18px] font-[600]">
                    {orderData?.discountPrice ? "$" + orderData.discountPrice.toFixed(2) : "$0.00"}
                </h5>
            </div>
            <h5 className="text-[18px] font-[600] text-end pt-3">
                ${orderData?.totalPrice?.toFixed(2) || '0.00'}
            </h5>
            <br />
        </div>
    );
};

export default Payment;
