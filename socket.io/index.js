require('dotenv').config();
const app = require('express')();
const { createServer } = require('http');
const { sendMessage, oldMessages } = require('./service/chatMessage');
const { isOnline, nowActive, offline } = require('./service/online');

const http = createServer(app);
const io = require('socket.io')(http);


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', async function (socket) {
  console.log(socket.id + " connected")

  const isActive = (await isOnline()).map( obj => obj.id );

  (socket.emit('old messages', async function(){
    if(!isActive.includes(socket.id)){
      console.log("enterd the old message")
      socket.broadcast.emit('old messages', await oldMessages());
      await nowActive(socket.id);
    }
  }))

  socket.on('disconnect', async function () {
    console.log('user disconnected');
    await offline(socket.id);
  });

  socket.on('chat message', function (msg) {
    io.emit('chat message', msg);
    sendMessage(msg);
  });
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});
