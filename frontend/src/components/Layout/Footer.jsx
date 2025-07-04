import React from "react";
import {
    AiFillFacebook,
    AiFillInstagram,
    AiFillYoutube,
    AiOutlineTwitter,
} from "react-icons/ai";
import { Link } from "react-router-dom";
import {
    footercompanyLinks,
    footerProductLinks,
    footerSupportLinks,
} from "../../static/data";

const Footer = () => {
    return (
        <div className="bg-[#000] text-white">
            <div className="grid grid-cols-1 sm:gird-cols-3 lg:grid-cols-4 gap-6 sm:px-8 px-5 py-16 sm:text-center">
                <ul className="px-5 text-center sm:text-start flex sm:block flex-col items-center">
                    <img
                        src="https://media.discordapp.net/attachments/897821919489970200/1381873917949644922/Thiet_ke_chua_co_ten__1_-removebg-preview_1.png?ex=684919e0&is=6847c860&hm=1972d4b57c6120f0d478acc64a16963cc16faaa3bb6816fdb51b8718339f1968&=&format=webp&quality=lossless"
                        alt=""
                        style={{ filter: "hue-rotate(180deg) saturate(2) grayscale(100%) invert(1)"}}
                    />
                    <br />
                    <p>The home and elements needeed to create beatiful products.</p>
                    <div className="flex items-center mt-[15px]">
                        <AiFillFacebook size={25} className="cursor-pointer" />
                        <AiOutlineTwitter
                            size={25}
                            style={{ marginLeft: "15px", cursor: "pointer" }}
                        />
                        <AiFillInstagram
                            size={25}
                            style={{ marginLeft: "15px", cursor: "pointer" }}
                        />
                        <AiFillYoutube
                            size={25}
                            style={{ marginLeft: "15px", cursor: "pointer" }}
                        />
                    </div>
                </ul>

                <ul className="text-center sm:text-start">
                    <h1 className="mb-1 font-semibold">Company</h1>
                    {footerProductLinks.map((link, index) => (
                        <li key={index}>
                            <Link
                                className="text-gray-400 hover:text-teal-400 duration-300
                   text-sm cursor-pointer leading-6"
                                to={link.link}
                            >
                                {link.name}
                            </Link>
                        </li>
                    ))}
                </ul>

                <ul className="text-center sm:text-start">
                    <h1 className="mb-1 font-semibold">Shop</h1>
                    {footercompanyLinks.map((link, index) => (
                        <li key={index}>
                            <Link
                                className="text-gray-400 hover:text-teal-400 duration-300
                   text-sm cursor-pointer leading-6"
                                to={link.link}
                            >
                                {link.name}
                            </Link>
                        </li>
                    ))}
                </ul>

                <ul className="text-center sm:text-start">
                    <h1 className="mb-1 font-semibold">Support</h1>
                    {footerSupportLinks.map((link, index) => (
                        <li key={index}>
                            <Link
                                className="text-gray-400 hover:text-teal-400 duration-300
                   text-sm cursor-pointer leading-6"
                                to={link.link}
                            >
                                {link.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10
         text-center pt-2 text-gray-400 text-sm pb-8"
            >
                <span>© 2025 ShopingSe. All rights reserved.</span>
                <span>Terms · Privacy Policy</span>
            </div>
        </div>
    );
};

export default Footer;