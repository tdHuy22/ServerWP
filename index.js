const {readFileSync} = require('fs');
const {join} = require('path');
const {createServer} = require('https');
const express = require('express');
const {Server} = require('socket.io');
const bodyParser = require('body-parser');

const userRoute = require('./routes/userRoute');
// ==================================== IMPORTS ====================================
const app = express();
const PORT = process.env.PORT || 8000;
const hostname = 'localhost';

const key = readFileSync('./cert/cert.key');
const cert = readFileSync('./cert/cert.crt');

const httpsServer = createServer({key, cert}, app);

const io = new Server(httpsServer,{
    cors:{
        origin: "https://localhost",
        methods: ["GET", "POST"]
    }
});
// ================================ ASSIGN_VARIABLES ===============================

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(express.static(join(__dirname, 'public')));

app.use('/', userRoute);
// =================================== MIDDLEWARE ==================================

io.on("connection", (socket) => {
    console.log("User connected: ", socket.id);

    socket.on("join-socket-room", (roomName) => {
        var rooms = io.sockets.adapter.rooms;
        var room = rooms.get(roomName);
        if(room === undefined){
            socket.join(roomName);
            socket.emit("new-room-created");
            console.log("New room created: ", roomName);
        }else if(room.size === 1){
            socket.join(roomName);
            socket.emit("another-user-joined");
            console.log("Another user joined: ", roomName);
        }else{
            socket.emit("room-full");
            console.log("Room is full: ", roomName);
        }
        console.log(rooms);
    });

    socket.on("user-ready", (roomName) => {
        console.log("User is ready: ", socket.id);
        socket.broadcast.to(roomName).emit("user-ready");
    });

    socket.on("candidate", (candidate, roomName) => {
        console.log("Received candidate: " + candidate + " from " + socket.id + " in room: " + roomName);
        console.log({candidate});
        socket.broadcast.to(roomName).emit("candidate", candidate);
    });

    socket.on("offer", (offer, roomName) => {
        console.log("Received offer: " + offer + " from " + socket.id + " in room: " + roomName);
        console.log({offer});
        socket.broadcast.to(roomName).emit("offer", offer);
    });

    socket.on("answer", (answer, roomName) => {
        console.log("Received answer: " + answer + " from " + socket.id + " in room: " + roomName);
        console.log({answer})
        socket.broadcast.to(roomName).emit("answer", answer);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: ", socket.id);
    });

    // socket.on("message", (payload, roomName) => {
    //     console.log("Payload");
    //     console.log({payload});
    //     socket.broadcast.to(roomName).emit("message", payload);
    // });
});

// ================================== SOCKET.IO ====================================

httpsServer.listen(PORT, hostname, () => {
    console.log(`Server running at https://${hostname}:${PORT}/`);
});
// =================================== SERVER ======================================
