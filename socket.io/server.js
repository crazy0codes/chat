const app = require('express')();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const sql = require('./config/db.config');
const { sendMessage, oldMessages } = require('./service/chatMessage');
const { getUserAccessToken } = require('./service/userAccess');
const cookieParser = require('cookie-parser');
require('dotenv').config();


const http = createServer(app);

const io = require('socket.io')(http, {
    cors: {
        origin: process.env.WEBSITE_URL,
        methods: ["GET", "POST"]
    }
});

app.use(cookieParser())

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
    console.log(stu_password)
    console.log("hashed password ", stu_password)
    if (await bcrypt.compare(password, stu_password)) {
        console.log("User's password == hashed password : true")
        res
            .cookie('token', getUserAccessToken(email))
            .status(200)
            .json({ msg: "user has logged in" })
        return;
    }


    console.log("User's password == hashed password : false")

    res
        .status(403)
        .json({ msg: "invalid password" })
    return;

}

function hasToken(req, res, next) {
    const { email, password } = req.query
    const { token } = req.cookies;
    if (!(email && password)) {
        res
            .status(402)
            .json({ msg: "required all credentials" })
        return
    }


    try {
        if (token) {
            const decoded = jwt.verify(token, 'Ofkjasojl[][&#^&QW23[OJLJfsd');
            console.log('Token is valid');
            console.log(decoded);
            if (decoded.email != email) {
                next();
            }
            res.status(200)
                .json({ email: decoded.email })
            return;
        }
        else {
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


io.on('connection', async (user) => {
    console.log(user.id + " is connected");

    try {
        const oldMsgs = await oldMessages();
        user.emit('old-messages', oldMsgs);
    } catch (error) {
        console.error("Error fetching old messages:", error);
    }

    user.on('disconnect', function () {
        console.log(user.id + " is disconnected");
    })

    user.on('joinRoom', function (roomID) {
        user.join(roomID)
        console.log(user.id + " has joined the " + roomID)
    })

    user.on('message', ({ msgObj, roomID }) => {
        const { msg, msg_delivered } = msgObj;
        try {
            if (roomID) {
                io.to(roomID).emit('message', msg);
                console.log(`From ${roomID} -> ${user.id} : ${msg}`);
            }

            sendMessage(msg);
            io.emit('message', {
                msg,
                msg_delivered
            });
            console.log(`${user.id} : ${msg}`);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    })
})

http.listen(3001, function () { console.log("Server is running"); })