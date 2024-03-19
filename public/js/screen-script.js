var socket = io("https://192.168.1.10:8000");

var kitAnoun = document.getElementById('kit-anoun');
var remoteVideo = document.getElementById('screen-video');

var creator = true;
var makingOffer = false;
var ignoreOffer = false;
var polite = true;

var payload = {
    description: null,
    candidate: null
}

const roomName = "kit";

var userMediaStream = null;

var peerConnection = null;

const iceServer = {
    iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun.l.google.com:19302" }
    ]
}

var mediaConstraints = {
    video: true,
    cursor: "always",
    audio: false
};

async function kitAvailable() {
    console.log("User is creator: ", creator);
    
    try{
        await initRTCPeerConnection();
    } catch (err) {
        console.log(err);
        console.error(err);
    }
}

socket.emit("kit-online", roomName);

socket.on("kit-available", kitAvailable);
socket.on("kit-error", (roomName) => {
    console.log("KIT is not available: ", roomName);
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
        kitAnoun.style.display = "none";
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