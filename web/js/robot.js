/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';
var countIDMsg = 0;
var myUsername = "ROBOT";
var targetUsername = "PILOT";
var pc1 = null; // pilotPC
var webcamStream = null;        // MediaStream from webcam
var transceiver = null;         // RTCRtpTransceiver

var scan_conn_flag_ = true;

var myHostname = "";

var mediaConstraints;
var mediaConstraints2;

var vel_Left = 0.0;
var vel_Right = 0.0;
var vel_lin = 0.0;
var vel_ang = 0.0;
const W_wheel = 0.5;
const R_wheel = 1.0;

var num_recv = 0;
var num_recv_lin = 0;
var num_recv_ang = 0;
var enable_cmd = false;

// fully automated connection via Node.js server
window.onload = startupCode;

// const SERVER_IP_ = "10.244.75.85";
// const SERVER_IP_ = "10.244.207.185";

// const SERVER_IP_ = "10.244.86.201";
// test mercoledi
// const SERVER_IP_ = "10.244.107.78"; // REMOTE
// const SERVER_IP_ = "10.101.7.46"; // LOCAL
const SERVER_IP_ = window.location.hostname; // auto
var instructions_text = "";

async function startupCode()
{
  var count_cam = 0;
  await navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    devices.forEach(function(device) {
      if(device.kind === 'videoinput')
      { 
        switch(count_cam)
        {
          case 0:
            mediaConstraints = {
              audio: true,            // We want an audio track
              //video: true
              video: {
                deviceId: device.deviceId

                //facingMode: 'user'
              }
            };
            console.log(device.deviceId);
            break;
          case 1:
            mediaConstraints2 = {
              audio: true,            // We want an audio track
              //video: true
              video: {
                deviceId: device.deviceId
                //facingMode: 'user'
              }
            };
            console.log(device.deviceId);
            break;
        }
        count_cam ++;
      }
      console.log(device.kind + ": " + device.label +
                  " id = " + device.deviceId);
    });
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });
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
  console.log("Started!");
}


const video1 = document.querySelector('video#video1_robot');
const video2 = document.querySelector('video#video2_robot');

const audioCheckbox = document.querySelector('input#audio');
const connectionCheckbox = document.querySelector('input#scan_conn');
const div_num_recv = document.getElementById('div_num_recv');

const rotateBtn = document.getElementById('rotateBtn');
const rotateAnversaBtn = document.getElementById('rotateAnversaBtn');
const forwardBtn = document.getElementById('forwardBtn');
const backwardBtn = document.getElementById('backwardBtn');
const stopBtn = document.getElementById('stopBtn');

rotateBtn.onclick = rotateRobot;
rotateAnversaBtn.onclick = rotateAnversaRobot;
forwardBtn.onclick = forwardRobot;
backwardBtn.onclick = backwardRobot;
stopBtn.onclick = stopRobot;

// execute code before quitting
window.onbeforeunload = closingCode;
function closingCode(){
  console.log("Closing onbeforeunload");
  // sleep(5000);
  console.log(bleDevice);
  if(bleDevice.device) {
    bleDevice.disconnect();
    console.log("Disconnecting BLE device");
  }
   // do something...
   closeVideoCall();
   return null;
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
//var Negotiation = 0;
async function handleNegotiationNeededEvent() {
  console.log("___________________________");
  console.log("__ NEGOTIATION NEEDED _____");
  console.log("___________________________");
  /*if(Negotiation === 0 )
  {
      Negotiation++;
  }
  else
  {
      return;
  }*/
  console.log("*** Negotiation needed");

  try {
    console.log("---> Creating offer");
    console.log("___________________________");
    console.log("____ CREATING OFFER _______");
    console.log("___________________________");
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
    console.log("___________________________");
    console.log("__ SENDING VIDEO OFFER_____");
    console.log("___________________________");
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
  }

  connection.onerror = function(evt) {
    console.dir(evt);
  }

  connection.onmessage = function(evt) {
    var chatBox = document.querySelector(".chatbox");
    var text = "";
    console.log('Guarda qua');
    console.log(evt.data);
    console.log(evt);

    /*var msg = "";
    if (typeof evt.data === 'object') {
      // do nothing...
      console.log("Joystick message");
      msg = evt.data;
    } else {
      console.log("Normal message");
      console.log("typeof evt.data");
      console.log(typeof evt.data);
      msg = JSON.parse(evt.data);
    }*/
    var msg = JSON.parse(evt.data);
    console.log("Message received: ");
    console.dir(msg);
    var time = new Date(msg.date);
    var timeStr = time.toLocaleTimeString();

    switch(msg.type) {
      case "instructions_text":
        document.getElementById('ip_address').innerHTML = msg.text;
        break;

      case "disconnecting":
        console.log("Received disconnecting message from: " + msg.name);
        //Negotiation = 0;
        // closeVideoCall();
        // window.location.reload(false); 
        if(msg.name === "PILOT") handleHangUpMsg(msg);
        if(msg.name === "PILOT" || msg.name === "ROBOT") {
          emergency_brake();
        }
        if(bleDevice.device)
        {
          console.log('Disconnecting BLE device');
          bleDevice.disconnect();
          connectionCheckbox.checked = false;
        }
        break;

      case "invite":
        console.log("Received invite message");
        //invite();
        break;

      case "id":
        console.log(`countDebug = ${countIDMsg}`);
        countIDMsg++;
        if(countIDMsg==1) {
          clientID = msg.id;
          setUsername();
        }
        break;

      case "username":
        text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
        break;

      case "message":
        text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
        break;

      case "docking-message":
        console.log("--------------------------");
        console.log(" Received docking message ");
        console.log("--------------------------");
        dock_robot();
        break;

      case "scan-conn-message":
            scan_conn_flag_ = msg.value;
            conn_discon();
            connectionCheckbox.checked = scan_conn_flag_;
            break;

      case "joy-message":
            console.log("--------------------------------");
            console.log("SINGLE JOYSTICK Message in a bottle!");
            console.log(msg.value_lin);
            console.log(msg.value_ang);
            console.log("--------------------------------");
            vel_lin = msg.value_lin;
            vel_ang = msg.value_ang;
            num_recv += 1;
            div_num_recv.innerHTML = `# num_recv = ${num_recv}`;
            compute_vel();
            break;

      case "cam_num":
              switch_cam(msg.value);
              break
      
      case "joyL-message":
            console.log("--------------------------------");
            console.log("JOYSTICK LEFT Message in a bottle!");
            console.log(msg.value);
            console.log("--------------------------------");
            vel_lin = -msg.value;
            num_recv_lin += 1;
            //div_num_recv_lin.innerHTML = `# lin = ${num_recv_lin}`;
            compute_vel();
            break;

      case "joyR-message":
            console.log("--------------------------------");
            console.log("JOYSTICK RIGHT Message in a bottle!");
            console.log(msg.value);
            console.log("--------------------------------");
            vel_ang = -msg.value;
            num_recv_ang += 1;
            //div_num_recv_ang.innerHTML = `# ang = ${num_recv_ang}`;
            compute_vel();
            break;

      case "text-message":
          console.log("--------------------------------");
          console.log("Message in a bottle!");
          console.log("A message from " + msg.name + " for " + msg.target);
          console.log(msg.text);
          console.log("--------------------------------");
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
        console.log("Robot has received a new-ice-candidate message.");
        handleNewICECandidateMsg(msg);
        break;

      case "hang-up": // The other peer has hung up the call
        handleHangUpMsg(msg);
        break;

      // Unknown message; output to console for debugging.

      default:
        console.log("Unknown message received:");
        console.log(msg);
    }

    // If there's text to insert into the chat buffer, do so now, then
    // scroll the chat panel so that the new text is visible.

    if (text.length) {
      chatBox.innerHTML += text;
      chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
    }
  }
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
  //if(0) {
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
        track => transceiver = pc1.addTransceiver(track, {streams: [webcamStream]}, {send: true, receive: true})
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
  console.log("*** Received hang up notification from other peer");

  closeVideoCall();
}

// Close the RTCPeerConnection and reset variables so that the user can
// make or receive another call if they wish. This is called both
// when the user hangs up, the other user hangs up, or if a connection
// failure is detected.

function closeVideoCall() {
  var localVideo = video1;

  console.log("Closing the call");

  console.log(" Stopping the robot");
  emergency_brake();

  // Close the RTCPeerConnection

  if (pc1) {
    console.log("--> Closing the peer connection");

    // // Stop all transceivers on the connection
    
    pc1.getTransceivers().forEach(transceiver => {
      console.log('transceiver.stop() should happen here');
      console.log(transceiver);
      try {
      transceiver.stop();
      } catch (e)
      {
        console.log(e);
      }
    });

    // Disconnect all our event listeners; we don't want stray events
    // to interfere with the hangup while it's ongoing.

    pc1.ontrack = null;
    pc1.onnicecandidate = null;
    pc1.oniceconnectionstatechange = null;
    pc1.onsignalingstatechange = null;
    pc1.onicegatheringstatechange = null;
    pc1.onnotificationneeded = null;


    // if (pc1) {
    //   pc1.getTransceivers().getTracks().forEach(function (track) { track.stop(); });
    // }

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

function compute_vel() {
 if(enable_cmd)
 {
    vel_Right = ((2 * vel_lin) + (vel_ang * W_wheel)) / (2 * R_wheel);
    vel_Left = ((2 * vel_lin) - (vel_ang * W_wheel)) / (2 * R_wheel);
    /*console.log(Math.round(vel_Left));
    console.log(Math.round(vel_Right));*/
    if(vel_Left < -200) { vel_Left = -200; }
    if(vel_Left > 200) {vel_Left = 200;}
    if(vel_Right < -200) { vel_Right = -200; }
    if(vel_Right > 200) {vel_Right = 200;}
    console.warn(`Math.round(vel_Left): ${Math.round(vel_Left)} Math.round(vel_Right): ${Math.round(vel_Right)}`);
    if(window.root != null && bleDevice.device != null)
    {
        window.root.device.motors.setLeftAndRightMotorSpeed(Math.round(vel_Left), Math.round(vel_Right));
    }
    else
    {
      console.log('Robot vehicle not connected');
    }
 } 
 else
  {
    console.log('Robot vehicle not connected');
  }
}

function rotateAnversaRobot() {
  window.root.device.motors.setLeftAndRightMotorSpeed(+20, -20);
}

function rotateRobot() {
  window.root.device.motors.setLeftAndRightMotorSpeed(-20, +20);
}

function forwardRobot() {
  console.log('Mando il robot avanti');
  // window.root.device.motors.setLeftAndRightMotorSpeed(+30, +30);
  // window.root.device.motors.setRightMotorSpeed(+30);
  // window.root.device.motors.setLeftMotorSpeed(+30);
  window.root.device.motors.setLeftAndRightMotorSpeed(20, 20);
}

function backwardRobot() {
  window.root.device.motors.setLeftAndRightMotorSpeed(-20, -20);
}

function stopRobot() {
  window.root.device.motors.setLeftAndRightMotorSpeed(Math.round(0), Math.round(0));
}

function dock_robot()
{
  window.root.device.motors.dockRobot();
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

function conn_discon(){
  if(scan_conn_flag_) 
    {
      bleDevice.scanAndConnect();
      enable_cmd = true;
    }
  else {
    if(bleDevice.device) {
      console.log('Disconnecting BLE device from robot side');
      bleDevice.disconnect();
      enable_cmd = false;
    }
  }
}

async function switch_cam(cam_numb)
{
  webcamStream.getTracks().forEach(track => {
        track.stop();
        });
  switch (cam_numb)
  {
    case 1:
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      } catch(err) {
        handleGetUserMediaError(err);
        return;
      }
      break;
    case 2:
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints2);
      } catch(err) {
        handleGetUserMediaError(err);
        return;
      }
      break;
  }
  video1.srcObject = webcamStream;
  try 
  {
    webcamStream.getTracks().forEach(
      track => transceiver.sender.replaceTrack(track)
    );
  }
  catch(err)
  {
      handleGetUserMediaError(err);
  }
}


async function switch_battery(el_battery) { 

  if (el_battery.checked) {

  }
}

  function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

function emergency_brake()
{
  if(vel_lin != 0 || vel_ang != 0) {
    console.log('Emergency brake: triggered!');
    vel_lin = 0;
    vel_ang = 0;
    div_num_recv.innerHTML = `# num_recv = PILOT CONNECTION LOST`;
    compute_vel();
  }
  else {
    console.log('Emergency brake: no need, all good');
  }
}