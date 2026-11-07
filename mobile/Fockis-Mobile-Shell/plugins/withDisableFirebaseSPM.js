const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

module.exports = function withDisableFirebaseSPM(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        throw new Error("Fockis: iOS Podfile was not found.");
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");
      const setting = "$RNFirebaseDisableSPM = true";

      if (!podfile.includes(setting)) {
        podfile = `${setting}\n${podfile}`;
        fs.writeFileSync(podfilePath, podfile, "utf8");
      }

      return config;
    },
  ]);
};
