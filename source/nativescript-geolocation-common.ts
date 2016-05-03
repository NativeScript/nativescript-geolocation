import {Location as LocationDef} from "./location";
import * as locationModule from "./location-monitor";
import timer = require("timer");
var location: typeof locationModule = null; //required dynamically

export class Location implements LocationDef {
    public latitude: number;
    public longitude: number;

    public altitude: number;

    public horizontalAccuracy: number;
    public verticalAccuracy: number;

    public speed: number; // in m/s ?

    public direction: number; // in degrees

    public timestamp: Date;

    public android: android.location.Location;  // android Location
    public ios: CLLocation;      // iOS native location
}

export var defaultGetLocationTimeout = 5 * 60 * 1000; // 5 minutes
