import { android as androidAppInstance, AndroidApplication } from "application";
import { AndroidActivityResultEventData, AndroidActivityRequestPermissionsEventData } from "application";
import { device as PlatformDevice } from "platform";
import { Accuracy } from "ui/enums";
import { setTimeout, clearTimeout } from "timer";
import { write } from "trace";
import { LocationBase, defaultGetLocationTimeout, minTimeUpdate, minRangeUpdate } from "./geolocation.common";
import { Options, successCallbackType, errorCallbackType } from "./location-monitor";
import * as permissions from "nativescript-permissions";
let application = require("application");

declare var com: any;
let REQUEST_ENABLE_LOCATION = 4269; // random number

export function getCurrentLocation(options: Options): Promise<Location> {
    let mFusedLocationClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(androidAppInstance.context);
    return new Promise(function (resolve, reject) {
        _requestLocationPermissions().then(() => {
            _makeGooglePlayServicesAvailable().then(() => {
                enableLocationRequest().then(() => {
                    // TODO: get last known or wait for current based on the timeout.. if (options.timeout === 0) {
                    let locationTask = mFusedLocationClient.getLastLocation()
                        .addOnSuccessListener(getLocationListener(options.maximumAge, resolve, reject))
                        .addOnFailureListener(getTaskFailListener((e) => reject(e.getMessage())));
                }, reject);
            }, reject);
        }, reject);
    });
}

function getLocationRequest(options: Options): any {
    let mLocationRequest = new com.google.android.gms.location.LocationRequest();
    mLocationRequest.setInterval(options.updateTime || 0);
    mLocationRequest.setFastestInterval(options.minimumUpdateTime || 0);
    if (options.desiredAccuracy === Accuracy.high) {
        mLocationRequest.setPriority(com.google.android.gms.location.LocationRequest.PRIORITY_HIGH_ACCURACY);
    } else {
        mLocationRequest.setPriority(com.google.android.gms.location.LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY);
    }

    return mLocationRequest;
}

function _requestLocationPermissions(): Promise<any> {
    return permissions.requestPermission((<any>android).Manifest.permission.ACCESS_FINE_LOCATION);
}

function getLocationListener(maxAge, onLocation, onError) {
    return getTaskSuccessListener((nativeLocation: android.location.Location) => {
        if (nativeLocation != null) {
            let location = new Location(nativeLocation);
            if (typeof maxAge === "number" && nativeLocation != null) {
                if (location.timestamp.valueOf() + maxAge > new Date().valueOf()) {
                    onLocation(location);
                } else {
                    onError(new Error("Last known location too old!"));
                }
            } else {
                onLocation(location);
            }
        } else {
            onError(new Error("There is no last known location!"));
        }
    });
}

function getTaskSuccessListener(done: (result) => void) {
    return new com.google.android.gms.tasks.OnSuccessListener({
        onSuccess: done
    });
}

function getTaskFailListener(done: (exception) => void) {
    return new com.google.android.gms.tasks.OnFailureListener({
        onFailure: done
    });
}

/**
 * Monitor for location change.
 * @returns {number} The watch id
 */
export function watchLocation(successCallback: successCallbackType, errorCallback: errorCallbackType, options: Options): number {
    return null;
}

/**
 * Stop monitoring for location change. Parameter expected is the watchId returned from `watchLocation`.
 * @param watchId The watch id returned when watchLocation was called
 */
export function clearWatch(watchId: number): void {

}

export function enableLocationRequest(always?: boolean): Promise<void> {
    return new Promise<void>(function (resolve, reject) {
        isEnabled().then(() => {
            resolve();
        }, (ex) => {
            let statusCode = ex.getStatusCode();
            if (statusCode === com.google.android.gms.common.api.CommonStatusCodes.RESOLUTION_REQUIRED) {
                try {
                    // TODO: ask NS for better approach
                    androidAppInstance.foregroundActivity.onActivityResult = (requestCode, resultCode, data) => {
                        if (requestCode === REQUEST_ENABLE_LOCATION) {
                            if (resultCode === 0) {
                                reject('Location not enabled.');
                            } else {
                                resolve();
                            }
                        }
                    };

                    ex.startResolutionForResult(androidAppInstance.foregroundActivity, REQUEST_ENABLE_LOCATION);
                } catch (sendEx) {
                    // Ignore the error.
                    resolve();
                }
            } else {
                reject();
            }
        });
    });
}

function _makeGooglePlayServicesAvailable(): Promise<void> {
    return new Promise<void>(function (resolve, reject) {
        if (_isGooglePlayServicesAvailable()) {
            resolve();
            return;
        }

        let googleApiAvailability = com.google.android.gms.common.GoogleApiAvailability.getInstance();
        googleApiAvailability.makeGooglePlayServicesAvailable(androidAppInstance.foregroundActivity)
            .addOnSuccessListener(getTaskSuccessListener(resolve))
            .addOnFailureListener(getTaskFailListener(reject));
    });
}

function _isGooglePlayServicesAvailable(): boolean {
    let isLocationServiceEnabled = true;
    let googleApiAvailability = com.google.android.gms.common.GoogleApiAvailability.getInstance();
    let resultCode = googleApiAvailability.isGooglePlayServicesAvailable(androidAppInstance.foregroundActivity);
    if (resultCode !== com.google.android.gms.common.ConnectionResult.SUCCESS) {
        isLocationServiceEnabled = false;
    }

    return isLocationServiceEnabled;
}

export function isEnabled(options?: Options): Promise<boolean> {
    return new Promise(function (resolve, reject) {
        options = options || { desiredAccuracy: Accuracy.high, updateTime: 0, updateDistance: 0, maximumAge: 0, timeout: 0 };
        let locationRequest = getLocationRequest(options);
        let locationSettingsBuilder = new com.google.android.gms.location.LocationSettingsRequest.Builder();
        locationSettingsBuilder.addLocationRequest(locationRequest);
        locationSettingsBuilder.setAlwaysShow(true);
        let locationSettingsClient = com.google.android.gms.location.LocationServices.getSettingsClient(androidAppInstance.context);
        locationSettingsClient.checkLocationSettings(locationSettingsBuilder.build())
            .addOnSuccessListener(getTaskSuccessListener((a) => {
                resolve();
            }))
            .addOnFailureListener(getTaskFailListener((ex) => {
                reject(ex);
            }));
    });
}

/**
 * Calculate the distance between two locations.
 * @param {Location} loc1 From location
 * @param {Location} loc2 To location
 * @returns {number} The calculated distance in meters.
 */
export function distance(loc1: Location, loc2: Location): number {
    return null;
}

export class Location extends LocationBase {
    public android: android.location.Location;  // android Location

    constructor(androidLocation: android.location.Location) {
        super();
        this.android = androidLocation;
        this.latitude = androidLocation.getLatitude();
        this.longitude = androidLocation.getLongitude();
        this.altitude = androidLocation.getAltitude();
        this.horizontalAccuracy = androidLocation.getAccuracy();
        this.verticalAccuracy = androidLocation.getAccuracy();
        this.speed = androidLocation.getSpeed();
        this.direction = androidLocation.getBearing();
        this.timestamp = new Date(androidLocation.getTime());
    }
}