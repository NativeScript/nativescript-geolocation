import * as geolocation from "nativescript-geolocation";
import { Observable, ObservableArray } from "@nativescript/core";

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