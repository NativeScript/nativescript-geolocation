import {Location} from "./location";

/**
* Provides options for location monitoring.
*/
export interface Options {
   /**
    * Specifies desired accuracy in meters. Defaults to DesiredAccuracy.HIGH
    */
    desiredAccuracy?: number;

   /**
    * Update distance filter in meters. Specifies how often to update. Default on iOS is no filter, on Android it is 0 meters
    */
    updateDistance?: number;

   /**
    * Minimum time interval between location updates, in milliseconds (ignored on iOS)
    */
    minimumUpdateTime?: number;

   /**
    * how old locations to receive in ms.
    */
    maximumAge?: number;

   /**
    * how long to wait for a location in ms.
    */
    timeout?: number;
}

export function getCurrentLocation(options): Promise<Location>;
export function watchLocation(options): Number;
export function clearWatch(watchId): void;
export function enableLocationRequest(always?: boolean): void;
export function isEnabled(): boolean;
export function distance(loc1: Location, loc2: Location): number;

export class LocationMonitor {
    static getLastKnownLocation(): Location;
    static stopLocationMonitoring(locListenerId: Number): void;
    static startLocationMonitoring(options: Options, locListener: any): void;
    static createListenerWithCallbackAndOptions(successCallback: (location: Location) => void, options: Options): any;
    static stopLocationMonitoring(locListenerId: Number): void;
}
