import React, { useState, useRef, useEffect } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import styles from "../../styles/styles";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";


const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("")
    const [visible, setVisible] = useState(false)
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [otpTimer, setOtpTimer] = useState(60);
    const timerRef = useRef();

    
    //const [isLoading, setIsLoading] = useState(true);
    //const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Hàm lấy device info từ localStorage
const getDeviceInfo = () => {
  const raw = localStorage.getItem("deviceInfo");
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj.encryptedDeviceId && obj.signature) return obj;
    return null;
  } catch {
    return null;
  }
};
// Lưu device info vào localStorage
const setDeviceInfo = (encryptedDeviceId, signature) => {
  localStorage.setItem("deviceInfo", JSON.stringify({ encryptedDeviceId, signature }));
};

    useEffect(() => {
        if (step === 2 && otpTimer > 0) {
            timerRef.current = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
        }
        return () => clearTimeout(timerRef.current);
    }, [otpTimer, step]);

    const handleSubmit = async (e) => {
    e.preventDefault();
    const deviceInfo = getDeviceInfo();
    const payload = {
      email,
      password,
      userAgent: navigator.userAgent,
      ...(deviceInfo ? { encryptedDeviceId: deviceInfo.encryptedDeviceId, signature: deviceInfo.signature } : {})
    };
    await axios
        .post(
            `${server}/user/login-user`,
            payload,
            { withCredentials: true }
        ).then((res) => {
    if (res.data.encryptedDeviceId && res.data.signature) {
        setDeviceInfo(res.data.encryptedDeviceId, res.data.signature);
        if (res.data.skipOtp) {
            toast.success("Login Success!");
            setStep(1); // Reset về bước 1
            //navigate("/");
            window.location.reload(true);
        } else {
            toast.success("OTP sent to your email!");
            setStep(2); // Sang bước nhập OTP
            setOtpTimer(60); // Reset timer
        }
    }
})
.catch((err) => {
    toast.error(err.response?.data?.message || "Login failed");
});
    }

    const handleResendOtp = async () => {
        const deviceInfo = getDeviceInfo();
        const payload = {
          email,
          password,
          userAgent: navigator.userAgent,
          ...(deviceInfo ? { encryptedDeviceId: deviceInfo.encryptedDeviceId, signature: deviceInfo.signature } : {})
        };
        await axios
            .post(
                `${server}/user/login-user`,
                payload,
                { withCredentials: true }
            ).then((res) => {
                if (res.data.encryptedDeviceId && res.data.signature) {
                    setDeviceInfo(res.data.encryptedDeviceId, res.data.signature);
                }
                if (!res.data.skipOtp) {
                    toast.success("OTP resent to your email!");
                    setOtpTimer(60); // reset timer
                }
            })
            .catch((err) => {
                toast.error(err.response?.data?.message || "Resend OTP failed");
            });
    };

    const handleOtpSubmit = async (e) => {
  e.preventDefault();
  const deviceInfo = getDeviceInfo();
  if (!deviceInfo) {
    toast.error("Thiết bị không hợp lệ. Vui lòng đăng nhập lại.");
    setStep(1);
    return;
  }
  await axios
    .post(
      `${server}/user/login-verify-otp`,
      {
        email,
        otp,
        encryptedDeviceId: deviceInfo.encryptedDeviceId,
        signature: deviceInfo.signature,
        userAgent: navigator.userAgent,
      },
      { withCredentials: true }
    ).then(() => {
      toast.success("Login Success!");
    //   setTimeout(() => {
    //     navigate("/");
    //   }, 100);
      window.location.reload(true);
    })
    .catch((err) => {
      toast.error(err.response?.data?.message || "OTP xác thực thất bại");
    });
};
    //if (isLoading) return null;
    //if (isAuthenticated) return null; // hoặc return <Navigate to="/" /> nếu dùng react-router v6+

    return (
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Login to your account
                </h2>
            </div>
            <div className='mt-8 sm:mx-auto sw:w-full sm:max-w-md'>
                <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
                    {step === 1 ? (
                    <form className='space-y-6' onSubmit={handleSubmit} >
                        {/* Email */}
                        <div>
                            <label htmlFor="email"
                                className='block text-sm font-medium text-gray-700'
                            >
                                Email address
                            </label>
                            <div className='mt-1'>
                                <input type="email"
                                    name='email'
                                    autoComplete='email'
                                    required
                                    placeholder='Please enter valid email'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
                                />

                            </div>
                        </div>
                        {/* Password */}
                        <div>
                            <label htmlFor="password"
                                className='block text-sm font-medium text-gray-700'
                            >
                                password
                            </label>
                            <div className='mt-1 relative'>
                                <input type={visible ? "text" : "password"}
                                    name='password'
                                    autoComplete='password'
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
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
                        {/* password end */}

                        <div className={`${styles.noramlFlex} justify-between`}>
                            <div className={`${styles.noramlFlex}`}>
                                <input
                                    type="checkbox"
                                    name="remember-me"
                                    id="remember-me"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="ml-2 block text-sm text-gray-900"
                                >
                                    Remember me
                                </label>
                            </div>
                            <div className='text-sm'>
                                <a
                                    href=".forgot-password"
                                    className="font-medium text-blue-600 hover:text-blue-500"
                                >
                                    Forgot your password?
                                </a>
                            </div>
                        </div>
                        <div>
                            <button
                                type='submit'
                                className=' className="group relative w-full h-[40px] flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"'
                            >
                                Submit
                            </button>
                        </div>

                        <div className={`${styles.noramlFlex} w-full`} >
                            <h4>Not have any account</h4>
                            <Link to="/sign-up" className="text-blue-600 pl-2">
                                Sign Up
                            </Link>
                        </div>
                    </form> ) : (
                    <form className='space-y-6' onSubmit={handleOtpSubmit}>
                        <div>
                            <label htmlFor="otp" className='block text-sm font-medium text-gray-700'>
                                Enter OTP sent to your email
                            </label>
                            <div className='mt-1'>
                                <input
                                    type="text"
                                    name="otp"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
                                />
                            </div>
                            <div className="mb-4 text-center">
                            <span className="text-sm text-gray-600">
                            OTP expires in: {otpTimer}s
                            </span>
                            <br />
                            <button
                                type="button"
                                className={`mt-2 text-blue-600 hover:underline text-sm ${otpTimer > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={handleResendOtp}
                                disabled={otpTimer > 0}
                            >
                        Resend OTP
                            </button>
                        </div>
                        </div>
                        <button
                            type='submit'
                            className='group relative w-full h-[40px] flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700'
                        >
                            Verify OTP
                        </button>
                    </form>
                )}
                </div>
            </div>
        </div>
    )
}

export default Login