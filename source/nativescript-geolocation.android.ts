import appModule = require("application");
import enums = require("ui/enums");
import timer = require("timer");
import trace = require("trace");
import common = require("./nativescript-geolocation-common");
import {LocationMonitor as LocationMonitorDef} from "./location-monitor";
global.moduleMerge(common, exports);

var locationListeners = {};
var watchId = 0;
var androidLocationManager;
var minTimeUpdate = 1 * 60 * 1000; // 1 minute
var minRangeUpdate = 0; // 0 meters

function getAndroidLocationManager() {
    if (!androidLocationManager) {
        androidLocationManager = appModule.android.context.getSystemService(android.content.Context.LOCATION_SERVICE);
    }
    return androidLocationManager;
}

function createLocationListener() {
    var locationListener = new android.location.LocationListener({
        onLocationChanged: function (location1) {
            if (this._onLocation) {
                this._onLocation(locationFromAndroidLocation(location1));
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
    (<any>locationListener).id = watchId;
    locationListeners[watchId] = locationListener;
    return locationListener;
}

function locationFromAndroidLocation(androidLocation) {
    var location = new common.Location();
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

function androidLocationFromLocation(location) {
    var androidLocation = new android.location.Location('custom');
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
        }
        catch (e) {
            console.error('invalid location timestamp');
        }
    }
    return androidLocation;
}

export class LocationMonitor implements LocationMonitorDef {
    static getLastKnownLocation() {
        var criteria = new android.location.Criteria();
        criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
        try {
            var providers = getAndroidLocationManager().getProviders(criteria, false);
            var i;
            var iter = providers.iterator();
            var tempLocation;
            var androidLocation;
            while(iter.hasNext()) {
                var provider = iter.next();
                tempLocation = getAndroidLocationManager().getLastKnownLocation(provider);
                if (!androidLocation) {
                    androidLocation = tempLocation;
                }
                else {
                    if (tempLocation.getTime() > androidLocation.getTime()) {
                        androidLocation = tempLocation;
                    }
                }
            }
            if (androidLocation) {
                return locationFromAndroidLocation(androidLocation);
            }
        }
        catch (e) {
            trace.write("Error: " + e.message, "Error");
        }
        return null;
    }

    static startLocationMonitoring(options, listener) {
        var updateTime = (options && typeof options.minimumUpdateTime === "number") ? options.minimumUpdateTime : minTimeUpdate;
        var updateDistance = (options && typeof options.updateDistance === "number") ? options.updateDistance : minRangeUpdate;
        getAndroidLocationManager().requestLocationUpdates(updateTime, updateDistance, criteriaFromOptions(options), listener, null);
    }

    static createListenerWithCallbackAndOptions(successCallback, options) {
        var locListener = createLocationListener();
        (<any>locListener)._onLocation = successCallback;
        return locListener;
    }

    static stopLocationMonitoring(locListenerId) {
        if (locationListeners[locListenerId]) {
            getAndroidLocationManager().removeUpdates(locationListeners[locListenerId]);
            delete locationListeners[locListenerId];
        }
    }
}

export function isEnabled() {
    var criteria = new android.location.Criteria();
    criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
    // due to bug in android API getProviders() with criteria parameter overload should be called (so most loose accuracy is used).
    var enabledProviders = getAndroidLocationManager().getProviders(criteria, true);
    return (enabledProviders.size() > 0) ? true : false;
}

export function distance(loc1, loc2) {
    if (!loc1.android) {
        loc1.android = androidLocationFromLocation(loc1);
    }
    if (!loc2.android) {
        loc2.android = androidLocationFromLocation(loc2);
    }
    return loc1.android.distanceTo(loc2.android);
}

export function enableLocationRequest(always?: boolean) {
    (<android.app.Activity>appModule.android.currentContext).startActivityForResult(new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS), 0);
}

function criteriaFromOptions(options) {
    var criteria = new android.location.Criteria();
    if (options && options.desiredAccuracy <= enums.Accuracy.high) {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_FINE);
    }
    else {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
    }
    return criteria;
}

export function watchLocation(successCallback, errorCallback, options) {
    var criteria = new android.location.Criteria();
    if (options && options.desiredAccuracy <= enums.Accuracy.high) {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_FINE);
    }
    else {
        criteria.setAccuracy(android.location.Criteria.ACCURACY_COARSE);
    }
    var locListener = createLocationListener();
    (<any>locListener)._onLocation = successCallback;
    try {
        var updateTime = (options && typeof options.minimumUpdateTime === "number") ? options.minimumUpdateTime : minTimeUpdate;
        var updateDistance = (options && typeof options.updateDistance === "number") ? options.updateDistance : minRangeUpdate;
        getAndroidLocationManager().requestLocationUpdates(updateTime, updateDistance, criteria, locListener, null);
        return (<any>locListener).id;
    }
    catch (e) {
        LocationMonitor.stopLocationMonitoring((<any>locListener).id);
        errorCallback(e);
        return null;
    }
}

export function clearWatch(locListenerId) {
    LocationMonitor.stopLocationMonitoring(locListenerId);
}
