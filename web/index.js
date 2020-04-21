// const server = require('server');

// const {get, post}  = server.router;

// server({port : 3000}, [
//     get('/', ctx => 'Ciao')
// ])

'use strict';

const https = require('https');
const fs = require('fs');
const path = require("path");
var express = require('express');
var WebSocketServer = require('websocket').server;
var count = 0;
// var appendToMakeUnique = 0;

var lastConnectionRequestUsername = "";

function log(text) {
    var time = new Date();
  
    console.log("[SERVER " + time.toLocaleTimeString() + "] " + text);
}

// private Certificate
// console.log(path.resolve(__dirname,'security/server.key'));
const options = {
    key: fs.readFileSync(path.resolve(__dirname,'security/server.key')),
    cert: fs.readFileSync(path.resolve(__dirname,'security/server.crt'))
}

// roomba bluetooth setup page
/*var app_roomba = express();

app_roomba.use(express.static(__dirname));

app_roomba.get("/", function(req, res) {
    console.log("Pilot is connecting");
    res.sendFile(path.resolve(__dirname,'root-ble.html'));

});

var bodyParser_roomba = require("body-parser");
app_roomba.use(bodyParser_roomba.urlencoded({ extended: false }));

app_roomba.post("/", function(req,res){
    console.log("Received POST request from Pilot");
});

const port_roomba = 5555;

var server_roomba = https.createServer(options,app_roomba);
console.log("Pilot page listening on port: ", port_roomba);

server_roomba.listen(port_roomba);*/

// pilot setup page
var app_pilot = express();

app_pilot.use(express.static(__dirname));

app_pilot.get("/", function(req, res) {
    console.log("Pilot is connecting");
    lastConnectionRequestUsername = "PILOT";
    res.sendFile(path.resolve(__dirname,'pilot.html'));

});

var bodyParser = require("body-parser");
app_pilot.use(bodyParser.urlencoded({ extended: false }));

app_pilot.post("/", function(req,res){
    console.log("Received POST request from Pilot");
});

const port_pilot = 3333;

var server_pilot = https.createServer(options,app_pilot);
console.log("Pilot page listening on port: ", port_pilot);

server_pilot.listen(port_pilot);

// robot setup page
var app_robot = express();

app_robot.use(express.static(__dirname));

app_robot.get("/", function(req, res) {
    console.log("Robot is connecting");
    lastConnectionRequestUsername = "ROBOT";
    res.sendFile(path.resolve(__dirname,'robot.html'));
});

const port_robot = 4444;

var server_robot = https.createServer(options,app_robot);
console.log("Robot page listening on port: ", port_robot);


console.log("process.env.IP is ", process.env.IP);

server_robot.listen(port_robot);

var showInstructions = function()
{
    console.log("### Istruzioni ###");
    console.log("Le interfacce di rete su questo dispositivo sono:");

    var device_ip = '';

    var os = require('os');
    var ifaces = os.networkInterfaces();

    Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;
    
    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
        }

        if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        console.log(ifname + ':' + alias, iface.address);
        } else {
        // this interface has only one ipv4 adress
        console.log(ifname, iface.address);
        device_ip = iface.address;
        }
        ++alias;
    });
    });

    console.log('');
    console.log(`Collegare il dispositivo PILOTA a: https://${device_ip}:${port_pilot}`);
    console.log('');
    console.log(`Collegare il dispositivo ROBOT a:  https://${device_ip}:${port_robot}`);
    console.log('');
    console.log("##################");

}

showInstructions();
//////

// If we were able to get the key and certificate files, try to
// start up an HTTPS server.

var webServer = null;
var connectionArray = [];
var nextID = Date.now();

try {
  if (options.key && options.cert) {
    webServer = https.createServer(options, handleWebRequest);
  }
} catch(err) {
  webServer = null;
}

if (!webServer) {
  try {
    webServer = http.createServer({}, handleWebRequest);
  } catch(err) {
    webServer = null;
    log(`Error attempting to create HTTP(s) server: ${err.toString()}`);
  }
}

function originIsAllowed(origin) {
    return true;    // We will accept all connections
}

// Our HTTPS server does nothing but service WebSocket
// connections, so every request just returns 404. Real Web
// requests are handled by the main server on the box. If you
// want to, you can return real HTML here and serve Web content.

function handleWebRequest(request, response) {
    log ("Received request for " + request.url);
    response.writeHead(404);
    response.end();
  }
  
  // Spin up the HTTPS server on the port assigned to this sample.
  // This will be turned into a WebSocket port very shortly.
  
  var port_signal = 1111;
  webServer.listen(port_signal, function() {
    log(`Server is listening on port ${port_signal}`);
  });
  
  // Create the WebSocket server by converting the HTTPS server into one.
  
  var wsServer = new WebSocketServer({
    httpServer: webServer,
    autoAcceptConnections: false
  });
  
  if (!wsServer) {
    log("ERROR: Unable to create WbeSocket server!");
  }

  // Scan the list of connections and return the one for the specified
// clientID. Each login gets an ID that doesn't change during the session,
// so it can be tracked across username changes.
function getConnectionForID(id) {
    var connect = null;
    var i;
  
    for (i=0; i<connectionArray.length; i++) {
      if (connectionArray[i].clientID === id) {
        connect = connectionArray[i];
        break;
      }
    }
  
    return connect;
}

// Builds a message object of type "userlist" which contains the names of
// all connected users. Used to ramp up newly logged-in users and,
// inefficiently, to handle name change notifications.
function makeUserListMessage() {
    var userListMsg = {
      type: "userlist",
      users: []
    };
    var i;
  
    // Add the users to the list
  
    for (i=0; i<connectionArray.length; i++) {
      userListMsg.users.push(connectionArray[i].username);
    }
  
    return userListMsg;
  }

// Sends a "userlist" message to all chat members. This is a cheesy way
// to ensure that every join/drop is reflected everywhere. It would be more
// efficient to send simple join/drop messages to each user, but this is
// good enough for this simple example.
function sendUserListToAll() {
    var userListMsg = makeUserListMessage();
    var userListMsgStr = JSON.stringify(userListMsg);
    var i;
  
    for (i=0; i<connectionArray.length; i++) {
      connectionArray[i].sendUTF(userListMsgStr);
    }
}

  // Scans the list of users and see if the specified name is unique. If it is,
// return true. Otherwise, returns false. We want all users to have unique
// names.
function isUsernameUnique(name) {
    console.log("Checking if name " + name + " is unique");
    var isUnique = true;
    var i;
  
    for (i=0; i<connectionArray.length; i++) {
      if (connectionArray[i].username === name) {
        isUnique = false;
        break;
      }
    }
    return isUnique;
}
// Set up a "connect" message handler on our WebSocket server. This is
// called whenever a user connects to the server's port using the
// WebSocket protocol.

wsServer.on('request', function(request) {
    console.log(`Current users are: ---------------`);
    var i=0;
    // var robotConnected = false;
    // var pilotConnected = false;
    var alreadyConnectedUsername = "";
    for (i=0; i<connectionArray.length; i++) {
      console.log(connectionArray[i].username);
      if(connectionArray[i].username === "ROBOT") {
        // robotConnected = true;
        alreadyConnectedUsername = "ROBOT";
      }
      if(connectionArray[i].username === "PILOT") {
        // pilotConnected = true;
        alreadyConnectedUsername = "PILOT";
      }
    }
    console.log(`----------------------------------`);
    console.log('A new connection request arrived from: ' + lastConnectionRequestUsername);
    console.log(`----------------------------------`);

    log("New connection attempt");
    if (!originIsAllowed(request.origin)) {
      request.reject();
      log("Connection from " + request.origin + " rejected.");
      return;
    }
  
    // Accept the request and get a connection.
  
    var connection = request.accept("json", request.origin);
  
    // Add the new connection to our list of connections.
  
    log("Connection accepted from " + connection.remoteAddress);
    connectionArray.push(connection);
  
    connection.clientID = nextID;
    nextID++;
  
    // Send the new client its token; it send back a "username" message to
    // tell us what username they want to use.
  
    var msg = {
      type: "id",
      id: connection.clientID
    };
    connection.sendUTF(JSON.stringify(msg));
  

    // Allow invitation
    if(alreadyConnectedUsername === "PILOT" && lastConnectionRequestUsername === "ROBOT")
    {
      console.log("PILOT already connected. ROBOT attempting to connect. Notifying PILOT");
      var msgInvite = {
        type: "invite",
        from: "ROBOT",
        to: "PILOT"
      };
      // connection.sendUTF(JSON.stringify(msgInvite));
      sendToOneUser(msgInvite.to, JSON.stringify(msgInvite));
    }
    //

    // Set up a handler for the "message" event received over WebSocket. This
    // is a message sent by a client, and may be text to share with other
    // users, a private message (text or signaling) for one user, or a command
    // to the server.
  
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        log("Received message. Edit code in index.js for more details.");
        //log("Received Message: " + message.utf8Data);
  
        // Process incoming data.
  
        var sendToClients = true;
        msg = JSON.parse(message.utf8Data);
        var connect = getConnectionForID(msg.id);
  
        // Take a look at the incoming object and act on it based
        // on its type. Unknown message types are passed through,
        // since they may be used to implement client-side features.
        // Messages with a "target" property are sent only to a user
        // by that name.
  
        switch(msg.type) {
          // Rebound notification of disconnection
          case "disconnecting":
            console.log("Received disconnecting message from: " + msg.name);
            break;
          // Public, textual message
          case "message":
            msg.name = connect.username;
            msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
            break;

          case "joy-message":
            //console.log("--------------------------------");
            //console.log("SINGLE JOYSTICK Message in a bottle!");
            //console.log(msg.value_lin);
            //console.log(msg.value_ang);
            //console.log("--------------------------------");
            sendToOneUser(msg.target, JSON.stringify(msg));
            count+=1;
            console.log(count);
            sendToClients = false;  // We already sent the proper responses
            break;

          case "joyL-message":
            //console.log("--------------------------------");
            //console.log("JOYSTICK LEFT Message in a bottle!");
            //console.log("A message from " + msg.name + " for " + msg.target);
            //console.log(msg.value);
            //console.log("--------------------------------");
            sendToOneUser(msg.target, msg.value);
          break;
    
          case "joyR-message":
            //console.log("--------------------------------");
            //console.log("JOYSTICK RIGHT Message in a bottle!");
            //console.log("A message from " + msg.name + " for " + msg.target);
            //console.log(msg.value);
            //console.log("--------------------------------");
            sendToOneUser(msg.target, msg.value);
          break;

          case "text-message":
            console.log("--------------------------------");
            console.log("Message in a bottle!");
            console.log("A message from " + msg.name + " for " + msg.target);
            console.log(msg.text);
            console.log("--------------------------------");
            sendToOneUser(msg.target, msg.text);
            break;

          // Username change
          case "username":
            var nameChanged = false;
            var origName = msg.name;
  
            // Ensure the name is unique by appending a number to it
            // if it's not; keep trying that until it works.
            var appendToMakeUnique = 0;
            while (!isUsernameUnique(msg.name) && appendToMakeUnique < 1) {
              console.log("ERROR: username is not unique!");
              msg.name = origName + appendToMakeUnique;
              appendToMakeUnique++;
              nameChanged = true;
            }
  
            // If the name had to be changed, we send a "rejectusername"
            // message back to the user so they know their name has been
            // altered by the server.
            if (nameChanged) {
              var changeMsg = {
                id: msg.id,
                type: "rejectusername",
                name: msg.name
              };
              connect.sendUTF(JSON.stringify(changeMsg));
            }
  
            // Set this connection's final username and send out the
            // updated user list to all users. Yeah, we're sending a full
            // list instead of just updating. It's horribly inefficient
            // but this is a demo. Don't do this in a real app.
            connect.username = msg.name;
            sendUserListToAll();
            sendToClients = false;  // We already sent the proper responses
            break;
        }
  
        // Convert the revised message back to JSON and send it out
        // to the specified client or all clients, as appropriate. We
        // pass through any messages not specifically handled
        // in the select block above. This allows the clients to
        // exchange signaling and other control objects unimpeded.
  
        if (sendToClients) {
          var msgString = JSON.stringify(msg);
          var i;
  
          // If the message specifies a target username, only send the
          // message to them. Otherwise, send it to every user.
          if (msg.target && msg.target !== undefined && msg.target.length !== 0) {
            sendToOneUser(msg.target, msgString);
          } else {
            for (i=0; i<connectionArray.length; i++) {
              connectionArray[i].sendUTF(msgString);
            }
          }
        }
      }
    });
  
    // Handle the WebSocket "close" event; this means a user has logged off
    // or has been disconnected.
    connection.on('close', function(reason, description) {
      console.log("A user has disconnected");
      // First, remove the connection from the list of connections.
      connectionArray = connectionArray.filter(function(el, idx, ar) {
        return el.connected;
      });
  
      // Now send the updated user list. Again, please don't do this in a
      // real application. Your users won't like you very much.
      // sendUserListToAll();
  
      // Build and output log output for close information.
  
      var logMessage = "Connection closed: " + connection.remoteAddress + " (" +
                       reason;
      if (description !== null && description.length !== 0) {
        logMessage += ": " + description;
      }
      logMessage += ")";
      log(logMessage);
    });
  });

  // Sends a message (which is already stringified JSON) to a single
// user, given their username. We use this for the WebRTC signaling,
// and we could use it for private text messaging.
function sendToOneUser(target, msgString) {
    var isUnique = true;
    var i;
  
    for (i=0; i<connectionArray.length; i++) {
      if (connectionArray[i].username === target) {
        connectionArray[i].sendUTF(msgString);
        break;
      }
    }
  }