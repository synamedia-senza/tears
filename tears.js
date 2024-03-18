import { init, remotePlayer, uiReady, lifecycle } from "@Synamedia/hs-sdk";

const ENCRYPTED_TEST_VIDEO="https://storage.googleapis.com/wvmedia/cenc/h264/tears/tears.mpd";

window.addEventListener("load", async () => {
  await init();
  uiReady();
});

document.addEventListener("keydown", async (event) => {
  const currentState = await lifecycle.getState();
  if (currentState === "background" || currentState === "inTransitionToBackground") {
    lifecycle.moveToForeground();
  } else {
    await remotePlayer.load(ENCRYPTED_TEST_VIDEO);
    remotePlayer.play();
  }
}, false);

remotePlayer.addEventListener("license-request", async (event) => {
  console.log("Got license-request event");
  const requestBuffer = event?.detail?.licenseRequest;
  const requestBufferStr = String.fromCharCode.apply(null, new Uint8Array(requestBuffer));
  console.log("License request in base64:", requestBufferStr);

  const decodedLicenseRequest = window.atob(requestBufferStr); // from base 64
  const licenseRequestBytes = Uint8Array.from(decodedLicenseRequest, (l) => l.charCodeAt(0));

  const res = await getLicenseFromServer(licenseRequestBytes.buffer);
  console.log("Writing response to platform ", res.code, res.responseBody);
  event.writeLicenseResponse(res.code, res.responseBody);
});

async function getLicenseFromServer(licenseRequest) {
  console.log("Requesting license From Widevine server");
  const response = await fetch("https://proxy.uat.widevine.com/proxy", {
    "method": "POST",
    "body": licenseRequest,
    "headers" : {
      "Content-Type": "application/octet-stream"
    }
  });

  const code = response.status;
  if (code !== 200) {
    console.error("failed to to get response from widevine:", code);
    const responseBody = await response.text();
    console.error(responseBody);
    return {code, responseBody};
  }
  const responseBody = await response.arrayBuffer();
  return {code, responseBody};
}

