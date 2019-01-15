<template>
    <Page class="page">
        <ActionBar class="action-bar">
            <Label class="action-bar-title" text="Geolocation Vue Demo"></Label>
        </ActionBar>

        <GridLayout rows="auto, auto, *, auto">
            <GridLayout row="0" columns="*, *, *, *" >
                <Button text="Enable Location" col="0" textWrap="true" @tap="enableLocationTap"/>
                <Button text="Get Current Location" col="1" textWrap="true" @tap="buttonGetLocationTap"/>
                <Button text="Start Monitoring" col="2" textWrap="true" @tap="buttonStartTap"/>
                <Button text="Stop Monitoring" col="3" textWrap="true" @tap="buttonStopTap"/>
            </GridLayout>
            <!-- <GridLayout row="1" columns="*, *" >
                <Button text="Start Background thread monitoring" col="0" ios:visibility="collapsed" textWrap="true" @tap="startBackgroundTap"/>
                <Button text="Stop Background thread monitoring" col="1" ios:visibility="collapsed" textWrap="true" @tap="stopBackgroundTap"/>
            </GridLayout> -->
            <ListView row="2" for="item in locations">
                <v-template>
                    <Label :text="item.latitude + ', ' + item.longitude + ', ' + item.altitude" />
                </v-template>
            </ListView>
            <Button text="Clear" row="3" @tap="buttonClearTap"/>
        </GridLayout>
    </Page>
</template>

<script>
    import * as geolocation from "nativescript-geolocation";
    import { Accuracy } from "tns-core-modules/ui/enums";
    import * as application from "tns-core-modules/application";
    import { device } from "tns-core-modules/platform";

    const utils = require("tns-core-modules/utils/utils");
    const jobId = 308; // the id should be unique for each background job. We only use one, so we set the id to be the same each time.

    function _stopBackgroundJob() {
        if (application.android) {
            let context = utils.ad.getApplicationContext();
            const jobScheduler = context.getSystemService(android.content.Context.JOB_SCHEDULER_SERVICE);
            if (jobScheduler.getPendingJob(jobId) !== null) {
                jobScheduler.cancel(jobId);
                console.log(`Job Canceled: ${jobId}`);
            }
        }
    }
    application.on(application.exitEvent, _stopBackgroundJob);

    export default {
        data() {
            return {
                watchIds: [],
                locations: []
            }
        },
        methods: {
            enableLocationTap: function() {
                geolocation.isEnabled().then(function (isEnabled) {
                    if (!isEnabled) {
                        geolocation.enableLocationRequest().then(function () { }, function (e) {
                            console.log("Error: " + (e.message || e));
                        });
                    }
                }, function (e) {
                    console.log("Error: " + (e.message || e));
                });
            },
            buttonGetLocationTap: function() {
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
            },
            buttonStartTap: function() {
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
            },
            buttonStopTap: function() {
                let watchId = this.watchIds.pop();
                while (watchId != null) {
                    geolocation.clearWatch(watchId);
                    watchId = this.watchIds.pop();
                }
            },
            startBackgroundTap: function() {
                if (application.android) {
                    let context = utils.ad.getApplicationContext();
                    if (device.sdkVersion >= "26") {
                        const jobScheduler = context.getSystemService(android.content.Context.JOB_SCHEDULER_SERVICE);
                        const component = new android.content.ComponentName(context, com.nativescript.location.BackgroundService26.class);
                        const builder = new android.app.job.JobInfo.Builder(jobId, component);
                        builder.setOverrideDeadline(0);
                        return jobScheduler.schedule(builder.build());
                    } else {
                        let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
                        context.startService(intent);
                    }
                }
            },
            stopBackgroundTap: function() {
                if (application.android) {
                    if (device.sdkVersion >= "26") {
                        _stopBackgroundJob();
                    } else {
                        let context = utils.ad.getApplicationContext();
                        let intent = new android.content.Intent(context, com.nativescript.location.BackgroundService.class);
                        context.stopService(intent);
                    }
                }
            },
            buttonClearTap: function() {
                this.locations.splice(0, this.locations.length);
            }
        }
    };
</script>

<style scoped lang="scss">
    // Start custom common variables
    @import '../app-variables';
    // End custom common variables

    // Custom styles
    .fa {
        color: $accent-dark;
    }

    .info {
        font-size: 20;
    }
</style>
