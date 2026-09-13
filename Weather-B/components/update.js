// Weather-B is fully free and does not fetch remote promotional/update feeds.
// Compatibility state for legacy UI paths is kept local only.
var wCast=null;
var sunriseTime=NaN,sunsetTime=NaN,noonTime=NaN,solarMidnight=NaN;
var mp_event=function(){};
const syncCompatibilityState=data=>{if(data&&data.wCast){wCast=data.wCast;const day=data.wCast.forecastDaily?.days?.[0];sunriseTime=day?.sunrise?toTimestamp(day.sunrise):NaN;sunsetTime=day?.sunset?toTimestamp(day.sunset):NaN;noonTime=day?.solarNoon?toTimestamp(day.solarNoon):((sunriseTime+sunsetTime)/2||NaN);solarMidnight=NaN}};
chrome.storage.local.get("wCast",syncCompatibilityState);
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes.wCast)syncCompatibilityState({wCast:changes.wCast.newValue})});
const adCard=()=>{if(typeof cardUpdate!=="undefined"&&cardUpdate)cardUpdate.style.display="none"};