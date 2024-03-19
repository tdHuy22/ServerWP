const {readFileSync} = require('fs');
const {join} = require('path');
const {createServer} = require('https');
const express = require('express');
const {Server} = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const userRoute = require('./routes/userRoute');
// ==================================== IMPORTS ====================================
const app = express();
const PORT = process.env.PORT || 8000;
const hostname = ["localhost", "192.168.1.10", "192.168.1.8"];

const key = readFileSync('./cert/cert.key');
const cert = readFileSync('./cert/cert.crt');

const httpsServer = createServer({key, cert}, app);

const io = new Server(httpsServer,{
    cors:{
        origin: ["https://localhost", "https://192.168.1.10", " https://192.168.1.8"],
        methods: ["GET", "POST"]
    }
});
// ================================ ASSIGN_VARIABLES ===============================

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

app.use(express.static(join(__dirname, 'public')));

app.use('/', userRoute);
app.use('/screen', userRoute);
// =================================== MIDDLEWARE ==================================

io.on("connection", (socket) => {
    console.log("User connected: ", socket.id);
    
    socket.on("kit-online", (roomName) => {
        var kitRooms = io.sockets.adapter.rooms;
        var kitRoom = kitRooms.get(roomName);
        if(kitRoom === undefined){
            socket.join(roomName);
            socket.emit("kit-available");
        }else if(kitRoom.size === 1){
            socket.emit("kit-error", roomName);
            console.log("Kit is not available: ", roomName);
        }else{
            socket.emit("kit-error", roomName);
            console.log("Kit is not available: ", roomName);
        }
        console.log({kitRooms});
    });

    socket.on("user-online", (roomName) => {
        var rooms = io.sockets.adapter.rooms;
        var room = rooms.get(roomName);
        if(room === undefined){
            console.log("KIT not available: ", roomName);
            socket.emit("kit-not-available", roomName);
        }else if(room.size === 1){
            socket.join(roomName);
            socket.emit("user-access-success");
            console.log("User access success: ", roomName);
        }else{
            socket.emit("kit-used", roomName);
            console.log("KIT is being used: ", roomName);
        }
        console.log({rooms});
    });

    socket.on("message", (payload, roomName) => {
        console.log("Payload");
        console.log({payload});
        socket.broadcast.to(roomName).emit("message", payload);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: ", socket.id);
    });
});

// ================================== SOCKET.IO ====================================

httpsServer.listen(PORT, hostname, () => {
    console.log(`Server running at https://${hostname[0]}:${PORT}/`);
    console.log(`Screen running at https://${hostname[0]}:${PORT}/screen`);
});
// =================================== SERVER ======================================
