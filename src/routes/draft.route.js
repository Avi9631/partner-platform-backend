const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const ListingDraftController = require("../controller/ListingDraft.controller");

 
router.get("/ping", function (req, res) {
    res.status(200).send({message: "Ping Successful"});
});


router.post("/createListingDraft", authMiddleware, ListingDraftController.createListingDraft);

router.patch("/updateListingDraft", authMiddleware, ListingDraftController.updateListingDraft);

router.delete("/deleteListingDraft", authMiddleware, ListingDraftController.deleteListingDraft);

router.post("/submitListingDraft", authMiddleware, ListingDraftController.submitListingDraft);

router.get("/listingDraft", authMiddleware, ListingDraftController.getUserListingDrafts);

router.get("/listingDraft/:id", authMiddleware, ListingDraftController.getListingDraftById);

module.exports = router;
