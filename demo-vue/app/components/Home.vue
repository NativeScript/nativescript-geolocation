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

    export default {
        data() {
            return {
                watchIds: [],
                locations: []
            }
        },
        methods: {
            enableLocationTap: async function() {
                let isEnable;

                try {
                    isEnable = await geolocation.isEnabled();
                } catch (e) {
                    console.log(`Error: ${(e.message || e)}`);
                    return;
                }

                if (isEnable) return;

                try {
                    await geolocation.enableLocationRequest(true, true)
                    console.log("User Enabled Location Service");
                } catch (ex) {
                    console.log("Unable to Enable Location", ex);
                }
            },
            buttonGetLocationTap: function() {
                let that = this;
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
                    let that = this;
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
