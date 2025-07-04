import React, { useEffect, useState } from 'react'
import { backend_url, server, getImageUrl } from "../../server";
import { useDispatch, useSelector } from 'react-redux';
import {
    deleteUserAddress,
    loadUser,
    updatUserAddress,
    updateUserInformation,
} from "../../redux/actions/user";
import { AiOutlineArrowRight, AiOutlineCamera, AiOutlineDelete } from 'react-icons/ai';
import { Link } from 'react-router-dom';
import styles from "../../styles/styles";
import { DataGrid } from "@material-ui/data-grid";
import { Button } from "@material-ui/core";
import { RxCross1 } from 'react-icons/rx'
import { MdTrackChanges } from "react-icons/md";
import { toast } from "react-toastify";
import axios from 'axios';
import { getAllOrdersOfUser } from '../../redux/actions/order';
import SecuritySettings from './SecuritySettings';
import { vietnameseProvinces } from '../../utils/vietnameseProvinces';

const ProfileContent = ({ active }) => {
    const { user, error, successMessage } = useSelector((state) => state.user);
    const [name, setName] = useState(user && user.name);
    const [email, setEmail] = useState(user && user.email);
    const [phoneNumber, setPhoneNumber] = useState(user && user.phoneNumber);
    const [password, setPassword] = useState("");

    const dispatch = useDispatch();

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch({ type: "clearErrors" });
        }
        if (successMessage) {
            toast.success(successMessage);
            dispatch({ type: "clearMessages" });
        }
    }, [error, successMessage, dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(updateUserInformation(name, email, phoneNumber, password));
    }

    // Image update
    const handleImage = async (e) => {
        const file = e.target.files[0];

        const formData = new FormData();
        formData.append("image", e.target.files[0]);

        await axios
            .put(`${server}/user/update-avatar`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                withCredentials: true,
            })
            .then((response) => {
                dispatch(loadUser());
                toast.success("Avatar updated successfully!");
            })
            .catch((error) => {
                toast.error(error);
            });
    };

    return (
        <div className='w-full'>
            {/* Profile Information */}
            {
                active === 1 && (
                    <>
                        <div className="flex justify-center w-full">
                            <div className='relative'>
                                <img src={getImageUrl(user?.avatar)}
                                    className="w-[150px] h-[150px] rounded-full object-cover border-[3px] border-[#3ad132]"
                                    alt="profile img"
                                    onError={(e) => {
                                        console.error('Avatar image failed to load:', e.target.src);
                                        e.target.style.display = 'none';
                                    }} />

                                <div className="w-[30px] h-[30px] bg-[#E3E9EE] rounded-full flex items-center justify-center cursor-pointer absolute bottom-[5px] right-[5px]">
                                    <input type="file"
                                        id="image"
                                        className="hidden"
                                        onChange={handleImage}
                                    />
                                    <label htmlFor="image">
                                        <AiOutlineCamera />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <br />
                        <br />

                        <div className='w-full px-5'>
                            <form onSubmit={handleSubmit}>
                                <div className='w-full 800px:flex block pb-3'>

                                    <div className=' w-[100%] 800px:w-[50%]'>
                                        <label className='block pb-2'>Full Name</label>
                                        <input type="text"
                                            className={`${styles.input} !w-[95%] mb-4 800px:mb-0`}
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>

                                    <div className=' w-[100%] 800px:w-[50%]'>
                                        <label className='block pb-2'>Email Address</label>
                                        <input type="text"
                                            className={`${styles.input} !w-[95%] mb-4 800px:mb-0`}
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="w-full 800px:flex block pb-3">
                                    <div className=" w-[100%] 800px:w-[50%]">
                                        <label className="block pb-2">Phone Number</label>
                                        <input
                                            type="number"
                                            className={`${styles.input} !w-[95%] mb-4 800px:mb-0`}
                                            required
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                        />
                                    </div>

                                    <div className=" w-[100%] 800px:w-[50%]">
                                        <label className="block pb-2">Enter your password</label>
                                        <input
                                            type="password"
                                            className={`${styles.input} !w-[95%] mb-4 800px:mb-0`}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>

                                </div>
                                <input
                                    className={`w-[250px] h-[40px] border border-[#3a24db] text-center text-[#3a24db] rounded-[3px] mt-8 cursor-pointer`}
                                    required
                                    value="Update"
                                    type="submit"
                                />
                            </form>
                        </div>
                    </>
                )
            }

            {/* Orders */}
            {
                active === 2 && (
                    <div>
                        <AllOrders />
                    </div>
                )
            }

            {/* Refund Order */}
            {
                active === 3 && (
                    <div>
                        <AllRefundOrders />
                    </div>
                )
            }

            {/* Track Order */}
            {active === 5 && (
                <div>
                    <TrackOrder />
                </div>
            )}

            {/* Change Password */}
            {active === 6 && (
                <div>
                    <ChangePassword />
                </div>
            )}

            {/* User Address */}
            {active === 7 && (
                <div>
                    <Address />
                </div>
            )}

            {/* Payment PIN / Security Settings */}
            {active === 8 && (
                <div>
                    <SecuritySettings />
                </div>
            )}

        </div >
    )
}

// All orders component
const AllOrders = () => {
    const { user } = useSelector((state) => state.user);
    const { orders } = useSelector((state) => state.order);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getAllOrdersOfUser(user._id));
    }, [dispatch, user._id]);

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 150, flex: 0.7 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 130,
            flex: 0.7,
            cellClassName: (params) => {
                return params.getValue(params.id, "status") === "Delivered"
                    ? "greenColor"
                    : "redColor";
            },
        },
        {
            field: "itemsQty",
            headerName: "Items Qty",
            type: "number",
            minWidth: 130,
            flex: 0.7,
        },
        {
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 130,
            flex: 0.8,
        },
        {
            field: " ",
            flex: 1,
            minWidth: 150,
            headerName: "",
            type: "number",
            sortable: false,
            renderCell: (params) => {
                return (
                    <>
                        <Link to={`/user/order/${params.id}`}>
                            <Button>
                                <AiOutlineArrowRight size={20} />
                            </Button>
                        </Link>
                    </>
                );
            },
        },
    ];

    const row = [];

    orders &&
        orders.forEach((item) => {
            row.push({
                id: item._id,
                itemsQty: item.cart.reduce((acc, cartItem) => acc + cartItem.qty, 0),
                total: "US$ " + item.totalPrice,
                status: item.status,
            });
        });

    return (
        <>
            <div className='pl-8 pt-1'>
                <DataGrid
                    rows={row}
                    columns={columns}
                    pageSize={10}
                    disableSelectionOnClick
                    autoHeight
                />
            </div>
        </>
    )
}

// Refund orders page
const AllRefundOrders = () => {
    const { user } = useSelector((state) => state.user);
    const { orders } = useSelector((state) => state.order);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getAllOrdersOfUser(user._id));
    }, [dispatch, user._id]);

    const eligibleOrders = orders && orders.filter((item) => item.status === "Processing refund");

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 150, flex: 0.7 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 130,
            flex: 0.7,
            cellClassName: (params) => {
                return params.getValue(params.id, "status") === "Delivered"
                    ? "greenColor"
                    : "redColor";
            },
        },
        {
            field: "itemsQty",
            headerName: "Items Qty",
            type: "number",
            minWidth: 130,
            flex: 0.7,
        },
        {
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 130,
            flex: 0.8,
        },
        {
            field: " ",
            flex: 1,
            minWidth: 150,
            headerName: "",
            type: "number",
            sortable: false,
            renderCell: (params) => {
                return (
                    <>
                        <Link to={`/user/order/${params.id}`}>
                            <Button>
                                <AiOutlineArrowRight size={20} />
                            </Button>
                        </Link>
                    </>
                );
            },
        },
    ];

    const row = [];

    eligibleOrders &&
        eligibleOrders.forEach((item) => {
            row.push({
                id: item._id,
                itemsQty: item.cart.reduce((acc, cartItem) => acc + cartItem.qty, 0),
                total: "US$ " + item.totalPrice,
                status: item.status,
            });
        });

    return (
        <div className="pl-8 pt-1">
            <DataGrid
                rows={row}
                columns={columns}
                pageSize={10}
                autoHeight
                disableSelectionOnClick
            />
        </div>
    );
};

// Track order component
const TrackOrder = () => {
    const { user } = useSelector((state) => state.user);
    const { orders } = useSelector((state) => state.order);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getAllOrdersOfUser(user._id));
    }, [dispatch, user._id]);

    const columns = [
        { field: "id", headerName: "Order ID", minWidth: 150, flex: 0.7 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 150,
            flex: 0.7,
            cellClassName: (params) => {
                return params.getValue(params.id, "status") === "Delivered"
                    ? "greenColor"
                    : "redColor";
            },
        },
        {
            field: "itemsQty",
            headerName: "Items Qty",
            type: "number",
            minWidth: 130,
            flex: 0.7,
        },
        {
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 130,
            flex: 0.8,
        },
        {
            field: " ",
            flex: 1,
            minWidth: 150,
            headerName: "",
            type: "number",
            sortable: false,
            renderCell: (params) => {
                return (
                    <>
                        <Link to={`/user/track/order/${params.id}`}>
                            <Button>
                                <MdTrackChanges size={20} />
                            </Button>
                        </Link>
                    </>
                );
            },
        },
    ];

    const row = []

    orders &&
        orders.forEach((item) => {
            row.push({
                id: item._id,
                itemsQty: item.cart.reduce((acc, cartItem) => acc + cartItem.qty, 0),
                total: "US$ " + item.totalPrice,
                status: item.status,
            });
        });

    return (
        <div className="pl-8 pt-1">
            <DataGrid
                rows={row}
                columns={columns}
                pageSize={10}
                disableSelectionOnClick
                autoHeight
            />
        </div>
    )
}

// Change Password component
const ChangePassword = () => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const passwordChangeHandler = async (e) => {
        e.preventDefault();

        await axios
            .put(
                `${server}/user/update-user-password`,
                { oldPassword, newPassword, confirmPassword },
                { withCredentials: true }
            )
            .then((res) => {
                toast.success("Password is updated");
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
            })
            .catch((error) => {
                toast.error(error.response.data.message);
            });
    };

    return (
        <div className='w-full px-5'>
            <h1
                className='text-[25px] text-center font-[600] text[#000000ba] pb-2'
            >
                Change Password
            </h1>
            <div className='w-full'>
                <form
                    onSubmit={passwordChangeHandler}
                    className="flex flex-col items-center"
                >
                    <div className=" w-[100%] 800px:w-[50%] mt-5">
                        <label className='block pb-2'>Enter your Old password</label>
                        <input type="password"
                            className={`${styles.input} !w-[95%] mb-4 800px:mb-0`}
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>

                    <div className=" w-[100%] 800px:w-[50%] mt-2">
                        <label className='block pb-2'>Enter your new Password</label>
                        <input type="password"
                            className={`${styles.input} !w-[95%] mb-4 800px:mb-0`}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className=" w-[100%] 800px:w-[50%] mt-2">
                        <label className="block pb-2">Enter your confirm password</label>
                        <input
                            type="password"
                            className={`${styles.input} !w-[95%] mb-4 800px:mb-0`}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <input
                            className={`w-[95%] h-[40px] border border-[#3a24db] text-center text-[#3a24db] rounded-[3px] mt-8 cursor-pointer`}
                            required
                            value="Update"
                            type="submit"
                        />
                    </div>
                </form>
            </div>
        </div>
    )
}

// Address component
const Address = () => {
    const [open, setOpen] = useState(false);
    const [province, setProvince] = useState("");
    const [address, setAddress] = useState("");
    const [addressType, setAddressType] = useState("");
    const { user } = useSelector((state) => state.user);
    const dispatch = useDispatch();

    // Vietnamese provinces list
    const addressTypeData = [
        { name: "Default" },
        { name: "Home" },
        { name: "Office" },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!province || !address || !addressType) {
            toast.error("Please fill all the fields!");
        } else {
            dispatch(
                updatUserAddress(
                    "VietNam", // Country is always VietNam
                    province,
                    address,
                    addressType
                )
            );
            setOpen(false);
            setProvince("");
            setAddress("");
            setAddressType("");
        }
    }

    const handleDelete = (item) => {
        const id = item._id;
        dispatch(deleteUserAddress(id));
    }

    return (
        <div className='w-full px-5'>
            {
                open && (
                    <div className="fixed w-full h-screen bg-[#0000004b] top-0 left-0 flex items-center justify-center ">
                        <div className="w-[35%] h-[80vh] bg-white rounded shadow relative overflow-y-scroll">
                            <div className="w-full flex justify-end p-3">
                                <RxCross1
                                    size={30}
                                    className="cursor-pointer"
                                    onClick={() => setOpen(false)}
                                />
                            </div>
                            <h1 className="text-center text-[25px] font-Poppins">
                                Add New Address
                            </h1>
                            <div className='w-full'>
                                <form onSubmit={handleSubmit} className="w-full">
                                    <div className="w-full block p-4">
                                        <div className="w-full pb-2">
                                            <label className="block pb-2">Country</label>
                                            <input
                                                type="text"
                                                value="VietNam"
                                                className="w-[95%] border h-[40px] rounded-[5px] px-3 bg-gray-100"
                                                readOnly
                                            />
                                        </div>

                                        <div className="w-full pb-2">
                                            <label className="block pb-2">Choose your Province</label>
                                            <select
                                                name=""
                                                id=""
                                                value={province}
                                                onChange={(e) => setProvince(e.target.value)}
                                                className="w-[95%] border h-[40px] rounded-[5px]"
                                            >
                                                <option value="" className="block border pb-2">
                                                    Choose your province
                                                </option>
                                                {vietnameseProvinces.map((provinceName) => (
                                                    <option
                                                        className="block pb-2"
                                                        key={provinceName}
                                                        value={provinceName}
                                                    >
                                                        {provinceName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-full pb-2">
                                            <label className="block pb-2">Address</label>
                                            <input
                                                type="text"
                                                className={`${styles.input}`}
                                                required
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Enter your detailed address"
                                            />
                                        </div>

                                        <div>
                                            <label className='block pb-2'>Address Type</label>
                                            <select name="" id=""
                                                value={addressType}
                                                onChange={(e) => setAddressType(e.target.value)}
                                                className='w-[95%] border h-[40px] rounded-[5px]'
                                            >
                                                <option value=""
                                                    className='block border pb-2'
                                                >
                                                    Choose Your Address Type
                                                </option>
                                                {
                                                    addressTypeData &&
                                                    addressTypeData.map((item) => (
                                                        <option
                                                            className='block pb-2'
                                                            key={item.name}
                                                            value={item.name}
                                                        >
                                                            {item.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div className=" w-full pb-2">
                                            <input
                                                type="submit"
                                                className={`${styles.input} mt-5 cursor-pointer`}
                                                required
                                                readOnly
                                            />
                                        </div>

                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className='flex w-full items-center justify-between' >
                <h1
                    className='text-[25px] font-[600] text[#000000ba] pb-2'
                >
                    My Address
                </h1>
                <div className={`${styles.button} rounded-md`}
                    onClick={() => setOpen(true)}
                >
                    <span className='text-[#fff]'>Add New</span>
                </div>
            </div>
            <br />

            {user &&
                user.addresses.map((item, index) => (
                    <div
                        className="w-full bg-white h-min 800px:h-[70px] rounded-[4px] flex items-center px-3 shadow justify-between pr-10 mb-5"
                        key={index}
                    >
                        <div className="flex items-center">
                            <h5 className="pl-5 font-[600]">{item.addressType}</h5>
                        </div>
                        <div className="pl-8 flex items-center">
                            <h6 className="text-[12px] 800px:text-[unset]">
                                {item.address}
                            </h6>
                        </div>
                        <div className="pl-8 flex items-center">
                            <h6 className="text-[12px] 800px:text-[unset]">
                                {item.province}, {item.country}
                            </h6>
                        </div>
                        <div className="pl-8 flex items-center">
                            <h6 className="text-[12px] 800px:text-[unset]">
                                {user && user.phoneNumber}
                            </h6>
                        </div>
                        <div className="min-w-[10%] flex items-center justify-between pl-8">
                            <AiOutlineDelete
                                size={25}
                                className="cursor-pointer"
                                onClick={() => handleDelete(item)}
                            />
                        </div>
                    </div>
                ))}

            {
                user && user.addresses.length === 0 && (
                    <h5 className="text-center pt-8 text-[18px]">
                        You don't have any saved addresses!
                    </h5>
                )}
        </div>
    )
}

export default ProfileContent
