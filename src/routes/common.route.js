const express = require("express");
const router = express.Router();
const genericController = require("../controller/Generic.controller.js");
 const authMiddleware = require("../middleware/authMiddleware");

 
router.get("/ping", function (req, res) {
    res.status(200).send({message: "Ping Successful"});
});

router.post("/getUser", authMiddleware, genericController.getUser);



module.exports = router;
