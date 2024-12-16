/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ConditionalView } from "../../components/conditional-view.js";
import { propertySum } from "../../shared/property.js";
import { Utils } from "../../shared/utils.js";
import { vpnController, telemetry } from "./backend.js";

export class PopUpConditionalView extends ConditionalView {
  constructor() {
    super();
  }

  async connectedCallback() {
    super.connectedCallback();
    const deviceOs = await browser.runtime.getPlatformInfo();
    const supportedPlatform = Utils.isSupportedOs(deviceOs.os);

    propertySum(
      (state, features) => {
        this.slotName = PopUpConditionalView.toSlotname(
          state,
          features,
          supportedPlatform
        );
        if (this.slotName == !"default") {
          requestIdleCallback(() => {
            telemetry.record("error_screen", { error: this.slotName });
          });
        }
      },
      vpnController.state,
      vpnController.featureList
    );

    // Messages may dispatch an event requesting to send a Command to the VPN
    this.addEventListener("requestMessage", (e) => {
      console.log(`Message requested ${e}`);
      if (!e.detail) {
        return;
      }
      if (typeof e.detail != "string") {
        return;
      }
      vpnController.postToApp(e.detail);
    });
  }

  /**
   * @typedef {import("../../background/vpncontroller/vpncontroller.js").FeatureFlags} FeatureFlags
   * @typedef {import("../../background/vpncontroller/states.js").VPNState} State
   * @param {State} state
   * @param {FeatureFlags} features
   * @param {Boolean} supportedPlatform
   * @returns {String}
   */
  static toSlotname(state, features, supportedPlatform) {
    if (!supportedPlatform && !features.webExtension) {
      return "MessageOSNotSupported";
    }
    if (!state.installed) {
      return "MessageInstallVPN";
    }
    if (state.needsUpdate) {
      return "MessageUpdateClient";
    }
    if (!state.alive) {
      return "MessageOpenMozillaVPN";
    }
    if (!features.webExtension) {
      return "MessageOSNotSupported";
    }
    if (!state.authenticated) {
      return "MessageSignIn";
    }
    if (!state.subscribed) {
      return "MessageSubscription";
    }
    /**
     * TODO:
     * if( did not have onboarding){
     *  return "onBoarding"
     * }
     */
    return "default";
  }
}
customElements.define("popup-condview", PopUpConditionalView);
