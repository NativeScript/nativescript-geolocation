import * as geolocation from "nativescript-geolocation";
import { Accuracy } from "ui/enums";
import { EventData } from "data/observable";
import { Page } from "ui/page";
import { MainViewModel } from "./main-view-model";
const utils = require("tns-core-modules/utils/utils");
import * as application from "tns-core-modules/application";
let locationService = require('./background-service');

let page: Page;
let model = new MainViewModel();
let watchIds = [];
declare var com: any;

export function pageLoaded(args: EventData) {
    page = <Page>args.object;
    page.bindingContext = model;
}

export function startBackgroundTap() {
    if (application.android) {
        let context = utils.ad.getApplicationContext();
        let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
        context.startService(intent);
    }
}

export function stopBackgroundTap() {
    if (application.android) {
        let context = utils.ad.getApplicationContext();
        let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
        context.stopService(intent);
    }
}

export function enableLocationTap() {
    geolocation.isEnabled().then(function (isEnabled) {
        if (!isEnabled) {
            geolocation.enableLocationRequest().then(function () {
            }, function (e) {
                console.log("Error: " + (e.message || e));
            });
        }
    }, function (e) {
        console.log("Error: " + (e.message || e));
    });
}

export function buttonGetLocationTap() {
    let location = geolocation.getCurrentLocation({
        desiredAccuracy: Accuracy.high,
        maximumAge: 5000,
        timeout: 10000
    })
        .then(function (loc) {
            if (loc) {
                model.locations.push(loc);
            }
        }, function (e) {
            console.log("Error: " + (e.message || e));
        });
}

export function buttonStartTap() {
    try {
        watchIds.push(geolocation.watchLocation(
            function (loc) {
                if (loc) {
                    model.locations.push(loc);
                }
            },
            function (e) {
                console.log("Error: " + e.message);
            },
            {
                desiredAccuracy: Accuracy.high,
                updateDistance: 0.1,
                updateTime: 3000,
                minimumUpdateTime: 100
            }));
    } catch (ex) {
        console.log("Error: " + ex.message);
    }
}

export function buttonStopTap() {
    let watchId = watchIds.pop();
    while (watchId != null) {
        geolocation.clearWatch(watchId);
        watchId = watchIds.pop();
    }
}

export function buttonClearTap() {
    model.locations.splice(0, model.locations.length);
}
