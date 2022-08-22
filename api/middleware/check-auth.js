var jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    var token = req.headers.token;
    const decode = jwt.verify(token, "BandGridAPI");
    console.log(decode);
    next();
  } catch (err) {
    res.status(401).json({
      message: "Auth Fail",
    });
  }
};
