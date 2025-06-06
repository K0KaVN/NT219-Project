import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/styles";
import { useSelector } from "react-redux";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { RxCross1 } from "react-icons/rx";


const Payment = () => {
    const [orderData, setOrderData] = useState([]);
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();

    useEffect(() => {
        const orderData = JSON.parse(localStorage.getItem("latestOrder"));
        setOrderData(orderData);
    }, []);

    const order = {
        cart: orderData?.cart,
        shippingAddress: orderData?.shippingAddress,
        user: user && user,
        totalPrice: orderData?.totalPrice,
    };

    // Direct payment handler - all payments are processed directly without third-party
    const directPaymentHandler = async (e) => {
        e.preventDefault();

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        try {
            // Simple payment process - always succeeds
            const { data } = await axios.post(
                `${server}/payment/process`,
                { amount: Math.round(orderData?.totalPrice * 100) },
                config
            );

            if (data.success) {
                order.paymentInfo = {
                    id: data.payment_id,
                    status: "succeeded",
                    type: "Direct Payment",
                };

                await axios
                    .post(`${server}/order/create-order`, order, config)
                    .then((res) => {
                        navigate("/order/success");
                        toast.success("Payment successful!");
                        localStorage.setItem("cartItems", JSON.stringify([]));
                        localStorage.setItem("latestOrder", JSON.stringify([]));
                        window.location.reload();
                    });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Payment failed");
        }
    };

    //  Cash on Delivery Handler (COD)
    const cashOnDeliveryHandler = async (e) => {
        e.preventDefault();

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        order.paymentInfo = {
            type: "Cash On Delivery",
        };

        await axios
            .post(`${server}/order/create-order`, order, config)
            .then((res) => {
                navigate("/order/success");
                toast.success("Order successful!");
                localStorage.setItem("cartItems", JSON.stringify([]));
                localStorage.setItem("latestOrder", JSON.stringify([]));
                window.location.reload();
            });
    }
    return (
        <div className="w-full flex flex-col items-center py-8">
            <div className="w-[90%] 1000px:w-[70%] block 800px:flex">
                <div className="w-full 800px:w-[65%]">
                    <PaymentInfo
                        user={user}
                        directPaymentHandler={directPaymentHandler}
                        cashOnDeliveryHandler={cashOnDeliveryHandler}
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
}) => {
    const [select, setSelect] = useState(1);

    return (
        <div className="w-full 800px:w-[95%] bg-[#fff] rounded-md p-5 pb-8">
            {/* select buttons */}
            <div>
                <div className="flex w-full pb-5 border-b mb-2">
                    <div
                        className="w-[25px] h-[25px] rounded-full bg-transparent border-[3px] border-[#1d1a1ab4] relative flex items-center justify-center"
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

                {/* Direct payment */}
                {select === 1 ? (
                    <div className="w-full flex border-b">
                        <form className="w-full" onSubmit={directPaymentHandler}>
                            <div className="w-full flex pb-3">
                                <div className="w-[50%]">
                                    <label className="block pb-2">Full Name</label>
                                    <input
                                        required
                                        value={user && user.name}
                                        className={`${styles.input} !w-[95%]`}
                                        readOnly
                                    />
                                </div>
                                <div className="w-[50%]">
                                    <label className="block pb-2">Email</label>
                                    <input
                                        required
                                        value={user && user.email}
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
                            <input
                                type="submit"
                                value="Pay Now"
                                className={`${styles.button} !bg-[#f63b60] text-[#fff] h-[45px] rounded-[5px] cursor-pointer text-[18px] font-[600]`}
                            />
                        </form>
                    </div>
                ) : null}
            </div>

            <br />
            {/* cash on delivery */}
            <div>
                <div className="flex w-full pb-5 border-b mb-2">
                    <div
                        className="w-[25px] h-[25px] rounded-full bg-transparent border-[3px] border-[#1d1a1ab4] relative flex items-center justify-center"
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

                {/* cash on delivery */}
                {select === 2 ? (
                    <div className="w-full flex">
                        <form className="w-full" onSubmit={cashOnDeliveryHandler}>
                            <div className="w-full pb-3">
                                <p className="text-[14px] text-[#00000080]">
                                    Pay with cash when your order is delivered.
                                </p>
                            </div>
                            <input
                                type="submit"
                                value="Confirm"
                                className={`${styles.button} !bg-[#f63b60] text-[#fff] h-[45px] rounded-[5px] cursor-pointer text-[18px] font-[600]`}
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
                <h3 className="text-[16px] font-[400] text-[#000000a4]">subtotal:</h3>
                <h5 className="text-[18px] font-[600]">${orderData?.subTotalPrice}</h5>
            </div>
            <br />
            <div className="flex justify-between">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">shipping:</h3>
                <h5 className="text-[18px] font-[600]">${shipping}</h5>
            </div>
            <br />
            <div className="flex justify-between border-b pb-3">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Discount:</h3>
                <h5 className="text-[18px] font-[600]">{orderData?.discountPrice ? "$" + orderData.discountPrice : "-"}
                </h5>
            </div>
            <h5 className="text-[18px] font-[600] text-end pt-3">
                ${orderData?.totalPrice}
            </h5>
            <br />

        </div>
    );
};

export default Payment;