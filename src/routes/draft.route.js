const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const { uploadListingDraftMedia, handleUploadError } = require("../middleware/uploadMiddleware");
const ListingDraftController = require("../controller/ListingDraft.controller");

 
router.get("/ping", function (req, res) {
    res.status(200).send({message: "Ping Successful"});
});

router.post("/createListingDraft", authenticateToken, ListingDraftController.createListingDraft);

router.patch("/updateListingDraft", authenticateToken, ListingDraftController.updateListingDraft);

router.delete("/deleteListingDraft", authenticateToken, ListingDraftController.deleteListingDraft);
 
router.get("/listingDraft", authenticateToken, ListingDraftController.getUserListingDrafts);

router.get("/listingDraft/:id", authenticateToken, ListingDraftController.getListingDraftById);

module.exports = router;
