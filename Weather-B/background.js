const DEFAULTS={citys:"New York",latlong:"40.713,-74.0072",timezone:"America/New_York",country:"US",setSettingFC:"c"};
chrome.runtime.onInstalled.addListener(()=>chrome.storage.local.set(DEFAULTS));
chrome.runtime.onStartup.addListener(()=>chrome.storage.local.get(Object.keys(DEFAULTS),d=>{const m={};for(const k in DEFAULTS)if(d[k]===undefined)m[k]=DEFAULTS[k];if(Object.keys(m).length)chrome.storage.local.set(m)}));
