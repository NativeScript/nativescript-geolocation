import { Location } from "./location";

/**
* Provides options for location monitoring.
*/
export interface Options {
    /**
     * Specifies desired accuracy in meters. Defaults to DesiredAccuracy.HIGH
     */
    desiredAccuracy?: number;

    /**
     * Update distance filter in meters. Specifies how often to update. Default on iOS is no filter  (ignored on Android)
     */
    updateDistance?: number;

    /**
     * Interval between location updates, in milliseconds (ignored on iOS)
     */
    updateTime?: number;

    /**
     * Minimum time interval between location updates, in milliseconds (ignored on iOS)
     */
    minimumUpdateTime?: number;

    /**
     * How old locations to receive in ms.
     */
    maximumAge?: number;

    /**
     * How long to wait for a location in ms.
     */
    timeout?: number;
}

declare type successCallbackType = (location: Location) => void;
declare type errorCallbackType = (error: Error) => void;

/**
 * Get current location applying the specified options (if any).
 * @param {Options} options
 */
export function getCurrentLocation(options: Options): Promise<Location>;

/**
 * Monitor for location change.
 * @returns {number} The watch id
 */
export function watchLocation(successCallback: successCallbackType, errorCallback: errorCallbackType, options: Options): number;

/**
 * Stop monitoring for location change. Parameter expected is the watchId returned from `watchLocation`.
 * @param watchId The watch id returned when watchLocation was called
 */
export function clearWatch(watchId: number): void;

/**
 * Ask for permissions to use location services. The option `always` is application for iOS only. Read more: https://developer.apple.com/documentation/corelocation/cllocationmanager/1620551-requestalwaysauthorization.
 * @param always iOS only. https://developer.apple.com/documentation/corelocation/cllocationmanager/1620551-requestalwaysauthorization
 */
export function enableLocationRequest(always?: boolean): Promise<void>;

/**
 * Check if location services are enabled
 * @param options android only. Check the availability based on the specified options.
 * @returns {boolean} True if location services are enabled
 */
export function isEnabled(options?: Options): Promise<boolean>;

/**
 * Calculate the distance between two locations.
 * @param {Location} loc1 From location
 * @param {Location} loc2 To location
 * @returns {number} The calculated distance in meters.
 */
export function distance(loc1: Location, loc2: Location): number;
