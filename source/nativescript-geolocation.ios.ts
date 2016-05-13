import appModule = require("application");
import enums = require("ui/enums");
import timer = require("timer");
import trace = require("trace");
import platformModule = require("platform");
import {Location as LocationDef} from "./location";
import {LocationMonitor as LocationMonitorDef, Options} from "./location-monitor";
import common = require("./nativescript-geolocation-common");
global.moduleMerge(common, exports);

var locationManagers = {};
var watchId = 0;
var minRangeUpdate = 0; // 0 meters
var defaultGetLocationTimeout = 5 * 60 * 1000; // 5 minutes

class LocationListenerImpl extends NSObject implements CLLocationManagerDelegate {
    public static ObjCProtocols = [CLLocationManagerDelegate];

    static new(): LocationListenerImpl {
        let result = <LocationListenerImpl>super.new();
        watchId++;
        result.id = watchId;
        return result;
    }

    private id: number;
    private _onLocation: (location: LocationDef) => any;
    private _onError: (error: Error) => any
    private _options: Options;

    public initWithLocationErrorOptions(location: (location: LocationDef) => any, error?: (error: Error) => any, options?: Options): LocationListenerImpl {
        this._onLocation = location;

        if (error) {
            this._onError = error;
        }

        if (options) {
            this._options = options;
        }

        return this;
    }

    public locationManagerDidUpdateLocations(manager, locations): void {
        for (var i = 0; i < locations.count; i++) {
            var location = locationFromCLLocation(locations.objectAtIndex(i));
            if (this._onLocation) {
                this._onLocation(location);
            }
        }
    }

    public locationManagerDidFailWithError(manager, error): void {
        if (this._onError) {
            this._onError(new Error(error.localizedDescription));
        }
    }
}

function locationFromCLLocation(clLocation) {
    var location = new common.Location();
    location.latitude = clLocation.coordinate.latitude;
    location.longitude = clLocation.coordinate.longitude;
    location.altitude = clLocation.altitude;
    location.horizontalAccuracy = clLocation.horizontalAccuracy;
    location.verticalAccuracy = clLocation.verticalAccuracy;
    location.speed = clLocation.speed;
    location.direction = clLocation.course;
    var timeIntervalSince1970 = NSDate.dateWithTimeIntervalSinceDate(0, clLocation.timestamp).timeIntervalSince1970;
    location.timestamp = new Date(timeIntervalSince1970 * 1000);
    location.ios = clLocation;
    return location;
}

function clLocationFromLocation(location) {
    var hAccuracy = location.horizontalAccuracy ? location.horizontalAccuracy : -1;
    var vAccuracy = location.verticalAccuracy ? location.verticalAccuracy : -1;
    var speed = location.speed ? location.speed : -1;
    var course = location.direction ? location.direction : -1;
    var altitude = location.altitude ? location.altitude : -1;
    var timestamp = location.timestamp ? NSDate.dateWithTimeIntervalSince1970(location.timestamp.getTime() / 1000) : null;
    var iosLocation = CLLocation.alloc().initWithCoordinateAltitudeHorizontalAccuracyVerticalAccuracyCourseSpeedTimestamp(CLLocationCoordinate2DMake(location.latitude, location.longitude), altitude, hAccuracy, vAccuracy, course, speed, timestamp);
    return iosLocation;
}

export class LocationMonitor implements LocationMonitorDef {
    static getLastKnownLocation() {
        var iosLocation;
        for(var locManagerId in locationManagers) {
            if (locationManagers.hasOwnProperty(locManagerId)) {
                var tempLocation = locationManagers[locManagerId].location;
                if (!iosLocation) {
                    iosLocation = tempLocation;
                }
                else {
                    if (tempLocation.timestamp > iosLocation.timestamp) {
                        iosLocation = tempLocation;
                    }
                }
            }
        }

        if (iosLocation) {
            return locationFromCLLocation(iosLocation);
        }

        var locListener = new LocationListenerImpl();
        locListener.initWithLocationErrorOptions(null, null, null);
        iosLocation = LocationMonitor.createiOSLocationManager(locListener, null).location;
        if (iosLocation) {
            return locationFromCLLocation(iosLocation);
        }
        return null;
    }

    static stopLocationMonitoring(iosLocManagerId) {
        if (locationManagers[iosLocManagerId]) {
            locationManagers[iosLocManagerId].stopUpdatingLocation();
            locationManagers[iosLocManagerId].delegate = null;
            delete locationManagers[iosLocManagerId];
        }
    }

    static startLocationMonitoring(options, locListener) {
        var iosLocManager = LocationMonitor.createiOSLocationManager(locListener, options);
        locationManagers[locListener.id] = iosLocManager;
        iosLocManager.startUpdatingLocation();
    }

    static createListenerWithCallbackAndOptions(successCallback, options) {
        var locListener = new LocationListenerImpl();
        locListener.initWithLocationErrorOptions(successCallback, null, options);
        return locListener;
    }

    static createiOSLocationManager(locListener, options) {
        var iosLocManager = new CLLocationManager();
        iosLocManager.delegate = locListener;
        iosLocManager.desiredAccuracy = options ? options.desiredAccuracy : enums.Accuracy.high;
        iosLocManager.distanceFilter = options ? options.updateDistance : minRangeUpdate;
        locationManagers[locListener.id] = iosLocManager;
        return iosLocManager;
    }
}

export function isEnabled() {
    if (CLLocationManager.locationServicesEnabled()) {
        // CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse and CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways are options that are available in iOS 8.0+
        // while CLAuthorizationStatus.kCLAuthorizationStatusAuthorized is here to support iOS 8.0-.
        return (CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse
            || CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways
            || CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorized);
        }
        return false;
}

export function distance(loc1, loc2) {
    if (!loc1.ios) {
        loc1.ios = clLocationFromLocation(loc1);
    }
    if (!loc2.ios) {
        loc2.ios = clLocationFromLocation(loc2);
    }
    return loc1.ios.distanceFromLocation(loc2.ios);
}

export function enableLocationRequest(always?: boolean) {
    var v2i = function convertVersionToInt(version){
        // 9.9.9 -> 9, 9, 9
        var parts = String(version).split(".").slice(0, 3).reverse(); while(parts.length < 3){ parts.unshift(0); }
        // 9, 9, 9 -> 9 * (1000 ^ 2) + 9 * (1000 ^ 1) + 9 * (1000 ^ 0)
        return parts.reduce(function(rv, cv, ci){ return rv += parseInt(cv) * Math.pow(1000, ci); }, 0);
    }
    if (v2i(platformModule.device.osVersion) >= v2i("8.0")) {
        var iosLocationManager = CLLocationManager.alloc().init();
        if (always) {
            iosLocationManager.requestAlwaysAuthorization();
        }
        else {
            iosLocationManager.requestWhenInUseAuthorization();
        }
    }
}

export function watchLocation(successCallback, errorCallback, options) {
    var locListener = new LocationListenerImpl();
    locListener.initWithLocationErrorOptions(successCallback, errorCallback, options);
    try {
        var iosLocManager = LocationMonitor.createiOSLocationManager(locListener, options);
        iosLocManager.startUpdatingLocation();
        return (<any>locListener).id;
    }
    catch (e) {
        LocationMonitor.stopLocationMonitoring((<any>locListener).id);
        errorCallback(e);
        return null;
    }
}

export function clearWatch(watchId) {
    LocationMonitor.stopLocationMonitoring(watchId);
}

// options - desiredAccuracy, updateDistance, minimumUpdateTime, maximumAge, timeout
export function getCurrentLocation(options) {
    options = options || {};
    if (options && options.timeout === 0) {
        // we should take any cached location e.g. lastKnownLocation
        return new Promise(function (resolve, reject) {
            var lastLocation = LocationMonitor.getLastKnownLocation();
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
            LocationMonitor.stopLocationMonitoring(locListenerId);
        }
        if (!isEnabled()) {
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
        var locListener = LocationMonitor.createListenerWithCallbackAndOptions(successCallback, options);

        try {
            LocationMonitor.startLocationMonitoring(options, locListener);
        }
        catch (e) {
            stopTimerAndMonitor((<any>locListener).id);
            reject(e);
        }

        if (options && typeof options.timeout === "number") {
            var timerId = timer.setTimeout(function () {
                LocationMonitor.stopLocationMonitoring((<any>locListener).id);
                reject(new Error("Timeout while searching for location!"));
            }, options.timeout || defaultGetLocationTimeout);
        }
    });
}
