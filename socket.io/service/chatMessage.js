const sql = require("../config/db.config");

async function sendMessage(message){
    try {
        await sql`INSERT INTO MESSAGES(MSG,msg_delivered) VALUES (${message},${new Date().toISOString()})`;
    }
    catch(err) {
        console.error(err);
        throw err; // or return Promise.reject(err);
    }
}

async function oldMessages(){
    try {
       const msgsList = await sql`SELECT * FROM MESSAGES`;
       return msgsList;
    }
    catch(err) {
        console.error(err);
        throw err; // or return Promise.reject(err);
    }
}

module.exports = {
    sendMessage,
    oldMessages
};