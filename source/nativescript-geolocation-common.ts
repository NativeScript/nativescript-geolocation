import defModule = require("nativescript-geolocation");
import timer = require("timer");

export class Location implements defModule.Location {
    public latitude: number;
    public longitude: number;

    public altitude: number;

    public horizontalAccuracy: number;
    public verticalAccuracy: number;

    public speed: number; // in m/s ?

    public direction: number; // in degrees

    public timestamp: Date;

    public android: android.location.Location;  // android Location
    public ios: CLLocation;      // iOS native location
}

var defaultGetLocationTimeout = 5 * 60 * 1000; // 5 minutes

// options - desiredAccuracy, updateDistance, minimumUpdateTime, maximumAge, timeout
export function getCurrentLocation(options) {
    options = options || {};

    if (options && options.timeout === 0) {
        // we should take any cached location e.g. lastKnownLocation
        return new Promise(function (resolve, reject) {
            var lastLocation = defModule.LocationMonitor.getLastKnownLocation();
            if (lastLocation) {
                if (options && typeof options.maximumAge === "number") {
                    if (lastLocation.timestamp.valueOf() + options.maximumAge > new Date().valueOf()) {
                        resolve(lastLocation);
                    }
                    else {
                        reject(new Error("Last known location too old!"));
                    }
                }
                else {
                    resolve(lastLocation);
                }
            }
            else {
                reject(new Error("There is no last known location!"));
            }
        });
    }

    return new Promise(function (resolve, reject) {
        var stopTimerAndMonitor = function (locListenerId) {
            if (timerId !== undefined) {
                timer.clearTimeout(timerId);
            }
            defModule.LocationMonitor.stopLocationMonitoring(locListenerId);
        }
        if (!defModule.isEnabled()) {
            reject(new Error("Location service is disabled"));
        }
        var successCallback = function(location) {
            if (options && typeof options.maximumAge === "number") {
                if (location.timestamp.valueOf() + options.maximumAge > new Date().valueOf()) {
                    stopTimerAndMonitor((<any>locListener).id);
                    resolve(location);
                }
                else {
                    stopTimerAndMonitor((<any>locListener).id);
                    reject(new Error("New location is older than requested maximum age!"));
                }
            }
            else {
                stopTimerAndMonitor((<any>locListener).id);
                resolve(location);
            }
        };
        var locListener = defModule.LocationMonitor.createListenerWithCallbackAndOptions(successCallback, options);

        try {
            defModule.LocationMonitor.startLocationMonitoring(options, locListener);
        }
        catch (e) {
            stopTimerAndMonitor((<any>locListener).id);
            reject(e);
        }

        if (options && typeof options.timeout === "number") {
            var timerId = timer.setTimeout(function () {
                defModule.LocationMonitor.stopLocationMonitoring((<any>locListener).id);
                reject(new Error("Timeout while searching for location!"));
            }, options.timeout || defaultGetLocationTimeout);
        }
    });
}