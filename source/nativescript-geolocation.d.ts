declare module "nativescript-geolocation" {
    /**
    * A data class that encapsulates common properties for a geolocation.
    */
    export class Location {
       /**
        * The latitude of the geolocation, in degrees.
        */
        latitude: number;

       /**
        * The longitude of the geolocation, in degrees.
        */
        longitude: number;

       /**
        * The altitude (if available), in meters above sea level.
        */
        altitude: number;

       /**
        * The horizontal accuracy, in meters.
        */
        horizontalAccuracy: number;

       /**
        * The vertical accuracy, in meters.
        */
        verticalAccuracy: number;

       /**
        * The speed, in meters/second over ground.
        */
        speed: number;

       /**
        * The direction (course), in degrees.
        */
        direction: number;

       /**
        * The time at which this location was determined.
        */
        timestamp: Date;

       /**
        * The android-specific [location](http://developer.android.com/reference/android/location/Location.html) object.
        */
        android: any;

       /**
        * The ios-specific [CLLocation](https://developer.apple.com/library/ios/documentation/CoreLocation/Reference/CLLocation_Class/) object.
        */
        ios: any;
    }

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

    function getCurrentLocation(options): Promise<Location>;
    function watchLocation(options): Number;
    function clearWatch(watchId): void;
    function enableLocationRequest(always?: boolean): void;
    function isEnabled(): boolean;
    function distance(loc1: Location, loc2: Location): number;

    export class LocationMonitor {
        static getLastKnownLocation(): Location;
        static stopLocationMonitoring(locListenerId: Number): void;
        static startLocationMonitoring(options: Options, locListener: any): void;
        static createListenerWithCallbackAndOptions(successCallback: (location: Location) => void, options: Options): any;
        static stopLocationMonitoring(locListenerId: Number): void;
    }
}
