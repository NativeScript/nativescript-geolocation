import {Location as LocationDef} from "./location";
import * as locationModule from "./location-monitor";
import timer = require("timer");
var location: typeof locationModule = null; //required dynamically

export class Location implements LocationDef {
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
    if (!location) {
        location = require("nativescript-geolocation");
    }

    if (options && options.timeout === 0) {
        // we should take any cached location e.g. lastKnownLocation
        return new Promise(function (resolve, reject) {
            var lastLocation = location.LocationMonitor.getLastKnownLocation();
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
            location.LocationMonitor.stopLocationMonitoring(locListenerId);
        }
        if (!location.isEnabled()) {
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
        var locListener = location.LocationMonitor.createListenerWithCallbackAndOptions(successCallback, options);

        try {
            location.LocationMonitor.startLocationMonitoring(options, locListener);
        }
        catch (e) {
            stopTimerAndMonitor((<any>locListener).id);
            reject(e);
        }

        if (options && typeof options.timeout === "number") {
            var timerId = timer.setTimeout(function () {
                location.LocationMonitor.stopLocationMonitoring((<any>locListener).id);
                reject(new Error("Timeout while searching for location!"));
            }, options.timeout || defaultGetLocationTimeout);
        }
    });
}
