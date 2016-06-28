import appModule = require("application");
import enums = require("ui/enums");
import timer = require("timer");
import trace = require("trace");
import platformModule = require("platform");
import {Location as LocationDef} from "./location";
import {LocationMonitor as LocationMonitorDef, Options, successCallbackType, errorCallbackType} from "./location-monitor";
import common = require("./nativescript-geolocation-common");
global.moduleMerge(common, exports);

var locationManagers = {};
var locationListeners = {};
var watchId = 0;
var minRangeUpdate = 0; // 0 meters
var defaultGetLocationTimeout = 5 * 60 * 1000; // 5 minutes

class LocationListenerImpl extends NSObject implements CLLocationManagerDelegate {
    public static ObjCProtocols = [CLLocationManagerDelegate];

    public id: number;
    private _onLocation: successCallbackType;
    private _onError: errorCallbackType;

    public static initWithLocationError(successCallback: successCallbackType, error?: errorCallbackType): LocationListenerImpl {
        let listener = <LocationListenerImpl>LocationListenerImpl.new();
        watchId++;
        listener.id = watchId;
        listener._onLocation = successCallback;
        listener._onError = error;

        return listener;
    }

    public locationManagerDidUpdateLocations(manager: CLLocationManager, locations: NSArray): void {
        for (let i = 0, count = locations.count; i < count; i++) {
            if (this._onLocation) {
                let location = locationFromCLLocation(<CLLocation>locations.objectAtIndex(i));
                this._onLocation(location);
            }
        }
    }

    public locationManagerDidFailWithError(manager: CLLocationManager, error: NSError): void {
        if (this._onError) {
            this._onError(new Error(error.localizedDescription));
        }
    }
}

class AuthorizationListenerImpl extends NSObject implements CLLocationManagerDelegate {
    public static ObjCProtocols = [CLLocationManagerDelegate];

    public id: number;
    private _callback: (listenderId: number) => void;

    public static initWithCallback(callback: (listenderId: number) => void) {
        let listener = <AuthorizationListenerImpl>AuthorizationListenerImpl.new();

        listener.id = (++watchId);        
        listener._callback = callback;

        return listener;
    }

    public locationManagerDidChangeAuthorizationStatus(manager: CLLocationManager, status: number) {
        if (status !== CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined) {
            this._callback(this.id);
        }    
    }
}

function locationFromCLLocation(clLocation: CLLocation): common.Location {
    let location = new common.Location();
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
}

function clLocationFromLocation(location: common.Location): CLLocation {
    let hAccuracy = location.horizontalAccuracy ? location.horizontalAccuracy : -1;
    let vAccuracy = location.verticalAccuracy ? location.verticalAccuracy : -1;
    let speed = location.speed ? location.speed : -1;
    let course = location.direction ? location.direction : -1;
    let altitude = location.altitude ? location.altitude : -1;
    let timestamp = location.timestamp ? NSDate.dateWithTimeIntervalSince1970(location.timestamp.getTime() / 1000) : null;
    let iosLocation = CLLocation.alloc().initWithCoordinateAltitudeHorizontalAccuracyVerticalAccuracyCourseSpeedTimestamp(CLLocationCoordinate2DMake(location.latitude, location.longitude), altitude, hAccuracy, vAccuracy, course, speed, timestamp);
    return iosLocation;
}

// options - desiredAccuracy, updateDistance, minimumUpdateTime, maximumAge, timeout
export function getCurrentLocation(options: Options): Promise<LocationDef> {
    options = options || {};
    if (options.timeout === 0) {
        // we should take any cached location e.g. lastKnownLocation
        return new Promise(function (resolve, reject) {
            let lastLocation = LocationMonitor.getLastKnownLocation();
            if (lastLocation) {
                if (typeof options.maximumAge === "number") {
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
        if (!isEnabled()) {
            reject(new Error("Location service is disabled"));
        }

        let stopTimerAndMonitor = function (locListenerId) {
            if (timerId !== undefined) {
                timer.clearTimeout(timerId);
            }

            LocationMonitor.stopLocationMonitoring(locListenerId);
        }

        let successCallback = function (location: common.Location) {
            if (typeof options.maximumAge === "number") {
                if (location.timestamp.valueOf() + options.maximumAge > new Date().valueOf()) {
                    stopTimerAndMonitor(locListener.id);
                    resolve(location);
                }
                else {
                    stopTimerAndMonitor(locListener.id);
                    reject(new Error("New location is older than requested maximum age!"));
                }
            }
            else {
                stopTimerAndMonitor(locListener.id);
                resolve(location);
            }
        };

        var locListener = LocationMonitor.createListenerWithCallbackAndOptions(successCallback, options);
        try {
            LocationMonitor.startLocationMonitoring(options, locListener);
        }
        catch (e) {
            stopTimerAndMonitor(locListener.id);
            reject(e);
        }

        if (typeof options.timeout === "number") {
            var timerId = timer.setTimeout(function () {
                LocationMonitor.stopLocationMonitoring(locListener.id);
                reject(new Error("Timeout while searching for location!"));
            }, options.timeout || defaultGetLocationTimeout);
        }
    });
}

export function watchLocation(successCallback: successCallbackType, 
                              errorCallback: errorCallbackType, 
                              options: Options): number {

    let locListener = LocationListenerImpl.initWithLocationError(successCallback, errorCallback);
    try {
        let iosLocManager = LocationMonitor.createiOSLocationManager(locListener, options);
        iosLocManager.startUpdatingLocation();
        return locListener.id;
    }
    catch (e) {
        LocationMonitor.stopLocationMonitoring(locListener.id);
        errorCallback(e);
        return null;
    }
}

export function clearWatch(watchId: number): void {
    LocationMonitor.stopLocationMonitoring(watchId);
}

export function enableLocationRequest(always?: boolean): void {
    let iosLocationManager = CLLocationManager.alloc().init();
    let authorizationListener = AuthorizationListenerImpl.initWithCallback((listenerId: number) => {
        locationManagers[listenerId].delegate = null;
        delete locationManagers[listenerId];
        delete locationListeners[listenerId];
    });

    iosLocationManager.delegate = authorizationListener;    
    locationManagers[authorizationListener.id] = iosLocationManager;
    locationListeners[authorizationListener.id] = authorizationListener;

    if (always) {
        iosLocationManager.requestAlwaysAuthorization();
    }
    else {
        iosLocationManager.requestWhenInUseAuthorization();
    }
}

export function isEnabled(): boolean {
    if (CLLocationManager.locationServicesEnabled()) {
        // CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse and CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways are options that are available in iOS 8.0+
        // while CLAuthorizationStatus.kCLAuthorizationStatusAuthorized is here to support iOS 8.0-.
        return (CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse
            || CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways
            || CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorized);
    }
    return false;
}

export function distance(loc1: common.Location, loc2: common.Location): number {
    if (!loc1.ios) {
        loc1.ios = clLocationFromLocation(loc1);
    }
    if (!loc2.ios) {
        loc2.ios = clLocationFromLocation(loc2);
    }
    return loc1.ios.distanceFromLocation(loc2.ios);
}

export class LocationMonitor implements LocationMonitorDef {
    static getLastKnownLocation(): common.Location {
        let iosLocation: CLLocation;
        for (let locManagerId in locationManagers) {
            if (locationManagers.hasOwnProperty(locManagerId)) {
                let tempLocation = locationManagers[locManagerId].location;
                if (!iosLocation || tempLocation.timestamp > iosLocation.timestamp) {
                    iosLocation = tempLocation;
                }
            }
        }

        if (iosLocation) {
            return locationFromCLLocation(iosLocation);
        }

        let locListener = LocationListenerImpl.initWithLocationError(null);
        iosLocation = LocationMonitor.createiOSLocationManager(locListener, null).location;
        if (iosLocation) {
            return locationFromCLLocation(iosLocation);
        }
        return null;
    }

    static startLocationMonitoring(options: Options, locListener: LocationListenerImpl): void {
        let iosLocManager = LocationMonitor.createiOSLocationManager(locListener, options);
        locationManagers[locListener.id] = iosLocManager;
        locationListeners[locListener.id] = locListener;
        iosLocManager.startUpdatingLocation();
    }

    static createListenerWithCallbackAndOptions(successCallback: successCallbackType, options: Options): LocationListenerImpl {
        return LocationListenerImpl.initWithLocationError(successCallback);
    }

    static stopLocationMonitoring(iosLocManagerId: number) {
        if (locationManagers[iosLocManagerId]) {
            locationManagers[iosLocManagerId].stopUpdatingLocation();
            locationManagers[iosLocManagerId].delegate = null;
            delete locationManagers[iosLocManagerId];
            delete locationListeners[iosLocManagerId];
        }
    }

    static createiOSLocationManager(locListener: LocationListenerImpl, options: Options): CLLocationManager {
        let iosLocManager = new CLLocationManager();
        iosLocManager.delegate = locListener;
        iosLocManager.desiredAccuracy = options ? options.desiredAccuracy : enums.Accuracy.high;
        iosLocManager.distanceFilter = options ? options.updateDistance : minRangeUpdate;
        locationManagers[locListener.id] = iosLocManager;
        locationListeners[locListener.id] = locListener;
        return iosLocManager;
    }
}