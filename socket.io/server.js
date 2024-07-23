const app = require('express')();
const cors = require('cors')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const sql = require('./config/db.config');
const cookieParser = require('cookie-parser');
const { getUserAccessToken } = require('./service/userAccess');
const { sendMessage, globalMessages } = require('./service/chatMessage');
require('dotenv').config();


const http = createServer(app);

const io = require('socket.io')(http, {
    cors: {
        origin: process.env.WEBSITE_URL,
        methods: ["GET", "POST"]
    }
});

app.use(cookieParser())
app.use(cors({
    origin: process.env.WEBSITE_URL,
    methods: ["GET", "POST"],
    credentials: true
}));


app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
})


app.get('/login', hasToken, hasOnlyPassword)


async function hashPassword(saltRounds, password) {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = bcrypt.hash(password, salt)
    return hash
}

async function updatePassword(email) {
    try {
        const hash = await hashPassword(10, 'password');
        await sql`update users set stu_password = ${hash} where stu_email = ${email}`
        console.log("Updated the password successfully")
    } catch (error) {
        console.log("We have an error in updating the password", error)
    }
}

async function hasOnlyPassword(req, res) {
    const { email, password } = req.query
    let hashedPassword = await sql`select stu_password from users where stu_email = ${email}`;
    if (hasOnlyPassword.length == 0) {
        console.log("no user is registered with that email");
        res.status(403)
            .json({ error: "user not found" })
        return
    }

    //Verify the  hashed passsword and user-sent password
    const [{ stu_password }] = hashedPassword;
    console.log('Verfication of password')
    if (await bcrypt.compare(password, stu_password)) {
        console.log("valid password")
        console.log("generated token")
        console.log("setting token in cookie")
        res
            .status(200)
            .json({
                token: getUserAccessToken(email),
                username: email,
                validUser: true
            })
        return;
    }

    console.log("invalid password")

    res
        .status(403)
        .json({ msg: "invalid password" })
    return;
}


//Login function using the token 
function hasToken(req, res, next) {
    const { email, password } = req.query
    const bearerToken = req.headers.authorization;
    let token = bearerToken.split(" ")[1];

    console.log(token)

    token = (token == "undefined" || token == "null")
        ? null : token

    if (!(email && password)) {
        console.log("No password || email")
        res
            .status(402)
            .json({ msg: "required all credentials" })
        return
    }

    try {
        if (token) {
            console.log("User has the token")
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token is valid');
            console.log(decoded);
            if (decoded.email != email) {
                next();
            }

            res.status(200)
                .json({
                    token,
                    username: decoded.email,
                    validUser: true
                })
            return;
        }
        else {
            console.log("User no token")
            next();
        }

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            console.log('Token has expired');
            next();
        } else if (err.name === 'JsonWebTokenError') {
            console.log('Invalid token');
            res.status(404)
                .json({ msg: err.name })
            return;
        } else {
            console.log('Token verification error:', err);
            res.status(404)
                .json({ msg: err })
            return;
        }
    }
}

app.get('*',(req,res) => res.render(<h1>ERROR 404</h1>))


io.on('connection', async (user) => {

    user.on('fresh-connection', function ({ stu_email, token }) {
        user.email = stu_email,
            user.token = token,
            console.log(user.email + " connected to " + "🔗" + " server ", "✅");
    })

    user.on('disconnect', function () {
        console.log(user.email + " is disconnected ❌");
    })

    user.on('user-rooms', async function (callBack) {
        try {
            console.log(user.email);
            const [{ rooms }] = await sql`SELECT rooms FROM user_in_rooms WHERE stu_email = ${user.email};`;
            console.log("current rooms :", rooms)
            user.emit("current-rooms", rooms)
        }
        catch (err) {
            console.error(err)
        }
    })

    async function joinRooms(roomId) {
        const [isRoomRegisterd] = await sql`SELECT EXISTS (SELECT 1 FROM rooms WHERE roomid = ${roomId} LIMIT 1);`

        console.log("Registered room :", isRoomRegisterd.exists)

        if (!isRoomRegisterd.exists) {
            await sql`INSERT INTO rooms(ROOM_ADMIN, ROOMID) VALUES(${user.email}, ${roomId});`
        }
        console.log("email ", user.email)
        let [{ rooms }] = await sql`SELECT rooms FROM user_in_rooms WHERE stu_email = ${user.email}`;
        let index = rooms.indexOf(roomId);

        if (index == -1) {
            rooms.push(roomId);
            try {
                await sql`UPDATE USER_IN_ROOMS SET rooms = ${rooms} WHERE STU_EMAIL = ${user.email}`
            } catch (error) {
                console.log("Error :", error);
            }
        }
        user.emit("current-rooms", rooms)
    }

    user.on('join-room', async function (roomId) {
        user.join(roomId);
        console.log(user.email + " has joined the " + roomId);
        try {
            joinRooms(roomId)
            let roomMsgs = await sql`SELECT * FROM messages_table WHERE roomid = ${roomId}`
            user.emit('old-messages', roomMsgs);
        } catch (error) {
            console.log("Error join-room :", error);
        }
    })

    user.on('message', ({ msgObj, roomID }) => {
        const { stu_email, msg, msg_delivered } = msgObj;
        try {
            if (roomID) {
                console.log(roomID)
                io.to(roomID).emit('message', msgObj);
                console.log(`From ${roomID} -> at ${msg_delivered}  ${stu_email} : ${msg}`);
                sendMessage({ ...msgObj, roomid: roomID });
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    })
})

http.listen(3001, function () { console.log("Server is running on 3001"); })