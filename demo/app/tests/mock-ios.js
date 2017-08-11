Object.defineProperty(exports, "__esModule", {
    value: true
});

var MockLocationManager = (function () {
    function MockLocationManager() {}
    MockLocationManager.prototype.location = null;
    MockLocationManager.prototype.removeUpdates = function (listener) {
        clearInterval(MockLocationManager.intervalId);
    };
    MockLocationManager.prototype.stopUpdatingLocation = function () {
        this.removeUpdates(null);
    };
    MockLocationManager.prototype.startUpdatingLocation = function () {
        var _this = this;
        this.removeUpdates(null);
        MockLocationManager.intervalId = setInterval(function () {
            // this.delegate is the location listener
            return _this._requestSingleUpdate(_this.delegate, _this);
        }, 500);
    };
    MockLocationManager.prototype._requestSingleUpdate = function (locListener, instance) {
        var newLocation = {
            coordinate: {
                longitude: this._getRandomCoordinate(),
                latitude: this._getRandomCoordinate()
            },
            altitude: 100,
            horizontalAccuracy: 500,
            verticalAccuracy: 500,
            timestamp: new Date()
        };

        // set the last known location
        MockLocationManager.prototype.location = newLocation;

        var wrappedLocation = locationFromCLLocation(newLocation);
        locListener._onLocation(wrappedLocation);
    };
    MockLocationManager.prototype._getRandomCoordinate = function () {
        var min = -180;
        var max = 180;
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    return MockLocationManager;
}());

if (typeof CLLocationManager !== 'undefined' && CLLocationManager) {
    CLLocationManager.locationServicesEnabled = function () {
        return true;
    };

    CLLocationManager.authorizationStatus = function () {
        return CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways;
    };
}

function locationFromCLLocation(clLocation) {
    var geolocation = require("nativescript-geolocation");
    var Location = geolocation.Location;

    let location = new Location();
    location.latitude = clLocation.coordinate.latitude;
    location.longitude = clLocation.coordinate.longitude;
    location.altitude = clLocation.altitude;
    location.horizontalAccuracy = clLocation.horizontalAccuracy;
    location.verticalAccuracy = clLocation.verticalAccuracy;
    location.speed = clLocation.speed;
    location.direction = clLocation.course;
    let timeIntervalSince1970 = NSDate.dateWithTimeIntervalSinceDate(0, clLocation.timestamp).timeIntervalSince1970;
    location.timestamp = new Date(timeIntervalSince1970 * 1000);
    location.ios = clLocation;
    return location;
};

exports.MockLocationManager = MockLocationManager;