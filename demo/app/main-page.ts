import * as geolocation from "nativescript-geolocation";
import { Accuracy } from "@nativescript/core/ui/enums";
import { EventData, Page, Application as application, Device as device, Utils as utils } from "@nativescript/core";
import { MainViewModel } from "./main-view-model";
import { BackgroundServiceClass } from "./background-service";

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
            const component = new android.content.ComponentName(context, BackgroundServiceClass.class);
            const builder = new (<any>android.app).job.JobInfo.Builder(jobId, component);
            builder.setOverrideDeadline(0);
            jobScheduler.schedule(builder.build());
        } else {
            let intent = new android.content.Intent(context, BackgroundServiceClass.class);
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
            let intent = new android.content.Intent(context, BackgroundServiceClass.class);
            context.stopService(intent);
        }
    }
}

export function enableLocationTap() {
    geolocation.isEnabled().then(function (isEnabled) {
        if (!isEnabled) {
            geolocation.enableLocationRequest(true, true).then(() => {
                console.log("User Enabled Location Service");
            }, (e) => {
                console.log("Error: " + (e.message || e));
            }).catch(ex => {
                console.log("Unable to Enable Location", ex);
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
