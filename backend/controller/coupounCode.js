const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller } = require("../middleware/auth");
const CoupounCode = require("../model/coupounCode");
const router = express.Router();

// create coupoun code
router.post(
  "/create-coupon-code",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Kiểm tra xem coupon code đã tồn tại chưa bằng cách so sánh với tất cả coupon hiện có
      const existingCoupons = await CoupounCode.find({ shopId: req.body.shopId });
      
      for (let coupon of existingCoupons) {
        const isNameMatch = await coupon.compareName(req.body.name);
        if (isNameMatch) {
          return next(new ErrorHandler("Coupoun code already exists!", 400));
        }
      }

      const coupounCode = await CoupounCode.create(req.body);

      res.status(201).json({
        success: true,
        coupounCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all coupons of a shop
router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCodes = await CoupounCode.find({ shopId: req.seller.id });
      res.status(201).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete coupoun code of a shop
router.delete(
  "/delete-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCode = await CoupounCode.findByIdAndDelete(req.params.id);

      if (!couponCode) {
        return next(new ErrorHandler("Coupon code dosen't exists!", 400));
      }
      res.status(201).json({
        success: true,
        message: "Coupon code deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get coupon code value by its name
router.get(
  "/get-coupon-value/:name",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const requestedName = req.params.name;
      
      // Lấy tất cả coupon codes và tìm kiếm bằng cách so sánh hash
      const allCoupons = await CoupounCode.find({});
      let foundCoupon = null;
      
      for (let coupon of allCoupons) {
        const isNameMatch = await coupon.compareName(requestedName);
        if (isNameMatch) {
          foundCoupon = coupon;
          break;
        }
      }

      if (!foundCoupon) {
        return next(new ErrorHandler("Coupon code not found!", 404));
      }

      res.status(200).json({
        success: true,
        couponCode: foundCoupon,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

module.exports = router;
