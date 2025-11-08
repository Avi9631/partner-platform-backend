module.exports = {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_DB,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Supabase requires this for SSL
        },
    },
    // HOST: "db.vtsiasguucuvjjqqooeo.supabase.co",
    // USER: "postgres",
    // PASSWORD: "Feedaq@123", // replace with your actual Supabase password
    // DB: "postgres",
    // dialect: "postgres",
    // port: 5432,
    // pool: {
    //     max: 5,
    //     min: 0,
    //     acquire: 30000,
    //     idle: 10000
    // }
};
  