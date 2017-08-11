Object.defineProperty(exports, "__esModule", {
    value: true
});

var MockLocationManager = (function () {
    function MockLocationManager() {
        this.MOCK_PROVIDER_NAME = "mockLocationProvider";
    }
    MockLocationManager.prototype._lastKnownLocation = null;
    MockLocationManager.prototype.requestSingleUpdate = function (options, locListener, looper) {
        var newLocation = new android.location.Location(this.MOCK_PROVIDER_NAME);
        newLocation.setLatitude(this._getRandomCoordinate());
        newLocation.setLongitude(this._getRandomCoordinate());
        newLocation.setTime((new Date()).getTime());
        newLocation.setAccuracy(500);

        MockLocationManager.prototype._lastKnownLocation = newLocation;

        locListener.onLocationChanged(newLocation);
    };
    MockLocationManager.prototype.getProviders = function (criteria, enabledOnly) {
        var providers = [this.MOCK_PROVIDER_NAME];
        providers.index = 0;
        providers.size = function () {
            return providers.length;
        };
        providers.iterator = function () {
            return {
                hasNext: function () {
                    return providers.index < providers.length;
                },
                next: function () {
                    var next = providers[providers.index];
                    providers.index += 1;
                    return next;
                }
            };
        }
        return providers;
    };
    MockLocationManager.prototype.removeUpdates = function (listener) {
        clearInterval(MockLocationManager.intervalId);
    };
    MockLocationManager.prototype.requestLocationUpdates = function (minTime, minDistance, criteria, listener, looper) {
        var _this = this;
        this.removeUpdates(null);
        MockLocationManager.intervalId = setInterval(function () {
            return _this.requestSingleUpdate(null, listener, null);
        }, 500);
    };
    MockLocationManager.prototype.getLastKnownLocation = function () {
        return MockLocationManager.prototype._lastKnownLocation;
    };
    MockLocationManager.prototype._getRandomCoordinate = function () {
        var min = -180;
        var max = 180;
        return Math.floor(Math.random() * (max - min + 1) + min);
    };
    return MockLocationManager;
}());

exports.MockLocationManager = MockLocationManager;