const sql = require("../config/db.config");

async function sendMessage(message){
    const {stu_email, roomid, msg, msg_delivered} = message;

    let check = await sql `select * from rooms where roomid = ${roomid}`;

    if(check.length == 0){
        await sql `insert into rooms(room_admin, roomid) values(${stu_email}, ${roomid})`
    }

    try {
        await sql`INSERT INTO MESSAGES_TABLE(stu_email,roomid,msg,msg_delivered) 
                        VALUES (${stu_email},${roomid},${msg},${msg_delivered})`;
    }
    catch(err) {
        console.error(err);
        throw err; 
    }
}

async function globalMessages(){
    try {
       let msgsList = await sql`SELECT * FROM MESSAGES_TABLE WHERE roomid = 'global'`;
       return msgsList;
    }
    catch(err) {
        console.error(err);
        throw err; 
    }
}

module.exports = {
    sendMessage,
    globalMessages
};