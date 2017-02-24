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

    /**
     * A Boolean value which has to be set to true on iOS versions > 9.0 to allow the application to receive location updates in 
     * background (e.g. in combination with the UIBackgroundModes key 'location' in the Info.plist). The value is ignored on Android.
     * @see {@link https://developer.apple.com/reference/corelocation/cllocationmanager/1620568-allowsbackgroundlocationupdates|allowsBackgroundLocationUpdates} 
     */
    iosAllowsBackgroundLocationUpdates?: boolean;

    /**
     * A Boolean value which has to be set to false on iOS to deactivate the automatic pause of location updates. The location manager might pause 
     * location updates for a period of time to improve battery life. This behavior may stop a long-running background task. Set this flag to false
     * to prevent this behavior. The value is ignored on Android.
     * @see {@link https://developer.apple.com/reference/corelocation/cllocationmanager/1620553-pauseslocationupdatesautomatical|pausesLocationUpdatesAutomatically}
     */
    iosPausesLocationUpdatesAutomatically?: boolean;
}

declare type successCallbackType = (location: Location) => void;
declare type errorCallbackType = (error: Error) => void;

export function getCurrentLocation(options: Options): Promise<Location>;
export function watchLocation(successCallback: successCallbackType, errorCallback: errorCallbackType, options: Options): number;
export function clearWatch(watchId: number): void;
export function enableLocationRequest(always?: boolean): Promise<void>;
export function isEnabled(): boolean;
export function distance(loc1: Location, loc2: Location): number;

export class LocationMonitor {
    static getLastKnownLocation(): Location;
    static startLocationMonitoring(options: Options, locListener: any): void;
    static createListenerWithCallbackAndOptions(successCallback: successCallbackType, options: Options): any;
    static stopLocationMonitoring(locListenerId: number): void;
}
