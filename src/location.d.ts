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