import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import styles from "../../styles/styles";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { RxAvatar } from 'react-icons/rx';
import { vietnameseProvinces } from "../../utils/vietnameseProvinces";


const ShopCreate = () => {

    const navigate = useNavigate()
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState();
    const [address, setAddress] = useState("");
    const [province, setProvince] = useState("");
    const [avatar, setAvatar] = useState();
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const config = { headers: { "Content-Type": "multipart/form-data" } };
        // meaning of uper line is that we are creating a new object with the name of config and the value of config is {headers:{'Content-Type':'multipart/form-data'}}  

        const newForm = new FormData();
        // meaning of uper line is that we are creating a new form data object and we are sending it to the backend with the name of newForm and the value of newForm is new FormData()
        newForm.append("file", avatar);
        // meanin of newForm.append("file",avatar) is that we are sending a file to the backend with the name of file and the value of the file is avatar
        newForm.append("name", name);
        newForm.append("email", email);
        newForm.append("password", password);
        newForm.append("province", province);
        newForm.append("address", address);
        newForm.append("phoneNumber", phoneNumber);

        try {
            const res = await axios.post(`${server}/shop/create-shop`, newForm, config);
            toast.success(res.data.message);
            setName("");
            setEmail("");
            setPassword("");
            setAvatar();
            setProvince("");
            setAddress("");
            setPhoneNumber();
            setIsSuccess(true);
            setIsSubmitting(false);
        } catch (error) {
            toast.error(error.response.data.message);
            setIsSubmitting(false);
        }
    }
    
    // File upload
    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        setAvatar(file);
    };

    return (
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Register as a seller
                </h2>
            </div>
            <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-[35rem]'>
                {isSuccess ? (
                    <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
                        <div className='text-center'>
                            <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100'>
                                <svg className='h-6 w-6 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7'></path>
                                </svg>
                            </div>
                            <h3 className='mt-4 text-lg font-medium text-gray-900'>Shop Registration Successful!</h3>
                            <p className='mt-2 text-sm text-gray-600'>
                                We've sent an activation link to your email address. Please check your email and click the activation link to complete your shop registration.
                            </p>
                            <div className='mt-6'>
                                <Link 
                                    to="/shop-login" 
                                    className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                >
                                    Continue to Login
                                </Link>
                            </div>
                            <div className='mt-4'>
                                <p className='text-xs text-gray-500'>
                                    Didn't receive an email? Check your spam folder or try registering again.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
                        <form className='space-y-6' onSubmit={handleSubmit} >
                            {/* Shop Name */}
                            <div>
                                <label htmlFor="name"
                                    className='block text-sm font-medium text-gray-700'
                                >
                                    Shop name
                                </label>
                                <div className='mt-1'>
                                    <input type="name"
                                        name='name'
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
                                    />
                                </div>
                            </div>
                            
                            {/* Phone number */}
                            <div>
                                <label htmlFor="phoneNumber"
                                    className='block text-sm font-medium text-gray-700'
                                >
                                    Phone Number
                                </label>
                                <div className='mt-1 relative'>
                                    <input
                                        type="number"
                                        name='phone-number'
                                        autoComplete='tel'
                                        required
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
                                    />
                                </div>
                            </div>

                            {/* Email start */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Email address
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label
                                    htmlFor="address"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Address
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="address"
                                        required
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            {/* Province */}
                            <div>
                                <label
                                    htmlFor="province"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Province
                                </label>
                                <div className="mt-1">
                                    <select
                                        name="province"
                                        required
                                        value={province}
                                        onChange={(e) => setProvince(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="">Choose your province</option>
                                        {vietnameseProvinces.map((provinceName) => (
                                            <option key={provinceName} value={provinceName}>
                                                {provinceName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Password
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        type={visible ? "text" : "password"}
                                        name="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                    {visible ? (
                                        <AiOutlineEye
                                            className="absolute right-2 top-2 cursor-pointer"
                                            size={25}
                                            onClick={() => setVisible(false)}
                                        />
                                    ) : (
                                        <AiOutlineEyeInvisible
                                            className="absolute right-2 top-2 cursor-pointer"
                                            size={25}
                                            onClick={() => setVisible(true)}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Avatar Upload */}
                            <div>
                                <label
                                    htmlFor="avatar"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Shop Avatar
                                </label>
                                <div className="mt-2 flex items-center">
                                    <span className="inline-block h-8 w-8 rounded-full overflow-hidden">
                                        {avatar ? (
                                            <img
                                                src={URL.createObjectURL(avatar)}
                                                alt="avatar"
                                                className="h-full w-full object-cover rounded-full"
                                            />
                                        ) : (
                                            <RxAvatar className="h-8 w-8" />
                                        )}
                                    </span>
                                    <label
                                        htmlFor="file-input"
                                        className="ml-5 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        <span>Upload a file</span>
                                        <input
                                            type="file"
                                            name="avatar"
                                            id="file-input"
                                            accept="image/*"
                                            onChange={handleFileInputChange}
                                            className="sr-only"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div>
                                <button
                                    type='submit'
                                    disabled={isSubmitting}
                                    className={`group relative w-full h-[40px] flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                                        isSubmitting 
                                            ? 'bg-gray-400 cursor-not-allowed' 
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating Shop...
                                        </>
                                    ) : (
                                        'Create Shop'
                                    )}
                                </button>
                            </div>

                            <div className={`${styles.noramlFlex} w-full`} >
                                <h4>Already have an account?</h4>
                                <Link to="/shop-login" className="text-blue-600 pl-2">
                                    Sign In
                                </Link>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ShopCreate