function BleDevice(identifier, services) {
    this.init(identifier, services);
}
var device_ = null;
var flag = false;
Object.assign(BleDevice.prototype, {

    init: function (identifier, services) {
      this.device = null;
      this.server = null;
      this.scanOptions = {
        acceptAllDevices: false,
        filters: [{services: [identifier]}],
        optionalServices: services
      };
    },

    log: function () {
      if (window.LOG) {
        console.log.apply(console, arguments);
      }
    },

    scanAndConnect: function () {
      var self = this;
      if(!flag)
      {
        flag = true;
        navigator.bluetooth.requestDevice(this.scanOptions)
        .then(function (device) {
          device_ = device;
          self.device = device;
          self.device.addEventListener('gattserverdisconnected', self.disconnectedBleDeviceHandler.bind(self));
          self.log('BLE device selected', self.device);
          self.connectBleDevice();
        })
        .catch(function(error) {
          self.log('BLE device not selected', error);
        })
      }
      else
      {
        self.device = device_;
        self.device.addEventListener('gattserverdisconnected', self.disconnectedBleDeviceHandler.bind(self));
        self.log('BLE device selected', self.device);
        self.connectBleDevice();
      }
      
    },

    connectBleDevice: function () {
      var self = this;
      this.device.gatt.connect()
      .then(function (server) {
        self.server = server;
        self.log('BLE device connected');
        self.dispatchEvent({type:'connected'});
      })
      .catch(function (error) {
        self.log('BLE device not connected', error);
      })
      console.log('Connection established with BLE device');
    },

    disconnect: function () {
      if (this.device && this.device.gatt.connected) {
        this.device.gatt.disconnect();
        this.device = null;
      }
    },

    disconnectedBleDeviceHandler: function () {
      this.log('BLE device disconnected in disconnectedBleDeviceHandler');
      this.dispatchEvent({type:'disconnected'});
    },

    getCharacteristicByServiceUuidAndCharacteristicUuid: function (serviceUuid, characteristicUuid, characteristicCallback) {
      var self = this;
      this.server.getPrimaryService(serviceUuid)
      .then(function (service) {
        return service.getCharacteristic(characteristicUuid);
      })
      .then(function (characteristic) {
        characteristicCallback(characteristic);
      })
      .catch(function (e) {
        self.log('error', e);
      });
    },

    readValueFromCharacteristic: function (characteristic, valueCallback) {
      var self = this;
      characteristic.readValue()
      .then(function (value) {
        valueCallback(value);
      })
      .catch(function (e) {
        self.log('error', e);
      });
    },

    writeValueFromCharacteristic: function (characteristic, value) {
      var self = this;
      characteristic.writeValue(value)
    },

    listenForNotificationValueFromCharacteristic: function (characteristic, valueCallback) {
      characteristic.addEventListener('characteristicvaluechanged', function (event) {
        valueCallback(event);
      });
      characteristic.startNotifications();
    }
});

Object.assign(BleDevice.prototype, EventDispatcher.prototype);
