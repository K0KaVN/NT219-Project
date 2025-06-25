import React from "react";
import { AiOutlineLogin } from "react-icons/ai";
import { RiLockPasswordLine } from "react-icons/ri";
import { HiOutlineReceiptRefund, HiOutlineShoppingBag } from "react-icons/hi";
import { RxPerson } from "react-icons/rx";
import { Link, useNavigate } from "react-router-dom";
import {
    MdOutlineAdminPanelSettings,
    MdOutlineTrackChanges,
} from "react-icons/md";
import { TbAddressBook } from "react-icons/tb";
import { FaRegCreditCard } from "react-icons/fa"; // Icon for Payment PIN
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../../redux/actions/user";

const ProfileSidebar = ({ active, setActive }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.user);

    const logoutHandler = async () => {
        try {
            await dispatch(logoutUser());
            toast.success("Logged out successfully!");
            navigate("/");
        } catch (error) {
            toast.error("Logout failed. Please try again.");
            console.log(error);
        }
    };

    return (
        <div className="w-full bg-white shadow-sm rounded-[10px] p-4 pt-8">
            {/* Profile Section */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={() => setActive(1)}
            >
                <RxPerson size={20} color={active === 1 ? "red" : ""} />
                <span
                    className={`pl-3 ${active === 1 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Profile
                </span>
            </div>

            {/* Orders Section */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={() => setActive(2)}
            >
                <HiOutlineShoppingBag size={20} color={active === 2 ? "red" : ""} />
                <span
                    className={`pl-3 ${active === 2 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Orders
                </span>
            </div>

            {/* Refunds Section */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={() => setActive(3)}
            >
                <HiOutlineReceiptRefund size={20} color={active === 3 ? "red" : ""} />
                <span
                    className={`pl-3 ${active === 3 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Refunds
                </span>
            </div>

            {/* Track Order Section */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={() => setActive(5)}
            >
                <MdOutlineTrackChanges size={20} color={active === 5 ? "red" : ""} />
                <span
                    className={`pl-3 ${active === 5 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Track Order
                </span>
            </div>

            {/* Change Password Section */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={() => setActive(6)}
            >
                <RiLockPasswordLine size={20} color={active === 6 ? "red" : ""} />
                <span
                    className={`pl-3 ${active === 6 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Change Password
                </span>
            </div>

            {/* Address Section */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={() => setActive(7)}
            >
                <TbAddressBook size={20} color={active === 7 ? "red" : ""} />
                <span
                    className={`pl-3 ${active === 7 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Address
                </span>
            </div>

            {/* Payment PIN / Security Settings Section (New addition) */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={() => setActive(8)} // Set active state to 8 for SecuritySettings
            >
                <FaRegCreditCard size={20} color={active === 8 ? "red" : ""} /> {/* Using a credit card icon */}
                <span
                    className={`pl-3 ${active === 8 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Payment PIN / Security
                </span>
            </div>

            {/* Admin Dashboard Link (Only for Admin role) */}
            {user && user?.role === "Admin" && (
                <Link to="/admin/dashboard">
                    <div
                        className="flex items-center cursor-pointer w-full mb-8"
                        onClick={() => setActive(9)} // Shifted to active state 9
                    >
                        <MdOutlineAdminPanelSettings
                            size={20}
                            color={active === 9 ? "red" : ""}
                        />
                        <span
                            className={`pl-3 ${active === 9 ? "text-[red]" : ""
                                } 800px:block hidden`}
                        >
                            Admin Dashboard
                        </span>
                    </div>
                </Link>
            )}

            {/* Logout Section */}
            <div
                className="flex items-center cursor-pointer w-full mb-8"
                onClick={logoutHandler}
            >
                <AiOutlineLogin size={20} color={active === 10 ? "red" : ""} /> {/* Shifted to active state 10 */}
                <span
                    className={`pl-3 ${active === 10 ? "text-[red]" : ""
                        } 800px:block hidden`}
                >
                    Logout
                </span>
            </div>
        </div>
    );
};

export default ProfileSidebar;
