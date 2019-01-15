import { Component, OnInit } from "@angular/core";
import * as geolocation from "nativescript-geolocation";
import { Accuracy } from "tns-core-modules/ui/enums";
import * as application from "tns-core-modules/application";
import { device } from "tns-core-modules/platform";
const utils = require("tns-core-modules/utils/utils");

@Component({
    selector: "Home",
    moduleId: module.id,
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {

    locations = [];
    watchIds = [];
    jobId = 308; // the id should be unique for each background job. We only use one, so we set the id to be the same each time.

    constructor() {
        // Use the component constructor to inject providers.
    }

    ngOnInit(): void {
        application.on(application.exitEvent, this._stopBackgroundJob);
        // Init your component properties here.
    }

    _stopBackgroundJob() {
        if (application.android) {
            let context = utils.ad.getApplicationContext();
            const jobScheduler = context.getSystemService((<any>android.content.Context).JOB_SCHEDULER_SERVICE);
            if (jobScheduler.getPendingJob(this.jobId) !== null) {
                jobScheduler.cancel(this.jobId);
                console.log(`Job Canceled: ${this.jobId}`);
            }
        }
    }

    public enableLocationTap() {
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
    
    public buttonGetLocationTap() {
        var that = this;
        geolocation.getCurrentLocation({
            desiredAccuracy: Accuracy.high,
            maximumAge: 5000,
            timeout: 10000
        }).then(function (loc) {
            if (loc) {
                that.locations.push(loc);
            }
        }, function (e) {
            console.log("Error: " + (e.message || e));
        });
    }
    
    public buttonStartTap() {
        try {
            var that = this;
            this.watchIds.push(geolocation.watchLocation(
                function (loc) {
                    if (loc) {
                        that.locations.push(loc);
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
    
    public buttonStopTap() {
        let watchId = this.watchIds.pop();
        while (watchId != null) {
            geolocation.clearWatch(watchId);
            watchId = this.watchIds.pop();
        }
    }
    
    public buttonClearTap() {
        this.locations.splice(0, this.locations.length);
    }

    // public startBackgroundTap() {
    //     if (application.android) {
    //         let context = utils.ad.getApplicationContext();
    //         if (device.sdkVersion >= "26") {
    //             const jobScheduler = context.getSystemService((<any>android.content.Context).JOB_SCHEDULER_SERVICE);
    //             const component = new android.content.ComponentName(context, com.nativescript.location.BackgroundService26.class);
    //             const builder = new (<any>android.app).job.JobInfo.Builder(this.jobId, component);
    //             builder.setOverrideDeadline(0);
    //             return jobScheduler.schedule(builder.build());
    //         } else {
    //             let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
    //             context.startService(intent);
    //         }
    //     }
    // }
    
    // public stopBackgroundTap() {
    //     if (application.android) {
    //         if (device.sdkVersion >= "26") {
    //             this._stopBackgroundJob();
    //         } else {
    //             let context = utils.ad.getApplicationContext();
    //             let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
    //             context.stopService(intent);
    //         }
    //     }
    // }
}
