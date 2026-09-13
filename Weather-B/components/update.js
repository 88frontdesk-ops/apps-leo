// Weather-B is fully free and does not fetch remote promotional/update feeds.
// Compatibility state for legacy UI paths is kept local only.
var wCast=null;
var sunriseTime=NaN,sunsetTime=NaN,noonTime=NaN,solarMidnight=NaN;
var mp_event=function(){};
chrome.storage.local.get("wCast",data=>{if(data&&data.wCast)wCast=data.wCast});
const adCard=()=>{if(typeof cardUpdate!=="undefined"&&cardUpdate)cardUpdate.style.display="none"};