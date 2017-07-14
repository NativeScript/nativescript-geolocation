import { Accuracy } from "ui/enums";
import { setTimeout, clearTimeout } from "timer";
import { write } from "trace";
import {
    Location as commonLocation,
    defaultGetLocationTimeout,
    minRangeUpdate
} from "./geolocation.common";
import {
    LocationMonitor as LocationMonitorDef,
    Options,
    successCallbackType,
    errorCallbackType
} from "./location-monitor";

const locationManagers = {};
const locationListeners = {};
let watchId = 0;

class LocationListenerImpl extends NSObject implements CLLocationManagerDelegate {
    public static ObjCProtocols = [CLLocationManagerDelegate]; // tslint:disable-line:variable-name

    public authorizeAlways: boolean;
    public id: number;
    private _onLocation: successCallbackType;
    private _onError: errorCallbackType;
    private _resolve: () => void;
    private _reject: (error: Error) => void;

    public static initWithLocationError(successCallback: successCallbackType,
        error?: errorCallbackType): LocationListenerImpl {
        let listener = <LocationListenerImpl>LocationListenerImpl.new();
        watchId++;
        listener.id = watchId;
        listener._onLocation = successCallback;
        listener._onError = error;

        return listener;
    }

    public static initWithPromiseCallbacks(resolve: () => void,
        reject: (error: Error) => void,
        authorizeAlways: boolean = false): LocationListenerImpl {
        let listener = <LocationListenerImpl>LocationListenerImpl.new();
        watchId++;
        listener.id = watchId;
        listener._resolve = resolve;
        listener._reject = reject;
        listener.authorizeAlways = authorizeAlways;

        return listener;
    }

    public locationManagerDidUpdateLocations(manager: CLLocationManager, locations: NSArray<CLLocation>): void {
        if (this._onLocation) {
            for (let i = 0, count = locations.count; i < count; i++) {
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

    public locationManagerDidChangeAuthorizationStatus(manager: CLLocationManager, status: CLAuthorizationStatus) {
        switch (status) {
            case CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined:
                break;

            case CLAuthorizationStatus.kCLAuthorizationStatusRestricted:
                break;

            case CLAuthorizationStatus.kCLAuthorizationStatusDenied:
                if (this._reject) {
                    LocationMonitor.stopLocationMonitoring(this.id);
                    this._reject(new Error("Authorization Denied."));
                }
                break;

            case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways:
                if (this.authorizeAlways && this._resolve) {
                    LocationMonitor.stopLocationMonitoring(this.id);
                    this._resolve();
                } else if (this._reject) {
                    LocationMonitor.stopLocationMonitoring(this.id);
                    this._reject(new Error("Authorization Denied."));
                }
                break;

            case CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse:
                if (!this.authorizeAlways && this._resolve) {
                    LocationMonitor.stopLocationMonitoring(this.id);
                    this._resolve();
                } else if (this._reject) {
                    LocationMonitor.stopLocationMonitoring(this.id);
                    this._reject(new Error("Authorization Denied."));
                }
                break;

            default:
                break;
        }
    }
}

function locationFromCLLocation(clLocation: CLLocation): commonLocation {
    let location = new commonLocation();
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

function clLocationFromLocation(location: commonLocation): CLLocation {
    let hAccuracy = location.horizontalAccuracy ? location.horizontalAccuracy : -1;
    let vAccuracy = location.verticalAccuracy ? location.verticalAccuracy : -1;
    let speed = location.speed ? location.speed : -1;
    let course = location.direction ? location.direction : -1;
    let altitude = location.altitude ? location.altitude : -1;
    let timestamp = location.timestamp ? location.timestamp : null;
    let iosLocation = CLLocation.alloc()
        .initWithCoordinateAltitudeHorizontalAccuracyVerticalAccuracyCourseSpeedTimestamp(
        CLLocationCoordinate2DMake(location.latitude, location.longitude),
        altitude,
        hAccuracy,
        vAccuracy,
        course,
        speed,
        timestamp
        );
    return iosLocation;
}

// options - desiredAccuracy, updateDistance, minimumUpdateTime, maximumAge, timeout
export function getCurrentLocation(options: Options): Promise<commonLocation> {
    options = options || {};
    if (options.timeout === 0) {
        // we should take any cached location e.g. lastKnownLocation
        return new Promise(function (resolve, reject) {
            let lastLocation = LocationMonitor.getLastKnownLocation();
            if (lastLocation) {
                if (typeof options.maximumAge === "number") {
                    if (lastLocation.timestamp.valueOf() + options.maximumAge > new Date().valueOf()) {
                        resolve(lastLocation);
                    } else {
                        reject(new Error("Last known location too old!"));
                    }
                } else {
                    resolve(lastLocation);
                }
            } else {
                reject(new Error("There is no last known location!"));
            }
        });
    }

    return new Promise(function (resolve, reject) {
        if (!isEnabled()) {
            reject(new Error("Location service is disabled"));
        }

        let timerId;
        let locListener;

        let stopTimerAndMonitor = function (locListenerId) {
            if (timerId !== undefined) {
                clearTimeout(timerId);
            }

            LocationMonitor.stopLocationMonitoring(locListenerId);
        };

        let successCallback = function (location: commonLocation) {
            stopTimerAndMonitor(locListener.id);
            if (typeof options.maximumAge === "number") {
                if (location.timestamp.valueOf() + options.maximumAge > new Date().valueOf()) {
                    resolve(location);
                } else {
                    reject(new Error("New location is older than requested maximum age!"));
                }
            } else {
                resolve(location);
            }
        };

        locListener = LocationListenerImpl.initWithLocationError(successCallback);
        try {
            LocationMonitor.startLocationMonitoring(options, locListener);
        } catch (e) {
            stopTimerAndMonitor(locListener.id);
            reject(e);
        }

        if (typeof options.timeout === "number") {
            timerId = setTimeout(function () {
                LocationMonitor.stopLocationMonitoring(locListener.id);
                reject(new Error("Timeout while searching for location!"));
            }, options.timeout || defaultGetLocationTimeout);
        }
    });
}

export function watchLocation(successCallback: successCallbackType,
    errorCallback: errorCallbackType,
    options: Options): number {
    let zonedSuccessCallback = (<any>global).zonedCallback(successCallback);
    let zonedErrorCallback = (<any>global).zonedCallback(errorCallback);
    let locListener = LocationListenerImpl.initWithLocationError(zonedSuccessCallback, zonedErrorCallback);
    try {
        let iosLocManager = LocationMonitor.createiOSLocationManager(locListener, options);
        iosLocManager.startUpdatingLocation();
        return locListener.id;
    } catch (e) {
        LocationMonitor.stopLocationMonitoring(locListener.id);
        zonedErrorCallback(e);
        return null;
    }
}

export function clearWatch(_watchId: number): void {
    LocationMonitor.stopLocationMonitoring(_watchId);
}

export function enableLocationRequest(always?: boolean): Promise<void> {
    return new Promise<void>(function (resolve, reject) {
        if (isEnabled()) {
            resolve();
            return;
        }

        let listener = LocationListenerImpl.initWithPromiseCallbacks(resolve, reject, always);
        try {
            let manager = LocationMonitor.createiOSLocationManager(listener, null);
            if (always) {
                manager.requestAlwaysAuthorization();
            } else {
                manager.requestWhenInUseAuthorization();
            }
        } catch (e) {
            LocationMonitor.stopLocationMonitoring(listener.id);
            reject(e);
        }
    });
}

export function isEnabled(): boolean {
    if (CLLocationManager.locationServicesEnabled()) {
        // CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse and
        // CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways are options that are available in iOS 8.0+
        // while CLAuthorizationStatus.kCLAuthorizationStatusAuthorized is here to support iOS 8.0-.
        const AUTORIZED_WHEN_IN_USE = CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedWhenInUse;
        return (CLLocationManager.authorizationStatus() === AUTORIZED_WHEN_IN_USE
            || CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorizedAlways
            || CLLocationManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusAuthorized);
    }
    return false;
}

export function distance(loc1: commonLocation, loc2: commonLocation): number {
    if (!loc1.ios) {
        loc1.ios = clLocationFromLocation(loc1);
    }
    if (!loc2.ios) {
        loc2.ios = clLocationFromLocation(loc2);
    }
    return loc1.ios.distanceFromLocation(loc2.ios);
}

export class LocationMonitor implements LocationMonitorDef {
    static getLastKnownLocation(): commonLocation {
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

    static startLocationMonitoring(options: Options, locListener: any): void {
        let iosLocManager = LocationMonitor.createiOSLocationManager(locListener, options);
        iosLocManager.startUpdatingLocation();
    }

    static stopLocationMonitoring(iosLocManagerId: number) {
        if (locationManagers[iosLocManagerId]) {
            locationManagers[iosLocManagerId].stopUpdatingLocation();
            locationManagers[iosLocManagerId].delegate = null;
            delete locationManagers[iosLocManagerId];
            delete locationListeners[iosLocManagerId];
        }
    }

    static createiOSLocationManager(locListener: any, options: Options): CLLocationManager {
        let iosLocManager = new CLLocationManager();
        iosLocManager.delegate = locListener;
        iosLocManager.desiredAccuracy = options ? options.desiredAccuracy : Accuracy.high;
        iosLocManager.distanceFilter = options ? options.updateDistance : minRangeUpdate;
        locationManagers[locListener.id] = iosLocManager;
        locationListeners[locListener.id] = locListener;
        return iosLocManager;
    }
}

export class Location extends commonLocation {

}
