if (!self.document) {
  importScripts("./libraries/tz.js","./libraries/moment.js","./libraries/moment-timezone-with-data-10-year-range.min.js","./components/util.js","./libraries/suncalc.js","./components/weatherCast.js");

  const DEFAULTS={citys:"New York",latlong:"40.713,-74.0072",timezone:"America/New_York",country:"US",setSettingFC:"c",IntervalUpdate:"15",badgeDataSource:"realtime",badgeAlert:true};

  const ensureDefaults=()=>new Promise(resolve=>chrome.storage.local.get(Object.keys(DEFAULTS),data=>{const missing={};Object.keys(DEFAULTS).forEach(key=>{if(data[key]===undefined)missing[key]=DEFAULTS[key]});if(Object.keys(missing).length)chrome.storage.local.set(missing,resolve);else resolve()}));

  const refreshWeather=async()=>{await ensureDefaults();chrome.storage.local.get(["latlong","country","citys","timezone"],async data=>{if(!data.latlong)return;try{await weCast(data.latlong,data.country,data.timezone)}catch(error){console.warn("Weather-B background refresh failed",error)}})};

  const scheduleRefresh=()=>{chrome.storage.local.get("IntervalUpdate",data=>{const minutes=Math.max(15,parseInt(data.IntervalUpdate)||15);chrome.alarms.create("weatherRefresh",{delayInMinutes:.05,periodInMinutes:minutes})})};

  chrome.runtime.onInstalled.addListener(async details=>{if(details.reason==="install")await ensureDefaults();else await ensureDefaults();scheduleRefresh();refreshWeather()});
  chrome.runtime.onStartup.addListener(()=>{scheduleRefresh();refreshWeather()});
  chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==="weatherRefresh")refreshWeather()});
  chrome.runtime.onMessage.addListener((request,sender)=>{if(sender.id===chrome.runtime.id&&request?.msg==="intervalUpdateMessage"){scheduleRefresh();refreshWeather()}});
  chrome.idle.setDetectionInterval(900);
  chrome.idle.onStateChanged.addListener(state=>{if(state==="active")refreshWeather()});
}