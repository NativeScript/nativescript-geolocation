// import * as geolocation from "nativescript-geolocation";
// import { Accuracy } from "tns-core-modules/ui/enums";
// import * as application from "tns-core-modules/application";
// import { device } from "tns-core-modules/platform";
// import * as Toast from "nativescript-toast";

// let watchId;

// function _clearWatch() {
//     if (watchId) {
//         geolocation.clearWatch(watchId);
//         watchId = null;
//     }
// }

// function _startWatch() {
//     geolocation.enableLocationRequest().then(function () {
//         _clearWatch();
//         watchId = geolocation.watchLocation(
//             function (loc) {
//                 if (loc) {
//                     let toast = Toast.makeText('Background Location: \n' + loc.latitude + ', ' + loc.longitude);
//                     toast.show();
//                     console.log('Background Location: ' + loc.latitude + ' ' + loc.longitude);
//                 }
//             },
//             function (e) {
//                 console.log("Background watchLocation error: " + (e.message || e));
//             },
//             {
//                 desiredAccuracy: Accuracy.high,
//                 updateDistance: 1.0,
//                 updateTime: 3000,
//                 minimumUpdateTime: 100
//             });
//     }, function (e) {
//         console.log("Background enableLocationRequest error: " + (e.message || e));
//     });
// }

// application.on(application.exitEvent, _clearWatch);

// if (application.android) {
//     if (device.sdkVersion < "26") {
//         (<any>android.app.Service).extend("com.nativescript.location.BackgroundService", {
//             onStartCommand: function (intent, flags, startId) {
//                 this.super.onStartCommand(intent, flags, startId);
//                 return android.app.Service.START_STICKY;
//             },
//             onCreate: function () {
//                 _startWatch();
//             },
//             onBind: function (intent) {
//                 console.log("on Bind Services");
//             },
//             onUnbind: function (intent) {
//                 console.log('UnBind Service');
//             },
//             onDestroy: function () {
//                 console.log('service onDestroy');
//                 _clearWatch();
//             }
//         });
//     } else {
//         (<any>android.app).job.JobService.extend("com.nativescript.location.BackgroundService26", {
//             onStartJob() {
//                 console.log('service onStartJob');
//                 _startWatch();
//                 return true;
//             },
//             onStopJob(jobParameters: any) {
//                 console.log('service onStopJob');
//                 this.jobFinished(jobParameters, false);
//                 _clearWatch();
//                 return false;
//             },
//         });
//     }
// }
