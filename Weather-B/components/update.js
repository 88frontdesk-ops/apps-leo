// Weather-B is fully free and does not fetch remote promotional/update feeds.
// Compatibility state for legacy UI paths is kept local only.
var sunriseTime=NaN,sunsetTime=NaN,noonTime=NaN,solarMidnight=NaN;
var mp_event=function(){};
const adCard=()=>{if(typeof cardUpdate!=="undefined"&&cardUpdate)cardUpdate.style.display="none"};