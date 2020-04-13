#!/bin/bash

# git clone https://gitlab.com/danresearch/toolbox/webrtc_p2p_call

cd web
git clone https://github.com/matths/root-robot-ble-javascript.git root-robot
npm install -g express-generator # possibly not needed
npm install express
npm install websocket
npm install nipplejs --save # --save might not be needed