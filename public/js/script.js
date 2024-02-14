var socket = io();

var videoChatForm = document.getElementById('video-chat-form');
var videoChatRooms = document.getElementById('video-chat-rooms');

var roomInput = document.getElementById('roomName');
var localVideo = document.getElementById('user-video');
var remoteVideo = document.getElementById('peer-video');
var joinButton = document.getElementById('join');

var creator = false;
var makingOffer = false;
var ignoreOffer = false;
var polite = true;

var payload = {
    description: null,
    candidate: null
}

var roomName = null;
var userMediaStream = null;

var peerConnection = null;

var iceServer = {
    iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun.l.google.com:19302" }
    ]
}

var displayConstraints = {
    video: {
        width: 500,
        height: 500
    },
    cursor: "always",
    audio: false
};

async function getLocalStreamCreate() {
    creator = true;
    console.log("User is creator: ", creator);
    
    await initRTCPeerConnection();

    try{
        const stream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
        userMediaStream = stream;
        userMediaStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, userMediaStream);
        });
        videoChatForm.style.display = 'none';
        localVideo.srcObject = stream;
        localVideo.onloadedmetadata = () => {
            localVideo.play();
        };
        console.log("User is ready: ");
        socket.emit('user-ready', roomName);
    } catch (err) {
        alert('Please allow access to your camera and microphone')
        console.log(err);
        console.error(err);
    }
}

async function getLocalStreamJoin() {
    creator = false;
    console.log("User is creator: ", creator);

    await initRTCPeerConnection();

    try{
        const stream = await navigator.mediaDevices.getUserMedia({video: false, audio: true});
        userMediaStream = stream;
        userMediaStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, userMediaStream);
        });
        videoChatForm.style.display = 'none';
        localVideo.srcObject = stream;
        localVideo.onloadedmetadata = () => {
            localVideo.play();
        };
    } catch (err) {
        alert('Please allow access to your camera and microphone')
        console.log(err);
        console.error(err);
    }
}

joinButton.addEventListener('click', () => {
    
    if (roomInput.value === "") {
        alert('Please enter a room name');
    } else {
        roomName = roomInput.value;
        console.log("Room name: ", roomName);
        socket.emit('join-socket-room', roomName);
        console.log("User is joining room: ", roomName);
    }
});

socket.on('new-room-created', getLocalStreamCreate);
socket.on('another-user-joined', getLocalStreamJoin);
socket.on('room-full', () => {
    alert('Room is full');
});

socket.on('message', onMessage);

async function onMessage(payload) { 
    console.log("Received payload: ", {payload});
    try{
        if(payload.description){
            const offerCollision = (payload.description.type === "offer") && (makingOffer || peerConnection.signalingState !== "stable");
            ignoreOffer = !polite && offerCollision;
            if(ignoreOffer){
                return;
            }
            await peerConnection.setRemoteDescription(payload.description);
            if(payload.description.type === "offer"){
                await peerConnection.setLocalDescription();
                var localDescription = peerConnection.localDescription;
                payload = {
                    description: localDescription,
                    candidate: null
                };
                if(payload){
                    console.log("Sending payload: ", {payload});
                    socket.emit("message", payload, roomName);
                }
            }
        }else if(payload.candidate){
            try{
                var iceCandidate = new RTCIceCandidate(payload.candidate);
                await peerConnection.addIceCandidate(iceCandidate);
            } catch(err){
                if(!ignoreOffer){
                    throw err;
                }
            }
        }
    } catch(err){
        console.error(err);
    }
}

function initRTCPeerConnection() {
    peerConnection = new RTCPeerConnection(iceServer);

    peerConnection.onicecandidate = onIceCandidateFunction;
    peerConnection.ontrack = onTrackFunction;
    peerConnection.onnegotiationneeded = onNegotiationNeededFunction;
    peerConnection.oniceconnectionstatechange = onIceConnectionStateChangeFunction;
}

function onIceCandidateFunction(event) {
    if(event.candidate){
        payload = { 
            description: null,
            candidate: event.candidate
        }
        if(payload){
            console.log("Sending payload: ", {payload});
            socket.emit("message", payload, roomName);
        }
    }
};

function onTrackFunction(event) {
    event.track.onunmute = () => {
        console.log("Received remote track: ", event.track);
        if(remoteVideo.srcObject) return;
        console.log("Received remote stream: ", event.streams[0]);
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.onloadedmetadata = () => {
            console.log("Remote video is loaded");
            remoteVideo.play();
        };
    };
};

async function onNegotiationNeededFunction() {
    try{
        makingOffer = true;
        await peerConnection.setLocalDescription();
        var localDescription = peerConnection.localDescription;
        payload = {
            description: localDescription,
            candidate: null
        };
        if(payload){
            console.log("Sending payload: ", {payload});
            socket.emit("message", payload, roomName);
        }
    } catch (err) {
        console.error(err);
    } finally{
        makingOffer = false;
    }
}

function onIceConnectionStateChangeFunction() {
    console.log("Ice connection state change: ", peerConnection.iceConnectionState);
    if(peerConnection.iceConnectionState === "failed"){
        peerConnection.restartIce();
    }
}