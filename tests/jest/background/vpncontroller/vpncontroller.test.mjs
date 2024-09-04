/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import {
  fromVPNStatusResponse,
  isSplitTunnled,
  ServerCity,
  ServerCountry,
  vpnStatusResponse,
} from "../../../../src/background/vpncontroller";

describe("isSplitTunneled", () => {
  const cases = [
    { res: true, path: "/soo/bar/Firefox Nightly/firefox.exe" },
    { res: true, path: "/soo/bar/Firefox Developer Edition/firefox.exe" },
    { res: true, path: "/soo/bar/Firefox/firefox.exe" },
    { res: true, path: "/soo/bar/Firefox Nightly/firefox" },
    { res: true, path: "/soo/bar/Firefox Developer Edition/firefox" },
    { res: true, path: "/soo/bar/Firefox/firefox" },
    { res: false, path: "/soo/bar/Waterfox/Waterfox" },
  ];
  cases.forEach((c) => {
    it(`Should handle ${c.path}`, () => {
      expect(
        isSplitTunnled({
          t: "disabled_apps",
          disabled_apps: [c.path],
        })
      ).toBe(c.res);
    });
  });
  it(`No apps split tunneled`, () => {
    expect(
      isSplitTunnled({
        t: "disabled_apps",
        disabled_apps: [],
      })
    ).toBe(false);
  });
  it(`Has default args`, () => {
    expect(isSplitTunnled()).toBe(false);
  });
  it(`Throws with wrong args`, () => {
    try {
      isSplitTunnled({
        t: "malformed_apps",
        disabled_apps: [],
      });
      // Unreachable Hopefully
      expect(null).toBe(true);
    } catch (error) {
      expect(error.toString()).toContain("passed an invalid response");
    }
  });
});

describe("fromVPNStatusResponse", () => {
  const makeCountry = (code, name) => {
    const out = new ServerCountry();
    out.code = code;
    out.name = name;
    return out;
  };
  const makeCity = (code, name) => {
    const x = new ServerCity();
    x.code = code;
    x.name = name;
    return x;
  };

  const list = (() => {
    const l = [];
    const germany = makeCountry("de", "germany");
    germany.cities.push(makeCity("ber", "berlin"));
    l.push(germany);
    const mordor = makeCountry("mor", "mordor");
    mordor.cities.push("oh", "Actually no idea what the name would be");
    l.push(mordor);
    return l;
  })();

  it("fails on a non status response", () => {
    const msg = new vpnStatusResponse();
    msg.t = "no status";
    expect(fromVPNStatusResponse(msg)).toBeUndefined();
  });

  it("It can Create a StateOff Status", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateOff";
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";

    const result = fromVPNStatusResponse(msg, list);
    expect(result.exitServerCity).toBe(list[1][0]);
    expect(result.exitServerCountry).toBe(list[1]);
    expect(result.connected).toBe(false);
    expect(result.state).toBe("Disabled");
  });

  it("It creates a StateOff Status when Disconnecting", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateDisconnecting";
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";

    const result = fromVPNStatusResponse(msg, list);
    expect(result.exitServerCity).toBe(list[1][0]);
    expect(result.exitServerCountry).toBe(list[1]);
    expect(result.connected).toBe(false);
    expect(result.state).toBe("Disabled");
  });
  it("It creates a StatOn Status ", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateOn";
    msg.status.connectedSince = "1";
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";

    const result = fromVPNStatusResponse(msg, list);
    expect(result.exitServerCity).toBe(list[1][0]);
    expect(result.exitServerCountry).toBe(list[1]);
    expect(result.connected).toBe(true);
    expect(result.connectedSince).toBe(1);
    expect(result.state).toBe("Enabled");
  });
  it("It can handle omition of connectedSince ", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateOn";
    delete msg.status.connectedSince;
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";

    const result = fromVPNStatusResponse(msg, list);
    expect(result.exitServerCity).toBe(list[1][0]);
    expect(result.exitServerCountry).toBe(list[1]);
    expect(result.connected).toBe(true);
    expect(result.connectedSince).toBe(0);
    expect(result.state).toBe("Enabled");
  });
});