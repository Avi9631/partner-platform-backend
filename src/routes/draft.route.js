const express = require("express");
const router = express.Router();
 const authMiddleware = require("../middleware/authMiddleware");

 
router.get("/ping", function (req, res) {
    res.status(200).send({message: "Ping Successful"});
});


router.post("/createListingDraft", authMiddleware, AuthController.getUser);

router.patch("/updateListingDraft", authMiddleware, AuthController.getUser);

router.delete("/deleteListingDraft", authMiddleware, AuthController.getUser);

router.post("/submitListingDraft", authMiddleware, AuthController.getUser);

router.get("/listingDraft", authMiddleware, AuthController.getUser);

router.get("/listingDraft/:id", authMiddleware, AuthController.getUser);

module.exports = router;
