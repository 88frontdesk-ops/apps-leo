document.addEventListener('DOMContentLoaded',()=>{
  const tabs=[...document.querySelectorAll('.view-tab')];
  const panels=[...document.querySelectorAll('.view-panel')];
  const selectTab=name=>{tabs.forEach(t=>t.classList.toggle('active',t.dataset.view===name));panels.forEach(p=>p.classList.toggle('active',p.dataset.panel===name));};
  tabs.forEach(t=>t.addEventListener('click',()=>selectTab(t.dataset.view)));
  selectTab('overview');

  const bgBase='assets/background/';
  const chooseBackground=()=>{
    const condition=(document.getElementById('short-forecast')?.textContent||'').toLowerCase();
    const icon=document.getElementById('weather-icon')?.getAttribute('src')||'';
    const night=/night-/.test(icon);
    let kind='clear';
    if(/thunder|storm/.test(condition)) kind='rain';
    else if(/snow|sleet|ice|wintry/.test(condition)) kind='sleet';
    else if(/rain|shower|drizzle/.test(condition)) kind='rain';
    else if(/fog|mist|haze|smoke/.test(condition)) kind='fog';
    else if(/overcast|cloudy/.test(condition)) kind='cloudy';
    else if(/partly|mostly/.test(condition)) kind='partly-cloudy';
    const url=`${bgBase}${kind}-${night?'night':'day'}.jpg`;
    document.documentElement.style.setProperty('--weather-bg',`url("${url}")`);
    document.body.dataset.weatherKind=kind;
    document.body.dataset.weatherNight=night?'1':'0';
  };
  const conditionNode=document.getElementById('short-forecast');
  const iconNode=document.getElementById('weather-icon');
  if(conditionNode)new MutationObserver(chooseBackground).observe(conditionNode,{childList:true,subtree:true,characterData:true});
  if(iconNode)new MutationObserver(chooseBackground).observe(iconNode,{attributes:true,attributeFilter:['src']});
  chooseBackground();
  setInterval(chooseBackground,60000);

  const syncDetails=()=>{
    const pairs=[['feels-like','feels-like-inline'],['humidity','humidity-detail'],['pressure','pressure-detail'],['wind','wind-detail'],['visibility','visibility-detail'],['condition-description','condition-description-detail']];
    pairs.forEach(([from,to])=>{const a=document.getElementById(from),b=document.getElementById(to);if(a&&b)b.textContent=a.textContent;});
  };
  const content=document.getElementById('content');
  if(content)new MutationObserver(syncDetails).observe(content,{childList:true,subtree:true,characterData:true});
  syncDetails();
});