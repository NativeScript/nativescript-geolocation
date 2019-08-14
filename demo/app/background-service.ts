import * as geolocation from "nativescript-geolocation";
import { Accuracy } from "tns-core-modules/ui/enums";
import * as application from "tns-core-modules/application";
import { device } from "tns-core-modules/platform";
import * as Toast from "nativescript-toast";

let watchId;

function _clearWatch() {
    if (watchId) {
        geolocation.clearWatch(watchId);
        watchId = null;
    }
}

function _startWatch() {
    geolocation.enableLocationRequest().then(function () {
        _clearWatch();
        watchId = geolocation.watchLocation(
            function (loc) {
                if (loc) {
                    let toast = Toast.makeText('Background Location: \n' + loc.latitude + ', ' + loc.longitude);
                    toast.show();
                    console.log('Background Location: ' + loc.latitude + ' ' + loc.longitude);
                }
            },
            function (e) {
                console.log("Background watchLocation error: " + (e.message || e));
            },
            {
                desiredAccuracy: Accuracy.high,
                updateDistance: 1.0,
                updateTime: 3000,
                minimumUpdateTime: 100
            });
    }, function (e) {
        console.log("Background enableLocationRequest error: " + (e.message || e));
    });
}
application.on(application.exitEvent, _clearWatch);

export function getBackgroundServiceClass() {
    if (application.android) {
        if (device.sdkVersion < "26") {
            @JavaProxy("com.nativescript.location.BackgroundService")
            class BackgroundService extends (<any>android).app.Service {
                constructor() {
                    super();
                    return global.__native(this);
                }
                onStartCommand(intent, flags, startId) {
                    console.log('service onStartCommand');
                    this.super.onStartCommand(intent, flags, startId);
                    return android.app.Service.START_STICKY;
                }
                onCreate() {
                    console.log('service onCreate');
                    _startWatch();
                }
                onBind(intent) {
                    console.log('service onBind');
                }
                onUnbind(intent) {
                    console.log('service onUnbind');
                }
                onDestroy() {
                    console.log('service onDestroy');
                    _clearWatch();
                }
            }
            return BackgroundService;
        } else {
            @JavaProxy("com.nativescript.location.BackgroundService26")
            class BackgroundService26 extends (<any>android.app).job.JobService {
                constructor() {
                    super();
                    return global.__native(this);
                }
                onStartJob(): boolean {
                    console.log('service onStartJob');
                    _startWatch();
                    return true;
                }
                onStopJob(jobParameters: any): boolean {
                    console.log('service onStopJob');
                    this.jobFinished(jobParameters, false);
                    _clearWatch();
                    return false;
                }
            }
            return BackgroundService26;
        }
    } else {
        return null;
    }
}
export const BackgroundServiceClass = getBackgroundServiceClass();