Object.defineProperty(exports, "__esModule", {
    value: true
});

var geoLocation = require("nativescript-geolocation");
var MockLocationManager = {
};
MockLocationManager.intervalId = null;
MockLocationManager._lastKnownLocation = null;
MockLocationManager._getRandomCoordinate = function () {
    var min = -180;
    var max = 180;
    return Math.floor(Math.random() * (max - min + 1) + min);
};
MockLocationManager.getNewLocation = function () {
    var newLocation = new android.location.Location("mockLocationProvider");
    var latitude = MockLocationManager._getRandomCoordinate();
    var longitude = MockLocationManager._getRandomCoordinate();
    newLocation.setLatitude(latitude);
    newLocation.setLongitude(longitude);
    newLocation.setTime((new Date()).getTime());
    newLocation.setAccuracy(500);

    return newLocation;
};
MockLocationManager.getLastLocation = function (maximumAge, resolve, reject) {
    var lastLocation = MockLocationManager._lastKnownLocation ?
        new geoLocation.Location(MockLocationManager._lastKnownLocation) : null;

    resolve(lastLocation);
};
MockLocationManager.removeLocationUpdates = function (listener) {
    clearInterval(MockLocationManager.intervalId);
};
MockLocationManager.requestLocationUpdates = function (locationRequest, locationCallback) {
    MockLocationManager.removeLocationUpdates(null);
    MockLocationManager.intervalId = setInterval(function () {
        locationCallback.onLocationResult({
            getLastLocation: function () {
                MockLocationManager._lastKnownLocation = MockLocationManager.getNewLocation();
                return MockLocationManager._lastKnownLocation;
            }
        });
    }, 500);
};
MockLocationManager.shouldSkipChecks = function () {
    return true;
}

exports.MockLocationManager = MockLocationManager;