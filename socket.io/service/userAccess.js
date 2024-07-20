const sql = require('../config/db.config');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function getUserAccessToken(email) {

    try {
        const token = jwt.sign(
            { email },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        )
        return token
    } catch (error) {
        console.log("Tokken error :" + error);
        return;
    }
}

module.exports = {getUserAccessToken};