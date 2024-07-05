// const sql  = require('./config/db.config');
const { sendMessage, oldMessages } = require('./service/chatMessage')
const app = require('express')();
const { createServer } = require('http');

const http = createServer(app);
const io = require('socket.io')(http);


app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
})

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html')
})

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

    user.on('message', ({ message, roomID }) => {
        try {
            if(roomID){
                io.to(roomID).emit('message', message);
                console.log(`From ${roomID} -> ${user.id} : ${message}`);
            }
    
            sendMessage(message);
            io.emit('message', message);
            console.log(`${user.id} : ${message}`);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    })
})

http.listen(3000, function () { console.log("Server is running"); })