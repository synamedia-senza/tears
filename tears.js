const ENCRYPTED_TEST_VIDEO = "https://storage.googleapis.com/wvmedia/cenc/h264/tears/tears.mpd";
const WIDEVINE = "https://proxy.uat.widevine.com/proxy";

window.addEventListener("load", async () => {
  await senza.init();
  senza.uiReady();
});

document.addEventListener("keydown", async (event) => {
  const currentState = await senza.lifecycle.getState();
  if (currentState === "background" || currentState === "inTransitionToBackground") {
    senza.lifecycle.moveToForeground();
  } else {
    await senza.remotePlayer.load(ENCRYPTED_TEST_VIDEO);
    senza.remotePlayer.play();
  }
}, false);

hs.remotePlayer.addEventListener("license-request", async (event) => {
  console.log("[tears]", "Got license-request event");
  const requestBuffer = event?.detail?.licenseRequest;
  const requestBufferStr = String.fromCharCode.apply(null, new Uint8Array(requestBuffer));
  const decodedLicenseRequest = window.atob(requestBufferStr); // from base 64
  console.log("[tears]", "License request in base64:", decodedLicenseRequest);
  const licenseRequestBytes = Uint8Array.from(decodedLicenseRequest, (l) => l.charCodeAt(0));

  const res = await getLicenseFromServer(licenseRequestBytes.buffer);
  console.log("[tears]", "Writing response to platform ", res.code, res.responseBody);
  event.writeLicenseResponse(res.code, res.responseBody);
});

async function getLicenseFromServer(licenseRequest) {
  console.log("[tears]", "Requesting license From Widevine server");
  const response = await fetch(WIDEVINE, {
    "method": "POST",
    "body": licenseRequest,
    "headers" : {
      "Content-Type": "application/octet-stream"
    }
  });

  const code = response.status;
  if (code !== 200) {
    console.error("[tears]", "failed to to get response from widevine:", code);
    const responseBody = await response.text();
    console.error("[tears]", responseBody);
    return {code, responseBody};
  }
  const responseBody = await response.arrayBuffer();
  return {code, responseBody};
}

