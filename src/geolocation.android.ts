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

let mFusedLocationClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(androidAppInstance.context);
// TODO: ENABLE LOCATION SERVICE

/**
 * Get current location applying the specified options (if any).
 * @param {Options} options
 */
export function getCurrentLocation(options: Options): Promise<Location> {
    if (options.timeout === 0) {
        // return the last known location
        return new Promise(function(resolve, reject) {
            requestLocationPermissions().then(() => {
                let locationTask = mFusedLocationClient.getLastLocation()
                    .addOnSuccessListener(getLocationListener(options.maximumAge, resolve, reject))
                    .addOnFailureListener(getTaskFailListener(reject));
            });
        });
    } else {
        // wait for the current location
        return new Promise(function(resolve, reject) {
            requestLocationPermissions().then(() => {
                console.log('get last known location');
                let locationTask = mFusedLocationClient.getLastLocation()
                    .addOnSuccessListener(getLocationListener(options.maximumAge, resolve, reject))
                    .addOnFailureListener(getTaskFailListener(reject));
            });
        });
    }
}

function requestLocationPermissions(): Promise<any> {
    return permissions.requestPermission([(<any>android).Manifest.permission.ACCESS_FINE_LOCATION]);
}

function getLocationListener(maxAge, onLocation, onError) {
    return new com.google.android.gms.tasks.OnSuccessListener({
        onSuccess: function(nativeLocation: android.location.Location) {
            console.log('onSuccess: ' + nativeLocation);
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
        }
    });
}

function getTaskFailListener(onFail) {
    return new com.google.android.gms.tasks.OnFailureListener({
        onFailure: function (exception) {
            console.log('onFailure: ' + exception);
            onFail(exception.getMessage());
        }
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

/**
 * Ask for permissions to use location services. The option `always` is application for iOS only. Read more: https://developer.apple.com/documentation/corelocation/cllocationmanager/1620551-requestalwaysauthorization.
 * @param always iOS only. https://developer.apple.com/documentation/corelocation/cllocationmanager/1620551-requestalwaysauthorization
 */
export function enableLocationRequest(always?: boolean): Promise<void> {
    return null;
}

/**
 * Check if location services are enabled
 * @returns {boolean} True if location services are enabled
 */
export function isEnabled(): boolean {
    return null;
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