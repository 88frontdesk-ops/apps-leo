/* global api, defaults */

if (typeof importScripts !== 'undefined') {
  self.importScripts('api.js', 'defaults.js', 'reload.js', 'context.js');
}

// Firefox
if (typeof URLPattern === 'undefined') {
  import('./polyfill/urlpattern.js').then(o => {
    self.URLPattern = o.URLPattern;
  });
}


const messaging = (request, sender, response = () => {}) => {
  if (request.method === 'remove-jobs') {
    // remove the jobs
    setTimeout(async () => {
      // get profiles before clearing the storage
      const map = new Map();
      for (const id of request.ids) {
        const profile = await api.storage.get('job-' + id);
        map.set(id.toString(), profile);
      }

      // remove job
      for (const e of request.ids) {
        const id = e.toString();
        await api.alarms.remove(id);
        api.button.icon('disabled', Number(id));
      }
      await api.storage.remove(...request.ids.map(id => 'job-' + id));
      await api.alarms.count().then(c => api.button.badge(c));

      if (request['skip-echo'] !== true) {
        api.post.bg({
          method: 'reload-interface'
        }, () => chrome.runtime.lastError);
      }
      response();

      // remove counters
      for (const e of request.ids) {
        chrome.tabs.sendMessage(Number(e), {
          method: 'kill-counter'
        }, () => chrome.runtime.lastError);
      }

      // allow discarding
      for (const [id, profile] of map.entries()) {
        if (profile && profile.nodiscard) {
          api.tabs.update(Number(id), {
            autoDiscardable: true
          });
        }
      }

      // keep track of jobs that are not removed by the user
      if (
        request.reason === 'tab-removed' ||
        request.reason === 'tab-not-found-on-window-removed' ||
        request.reason === 'tab-not-found-on-popup' ||
        request.reason === 'tab-not-found-on-alarm'
      ) {
        api.storage.get({
          'removed.jobs': {}
        }).then(prefs => {
          for (const id of request.ids) {
            const profile = map.get(id.toString());
            // do not add a job that is explicitly being forbidden
            if (profile && profile['skip-auto-add'] !== true) {
              // add new one
              prefs['removed.jobs'][api.clean.href(profile.href)] = {
                reason: request.reason,
                profile,
                timestamp: Date.now()
              };
            }
          }
          // remove old profiles
          Object.entries(prefs['removed.jobs']).forEach(([key, o]) => {
            if (Date.now() - o.timestamp > defaults['removed.jobs']) {
              delete prefs['removed.jobs'][key];
            }
          });
          api.storage.set(prefs);
        });
      }
    });

    return true;
  }
  else if (request.method === 'add-jobs') {
    const g = Object.assign({}, defaults.profile, request.profile, {
      timestamp: Date.now()
    });

    const period = Math.max(1, api.convert.secods(api.convert.str2obj(g.period)));

    const when = Date.now() + (request.now ? 100 : (
      g.randomize ? parseInt(Math.random() * period * 1000) : period * 1000
    ));

    setTimeout(async () => {
      const storage = {};
      for (const tab of request.tabs) {
        const name = tab.id.toString();
        storage['job-' + name] = Object.assign({
          href: tab.url
        }, g);
        await api.alarms.add(name, {
          when,
          // only used as backup. The extension sets a new alarm
          periodInMinutes: Math.max(1, period / 60)
        });
        api.button.icon('active', tab.id);
        // countdown
        if (request.profile['visual-countdown']) {
          api.tabs.countdown(tab.id, request.profile.period).catch(e => console.error(e));
        }
        // no discard
        if (g.nodiscard) {
          api.tabs.update(tab.id, {
            autoDiscardable: false
          });
        }
      }
      await api.storage.set(storage);
      api.alarms.count().then(c => api.button.badge(c));

      api.post.bg({
        method: 'reload-interface'
      }, () => chrome.runtime.lastError);
      response();
    });

    // keep in profiles
    api.storage.get({
      profiles: {}
    }).then(prefs => {
      for (const tab of request.tabs) {
        try {
          const {hostname} = new URL(tab.url);

          if (hostname) {
            prefs.profiles[hostname] = Object.assign({
              href: tab.url
            }, g);
          }
        }
        catch (e) {
          console.warn('Cannot add the new job to profiles', e);
        }
      }
      const profiles = Object.entries(prefs.profiles);
      if (profiles.length > defaults['max-number-of-profiles']) {
        const keys = profiles.sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, profiles.length - defaults['max-number-of-profiles']).map(a => a[0]);

        for (const key of keys) {
          delete prefs.profiles[key];
        }
      }

      api.storage.set(prefs);
    });

    return true;
  }
  else if (request.method === 'search-for-profile-anyway') {
    (async () => {
      // Do we have a job for this tab
      if (request.alarm) {
        const profile = await api.storage.get('job-' + request.alarm.name);

        return response({
          active: true,
          profile
        });
      }
      // Do we have a profile for this tab
      const profile = await new Promise(resolve => messaging({
        method: 'search-for-profile',
        url: request.url
      }, {}, resolve));
      if (profile) {
        return response({profile});
      }
      // load defaults
      api.storage.get({
        'default-profile': defaults.profile
      }).then(prefs => response({
        profile: prefs['default-profile']
      }));
    })();

    return true;
  }
  else if (request.method === 'search-for-profile') {
    api.storage.get({
      profiles: {}
    }).then(({profiles}) => {
      for (const [key, value] of Object.entries(profiles)) {
        if (api.match('ht:' + key, request.url)) {
          return response(value);
        }
      }
      return response(false);
    });
    return true;
  }
  else if (request.method === 'show-error') { // user command
    const id = sender.tab.id;

    api.button.icon('error', id);
    api.button.badge('E', id);
    api.button.tooltip(request.message, id);
  }
  else if (request.method === 'toggle-requested') { // user command
    const id = sender.tab.id;

    api.alarms.get(id.toString()).then(o => {
      if (o) {
        messaging({
          reason: 'script-request',
          method: 'remove-jobs',
          ids: [id]
        });
      }
      else {
        messaging({
          method: 'search-for-profile',
          url: sender.tab.url
        }, {}, v => messaging({
          method: 'add-jobs',
          profile: v || {},
          tabs: [sender.tab]
        }));
      }
    });
  }
  else if (request.method === 'activate-tab') { // user command
    api.tabs.activate(sender.tab.id);
  }
  else if (request.method === 'play-sound') { // user command
    try {
      const audio = new Audio(request.src);
      audio.volume = request.volume || 1;
      audio.play();
    }
    catch (e) {
      try {
        const args = new URLSearchParams();
        args.set('volume', request.volume || 1);
        args.set('src', request.src);

        chrome.offscreen.createDocument({
          url: '/data/sounds/play.html?' + args.toString(),
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'play alert on content change'
        }).catch(e => console.warn(e));
      }
      catch (ee) {
        console.warn(e, ee);
      }
    }
  }
  else if (request.method === 'close-document') {
    chrome.offscreen.closeDocument();
  }
  else if (request.method === 'delay-for') {
    const id = sender.tab.id;

    api.alarms.get(id.toString()).then(o => {
      if (o) {
        const when = Math.max(Date.now() + 1000, o.scheduledTime + request.delay);
        api.alarms.add(o.name, {
          when
        });
        api.post.bg({
          method: 'reload-interface'
        });
      }
    });
  }
  else if (request.method === 'echo') {
    response(true);
  }
  else if (request.method === 'sha256') {
    const msgBuffer = new TextEncoder('utf-8').encode(request.message);
    crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
      response(hashHex);
    });
    return true;
  }
  else if (request.method === 'synchronous-timings') {
    api.sync();
  }
};

api.post.fired(messaging);

/* remove the job if tab is removed */
api.tabs.removed((id, info) => {
  // on browser close, this causes issue
  if (info.isWindowClosing === false) {
    console.log('[Auto-Reload] Tab', id, 'closed, removing job');
    messaging({
      reason: 'tab-removed',
      method: 'remove-jobs',
      ids: [id]
    });
    // Rebalance auto-reload tasks when a tab is closed
    console.log('[Auto-Reload] Rebalancing after tab close');
    setTimeout(() => manageAutoReloadTabs(), 500);
  }
});
/*
  make sure all jobs have a tab;
  sometimes api.tabs.remove(..., false) is not being called when the tab is the only child
*/
api.tabs.removed(() => setTimeout(() => {
  api.alarms.keys().then(async names => {
    const ids = [];
    for (const name of names) {
      const tabId = Number(name);
      const tab = await api.tabs.get(tabId);
      if (!tab) {
        ids.push(tabId);
      }
    }
    if (ids.length) {
      messaging({
        reason: 'tab-not-found-on-window-removed',
        method: 'remove-jobs',
        ids
      });
    }
  });
}, 2000), true);

/* badge color */
api.storage.get({
  color: defaults['badge-color']
}).then(prefs => api.button.color(prefs.color));
api.storage.changed(ps => ps.color && api.button.color(ps.color.newValue));

/* FAQs & Feedback */
{
  chrome.management = chrome.management || {
    getSelf(c) {
      c({installType: 'normal'});
    }
  };
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = chrome.runtime.getManifest();
    chrome.runtime.onInstalled.addListener(({reason, previousVersion}) => {
      chrome.management.getSelf(({installType}) => installType === 'normal' && chrome.storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            chrome.tabs.query({active: true, lastFocusedWindow: true}, tbs => chrome.tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            chrome.storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    chrome.runtime.setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}


/* ================================
   AUTO RELOAD FOR CONFIGURED URLs
   ================================ */

console.log('[Auto-Reload] SCRIPT LOADING - AUTO RELOAD SECTION STARTING');

const AUTO_RELOAD_CONFIG = defaults['auto-reload-urls'] || [];

console.log('[Auto-Reload] CONFIG LOADED:', AUTO_RELOAD_CONFIG);

/**
 * Manages auto-reload for URLs with single active tab constraint
 * Keeps track of which tab is currently active for each URL pattern
 */
async function manageAutoReloadTabs() {
  console.log('[Auto-Reload] manageAutoReloadTabs called at:', new Date().toLocaleTimeString());
  console.log('[Auto-Reload] CONFIG:', AUTO_RELOAD_CONFIG);
  
  try {
    for (const config of AUTO_RELOAD_CONFIG) {
      const pattern = config.pattern;
      const period = config.period || '00:10:00';
      const maxActiveTabs = config['max-active-tabs'] || 1;
      
      console.log('[Auto-Reload] Processing pattern:', pattern, 'Period:', period, 'Max tabs:', maxActiveTabs);
      
      // Find all tabs matching this URL pattern
      const tabs = await chrome.tabs.query({url: pattern});
      console.log('[Auto-Reload] Found', tabs.length, 'tabs for pattern', pattern);
      if (tabs.length > 0) {
        tabs.forEach(t => console.log('  - Tab', t.id, ':', t.url));
      }
      
      if (!tabs || tabs.length === 0) {
        console.log('[Auto-Reload] No tabs found, skipping');
        continue;
      }
      
      // Get all active jobs for these tabs
      const activeJobs = [];
      const tabsWithoutJobs = [];
      
      for (const tab of tabs) {
        const existing = await api.alarms.get(tab.id.toString());
        console.log('[Auto-Reload] Tab', tab.id, '- has alarm:', !!existing);
        if (existing) {
          activeJobs.push({tab, alarm: existing});
        } else {
          tabsWithoutJobs.push(tab);
        }
      }
      
      console.log('[Auto-Reload] Active jobs:', activeJobs.length, 'Tabs without jobs:', tabsWithoutJobs.length);
      
      // Remove excess active jobs if more than max
      if (activeJobs.length > maxActiveTabs) {
        const jobsToRemove = activeJobs.slice(maxActiveTabs);
        for (const {tab} of jobsToRemove) {
          console.log('[Auto-Reload] Removing excess job from tab', tab.id);
          await api.alarms.remove(tab.id.toString());
          await api.storage.remove('job-' + tab.id);
          api.button.icon('disabled', tab.id);
        }
        activeJobs.splice(maxActiveTabs);
      }
      
      // If we need more active jobs and have tabs available
      if (activeJobs.length < maxActiveTabs && tabsWithoutJobs.length > 0) {
        const tabsToAdd = tabsWithoutJobs.slice(0, maxActiveTabs - activeJobs.length);
        
        for (const tab of tabsToAdd) {
          const timeParts = api.convert.str2obj(period);
          const periodSeconds = api.convert.secods(timeParts);
          const when = Date.now() + (periodSeconds * 1000);
          
          console.log('[Auto-Reload] Creating job for tab', tab.id);
          console.log('  - Period:', period, '-> seconds:', periodSeconds);
          console.log('  - First reload at:', new Date(when).toLocaleTimeString());
          
          const profile = Object.assign({}, defaults.profile, config, {
            period: period,
            href: tab.url,
            timestamp: Date.now()
          });
          
          // Create storage entry for this job
          const storageKey = 'job-' + tab.id;
          await api.storage.set({
            [storageKey]: profile
          });
          console.log('[Auto-Reload] Job stored in storage as:', storageKey);
          
          // Add alarm
          await api.alarms.add(tab.id.toString(), {
            when,
            periodInMinutes: Math.max(1, periodSeconds / 60)
          });
          console.log('[Auto-Reload] Alarm created successfully');
          
          // Verify the alarm was actually created
          const createdAlarm = await api.alarms.get(tab.id.toString());
          console.log('[Auto-Reload] Alarm verification - exists:', !!createdAlarm, createdAlarm ? 'scheduled for: ' + new Date(createdAlarm.scheduledTime).toLocaleTimeString() : '');
          
          // Update button icon
          api.button.icon('active', tab.id);
        }
        
        // Update badge count
        const count = await api.alarms.count();
        api.button.badge(count);
        console.log('[Auto-Reload] Badge updated, total alarms:', count);
      }
    }
  } catch (e) {
    console.error('Auto reload management error:', e, e.stack);
  }
  
  // Final diagnostic log
  console.log('[Auto-Reload] manageAutoReloadTabs completed, checking all alarms...');
  await logAllAlarms();
}

console.log('[Auto-Reload] manageAutoReloadTabs function defined');

// Add diagnostics to check all alarms
async function logAllAlarms() {
  const allAlarms = await chrome.alarms.getAll();
  console.log('[Auto-Reload] All Chrome alarms:', allAlarms.length);
  allAlarms.forEach(a => {
    console.log('  - Alarm:', a.name, 'scheduled for:', new Date(a.scheduledTime).toLocaleTimeString(), 'periodInMinutes:', a.periodInMinutes);
  });
}

console.log('[Auto-Reload] logAllAlarms function defined');

/* Clear existing profiles on startup to reset configuration */
chrome.runtime.onStartup.addListener(() => {
  console.log('[Auto-Reload] Browser startup detected');
  chrome.storage.local.get(['profiles'], (prefs) => {
    if (prefs.profiles) {
      chrome.storage.local.set({profiles: {}});
      console.log('[Auto-Reload] Cleared old profiles');
    }
  });
});

/* Run auto-reload management on startup and periodically */
console.log('[Auto-Reload] Setting initial timeout (500ms)');
setTimeout(async () => {
  console.log('[Auto-Reload] Initial timeout fired');
  await logAllAlarms();
  manageAutoReloadTabs();
}, 500);

chrome.runtime.onStartup.addListener(() => {
  console.log('[Auto-Reload] Extension startup, calling manageAutoReloadTabs');
  setTimeout(() => manageAutoReloadTabs(), 500);
});

/* Watchdog to maintain proper tab state - using internal alarm */
console.log('[Auto-Reload] Creating watchdog alarm');
api.alarms.add('auto-reload-watchdog', {periodInMinutes: 1}, true);

api.alarms.fired(async (alarm) => {
  console.log('[Auto-Reload] Watchdog alarm fired:', alarm.name, new Date().toLocaleTimeString());
  if (alarm.name === 'auto-reload-watchdog') {
    console.log('[Auto-Reload] About to call manageAutoReloadTabs');
    await logAllAlarms();
    manageAutoReloadTabs();
  }
}, true);

/* Listen for tab updates to catch navigation to auto-reload URLs */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('[Auto-Reload] Tab', tabId, 'completed loading:', changeInfo.url);
    setTimeout(() => manageAutoReloadTabs(), 300);
  }
});

/* Listen for tab creation */
chrome.tabs.onCreated.addListener((tab) => {
  console.log('[Auto-Reload] Tab created:', tab.id, tab.url);
  setTimeout(() => manageAutoReloadTabs(), 500);
});