// Create token and saving the in cookies and send response

const sendToken = (user, statusCode, res, extra = {}) => {
  const token = user.getJwtToken();

  // Options for cookies
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    user,
    token,
    ...extra,
  });
};
module.exports = sendToken;
