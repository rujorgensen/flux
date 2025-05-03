import Alpine from 'alpinejs';

const peerConnectionConfig = {
    iceServers: [
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun2.1.google.com:19302' },
        { urls: 'stun:stun.l.google.com:19302' },

        // {
        //     urls: 'turn:numb.viagenie.ca',
        //     credential: 'muazkh',
        //     username: 'webrtc@live.com'
        // },
        // {
        //     urls: 'turn:192.158.29.39:3478?transport=udp',
        //     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        //     username: '28224511:1379330808'
        // },
        // {
        //     urls: 'turn:192.158.29.39:3478?transport=tcp',
        //     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        //     username: '28224511:1379330808'
        // },
        // {
        //     urls: 'turn:turn.bistri.com:80',
        //     credential: 'homeo',
        //     username: 'homeo'
        // },

        // * BELOW DOES NOT WORK
        // {
        //     url: 'turn:turn.anyfirewall.com:443?transport=tcp',
        //     credential: 'webrtc',
        //     username: 'webrtc'
        // }
    ],

};

// Define observable component
Alpine.data('webRTCApplication', () => ({
    // Data properties
    offerSDP: '',
    answerSDP: '',
    message: '',
    receivedMessage: <any>null,

    // Internal state

    // Initialize RTCPeerConnections
    peer1: <any>null,
    peer2: <any>null,
    dataChannel: <any>null,
    receiveChannel: <any>null,

    async init() {
        console.log('🚀 WebRTC Application is live');

        // Initialize RTCPeerConnections
        this.peer1 = new RTCPeerConnection(peerConnectionConfig);
        this.peer2 = new RTCPeerConnection(peerConnectionConfig);
        // Setup ICE handling for both peers
        this.peer1.onicecandidate = (
            event: any,
        ) => {
            if (event.candidate === null) {
                this.offerSDP = JSON.stringify(this.peer1.localDescription);
            }
        };

        this.peer2.onicecandidate = (
            event: any,
        ) => {
            if (event.candidate === null) {
                this.answerSDP = JSON.stringify(this.peer2.localDescription);
            }
        };

        // Handle incoming DataChannel on peer2
        this.peer2.ondatachannel = (
            event: any,
        ) => {
            this.receiveChannel = event.channel;
            this.receiveChannel.onopen = () => console.log('ReceiveChannel opened');
            this.receiveChannel.onmessage = (e: any) => this.receivedMessage = e.data;
        };
    },

    // Create offer from Peer 1
    async createOffer() {
        this.dataChannel = this.peer1.createDataChannel("chat");
        this.dataChannel.onopen = () => console.log("DataChannel opened");
        this.dataChannel.onmessage = (e: any) => this.receivedMessage = e.data;

        const offer = await this.peer1.createOffer();
        await this.peer1.setLocalDescription(offer);
    },

    // Set remote offer on Peer 2 and prepare for answer
    async setRemoteOffer(
        offerSDP: any,
    ) {
        const offer = JSON.parse(offerSDP);
        await this.peer2.setRemoteDescription(offer);

        // Create answer from Peer 2
        const answer = await this.peer2.createAnswer();
        await this.peer2.setLocalDescription(answer);
    },

    // Set remote answer on Peer 1 to finalize connection
    async setRemoteAnswer(
        answerSDP: any,
    ) {
        const answer = JSON.parse(answerSDP);
        await this.peer1.setRemoteDescription(answer);
    },

    // Send message over DataChannel
    sendMessage() {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.send(this.message);
        } else if (this.receiveChannel && this.receiveChannel.readyState === "open") {
            this.receiveChannel.send(this.message);
        } else {
            alert("Connection is not established yet.");
        }
    },
}));

console.log('⚙️ Starting alpine');


// async function pageReady() {
//     uuid = createUUID();

//     localVideo = document.getElementById('localVideo');
//     remoteVideo = document.getElementById('remoteVideo');

//     serverConnection = new WebSocket(`wss://${window.location.hostname}:8443`);
//     serverConnection.onmessage = gotMessageFromServer;

//     const constraints = {
//         video: true,
//         audio: true,
//     };

//     if (!navigator.mediaDevices.getUserMedia) {
//         alert('Your browser does not support getUserMedia API');
//         return;
//     }

//     try {
//         const stream = await navigator.mediaDevices.getUserMedia(constraints);

//         localStream = stream;
//         localVideo.srcObject = stream;
//     } catch (error) {
//         errorHandler(error);
//     }
// }

// function start(isCaller) {
//     peerConnection = new RTCPeerConnection(peerConnectionConfig);
//     peerConnection.onicecandidate = gotIceCandidate;
//     peerConnection.ontrack = gotRemoteStream;

//     for (const track of localStream.getTracks()) {
//         peerConnection.addTrack(track, localStream);
//     }

//     if (isCaller) {
//         peerConnection.createOffer().then(createdDescription).catch(errorHandler);
//     }
// }

// function gotMessageFromServer(message) {
//     if (!peerConnection) start(false);

//     const signal = JSON.parse(message.data);

//     // Ignore messages from ourself
//     if (signal.uuid == uuid) return;

//     if (signal.sdp) {
//         peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
//             // Only create answers in response to offers
//             if (signal.sdp.type !== 'offer') return;

//             peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
//         }).catch(errorHandler);
//     } else if (signal.ice) {
//         peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
//     }
// }

// function gotIceCandidate(event) {
//     if (event.candidate != null) {
//         serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }));
//     }
// }

// function createdDescription(description) {
//     console.log('got description');

//     peerConnection.setLocalDescription(description).then(() => {
//         serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }));
//     }).catch(errorHandler);
// }

// function gotRemoteStream(event) {
//     console.log('got remote stream');
//     remoteVideo.srcObject = event.streams[0];
// }

// function errorHandler(error) {
//     console.log(error);
// }

// // Taken from http://stackoverflow.com/a/105074/515584
// // Strictly speaking, it's not a real UUID, but it gets the job done here
// function createUUID() {
//     function s4() {
//         return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
//     }

//     return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
// }