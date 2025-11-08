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
    number: number,
    nameInitial: getInitials(firstName + " " + lastName),
  };
  const [data, created] = await db.User.findOrCreate({
    where: {
      email: email,
    },
    defaults: user,
  });
  console.log(data.userId);

  console.log(data.userId);
  return data;
}


async function findUser(email) {
  const data = await db.User.findOne({
    where: {
      email: email,
    },
  });
  console.log(data);
  return data;
}

const getUser = async (userId) => {
  try {
    // Input validation
    if (!userId) throw new Error("User ID is required");

    const userData = await db.User.findByPk(userId);

    if (!userData) {
      logger.warn(`User not found with ID: ${userId}`);
      throw new Error("User not found");
    }

    // Convert to plain object and remove any sensitive information
    const userJson = userData.toJSON();

    getStudyStreak(userId);
    calculateLearningHours(userId);

    return userJson;
  } catch (error) {
    logger.error("Error in getUser:", error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};
 


module.exports = {
  findUser,
  createUser,
  getUser
};
