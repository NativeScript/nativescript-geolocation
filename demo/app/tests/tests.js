var mockLocationManagerPath = typeof android !== 'undefined' && android ? "./mock-android" : "./mock-ios";
var Accuracy = require("ui/enums").Accuracy;
var MockLocationManager = require(mockLocationManagerPath).MockLocationManager;

describe("location class", function () {
    it("can be instantiated", function () {
        var geoLocation = require("nativescript-geolocation");
        var Location = geoLocation.Location;
        var nativeLocation = null;
        if (MockLocationManager.getNewLocation) {
            nativeLocation = MockLocationManager.getNewLocation();
        }

        expect(function () {
            return new Location(nativeLocation);
        }).not.toThrow();

        expect(new Location(nativeLocation)).toBeDefined();
    });
});

describe("geolocation", function () {
    beforeEach(function () {
        geolocation = require("nativescript-geolocation");
        geolocation.setCustomLocationManager(MockLocationManager);
    });

    it("getCurrentLocation returns fresh location when timeout > 0", function (done) {
        var location = geolocation.getCurrentLocation({
            desiredAccuracy: Accuracy.high,
            updateDistance: 0.1,
            maximumAge: 5000,
            timeout: 20000
        })
            .then(function (loc) {
                expect(loc).toBeDefined();
                expect(180 > loc.latitude > -180).toBeTruthy();

                done();
            }, function (e) {
                done.fail("Error: " + e.message);
            });
    });

    it("getCurrentLocation returns timeout when timeout = 20", function (done) {
        var location = geolocation.getCurrentLocation({
            desiredAccuracy: Accuracy.high,
            updateDistance: 0.1,
            maximumAge: 5000,
            timeout: 20
        })
            .then(function (loc) {
                done.fail("Got location instead of timeout: " + loc);
            }, function (e) {
                expect(e.message).toEqual('Timeout while searching for location!');
                done();
            });
    });

    it("getCurrentLocation returns last known location (if any) when timeout = 0", function (done) {
        var getCurrentLocation = function (timeout) {
            return geolocation.getCurrentLocation({
                desiredAccuracy: Accuracy.high,
                updateDistance: 0.1,
                maximumAge: 1000,
                timeout: timeout
            });
        };

        getCurrentLocation(20000)
            .then(function (loc) {
                getCurrentLocation(0).then(function (loc2) {
                    expect(loc).toBeDefined();
                    expect(180 > loc.latitude > -180).toBeTruthy();
                    expect(loc).toEqual(loc2);

                    done();
                }, function (e) {
                    done.fail("Error: " + e.message);
                });
            }, function (e) {
                done.fail("Error: " + e.message);
            });
    });

    it("watchLocation", function (done) {
        var locations = [];

        geolocation.watchLocation(
            function (loc) {
                locations.push(loc);
            },
            function (e) {
                done.fail("Error: " + e.message);
            }, {
                desiredAccuracy: Accuracy.high,
                updateDistance: 0.1,
                minimumUpdateTime: 100
            });

        setTimeout(function () {
            expect(locations.length > 1).toBeTruthy();

            for (i = 0; i < locations.length; i++) {
                var loc = locations[i];
                expect(loc).toBeDefined();
                expect(180 > loc.latitude > -180).toBeTruthy();
            }

            done();
        }, 1500);
    });

    it("clearWatch", function (done) {
        var locations = [];
        var reference = 0;

        var watchId = geolocation.watchLocation(
            function (loc) {
                locations.push(loc);
            },
            function (e) {
                done.fail("Error: " + e.message);
            }, {
                desiredAccuracy: Accuracy.high,
                updateDistance: 0.1,
                minimumUpdateTime: 100
            });

        setTimeout(function () {
            geolocation.clearWatch(watchId);
            reference = locations.length;
        }, 1000);
        setTimeout(function () {
            expect(reference).toEqual(locations.length);

            done();
        }, 2000);
    });
});