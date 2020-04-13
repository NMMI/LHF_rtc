
const moveButton = document.getElementById('moveBtn');

moveButton.onclick = move;

function move() {
  console.log("Move button clicked");
  window.root.device.motors.setLeftAndRightMotorSpeed(50,50);
}



window.LOG = 1;

var bleDevice = new BleDevice(Root.identifier, Root.services);

var my_robot = "";

bleDevice.addEventListener('connected', function (event) {
  btnDisconnect.removeAttribute('disabled');
  btnScanAndConnect.setAttribute('disabled', 'disabled');

  var root = new Root(bleDevice);
  root.setup(rootIsSetup);
  // my_robot = root;
  console.log('Robot connected OK');
});

bleDevice.addEventListener('disconnected', function (event) {
  btnScanAndConnect.removeAttribute('disabled');
  btnDisconnect.setAttribute('disabled', 'disabled');
});

var btnScanAndConnect = document.getElementById('btnScanAndConnect')
var btnDisconnect = document.getElementById('btnDisconnect')

btnScanAndConnect.addEventListener('pointerup', scanAndConnect)
btnDisconnect.addEventListener('pointerup', disconnect)

function scanAndConnect (event) {
  bleDevice.scanAndConnect();
}

function disconnect (event) {
  bleDevice.disconnect();
}

function rootIsSetup (root) {
  console.log('start using root', root);
  window.root = root;

  moveButton.disabled = false;
  // draw square example
  document.getElementById('log').innerHTML += '<br>Connected!';

  console.log('Muovo 15 cm');
  // window.root.device.motors.driveDistance(150,fatto);
  // root.device.motors.setLeftAndRightMotorSpeed(50,50);
  console.log('Fine 15 cm');
  // runQueue([go15cm, turn90deg, go15cm, turn90deg, go15cm, turn90deg, go15cm, turn90deg]);
}

function fatto()
{
  console.log('OK!')
}

// draw square example
function runQueue(arr) {
  document.getElementById('log').innerHTML += '<br>Starting motion command queue!';
  var fnc = arr.shift();
  var next = function () { runQueue(arr); };
  if (arr.length<=0) {
    next = function () { console.log('done'); }
  }
  fnc(next);
}

var go15cm = function (next) {
  console.log('Begin of go15cm');
  document.getElementById('log').innerHTML += '<br>Trying 15 cm forward!';
  window.root.device.motors.driveDistance(150, next);
  // window.root.device.motors.driveDistance(150, next, my_robot);
  document.getElementById('log').innerHTML += '<br>Should have moved 15 cm forward!';
  console.log('End of go15cm');
}
var turn90deg = function (next) {
  console.log('Begin of turn90deg');
  document.getElementById('log').innerHTML += '<br>Tring 90 deg rotation!';
  window.root.device.motors.rotateAngel(900, next);
  console.log('End of turn90deg');
}

