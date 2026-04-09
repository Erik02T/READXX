import { API_BASE_URL } from "../shared/utils";

export function registerServiceWorkerListeners(): void {
  chrome.runtime.onInstalled.addListener(() => {
    console.info("readxx installed", { API_BASE_URL });
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    console.info("readxx alarm", alarm.name);
  });
}
