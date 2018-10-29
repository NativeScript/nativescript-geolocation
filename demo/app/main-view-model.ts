import * as geolocation from "nativescript-geolocation";
import { Observable } from "tns-core-modules/data/observable";
import { ObservableArray } from "tns-core-modules/data/observable-array";

export class MainViewModel extends Observable {
    private _locations: ObservableArray<geolocation.Location>;

    public get locations(): ObservableArray<geolocation.Location> {
        if (!this._locations) {
            this._locations = new ObservableArray<geolocation.Location>();
        }
        return this._locations;
    }

    public set locations(value: ObservableArray<geolocation.Location>) {
        if (this._locations !== value) {
            this._locations = value;
            this.notifyPropertyChange('locations', value);
        }
    }
}