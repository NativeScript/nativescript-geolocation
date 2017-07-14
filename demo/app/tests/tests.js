var Location = require("nativescript-geolocation").Location;

describe("location", function () {
    it("can be instantiated", function () {
        expect(function () {
            return new Location();
        }).not.toThrow();

        expect(new Location()).toBeDefined();
    });
});