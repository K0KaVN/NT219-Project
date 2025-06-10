import React, { useState } from "react";
import styles from "../../styles/styles";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { vietnameseProvinces } from "../../utils/vietnameseProvinces";

const Checkout = () => {
    const { user } = useSelector((state) => state.user);
    const { cart } = useSelector((state) => state.cart);
    const [province, setProvince] = useState("");
    const [userInfo, setUserInfo] = useState(false); // State to toggle saved address display
    const [address, setAddress] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [couponCodeData, setCouponCodeData] = useState(null);
    const [discountPrice, setDiscountPrice] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0); // Scroll to top on component mount
    }, []);

    const paymentSubmit = () => {
        if (address === "" || province === "") {
            toast.error("Please choose your delivery address!")
        } else {
            const shippingAddress = {
                address1: address, // Map to address1 for backward compatibility
                address2: "",
                zipCode: null,
                country: "VietNam",
                city: province, // Map province to city for backward compatibility
            };

            const orderData = {
                cart,
                totalPrice: parseFloat(totalPrice), // Ensure totalPrice is a number
                subTotalPrice,
                shipping,
                discountPrice,
                shippingAddress,
                user: { _id: user._id }, // Ensure only user._id is sent if the backend schema expects it as a string within an object
            }

            // Update local storage with the order data before navigating to payment
            localStorage.setItem("latestOrder", JSON.stringify(orderData));
            navigate("/payment"); // Navigate to the payment page where PIN verification will occur
        }
    };

    const subTotalPrice = cart.reduce(
        (acc, item) => acc + item.qty * item.discountPrice,
        0
    );

    // This is shipping cost variable (10% of subtotal)
    const shipping = subTotalPrice * 0.1;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = couponCode; // Assuming couponCode is the name to query

        await axios.get(`${server}/coupon/get-coupon-value/${name}`).then((res) => {
            const shopId = res.data.couponCode?.shopId;
            const couponCodeValue = res.data.couponCode?.value;

            if (res.data.couponCode !== null) {
                const isCouponValid =
                    cart && cart.filter((item) => item.shopId === shopId);

                if (isCouponValid.length === 0) {
                    toast.error("Coupon code is not valid for this shop");
                    setCouponCode("");
                } else {
                    const eligiblePrice = isCouponValid.reduce(
                        (acc, item) => acc + item.qty * item.discountPrice,
                        0
                    );
                    const discountPrice = (eligiblePrice * couponCodeValue) / 100;
                    setDiscountPrice(discountPrice);
                    setCouponCodeData(res.data.couponCode);
                    setCouponCode("");
                }
            } else { // Handle case where coupon code doesn't exist
                toast.error("Coupon code doesn't exist!");
                setCouponCode("");
            }
        }).catch((error) => {
            toast.error(error.response?.data?.message || "Error applying coupon.");
            setCouponCode("");
        });
    };

    const discountPercentenge = couponCodeData ? discountPrice : 0; // Ensure it's a number for calculations

    // Helper function to safely calculate total price
    const calculateTotalPrice = () => {
        const sub = Number(subTotalPrice) || 0;
        const ship = Number(shipping) || 0;
        const discount = Number(discountPercentenge) || 0;
        return (sub + ship - discount).toFixed(2);
    };

    const totalPrice = calculateTotalPrice(); // Final total price

    // console.log(discountPercentenge); // Removed console.log

    return (
        <div className="w-full flex flex-col items-center py-8">
            <div className="w-[90%] 1000px:w-[70%] block 800px:flex">
                <div className="w-full 800px:w-[65%]">
                    <ShippingInfo
                        user={user}
                        province={province}
                        setProvince={setProvince}
                        userInfo={userInfo}
                        setUserInfo={setUserInfo}
                        address={address}
                        setAddress={setAddress}
                        vietnameseProvinces={vietnameseProvinces}
                    />
                </div>
                <div className="w-full 800px:w-[35%] 800px:mt-0 mt-8">
                    <CartData
                        handleSubmit={handleSubmit}
                        totalPrice={totalPrice}
                        shipping={shipping}
                        subTotalPrice={subTotalPrice}
                        couponCode={couponCode}
                        setCouponCode={setCouponCode}
                        discountPercentenge={discountPercentenge}
                    />
                </div>
            </div>
            <div
                className={`${styles.button} w-[150px] 800px:w-[280px] mt-10`}
                onClick={paymentSubmit}
            >
                <h5 className="text-white">Go to Payment</h5>
            </div>
        </div>
    );
};

const ShippingInfo = ({
    user,
    province,
    setProvince,
    userInfo,
    setUserInfo,
    address,
    setAddress,
    vietnameseProvinces,
}) => {
    return (
        <div className="w-full 800px:w-[95%] bg-white rounded-md p-5 pb-8">
            <h5 className="text-[18px] font-[500]">Shipping Address</h5>
            <br />
            <form>
                <div className="w-full flex pb-3">
                    <div className="w-[50%]">
                        <label className="block pb-2">Full Name</label>
                        <input
                            type="text"
                            value={user ? user.name : ""} // Handle null user
                            required
                            className={`${styles.input} !w-[95%]`}
                            readOnly // Assuming user name is not editable here
                        />
                    </div>
                    <div className="w-[50%]">
                        <label className="block pb-2">Email Address</label>
                        <input
                            type="email"
                            value={user ? user.email : ""} // Handle null user
                            required
                            className={`${styles.input}`}
                            readOnly // Assuming user email is not editable here
                        />
                    </div>
                </div>

                <div className="w-full flex pb-3">
                    <div className="w-[50%]">
                        <label className="block pb-2">Phone Number</label>
                        <input
                            type="number"
                            required
                            value={user ? user.phoneNumber : ""} // Handle null user
                            className={`${styles.input} !w-[95%]`}
                            readOnly // Assuming user phone number is not editable here
                        />
                    </div>
                    <div className="w-[50%]">
                        <label className="block pb-2">Country</label>
                        <input
                            type="text"
                            value="VietNam"
                            className={`${styles.input} bg-gray-100`}
                            readOnly
                        />
                    </div>
                </div>

                <div className="w-full flex pb-3">
                    <div className="w-[50%]">
                        <label className="block pb-2">Province</label>
                        <select
                            className="w-[95%] border h-[40px] rounded-[5px]"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                        >
                            <option className="block pb-2" value="">
                                Choose your province
                            </option>
                            {vietnameseProvinces.map((provinceName) => (
                                <option key={provinceName} value={provinceName}>
                                    {provinceName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-[50%]">
                        <label className="block pb-2">Address</label>
                        <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className={`${styles.input}`}
                            placeholder="Enter your detailed address"
                        />
                    </div>
                </div>

                <div></div> {/* Empty div, possibly for layout spacing */}
            </form>
            <h5
                className="text-[18px] cursor-pointer inline-block"
                onClick={() => setUserInfo(!userInfo)}
            >
                Choose From saved address
            </h5>
            {userInfo && (
                <div>
                    {user &&
                        user.addresses.map((item, index) => (
                            <div className="w-full flex mt-1" key={index}>
                                <input
                                    type="checkbox"
                                    className="mr-3"
                                    value={item.addressType}
                                    // Set all address fields when a saved address is selected
                                    onClick={() => {
                                        setAddress(item.address1 || item.address || "");
                                        setProvince(item.city || item.province || "");
                                    }}
                                />
                                <h2>{item.addressType}</h2>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};

const CartData = ({
    handleSubmit,
    totalPrice,
    shipping,
    subTotalPrice,
    couponCode,
    setCouponCode,
    discountPercentenge,
}) => {
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
                <h5 className="text-[18px] font-[600]">${formatPrice(subTotalPrice)}</h5>
            </div>
            <br />
            <div className="flex justify-between">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Shipping:</h3>
                <h5 className="text-[18px] font-[600]">${formatPrice(shipping)}</h5>
            </div>
            <br />
            <div className="flex justify-between border-b pb-3">
                <h3 className="text-[16px] font-[400] text-[#000000a4]">Discount:</h3>
                <h5 className="text-[18px] font-[600]">
                    - ${formatPrice(discountPercentenge || 0)}
                </h5>
            </div>
            <h5 className="text-[18px] font-[600] text-end pt-3">${totalPrice}</h5>
            <br />
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    className={`${styles.input} h-[40px] pl-2`}
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    required
                />
                <input
                    className={`w-full h-[40px] border border-[#f63b60] text-center text-[#f63b60] rounded-[3px] mt-8 cursor-pointer`}
                    required
                    value="Apply code"
                    type="submit"
                />
            </form>
        </div>
    );
};

export default Checkout;