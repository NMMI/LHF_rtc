# LHF_rtc
Tool to communicate with video and audio through the browser (works on LAN)

# USERS - Manual installation

```
npm install express; npm install websocket
```

To run:

```
cd LHF_rtc
node index.js
```

# DEVELOPERS - setup

Windows: [Download Node.js](https://nodejs.org/it/download/)
Ubuntu: `sudo apt-get install node`

Then run as above.

It will show the *SERVER_IP*address on the current LAN.
Then https://SERVER_IP:1111 will manage the connections (users don't need to know this).

PILOT connects to https://SERVER_IP:3333
ROBOT connects to https://SERVER_IP:4444

