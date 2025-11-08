const express = require("express");
const router = express.Router();
 const authMiddleware = require("../middleware/authMiddleware");


router.post("/partnerUser/get", authMiddleware, AuthController.getUser);

router.patch("/partnerUser/update", authMiddleware, AuthController.getUser);

router.post("/partnerUser/verifyPhone", authMiddleware, AuthController.getUser);


module.exports = router;
