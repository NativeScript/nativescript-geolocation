import * as geolocation from "nativescript-geolocation";
import { Accuracy } from "tns-core-modules/ui/enums";
import { EventData } from "tns-core-modules/data/observable";
import { Page } from "tns-core-modules/ui/page";
import { MainViewModel } from "./main-view-model";
const utils = require("tns-core-modules/utils/utils");
import * as application from "tns-core-modules/application";
import { device } from "tns-core-modules/platform";

let page: Page;
let model = new MainViewModel();
let watchIds = [];
const jobId = 308; // the id should be unique for each background job. We only use one, so we set the id to be the same each time.
declare var com: any;

function _stopBackgroundJob() {
    if (application.android) {
        let context = utils.ad.getApplicationContext();
        const jobScheduler = context.getSystemService((<any>android.content.Context).JOB_SCHEDULER_SERVICE);
        if (jobScheduler.getPendingJob(jobId) !== null) {
            jobScheduler.cancel(jobId);
            console.log(`Job Canceled: ${jobId}`);
        }
    }
}
application.on(application.exitEvent, _stopBackgroundJob);

export function pageLoaded(args: EventData) {
    page = <Page>args.object;
    page.bindingContext = model;
}

export function startBackgroundTap() {
    if (application.android) {
        let context = utils.ad.getApplicationContext();
        if (device.sdkVersion >= "26") {
            const jobScheduler = context.getSystemService((<any>android.content.Context).JOB_SCHEDULER_SERVICE);
            const component = new android.content.ComponentName(context, com.nativescript.location.BackgroundService26.class);
            const builder = new (<any>android.app).job.JobInfo.Builder(jobId, component);
            builder.setOverrideDeadline(0);
            return jobScheduler.schedule(builder.build());
        } else {
            let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
            context.startService(intent);
        }
    }
}

export function stopBackgroundTap() {
    if (application.android) {
        if (device.sdkVersion >= "26") {
            _stopBackgroundJob();
        } else {
            let context = utils.ad.getApplicationContext();
            let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
            context.stopService(intent);
        }
    }
}

export function enableLocationTap() {
    geolocation.isEnabled().then(function (isEnabled) {
        if (!isEnabled) {
            geolocation.enableLocationRequest(false, true).then(function () {
            }, function (e) {
                console.log("Error: " + (e.message || e));
            });
        }
    }, function (e) {
        console.log("Error: " + (e.message || e));
    });
}

export function buttonGetLocationTap() {
    geolocation.getCurrentLocation({
        desiredAccuracy: Accuracy.high,
        maximumAge: 5000,
        timeout: 10000
    }).then(function (loc) {
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
                updateDistance: 1,
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
