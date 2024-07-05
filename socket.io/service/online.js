const sql = require("../config/db.config");

async function isOnline(user_id) {
    try {
        return await sql`SELECT * FROM ACTIVE`;
    }
    catch (err) {
        console.error(err)
    }
}

async function offline(user_id) {
    try {
        return await sql`DELETE FROM ACTIVE WHERE USER_ID = ${user_id} `;
    }
    catch (err) {
        console.error(err)
    }
}

async function nowActive(user_id) {
    try {
        console.log("added the user")
        return await sql`INSERT INTO ACTIVE (USER_ID) VALUES ${user_id}`;
    }
    catch (err) {
        console.error(err)
    }
}

module.exports = {
    isOnline,
    offline,
    nowActive
}