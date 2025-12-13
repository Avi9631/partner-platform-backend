const db = require("../entity/index.js");
const logger = require("../config/winston.config.js");

const getInitials = (name) => {
  const trimmedName = name.trim();

  if (!trimmedName.includes(" ")) {
    return trimmedName.slice(0, 2).toUpperCase();
  }

  const words = trimmedName.split(" ").filter((word) => word.length > 0);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");

  return initials.slice(0, 2);
};

async function createUser(firstName, lastName, email, number) {
  const user = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: number,
    accountType: "INDIVIDUAL",
    phoneVerifiedAt: null,
    nameInitial: getInitials(firstName + " " + lastName),
  };
  const [data, created] = await db.PlatformUser.findOrCreate({
    where: {
      email: email,
    },
    defaults: user,
  });
  console.log(data.userId);

  console.log(data.userId);
  return data;
}

async function findUser(email, userId) {
  if (!userId && !email) throw new Error("User ID or email is required");

  try {
   const userData = await db.PlatformUser.findOne({
      where: {
        ...(email && { email: email }),
        ...(userId && { userId: userId }),
      },
      attributes: {
        exclude: ["user_deleted_at"], // Exclude sensitive/unnecessary fields
      },
      include: [
        {
          model: db.PartnerBusiness,
          as: "business",
          required: false, // LEFT JOIN - user may not have a business yet
        },
      ],
    });
    
    if (!userData) {
      logger.warn(`User not found with ID: ${userId}`);
      throw new Error("User not found");
    }

    const userJson = userData.toJSON();

    return userJson;
  } catch (error) {
    logger.error("Error in getUser:", error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}

 
 
module.exports = {
  findUser,
   createUser,
 };
