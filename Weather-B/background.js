chrome.runtime.onInstalled.addListener(()=>chrome.alarms.create("intervalUpdateTimes",{delayInMinutes:15,periodInMinutes:15}));
chrome.runtime.onStartup.addListener(()=>chrome.alarms.create("intervalUpdateTimes",{delayInMinutes:15,periodInMinutes:15}));
