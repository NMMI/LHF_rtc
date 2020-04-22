/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';



var myUsername = "PILOT";
var targetUsername = "ROBOT";

var myHostname = "";

var mediaConstraints = {
  audio: true,            // We want an audio track
  video: false
  /*video: {
    aspectRatio: {
      ideal: 1.333333     // 3:2 aspect is preferred
    }
  }*/
};

var webcamStream = null;        // MediaStream from webcam
var transceiver = null;         // RTCRtpTransceiver

var num_sent = 0;
var num_sent_ang = 0;

// function log(text) {
//   var time = new Date();

//   console.log("[PILOT " + time.toLocaleTimeString() + "] " + text);
// }

// fully automated connection via Node.js server
window.onload = startupCode;

// const SERVER_IP_ = "10.244.75.85";
// const SERVER_IP_ = "10.244.207.185";
// const SERVER_IP_ = "10.244.86.201";
// test mercoledi
// const SERVER_IP_ = "10.244.107.78"; // REMOTE
// const SERVER_IP_ = "10.101.7.46"; // LOCAL
const SERVER_IP_ = window.location.hostname; // auto

async function startupCode()
{
  console.log("Start me up");

  document.getElementById('ip_address').innerHTML = 'Indirizzo server: ' + SERVER_IP_;

  // Get our hostname
  // myHostname =  window.location.hostname;
  myHostname = SERVER_IP_;
  if (!myHostname) {
    myHostname = "localhost";
  }
  console.log("Hostname: " + myHostname);

  // starting negotiation
  console.log('Connecting to signaling server');
  connect();
  console.log('Sleep');
  await sleep(2000); //waiting for connection
  
  // start video stuff
  // startAuto();
  invite();

  console.log("Started!");

}


const video1 = document.querySelector('video#video1_pilot');
const video2 = document.querySelector('video#video2_pilot');

// const statusDiv = document.querySelector('div#status');

const audioCheckbox = document.querySelector('input#audio');

const div_num_recv = document.getElementById('div_num_recv');
//const div_num_recv_ang = document.getElementById('div_num_recv_ang');

//const messageButton = document.querySelector('button#messageBtn');
//const messageText = document.querySelector('input#messageText');

const dockingButton = document.getElementById('dockingButton');

// const startButton = document.querySelector('button#start');
// const callButton = document.querySelector('button#call');
// const insertRelayButton = document.querySelector('button#insertRelay');
// const hangupButton = document.querySelector('button#hangup');

//messageButton.onclick = sendMessageButton;
dockingButton.onclick = sendDockingMessage;

// startButton.onclick = start;
// callButton.onclick = call;
// insertRelayButton.onclick = insertRelay;
// hangupButton.onclick = hangup;

const pipes = [];

let localStream;
let remoteStream;

/*function gotStream(stream) {
  console.log('Received local stream');
  video1.srcObject = stream;
  localStream = stream;
  callButton.disabled = false;

  console.log(`gotStream: ${localStream}`);

  callAuto(); // TODO continue from here
  // we need to return the offer to the index.js script
  // so that it can be sent to the robot.js
}*/

function gotremoteStream(stream) {
  remoteStream = stream;
  video2.srcObject = stream;
  console.log('Received remote stream');
  console.log(`${pipes.length} element(s) in chain`);
  statusDiv.textContent = `${pipes.length} element(s) in chain`;
  insertRelayButton.disabled = false;
}

// function start() {
//   console.log('Requesting local stream');
//   startButton.disabled = true;
//   const options = audioCheckbox.checked ? {audio: true, video: true} : {audio: false, video: true};
//   navigator.mediaDevices
//       .getUserMedia(options)
//       .then(gotStream)
//       .catch(function(e) {
//         alert('getUserMedia() failed');
//         console.log('getUserMedia() error: ', e);
//       });
  
// }

// function call() {
//   callButton.disabled = true;
//   insertRelayButton.disabled = false;
//   hangupButton.disabled = false;
//   console.log('Starting call');
//   console.log(localStream);
//   console.log('localStream');
//   console.log('gotremoteStream');
//   console.log(gotremoteStream);
//   pipes.push(new VideoPipe(localStream, gotremoteStream));
// }

// function insertRelay() {
//   console.log('remoteStream');
//   console.log(remoteStream);
//   pipes.push(new VideoPipe(remoteStream, gotremoteStream));
//   insertRelayButton.disabled = true;
// }

/*function hangup() {
  console.log('Ending call');
  while (pipes.length > 0) {
    const pipe = pipes.pop();
    pipe.close();
  }
  // insertRelayButton.disabled = true;
  hangupButton.disabled = true;
  callButton.disabled = false;
}*/

// execute code before quitting
window.onbeforeunload = closingCode;
function closingCode(){
   // do something...
   closeVideoCall();
   return null;
}




/*async function startAuto() {
  console.log('Requesting local stream in automatic mode');
  var success = true;
  // startButton.disabled = true;
  const options_media = {audio: true, video: true};
  await navigator.mediaDevices
      .getUserMedia(options_media)
      .then(gotStream)
      .catch(function(e) {
        // alert('getUserMedia() failed');
        console.log('getUserMedia() error: ', e);
        success = false;
      });

  console.log(`startAuto: ${localStream}`);
  
  return success;
}*/

/*function callAuto() {
  console.log("Starting call negotiation");

  callButton.disabled = true;
  // insertRelayButton.disabled = false;
  // hangupButton.disabled = false;

  console.log('localStream');
  console.log(localStream);

  // pipes.push(new VideoPipe_pilot(localStream, gotremoteStream));
  invite();
}*/

// Handle a click on an item in the user list by inviting the clicked
// user to video chat. Note that we don't actually send a message to
// the callee here -- calling RTCPeerConnection.addTrack() issues
// a |notificationneeded| event, so we'll let our handler for that
// make the offer.

async function invite() {
  console.log("Starting to prepare an invitation");
  if (pc1) {
    alert("You can't start a call because you already have one open!");
    console.log("You can't start a call because you already have one open!");
  } else {
    console.log("Inviting user " + targetUsername);

    // Call createPeerConnection() to create the RTCPeerConnection.
    // When this returns, pc1 is our RTCPeerConnection
    // and webcamStream is a stream coming from the camera. They are
    // not linked together in any way yet.

    console.log("Setting up connection to invite user: " + targetUsername);
    createPeerConnection();

    // Get access to the webcam stream and attach it to the
    // "preview" box (id "local_video").

    try {
      webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      video1.srcObject = webcamStream;
    } catch(err) {
      handleGetUserMediaError(err);
      return;
    }

    // Add the tracks from the stream to the RTCPeerConnection

    try {
      webcamStream.getTracks().forEach(
        transceiver = track => pc1.addTransceiver(track, {streams: [webcamStream]})
      );
    } catch(err) {
      handleGetUserMediaError(err);
    }
  }
}

/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
//
// A "videopipe" abstraction on top of WebRTC.
//
// The usage of this abstraction:
// var pipe = new VideoPipe(mediastream, handlerFunction);
// handlerFunction = function(mediastream) {
//   do_something
// }
// pipe.close();
//
// The VideoPipe will set up 2 PeerConnections, connect them to each
// other, and call HandlerFunction when the stream is available in the
// second PeerConnection.
//

function errorHandler(context) {
  return function(error) {
    trace('Failure in ' + context + ': ' + error.toString);
  };
}

// eslint-disable-next-line no-unused-vars
function successHandler(context) {
  return function() {
    trace('Success in ' + context);
  };
}

function noAction() {
}

var pc1; // pilotPC


// ICE STUFF

// Handles |icecandidate| events by forwarding the specified
// ICE candidate (created by our local ICE agent) to the other
// peer through the signaling server.

function handleICECandidateEvent(event) {
  if (event.candidate) {
    console.log("*** Outgoing ICE candidate: " + event.candidate.candidate);

    sendToServer({
      type: "new-ice-candidate",
      target: targetUsername,
      candidate: event.candidate
    });
  }
}

// Handle |iceconnectionstatechange| events. This will detect
// when the ICE connection is closed, failed, or disconnected.
//
// This is called when the state of the ICE agent changes.

function handleICEConnectionStateChangeEvent(event) {
  console.log("*** ICE connection state changed to " + pc1.iceConnectionState);

  switch(pc1.iceConnectionState) {
    case "closed":
    case "failed":
    case "disconnected":
      closeVideoCall();
      break;
  }
}

// Handle the |icegatheringstatechange| event. This lets us know what the
// ICE engine is currently working on: "new" means no networking has happened
// yet, "gathering" means the ICE engine is currently gathering candidates,
// and "complete" means gathering is complete. Note that the engine can
// alternate between "gathering" and "complete" repeatedly as needs and
// circumstances change.
//
// We don't need to do anything when this happens, but we log it to the
// console so you can see what's going on when playing with the sample.

function handleICEGatheringStateChangeEvent(event) {
  console.log("*** ICE gathering state changed to: " + pc1.iceGatheringState);
}

// Set up a |signalingstatechange| event handler. This will detect when
// the signaling connection is closed.
//
// NOTE: This will actually move to the new RTCPeerConnectionState enum
// returned in the property RTCPeerConnection.connectionState when
// browsers catch up with the latest version of the specification!

function handleSignalingStateChangeEvent(event) {
  console.log("*** WebRTC signaling state changed to: " + pc1.signalingState);
  switch(pc1.signalingState) {
    case "closed":
      closeVideoCall();
      break;
  }
}

// Called by the WebRTC layer to let us know when it's time to
// begin, resume, or restart ICE negotiation.
var Negotiation = 0;
async function handleNegotiationNeededEvent() {
  if(Negotiation === 0 )
  {
      Negotiation++;
  }
  else
  {
      return;
  }
  console.log("*** Negotiation needed");

  try {
    console.log("---> Creating offer");
    const offer = await pc1.createOffer();

    // If the connection hasn't yet achieved the "stable" state,
    // return to the caller. Another negotiationneeded event
    // will be fired when the state stabilizes.

    if (pc1.signalingState != "stable") {
      console.log("     -- The connection isn't stable yet; postponing...")
      return;
    }

    // Establish the offer as the local peer's current
    // description.

    console.log("---> Setting local description to the offer");
    await pc1.setLocalDescription(offer);

    // Send the offer to the remote peer.

    console.log("---> Sending the offer to the remote peer");
    sendToServer({
      name: myUsername,
      target: targetUsername,
      type: "video-offer",
      sdp: pc1.localDescription
    });
  } catch(err) {
    console.log("*** The following error occurred while handling the negotiationneeded event:");
    reportError(err);
  };
}

// Called by the WebRTC layer when events occur on the media tracks
// on our WebRTC call. This includes when streams are added to and
// removed from the call.
//
// track events include the following fields:
//
// RTCRtpReceiver       receiver
// MediaStreamTrack     track
// MediaStream[]        streams
// RTCRtpTransceiver    transceiver
//
// In our case, we're just taking the first stream found and attaching
// it to the <video> element for incoming media.

function handleTrackEvent(event) {
  console.log("*** Track event");
  video2.srcObject = event.streams[0];
  // document.getElementById("video2").srcObject = event.streams[0];
  //document.getElementById("hangup").disabled = false;
}

// signaling stuff
var connection = null;


function sendToServer(msg) {
  var msgJSON = JSON.stringify(msg);

  console.log("Sending '" + msg.type + "' message: " + msgJSON);
  connection.send(msgJSON);
}


function setUsername() {
  // myUsername = "PILOT";

  sendToServer({
    name: myUsername,
    date: Date.now(),
    id: clientID,
    type: "username"
  });
}

// Given a message containing a list of usernames, this function
// populates the user list box with those names, making each item
// clickable to allow starting a video call.

function handleUserlistMsg(msg) {
  console.log(`Received user list msg: ${msg}`);
  /*
  var i;
  var listElem = document.querySelector(".userlistbox");

  // Remove all current list members. We could do this smarter,
  // by adding and updating users instead of rebuilding from
  // scratch but this will do for this sample.

  while (listElem.firstChild) {
    listElem.removeChild(listElem.firstChild);
  }

  // Add member names from the received list.

  msg.users.forEach(function(username) {
    var item = document.createElement("li");
    item.appendChild(document.createTextNode(username));
    item.addEventListener("click", invite, false);

    listElem.appendChild(item);
  });
  */
}


// Open and configure the connection to the WebSocket server.
var clientID = 0;

function connect() {
  var serverUrl;
  var scheme = "wss";

  // If this is an HTTPS connection, we have to use a secure WebSocket
  // connection too, so add another "s" to the scheme.
  serverUrl = scheme + "://" + myHostname + ":1111";

  console.log(`Connecting to server: ${serverUrl}`);
  connection = new WebSocket(serverUrl, "json");

  connection.onopen = function(evt) {
    console.log("Connection established");
    // document.getElementById("text").disabled = false;
    // document.getElementById("send").disabled = false;
  };

  connection.onerror = function(evt) {
    console.dir(evt);
  }

  connection.onmessage = function(evt) {
    var chatBox = document.querySelector(".chatbox");
    var text = "";
    var msg = JSON.parse(evt.data);
    console.log("Message received: ");
    console.dir(msg);
    var time = new Date(msg.date);
    var timeStr = time.toLocaleTimeString();

    switch(msg.type) {
      case "invite":
        console.log("Received invite message from " + msg.from);
        // closeVideoCall();
        // invite();
        window.location.reload(false); 
        break;

      case "id":
        clientID = msg.id;
        setUsername();
        break;

      case "username":
        text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
        break;

      case "message":
        text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
        break;

      case "rejectusername":
        myUsername = msg.name;
        text = "<b>Your username has been set to <em>" + myUsername +
          "</em> because the name you chose is in use.</b><br>";
        break;

      case "userlist":      // Received an updated user list
        handleUserlistMsg(msg);
        break;

      // Signaling messages: these messages are used to trade WebRTC
      // signaling information during negotiations leading up to a video
      // call.

      case "video-offer":  // Invitation and offer to chat
        console.log("Received a video offer");
        handleVideoOfferMsg(msg);
        break;

      case "video-answer":  // Callee has answered our offer
        console.log("Received a video answer");
        handleVideoAnswerMsg(msg);
        break;

      case "new-ice-candidate": // A new ICE candidate has been received
        console.log("Pilot has received a new-ice-candidate message");
        handleNewICECandidateMsg(msg);
        break;

      case "hang-up": // The other peer has hung up the call
        handleHangUpMsg(msg);
        break;

      // Unknown message; output to console for debugging.

      default:
        log_error("Unknown message received:");
        log_error(msg);
    }

    // If there's text to insert into the chat buffer, do so now, then
    // scroll the chat panel so that the new text is visible.

    if (text.length) {
      chatBox.innerHTML += text;
      chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
    }
  };
}

// Handles reporting errors. Currently, we just dump stuff to console but
// in a real-world application, an appropriate (and user-friendly)
// error message should be displayed.

function reportError(errMessage) {
  var errStr = `Error ${errMessage.name}: ${errMessage.message}`;
  console.log(errStr);
  // alert(errStr);
}


// handlers for ice stuff

// A new ICE candidate has been received from the other peer. Call
// RTCPeerConnection.addIceCandidate() to send it along to the
// local ICE framework.

async function handleNewICECandidateMsg(msg) {
  var candidate = new RTCIceCandidate(msg.candidate);
  // console.log(msg);
  // console.log("*** Adding received ICE candidate: " + JSON.stringify(candidate));
  console.log("*** Robot Adding received ICE candidate ***");
  try {
    await pc1.addIceCandidate(candidate)
  } catch(err) {
    reportError(err);
  }
}

// Create the RTCPeerConnection which knows how to talk to our
// selected STUN/TURN server and then uses getUserMedia() to find
// our camera and microphone and add that stream to the connection for
// use in our video call. Then we configure event handlers to get
// needed notifications on the call.

async function createPeerConnection() {
  console.log("Setting up a connection...");

  // Create an RTCPeerConnection which knows to use our chosen
  // STUN server.
  let servers = null;
  pc1 = new RTCPeerConnection(servers);

  // Set up event handlers for the ICE negotiation process.

  pc1.onicecandidate = handleICECandidateEvent;
  pc1.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  pc1.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  pc1.onsignalingstatechange = handleSignalingStateChangeEvent;
  pc1.onnegotiationneeded = handleNegotiationNeededEvent;
  pc1.ontrack = handleTrackEvent;
}

// Accept an offer to video chat. We configure our local settings,
// create our RTCPeerConnection, get and attach our local camera
// stream, then create and send an answer to the caller.

async function handleVideoOfferMsg(msg) {
  targetUsername = msg.name;

  // If we're not already connected, create an RTCPeerConnection
  // to be linked to the caller.

  console.log("Received video chat offer from " + targetUsername);
  if (!pc1) {
    console.log('No connection yet, connecting...');
    createPeerConnection();
  } else {
    console.log('Should be already connected...');
  }
  console.log('pc1.signalingState');
  console.log(pc1.signalingState);

  // We need to set the remote description to the received SDP offer
  // so that our local WebRTC layer knows how to talk to the caller.

  var desc = new RTCSessionDescription(msg.sdp);

  // If the connection isn't stable yet, wait for it...

  if (pc1.signalingState != "stable") {
    console.log("  - But the signaling state isn't stable, so triggering rollback");

    // Set the local and remove descriptions for rollback; don't proceed
    // until both return.
    await Promise.all([
      pc1.setLocalDescription({type: "rollback"}),
      pc1.setRemoteDescription(desc)
    ]);
    return;
  } else {
    console.log ("  - Setting remote description");
    await pc1.setRemoteDescription(desc);
  }

  // Get the webcam stream if we don't already have it

  if (!webcamStream) {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    } catch(err) {
      handleGetUserMediaError(err);
      return;
    }

    video1.srcObject = webcamStream;

    // Add the camera stream to the RTCPeerConnection

    try {
      webcamStream.getTracks().forEach(
        transceiver = track => pc1.addTransceiver(track, {streams: [webcamStream]})
      );
    } catch(err) {
      handleGetUserMediaError(err);
    }
  }

  console.log("---> Creating and sending answer to caller");

  await pc1.setLocalDescription(await pc1.createAnswer());

  sendToServer({
    name: myUsername,
    target: targetUsername,
    type: "video-answer",
    sdp: pc1.localDescription
  });
}

// Responds to the "video-answer" message sent to the caller
// once the callee has decided to accept our request to talk.

async function handleVideoAnswerMsg(msg) {
  console.log("*** Call recipient has accepted our call");

  // Configure the remote description, which is the SDP payload
  // in our "video-answer" message.

  var desc = new RTCSessionDescription(msg.sdp);
  await pc1.setRemoteDescription(desc).catch(reportError);
}

// Handle the "hang-up" message, which is sent if the other peer
// has hung up the call or otherwise disconnected.

function handleHangUpMsg(msg) {
  log("*** Received hang up notification from other peer");

  closeVideoCall();
}

// Close the RTCPeerConnection and reset variables so that the user can
// make or receive another call if they wish. This is called both
// when the user hangs up, the other user hangs up, or if a connection
// failure is detected.

function closeVideoCall() {
  var localVideo = video1;

  console.log("Closing the call");

  // Close the RTCPeerConnection

  if (pc1) {
    console.log("--> Closing the peer connection");

    // Disconnect all our event listeners; we don't want stray events
    // to interfere with the hangup while it's ongoing.

    pc1.ontrack = null;
    pc1.onnicecandidate = null;
    pc1.oniceconnectionstatechange = null;
    pc1.onsignalingstatechange = null;
    pc1.onicegatheringstatechange = null;
    pc1.onnotificationneeded = null;

    // Stop all transceivers on the connection

    // pc1.getTransceivers().forEach(transceiver_ => {
    //   transceiver_.stop();
    // });

    // Stop the webcam preview as well by pausing the <video>
    // element, then stopping each of the getUserMedia() tracks
    // on it.

    if (localVideo.srcObject) {
      localVideo.pause();
      localVideo.srcObject.getTracks().forEach(track => {
        track.stop();
      });
    }

    // Close the peer connection

    pc1.close();
    pc1 = null;
    webcamStream = null;

    // Send notification of disconnection
    var messageDisconnect = { 
      name: myUsername,
      target: targetUsername,
      type: "disconnecting",
    };
    sendToServer(messageDisconnect);
    
  }

  // Disable the hangup button

  // document.getElementById("hangup-button").disabled = true;
  // targetUsername = null;
}

// Handle errors which occur when trying to access the local media
// hardware; that is, exceptions thrown by getUserMedia(). The two most
// likely scenarios are that the user has no camera and/or microphone
// or that they declined to share their equipment when prompted. If
// they simply opted not to share their media, that's not really an
// error, so we won't present a message in that situation.

function handleGetUserMediaError(e) {
  console.log(e);
  switch(e.name) {
    case "NotFoundError":
      alert("Unable to open your call because no camera and/or microphone" +
            "were found.");
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      // Do nothing; this is the same as the user canceling the call.
      break;
    default:
      alert("Error opening your camera and/or microphone: " + e.message);
      break;
  }

  // Make sure we shut down our end of the RTCPeerConnection so we're
  // ready to try again.

  closeVideoCall();
}

// Text message exchange
function sendMessageButton()
{
  console.log('Pulsante premuto!');
  console.log(`Message is ${messageText.value}`);
  var message = { 
    name: myUsername,
    target: targetUsername,
    type: "text-message",
    text: messageText.value
  };
  sendToServer(message);
}

var offset_x;
var offset_y;

var relative_data = { 
    position: 
      {
        x : 0.0,
        y : 0.0

      }
  };

//Retrieve Joysticks values
const max_speed = 150;
var angle = 0.0;
var direction = ""
var direction_old = ""
var vel_lin = 0;
var vel_ang = 0;
var flag_send_zero = false;
joystick.on('start', function(evt, data) { 
                        /*nothing*/
                        }).on('move', function(evt, data) {
                                          angle = data.angle.degree;

                                          if((angle>=0 && angle<22.5) || (angle>=337.5 && angle<=360))
                                          {
                                            direction = "right";
                                            vel_lin = 0;
                                            vel_ang = -max_speed;
                                          }
                                          else if(angle>=22.5 && angle<67.5)
                                          {
                                            direction = "right-up";
                                            vel_lin = max_speed;
                                            vel_ang = -max_speed;
                                          }
                                          else if(angle>=67.5 && angle<112.5)
                                          {
                                            direction = "up";
                                            vel_lin = max_speed;
                                            vel_ang = 0;
                                          }
                                          else if(angle>=112.5 && angle<157.5)
                                          {
                                            direction = "left-up";
                                            vel_lin = max_speed;
                                            vel_ang = max_speed;
                                          }
                                          else if(angle>=157.5 && angle<202.5)
                                          {
                                            direction = "left";
                                            vel_lin = 0;
                                            vel_ang = max_speed;
                                          }
                                          else if(angle>=202.5 && angle<245.5)
                                          {
                                            direction = "left-down";
                                            vel_lin = -max_speed;
                                            vel_ang = max_speed;
                                          }
                                          else if(angle>=245.5 && angle<292.5)
                                          {
                                            direction = "down";
                                            vel_lin = -max_speed;
                                            vel_ang = 0;
                                          }
                                          else if(angle>=292.5 && angle<337.5)
                                          {
                                            direction = "right-down";
                                            vel_lin = -max_speed;
                                            vel_ang = -max_speed;
                                          }

                                          /*if((angle>=0 && angle<45) || (angle>=315 && angle<=360))
                                          {
                                            direction = "right";
                                            vel_lin = 0;
                                            vel_ang = -max_speed;
                                          }
                                          else if(angle>=45 && angle<135)
                                          {
                                            direction = "up";
                                            vel_lin = max_speed;
                                            vel_ang = 0;
                                          }
                                          else if(angle>=135 && angle<225)
                                          {
                                            direction = "left";
                                            vel_lin = 0;
                                            vel_ang = max_speed;
                                          }
                                          else if(angle>=225 && angle<315)
                                          {
                                            direction = "down";
                                            vel_lin = -max_speed;
                                            vel_ang = 0;
                                          }*/

                                          if (direction.localeCompare(direction_old) && data.distance > 80)
                                          {
                                            //console.log(direction);
                                            sendMessageJoy(vel_lin, vel_ang);
                                            direction_old = direction;
                                            flag_send_zero = true;
                                          }
                                          else if(data.distance < 40 && flag_send_zero)
                                          {
                                            direction_old = "NULL";
                                            vel_lin = 0;
                                            vel_ang = 0;
                                            sendMessageJoy(vel_lin, vel_ang);
                                            flag_send_zero = false;
                                          }


                                          /*
                                          var joy_sign_y = Math.sign(data.position.y - offset_y);
                                          var joy_sign_x = Math.sign(data.position.x - offset_x);
                                          relative_data.position.x = max_speed*joy_sign_x;
                                          relative_data.position.y = max_speed*joy_sign_y;
                                          if(joy_flag || joyL_sign != joyL_sign_old) {
                                            sendMessageJoyL(relative_data_L);
                                            joyL_sign_old = joyL_sign;
                                            joyL_flag = false;
                                          }*/
                                        }).on('end', function(evt, data) {
                                          if(flag_send_zero){
                                            direction_old = "NULL";
                                            vel_lin = 0;
                                            vel_ang = 0;
                                            sendMessageJoy(vel_lin, vel_ang);
                                            flag_send_zero = false;
                                          }
                                          
                                        });

// Send Joystick value message
function sendMessageJoy(v_lin, v_ang)
{
  num_sent += 1;
  div_num_recv.innerHTML = `# cmds = ${num_sent}`;
  var message_joy = { 
    name: myUsername,
    target: targetUsername,
    type: "joy-message",
    value_lin: parseInt(v_lin,10),
    value_ang: parseInt(v_ang,10)
  };
  sendToServer(message_joy);
}


// Docking message
function sendDockingMessage()
{
  var message_dock_robot = { 
    name: myUsername,
    target: targetUsername,
    type: "docking-message"
  };
  sendToServer(message_dock_robot);
}

function switch_function(el) {    
    if (el.checked) {
      video2.muted = false;
    }
    else
    {
      video2.muted = true;
    } 

  }

async function switch_function_video(el_vide) {    
  if (el_vide.checked) {
    mediaConstraints = {
      audio: true,
      video: true
    };
    //console.log("checked")
  }
  else
  {
    mediaConstraints = {
      audio: true,
      video: false
    };
    //console.log("no checked")

  }


 /* try {
      webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      video1.srcObject = webcamStream;
      } catch(err) {
        handleGetUserMediaError(err);
        return;
      }


  try {
      webcamStream.getTracks().forEach(
        transceiver = track => pc1.addTransceiver(track, {streams: [webcamStream]})
      );
    } catch(err) {
      handleGetUserMediaError(err);
    }
  */
}

      

function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}