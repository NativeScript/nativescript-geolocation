import { Location as LocationDef } from "./location";

export class LocationBase implements LocationDef {
  public latitude: number;
  public longitude: number;
  public altitude: number;
  public horizontalAccuracy: number;
  public verticalAccuracy: number;
  public speed: number; // in m/s ?
  public direction: number; // in degrees
  public timestamp: Date;
}

export const defaultGetLocationTimeout = 5 * 60 * 1000; // 5 minutes
export const minRangeUpdate = 0.1; // 0 meters
export const minTimeUpdate = 1 * 60 * 1000; // 1 minute
