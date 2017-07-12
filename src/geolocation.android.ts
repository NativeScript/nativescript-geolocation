import {
    android as androidAppInstance,
    AndroidApplication,
    AndroidActivityResultEventData,
    AndroidActivityRequestPermissionsEventData
} from "application";
import { device as PlatformDevice } from "platform";
import { Accuracy } from "ui/enums";
import { setTimeout, clearTimeout } from "timer";
import { write } from "trace";
import {
    Location as commonLocation,
    defaultGetLocationTimeout,
    minTimeUpdate,
    minRangeUpdate
} from "./geolocation.common";
import {
    LocationMonitor as LocationMonitorDef,
    Options,
    successCallbackType,
    errorCallbackType
} from "./location-monitor";

const locationListeners = {};
let watchId = 0;
let androidLocationManager: android.location.LocationManager;

function getAndroidLocationManager(): android.location.LocationManager {
    if (!androidLocationManager) {
        androidLocationManager = (<android.content.Context>androidAppInstance.context)
            .getSystemService(android.content.Context.LOCATION_SERVICE);
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

function locationFromAndroidLocation(androidLocation: android.location.Location): commonLocation {
    // console.log(`Converting androidLocation to location with date ${androidLocation.getTime()}`);
    let location = new commonLocation();
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

function androidLocationFromLocation(location: commonLocation): android.location.Location {
    let androidLocation = new android.location.Location("custom");
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
        } catch (e) {
            console.error("invalid location timestamp");
        }
    }
    return androidLocation;
}

function criteriaFromOptions(options: Options): android.location.Criteria {
    let criteria = new android.location.Criteria();
    if (options && options.desiredAccuracy <= Accuracy.high) {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_FINE);
    } else {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
    }
    return criteria;
}

function watchLocationCore(errorCallback: errorCallbackType,
    options: Options,
    locListener: android.location.LocationListener): void {
    let criteria = criteriaFromOptions(options);
    try {
        let updateTime = (options && typeof options.minimumUpdateTime === "number") ?
            options.minimumUpdateTime :
            minTimeUpdate;
        let updateDistance = (options && typeof options.updateDistance === "number") ?
            options.updateDistance :
            minRangeUpdate;
        getAndroidLocationManager().requestLocationUpdates(updateTime,
            updateDistance,
            criteria,
            locListener,
            null);
    } catch (e) {
        LocationMonitor.stopLocationMonitoring((<any>locListener).id);
        errorCallback(e);
    }
}

function enableLocationServiceRequest(currentContext,
    successCallback?,
    successArgs?,
    errorCallback?: errorCallbackType,
    errorArgs?): void {
    if (!isEnabled()) {
        let onActivityResultHandler = function (data: AndroidActivityResultEventData) {
            androidAppInstance.off(AndroidApplication.activityResultEvent, onActivityResultHandler);
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
            androidAppInstance.off(AndroidApplication.activityResultEvent, onActivityResultHandler);
        };
        androidAppInstance.on(AndroidApplication.activityResultEvent, onActivityResultHandler);
        const LOCATION_SETTINGS = android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS;
        currentContext.startActivityForResult(new android.content.Intent(LOCATION_SETTINGS), 0);
    } else {
        if (successCallback) {
            successCallback.apply(this, successArgs);
        }
    }
}

function enableLocationRequestCore(successCallback?,
    successArgs?,
    errorCallback?: errorCallbackType,
    errorArgs?): void {
    let currentContext = <android.app.Activity>androidAppInstance.currentContext;
    if (parseInt(PlatformDevice.sdkVersion) >= 23) {
        let activityRequestPermissionsHandler = function (data: AndroidActivityRequestPermissionsEventData) {
            // console.log(`requestCode: ${data.requestCode}`);
            // console.log(`permissions: ${data.permissions}`);
            // console.log(`grantResults: ${data.grantResults}`);
            if (data.requestCode === 5000) {
                const PERMISSION_GRANTED = android.content.pm.PackageManager.PERMISSION_GRANTED;
                if (data.grantResults.length > 0 && data.grantResults[0] === PERMISSION_GRANTED) {
                    // console.log("permission granted!!!");
                    enableLocationServiceRequest(currentContext,
                        successCallback,
                        successArgs,
                        errorCallback,
                        errorArgs);
                } else {
                    // console.log("permission not granted!!!");
                    if (errorCallback) {
                        errorCallback.apply(this, errorArgs);
                    }
                }
            }
            androidAppInstance.off(AndroidApplication.activityRequestPermissionsEvent,
                activityRequestPermissionsHandler);
        };
        androidAppInstance.on(AndroidApplication.activityRequestPermissionsEvent,
            activityRequestPermissionsHandler);
        let res = (<any>android.support.v4.content.ContextCompat)
            .checkSelfPermission(currentContext, (<any>android).Manifest.permission.ACCESS_FINE_LOCATION);
        if (res === -1) {
            (<any>android.support.v4.app).ActivityCompat
                .requestPermissions(currentContext, ["android.permission.ACCESS_FINE_LOCATION"], 5000);
        } else {
            enableLocationServiceRequest(currentContext,
                successCallback,
                successArgs,
                errorCallback,
                errorArgs);
        }
    } else {
        enableLocationServiceRequest(currentContext, successCallback, successArgs, errorCallback, errorArgs);
    }
}

export function watchLocation(successCallback: successCallbackType,
    errorCallback: errorCallbackType,
    options: Options): number {
    let zonedSuccessCallback = (<any>global).zonedCallback(successCallback);
    let zonedErrorCallback = (<any>global).zonedCallback(errorCallback);
    let locListener = createLocationListener(zonedSuccessCallback);
    if (!isEnabled()) {
        let notGrantedError = new Error("Location service is not enabled or using it is not granted.");
        enableLocationRequestCore(watchLocationCore,
            [
                zonedSuccessCallback,
                zonedErrorCallback,
                options,
                locListener
            ],
            zonedErrorCallback,
            [notGrantedError]);
    } else {
        watchLocationCore(zonedErrorCallback, options, locListener);
    }
    return (<any>locListener).id;
}


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
        let locListener;
        let enabledCallback = function (ecbResolve, ecbReject, ecbOptions) {
            // console.log("ecbOptions -> %j", ecbOptions);
            let successCallback = function (location: commonLocation) {
                LocationMonitor.stopLocationMonitoring(<any>locListener.id);
                if (ecbOptions && typeof ecbOptions.maximumAge === "number") {
                    if (location.timestamp.valueOf() + ecbOptions.maximumAge > new Date().valueOf()) {
                        ecbResolve(location);
                    } else {
                        ecbReject(new Error("New location is older than requested maximum age!"));
                    }
                } else {
                    ecbResolve(location);
                }
            };

            locListener = LocationMonitor.createListenerWithCallbackAndOptions(successCallback, ecbOptions);
            try {
                getAndroidLocationManager().requestSingleUpdate(criteriaFromOptions(ecbOptions), locListener, null);
            } catch (e) {
                ecbReject(e);
            }

            if (ecbOptions && typeof ecbOptions.timeout === "number") {
                const timerId = setTimeout(function () {
                    clearTimeout(timerId);
                    LocationMonitor.stopLocationMonitoring(<any>locListener.id);
                    ecbReject(new Error("Timeout while searching for location!"));
                }, ecbOptions.timeout || defaultGetLocationTimeout);
            }
        };
        let permissionDeniedCallback = function (pdcReject) {
            pdcReject(new Error("Location service is not enabled or using it is not granted."));
        };
        if (!isEnabled()) {
            enableLocationRequestCore(enabledCallback, [resolve, reject, options], permissionDeniedCallback, [reject]);
        } else {
            enabledCallback(resolve, reject, options);
        }
    });
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

        let enabledCallback = function (ecbResolve, ecbReject) {
            ecbResolve();
        };
        let permissionDeniedCallback = function (pdcReject) {
            pdcReject(new Error("Location service is not enabled or using it is not granted."));
        };

        enableLocationRequestCore(enabledCallback, [resolve], permissionDeniedCallback, [reject]);
    });
}

export function isEnabled(): boolean {
    let criteria = new android.location.Criteria();
    criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
    // due to bug in android API getProviders() with criteria parameter overload should be called
    // (so most loose accuracy is used).
    let enabledProviders = getAndroidLocationManager().getProviders(criteria, true);
    return (enabledProviders.size() > 0) ? true : false;
}

export function distance(loc1: commonLocation, loc2: commonLocation): number {
    if (!loc1.android) {
        loc1.android = androidLocationFromLocation(loc1);
    }
    if (!loc2.android) {
        loc2.android = androidLocationFromLocation(loc2);
    }
    return loc1.android.distanceTo(loc2.android);
}

export class LocationMonitor implements LocationMonitorDef {
    static getLastKnownLocation(): commonLocation {
        let criteria = new android.location.Criteria();
        criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
        try {
            let iterator = getAndroidLocationManager().getProviders(criteria, false).iterator();
            let androidLocation;
            while (iterator.hasNext()) {
                let provider = iterator.next();
                let tempLocation = getAndroidLocationManager().getLastKnownLocation(provider);
                if (!androidLocation || tempLocation.getTime() > androidLocation.getTime()) {
                    androidLocation = tempLocation;
                }
            }
            if (androidLocation) {
                return locationFromAndroidLocation(androidLocation);
            }
        } catch (e) {
            write("Error: " + e.message, "Error");
        }
        return null;
    }

    static startLocationMonitoring(options: Options, listener): void {
        let updateTime = (options && typeof options.minimumUpdateTime === "number") ?
            options.minimumUpdateTime :
            minTimeUpdate;
        let updateDistance = (options && typeof options.updateDistance === "number") ?
            options.updateDistance :
            minRangeUpdate;
        getAndroidLocationManager().requestLocationUpdates(updateTime,
            updateDistance,
            criteriaFromOptions(options),
            listener,
            null);
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
