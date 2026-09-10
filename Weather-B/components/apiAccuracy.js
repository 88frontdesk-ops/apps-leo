const apiAccuracy={
  percent:value=>Number.isFinite(value)?`${Math.round(value)}%`:"—",
  temperature:(c,unit)=>{
    if(!Number.isFinite(c))return"—";
    if(unit==="c")return `${c.toFixed(2)}°C`;
    return `${(c*9/5+32).toFixed(2)}°F`;
  },
  uv:value=>Number.isFinite(value)?String(Number(value.toFixed(2))):"—",
  description:(item,fallback="—")=>item&&typeof item.description==="string"&&item.description?item.description:fallback,
  precipitation:(mm,unit)=>{
    if(!Number.isFinite(mm))return"—";
    if(unit==="mmh")return `${mm.toFixed(2)} mm`;
    return `${(mm/25.4).toFixed(2)} in`;
  },
  conditionCode:(description,fallback)=>{
    const text=String(description||"").toLowerCase();
    if(text.includes("thunder"))return "thunderstorms";
    if(text.includes("freezing rain")||text.includes("freezing drizzle")||text.includes("sleet")||text.includes("wintry mix")||text.includes("ice"))return "sleet";
    if(text.includes("snow")||text.includes("flurr"))return "snow";
    if(text.includes("rain")||text.includes("drizzle")||text.includes("shower"))return "rain";
    if(text.includes("fog")||text.includes("haze")||text.includes("smoke")||text.includes("dust"))return "foggy";
    if(text.includes("partly")||text.includes("mostly sunny")||text.includes("mostly clear"))return "partlycloudy";
    if(text.includes("cloud")||text.includes("overcast"))return "cloudy";
    return fallback||"clear";
  },
  render:wCast=>{
    if(!wCast||!wCast.forecastHourly||!wCast.forecastDaily)return;
    chrome.storage.local.get(["setSettingFC","precipitationUnit"],settings=>{
      const tempUnit=settings.setSettingFC||"c";
      const precipUnit=settings.precipitationUnit||"inph";
      const hours=wCast.forecastHourly.hours||[];
      hours.forEach((hour,index)=>{
        const condition=document.getElementById(`forecast_${index}_hourly_condition`);
        const rain=document.getElementById(`forecast_${index}_hours_rain`);
        const uv=document.getElementById(`forecast_${index}_hourly_uv`);
        const temp=document.getElementById(`forecast_${index}_hourly_temp`);
        if(condition){condition.textContent=apiAccuracy.description(hour);}
        if(rain){rain.textContent=apiAccuracy.percent(Number.isFinite(hour.precipitationChance)?hour.precipitationChance*100:null);}
        if(uv){uv.textContent=apiAccuracy.uv(hour.uvIndex);}
        if(temp){temp.textContent=apiAccuracy.temperature(hour.temperature,tempUnit).replace(/°[CF]$/,"°");}
        const icon=apiAccuracy.conditionCode(hour.description,hour.conditionCode);
        const iconMap={"clear-day":"b_sun.svg","clear-night":"b_moon.svg",rain:"b_cloud_rain.svg",snow:"b_cloud_snow.svg",sleet:"b_cloud_snow_alt.svg",wind:"b_wind.svg",fog:"b_cloud_fog_alt.svg",cloudy:"b_cloud.svg","partly-cloudy-day":"b_cloud_sun.svg","partly-cloudy-night":"b_cloud_moon.svg"};
        const iconName=getWeIcon(icon,hour.daylight,hour.cloudCover);
        const node=document.querySelector(`.forecast_${index}_hours_icon_Class`);
        if(node)node.style.backgroundImage=`url("images/weather_icon/${iconMap[iconName]||"b_sun.svg"}")`;
      });
      (wCast.forecastDaily.days||[]).forEach((day,index)=>{
        const d=day.daytimeForecast||{},n=day.overnightForecast||{};
        const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
        set(`forecast_${index}_daily_day_description`,apiAccuracy.description(d));
        set(`forecast_${index}_daily_night_description`,apiAccuracy.description(n));
        set(`forecast_${index}_pop`,apiAccuracy.percent(Number.isFinite(d.precipitationChance)?d.precipitationChance*100:null));
        set(`forecast_${index}_daily_probability`,apiAccuracy.percent(Number.isFinite(d.precipitationChance)?d.precipitationChance*100:null));
        set(`forecast_${index}_daily_night_probability`,apiAccuracy.percent(Number.isFinite(n.precipitationChance)?n.precipitationChance*100:null));
        set(`forecast_${index}_daily_precipitation`,apiAccuracy.precipitation(d.precipitationAmount,precipUnit));
        set(`forecast_${index}_daily_night_precipitation`,apiAccuracy.precipitation(n.precipitationAmount,precipUnit));
        set(`forecast_${index}_daily_uv`,apiAccuracy.uv(day.maxUvIndex));
        set(`forecast_${index}_daily_temp`,Number.isFinite(day.temperatureMax)?(tempUnit==="c"?(day.temperatureMax).toFixed(2):(day.temperatureMax*9/5+32).toFixed(2))+"°":"—");
        set(`forecast_${index}_daily_temp_min`,Number.isFinite(day.temperatureMin)?(tempUnit==="c"?(day.temperatureMin).toFixed(2):(day.temperatureMin*9/5+32).toFixed(2))+"°":"—");
        set(`forecast_${index}_daily_temperatures_max`,Number.isFinite(day.temperatureMax)?apiAccuracy.temperature(day.temperatureMax,tempUnit):"—");
        set(`forecast_${index}_daily_temperatures_min`,Number.isFinite(day.temperatureMin)?apiAccuracy.temperature(day.temperatureMin,tempUnit):"—");
        set(`forecast_${index}_daily_day_description`,apiAccuracy.description(d));
        set(`forecast_${index}_daily_night_description`,apiAccuracy.description(n));
        const dayWindDir=document.getElementById(`forecast_${index}_daily_windDir`),nightWindDir=document.getElementById(`forecast_${index}_daily_night_windDir`);
        if(dayWindDir&&Number.isFinite(d.windDirection))dayWindDir.textContent="degrees"===localStorage.getItem("windDirUnit")?`${d.windDirection}°`:toCom(d.windDirection);
        if(nightWindDir&&Number.isFinite(n.windDirection))nightWindDir.textContent="degrees"===localStorage.getItem("windDirUnit")?`${n.windDirection}°`:toCom(n.windDirection);
      });
      const currentDescription=wCast.currentWeather&&wCast.currentWeather.description;
      ["current_condition","current_condition_table"].forEach(id=>{const el=document.getElementById(id);if(el&&currentDescription)el.textContent=currentDescription;});
      document.querySelectorAll(".current_uv").forEach(el=>{if(Number.isFinite(wCast.currentWeather?.uvIndex))el.textContent=apiAccuracy.uv(wCast.currentWeather.uvIndex);});
    });
  }
};