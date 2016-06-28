import appModule = require("application");
import platform = require("platform");
import enums = require("ui/enums");
import timer = require("timer");
import trace = require("trace");
import common = require("./nativescript-geolocation-common");
import {LocationMonitor as LocationMonitorDef, Options, successCallbackType, errorCallbackType} from "./location-monitor";
global.moduleMerge(common, exports);

var locationListeners = {};
var watchId = 0;
var androidLocationManager: android.location.LocationManager;
var minTimeUpdate = 1 * 60 * 1000; // 1 minute
var minRangeUpdate = 0; // 0 meters

function getAndroidLocationManager(): android.location.LocationManager {
    if (!androidLocationManager) {
        androidLocationManager = (<android.content.Context>appModule.android.context).getSystemService(android.content.Context.LOCATION_SERVICE);
    }
    return androidLocationManager;
}

function createLocationListener(successCallback: successCallbackType) {
    let locationListener = new android.location.LocationListener({
        onLocationChanged: function (location1: android.location.Location) {
            let locationCallback: successCallbackType = this._onLocation;
            if (locationCallback) {
                locationCallback(locationFromAndroidLocation(location1));
            }
        },

        onProviderDisabled: function (provider) {
            //
        },

        onProviderEnabled: function (provider) {
            //
        },

        onStatusChanged: function (arg1, arg2, arg3) {
            //
        }
    });
    watchId++;
    (<any>locationListener)._onLocation = successCallback;
    (<any>locationListener).id = watchId;
    locationListeners[watchId] = locationListener;
    return locationListener;
}

function locationFromAndroidLocation(androidLocation: android.location.Location): common.Location {
    let location = new common.Location();
    location.latitude = androidLocation.getLatitude();
    location.longitude = androidLocation.getLongitude();
    location.altitude = androidLocation.getAltitude();
    location.horizontalAccuracy = androidLocation.getAccuracy();
    location.verticalAccuracy = androidLocation.getAccuracy();
    location.speed = androidLocation.getSpeed();
    location.direction = androidLocation.getBearing();
    location.timestamp = new Date(androidLocation.getTime());
    location.android = androidLocation;
    return location;
}

function androidLocationFromLocation(location: common.Location): android.location.Location {
    let androidLocation = new android.location.Location('custom');
    androidLocation.setLatitude(location.latitude);
    androidLocation.setLongitude(location.longitude);
    if (location.altitude) {
        androidLocation.setAltitude(location.altitude);
    }
    if (location.speed) {
        androidLocation.setSpeed(float(location.speed));
    }
    if (location.direction) {
        androidLocation.setBearing(float(location.direction));
    }
    if (location.timestamp) {
        try {
            androidLocation.setTime(long(location.timestamp.getTime()));
        }
        catch (e) {
            console.error('invalid location timestamp');
        }
    }
    return androidLocation;
}

function criteriaFromOptions(options: Options): android.location.Criteria {
    let criteria = new android.location.Criteria();
    if (options && options.desiredAccuracy <= enums.Accuracy.high) {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_FINE);
    }
    else {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
    }
    return criteria;
}

function watchLocationCore(successCallback: successCallbackType, errorCallback: errorCallbackType, options: Options, locListener: android.location.LocationListener): void {
    let criteria = criteriaFromOptions(options);
    try {
        let updateTime = (options && typeof options.minimumUpdateTime === "number") ? options.minimumUpdateTime : minTimeUpdate;
        let updateDistance = (options && typeof options.updateDistance === "number") ? options.updateDistance : minRangeUpdate;
        getAndroidLocationManager().requestLocationUpdates(updateTime, updateDistance, criteria, locListener, null);
    }
    catch (e) {
        LocationMonitor.stopLocationMonitoring((<any>locListener).id);
        errorCallback(e);
    }
}

function enableLocationServiceRequest(currentContext, successCallback?, successArgs?, errorCallback?: errorCallbackType, errorArgs?): void {
    if (!isEnabled()) {
        let onActivityResultHandler = function (data: appModule.AndroidActivityResultEventData) {
            appModule.android.off(appModule.AndroidApplication.activityResultEvent, onActivityResultHandler);
            if (data.requestCode === 0) {
                if (isEnabled()) {
                    if (successCallback) {
                        successCallback.apply(this, successArgs);
                    }
                } else {
                    if (errorCallback) {
                        errorCallback.apply(this, errorArgs);
                    }
                }
            }
        };
        appModule.android.on(appModule.AndroidApplication.activityResultEvent, onActivityResultHandler);
        currentContext.startActivityForResult(new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS), 0);
    } else {
        if (successCallback) {
            successCallback.apply(this, successArgs);
        }
    }
}

function enableLocationRequestCore(successCallback?, successArgs?, errorCallback?: errorCallbackType, errorArgs?): void {
    let currentContext = <android.app.Activity>appModule.android.currentContext;
    if (parseInt(platform.device.sdkVersion) >= 23) {
        appModule.android.on(appModule.AndroidApplication.activityRequestPermissionsEvent, (data: appModule.AndroidActivityRequestPermissionsEventData) => {
            console.log('requestCode: ' + data.requestCode + ' permissions: ' + data.permissions + ' grantResults: ' + data.grantResults);
            if (data.requestCode === 5000) {
                if (data.grantResults.length > 0 && data.grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    console.log("permission granted!!!");
                    enableLocationServiceRequest(currentContext, successCallback, successArgs, errorCallback, errorArgs);
                } else {
                    console.log("permission not granted!!!");
                    if (errorCallback) {
                        errorCallback.apply(this, errorArgs);
                    }
                }
            }
        });
        let res = (<any>android.support.v4.content.ContextCompat).checkSelfPermission(currentContext, (<any>android).Manifest.permission.ACCESS_FINE_LOCATION);
        if (res === -1) {
            (<any>android.support.v4.app).ActivityCompat.requestPermissions(currentContext, ['android.permission.ACCESS_FINE_LOCATION'], 5000);
        } else {
            enableLocationServiceRequest(currentContext, successCallback, successArgs, errorCallback, errorArgs);
        }
    } else {
        enableLocationServiceRequest(currentContext, successCallback, successArgs, errorCallback, errorArgs);
    }
}

export function watchLocation(successCallback: successCallbackType, errorCallback: errorCallbackType, options: Options): number {
    var locListener = createLocationListener(successCallback);
    if (!isEnabled()) {
        let notGrantedError = new Error("Location service is not enabled or using it is not granted.");
        enableLocationRequestCore(watchLocationCore, [successCallback, errorCallback, options, locListener], errorCallback, [notGrantedError]);
    } else {
        watchLocationCore(successCallback, errorCallback, options, locListener);
    }
    return (<any>locListener).id;
}


export function getCurrentLocation(options: Options): Promise<common.Location> {
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
        var timerId;
        var stopTimerAndMonitor = function (locListenerId: number) {
            if (timerId !== undefined) {
                timer.clearTimeout(timerId);
            }
            LocationMonitor.stopLocationMonitoring(locListenerId);
        }

        let enabledCallback = function (resolve, reject, options) {
            let successCallback = function (location: common.Location) {
                stopTimerAndMonitor((<any>locListener).id);
                if (options && typeof options.maximumAge === "number") {
                    if (location.timestamp.valueOf() + options.maximumAge > new Date().valueOf()) {
                        resolve(location);
                    }
                    else {
                        reject(new Error("New location is older than requested maximum age!"));
                    }
                }
                else {
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
                timerId = timer.setTimeout(function () {
                    LocationMonitor.stopLocationMonitoring((<any>locListener).id);
                    reject(new Error("Timeout while searching for location!"));
                }, options.timeout || common.defaultGetLocationTimeout);
            }
        };
        var permissionDeniedCallback = function (reject) {
            reject(new Error("Location service is not enabled or using it is not granted."));
        };
        if (!isEnabled()) {
            enableLocationRequestCore(enabledCallback, [resolve, reject, options], permissionDeniedCallback, [reject]);
        } else {
            enabledCallback(resolve, reject, options);
        }
    });
}

export function clearWatch(watchId: number): void {
    LocationMonitor.stopLocationMonitoring(watchId);
}

export function enableLocationRequest(always?: boolean): Promise<void> {
    return new Promise<void>(function (resolve, reject) {
        if (isEnabled()) {
            resolve();
            return;
        }

        let enabledCallback = function (resolve, reject) {
            resolve();
        };
        var permissionDeniedCallback = function (reject) {
            reject(new Error("Location service is not enabled or using it is not granted."));
        };

        enableLocationRequestCore(enabledCallback, [resolve], permissionDeniedCallback, [reject]);
    });
}

export function isEnabled(): boolean {
    let criteria = new android.location.Criteria();
    criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
    // due to bug in android API getProviders() with criteria parameter overload should be called (so most loose accuracy is used).
    let enabledProviders = getAndroidLocationManager().getProviders(criteria, true);
    return (enabledProviders.size() > 0) ? true : false;
}

export function distance(loc1: common.Location, loc2: common.Location): number {
    if (!loc1.android) {
        loc1.android = androidLocationFromLocation(loc1);
    }
    if (!loc2.android) {
        loc2.android = androidLocationFromLocation(loc2);
    }
    return loc1.android.distanceTo(loc2.android);
}

export class LocationMonitor implements LocationMonitorDef {
    static getLastKnownLocation(): common.Location {
        let criteria = new android.location.Criteria();
        criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
        try {
            let iterator = getAndroidLocationManager().getProviders(criteria, false).iterator();
            let androidLocation;
            while (iterator.hasNext()) {
                var provider = iterator.next();
                let tempLocation = getAndroidLocationManager().getLastKnownLocation(provider);
                if (!androidLocation || tempLocation.getTime() > androidLocation.getTime()) {
                    androidLocation = tempLocation;
                }
            }
            if (androidLocation) {
                return locationFromAndroidLocation(androidLocation);
            }
        }
        catch (e) {
            trace.write("Error: " + e.message, "Error");
        }
        return null;
    }

    static startLocationMonitoring(options: Options, listener): void {
        let updateTime = (options && typeof options.minimumUpdateTime === "number") ? options.minimumUpdateTime : minTimeUpdate;
        let updateDistance = (options && typeof options.updateDistance === "number") ? options.updateDistance : minRangeUpdate;
        getAndroidLocationManager().requestLocationUpdates(updateTime, updateDistance, criteriaFromOptions(options), listener, null);
    }

    static createListenerWithCallbackAndOptions(successCallback: successCallbackType, options: Options) {
        return createLocationListener(successCallback);
    }

    static stopLocationMonitoring(locListenerId: number): void {
        let listener = locationListeners[locListenerId]; 
        if (listener) {
            getAndroidLocationManager().removeUpdates(listener);
            delete locationListeners[locListenerId];
        }
    }
}