import { android as androidAppInstance, AndroidApplication } from "application";
import { AndroidActivityResultEventData, AndroidActivityRequestPermissionsEventData } from "application";
import { device as PlatformDevice } from "platform";
import { Accuracy } from "ui/enums";
import { setTimeout, clearTimeout } from "timer";
import { write } from "trace";
import { LocationBase, defaultGetLocationTimeout, minTimeUpdate, minRangeUpdate } from "./geolocation.common";
import { Options, successCallbackType, errorCallbackType } from "./location-monitor";
import * as permissions from "nativescript-permissions";

declare var com: any;
let REQUEST_ENABLE_LOCATION = 4269; // random number
let _onEnableLocationSuccess = null;
let _onEnableLocationFail = null;

const locationListeners = {};
let watchIdCounter = 0;
let fusedLocationClient;

function _ensureLocationClient() {
    // Wrapped in a function as we should not access java object there because of the snapshots.
    fusedLocationClient = fusedLocationClient ||
        com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(androidAppInstance.context);
}

androidAppInstance.on(AndroidApplication.activityResultEvent, function (args: any) {
    if (args.requestCode === REQUEST_ENABLE_LOCATION) {
        if (args.resultCode === 0) {
            if (_onEnableLocationFail) {
                _onEnableLocationFail('Location not enabled.');
            }
        } else if (_onEnableLocationSuccess) {
            _onEnableLocationSuccess();
        }
    }
});

export function getCurrentLocation(options: Options): Promise<Location> {
    _ensureLocationClient();
    return new Promise(function (resolve, reject) {
        enableLocationRequest().then(() => {
            if (options.timeout === 0) {
                // get last known
                let locationTask = fusedLocationClient.getLastLocation()
                    .addOnSuccessListener(_getLocationListener(options.maximumAge, resolve, reject))
                    .addOnFailureListener(_getTaskFailListener((e) => reject(e.getMessage())));
            } else {
                // wait for the exact location
                let locationRequest = _getLocationRequest(options);
                let watchId = _getNextWatchId();
                let locationCallback = _getLocationCallback(watchId, (nativeLocation) => {
                    clearWatch(watchId);
                    resolve(new Location(nativeLocation));
                });

                _requestLocationUpdates(locationRequest, locationCallback);
            }
        }, reject);
    });
}

function _getNextWatchId() {
    let watchId = ++watchIdCounter;
    return watchId;
}

function _requestLocationUpdates(locationRequest, locationCallback) {
    _ensureLocationClient();
    fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, null /* Looper */);
}

function _getLocationCallback(watchId, onLocation): any {
    let LocationCallback = com.google.android.gms.location.LocationCallback.extend({
        // IMPORTANT: Do not touch any scope variables here. The Java definition of the class is cached
        // internally in NativeScript and if we directly use 'watchId' or 'onLocation' here, we will
        // always receive the references from the first '_getLocationCallback' method call!!!
        onLocationResult: function (locationResult) {
            this.onLocation(locationResult.getLastLocation());
        }
    });

    let locationCallback = new LocationCallback();
    // Workaround for the above-mentioned Note
    locationCallback.onLocation = onLocation;

    locationListeners[watchId] = locationCallback;

    return locationCallback;
}

function _getLocationRequest(options: Options): any {
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

function _getLocationListener(maxAge, onLocation, onError) {
    return _getTaskSuccessListener((nativeLocation: android.location.Location) => {
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

function _getTaskSuccessListener(done: (result) => void) {
    return new com.google.android.gms.tasks.OnSuccessListener({
        onSuccess: done
    });
}

function _getTaskFailListener(done: (exception) => void) {
    return new com.google.android.gms.tasks.OnFailureListener({
        onFailure: done
    });
}

export function watchLocation(successCallback: successCallbackType, errorCallback: errorCallbackType, options: Options): number {
    let locationRequest = _getLocationRequest(options);
    let watchId = _getNextWatchId();
    const locationCallback = _getLocationCallback(watchId, (nativeLocation) => {
        successCallback(new Location(nativeLocation));
    });

    _requestLocationUpdates(locationRequest, locationCallback);

    return watchId;
}

export function clearWatch(watchId: number): void {
    _ensureLocationClient();
    let listener = locationListeners[watchId];
    if (listener) {
        fusedLocationClient.removeLocationUpdates(listener);
        delete locationListeners[watchId];
    }
}

export function enableLocationRequest(always?: boolean): Promise<void> {
    _ensureLocationClient();
    return new Promise<void>(function (resolve, reject) {
        _requestLocationPermissions().then(() => {
            _makeGooglePlayServicesAvailable().then(() => {
                _isEnabled().then(() => {
                    resolve();
                }, (ex) => {
                    let statusCode = ex.getStatusCode();
                    if (statusCode === com.google.android.gms.common.api.CommonStatusCodes.RESOLUTION_REQUIRED) {
                        try {
                            _onEnableLocationSuccess = resolve;
                            _onEnableLocationFail = reject;
                            ex.startResolutionForResult(androidAppInstance.foregroundActivity, REQUEST_ENABLE_LOCATION);
                        } catch (sendEx) {
                            // Ignore the error.
                            resolve();
                        }
                    } else {
                        reject('Cannot enable the location service');
                    }
                });
            }, reject);
        }, reject);
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
            .addOnSuccessListener(_getTaskSuccessListener(resolve))
            .addOnFailureListener(_getTaskFailListener(reject));
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

function _isEnabled(options?: Options): Promise<boolean> {
    return new Promise(function (resolve, reject) {
        options = options || { desiredAccuracy: Accuracy.high, updateTime: 0, updateDistance: 0, maximumAge: 0, timeout: 0 };
        let locationRequest = _getLocationRequest(options);
        let locationSettingsBuilder = new com.google.android.gms.location.LocationSettingsRequest.Builder();
        locationSettingsBuilder.addLocationRequest(locationRequest);
        locationSettingsBuilder.setAlwaysShow(true);
        let locationSettingsClient = com.google.android.gms.location.LocationServices.getSettingsClient(androidAppInstance.context);
        locationSettingsClient.checkLocationSettings(locationSettingsBuilder.build())
            .addOnSuccessListener(_getTaskSuccessListener((a) => {
                resolve();
            }))
            .addOnFailureListener(_getTaskFailListener((ex) => {
                reject(ex);
            }));
    });
}

export function isEnabled(options?: Options): Promise<boolean> {
    return new Promise(function (resolve, reject) {
        if (!_isGooglePlayServicesAvailable() ||
            !permissions.hasPermission((<any>android).Manifest.permission.ACCESS_FINE_LOCATION)) {
            resolve(false);
        } else {
            _isEnabled().then(
                () => {
                    resolve(true);
                }, () => {
                    resolve(false);
                });
        }
    });
}

export function distance(loc1: Location, loc2: Location): number {
    return loc1.android.distanceTo(loc2.android);
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