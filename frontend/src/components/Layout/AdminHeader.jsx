import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { CiMoneyBill } from "react-icons/ci";
import { GrWorkshop } from "react-icons/gr";
import { backend_url, getImageUrl } from "../../server";

const AdminHeader = () => {
  const { user } = useSelector((state) => state.user);

  return (
    <div className="w-full h-[80px] bg-white shadow sticky top-0 left-0 z-30 flex items-center justify-between px-4">
      <div>
        <Link to="/">
          <img
            src="https://media.discordapp.net/attachments/897821919489970200/1381880151331180574/Thiet_ke_chua_co_ten__2_-removebg-preview.png?ex=68491fae&is=6847ce2e&hm=58ba949552e75ef852ff490f49c61097dbf2f5f49313336e11d1eb5d9ec07135&=&format=webp&quality=lossless"
            alt=""
          />
        </Link>
      </div>
      <div className="flex items-center">
        <div className="flex items-center mr-4">
          <Link to="/admin-withdraw-request" className="800px:block hidden">
            <CiMoneyBill
              color="#555"
              size={30}
              className="mx-5 cursor-pointer"
            />
          </Link>

          <Link to="/admin-sellers" className="800px:block hidden">
            <GrWorkshop
              color="#555"
              size={30}
              className="mx-5 cursor-pointer"
            />
          </Link>
          <img
            src={getImageUrl(user?.avatar)}
            alt=""
            className="w-[50px] h-[50px] rounded-full object-cover"
            onError={(e) => {
              console.error('Admin avatar image failed to load:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
