
window.LOG = 1;

var bleDevice = new BleDevice(Root.identifier, Root.services);

bleDevice.addEventListener('connected', function (event) {
  btnDisconnect.removeAttribute('disabled');
  btnScanAndConnect.setAttribute('disabled', 'disabled');

  var root = new Root(bleDevice);
  root.setup(rootIsSetup);

  // draw square example
  runQueue([go15cm, turn90deg, go15cm, turn90deg, go15cm, turn90deg, go15cm, turn90deg]);
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
}


// draw square example
function runQueue(arr) {
  var fnc = arr.shift();
  var next = function () { runQueue(arr); };
  if (arr.length<=0) {
    next = function () { console.log('done'); }
  }
  fnc(next);
}

var go15cm = function (next) {
  root.device.motors.driveDistance(150, next);
}
var turn90deg = function (next) {
  root.device.motors.rotateAngel(900, next);
}

