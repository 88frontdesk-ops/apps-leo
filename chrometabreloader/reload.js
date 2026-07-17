/* global api, messaging */

const custom = (tab, json) => {
  for (const o of json) {
    let match = false;
    if (o.url) {
      match = api.match(o.url, tab.url);
    }
    else if (o.hostname) {
      match = api.match('ht:' + o.hostname, tab.url);
    }
    if (match) {
      const profile = o;
      profile.period = api.convert.obj2str({
        hh: (o.dd || 0) * 24 + (o.hh || 0),
        mm: (o.mm || 0),
        ss: (o.ss || 0)
      });
      if (o.code) {
        profile['code-value'] = o.code;
        profile.code = true;
      }
      if (o['pre-code']) {
        profile['pre-code-value'] = o['pre-code'];
        profile['pre-code'] = true;
      }

      delete o.dd;
      delete o.hh;
      delete o.mm;
      delete o.ss;
      delete o.hostname;
      delete o.url;

      messaging({
        method: 'add-jobs',
        profile,
        tabs: [tab]
      });
      return true;
    }
  }
  return false;
};

// time: 00:00:00 - 00:30:59, 01:00:00 - 01:30:59
// day-aware examples: Wed 22:30:00 - Thu 07:30:00, Sat 06:30:00 - 15:30:00
const schedule = (time, prefs) => {
  const dayMap = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6
  };

  const parseDay = value => {
    if (!value) {
      return null;
    }
    return dayMap[String(value).trim().toLowerCase()] ?? null;
  };

  const parseTime = value => {
    const [hh = '0', mm = '0', ss = '0'] = String(value).trim().split(':');
    const hours = Number(hh);
    const minutes = Number(mm);
    const seconds = Number(ss);

    if ([hours, minutes, seconds].some(Number.isNaN)) {
      return null;
    }

    return {
      hh: Math.max(0, Math.min(23, hours)),
      mm: Math.max(0, Math.min(59, minutes)),
      ss: Math.max(0, Math.min(59, seconds))
    };
  };

  const parsePart = part => {
    const text = String(part).trim();
    const match = text.match(/^(?:(sun|sunday|mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday)\s+)?(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/i);

    if (!match) {
      return null;
    }

    const [, dayName, hh, mm = '0', ss = '0'] = match;
    const time = parseTime(`${hh}:${mm}:${ss}`);

    return {
      day: parseDay(dayName),
      time
    };
  };

  const match = value => {
    const [sstart = '', send = ''] = value.split(/\s*-\s*/);

    if (sstart === '' || send === '') {
      console.error('Time is invalid', 'start', sstart, 'end', send);
      return;
    }

    const startPart = parsePart(sstart);
    const endPart = parsePart(send);

    if (!startPart || !endPart || !startPart.time || !endPart.time) {
      console.error('Time is invalid', sstart, send);
      return;
    }

    const offset = Number(prefs['schedule-offset'] || 0);
    const now = new Date(Date.now() + offset * 60 * 1000);
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);

    const start = new Date(base);
    const startDay = startPart.day === null ? start.getDay() : startPart.day;
    const startDelta = (startDay - start.getDay() + 7) % 7;
    start.setDate(start.getDate() + startDelta);
    start.setHours(startPart.time.hh, startPart.time.mm, startPart.time.ss, 0);

    let end = new Date(base);
    const endDay = endPart.day === null ? (startPart.day === null ? end.getDay() : startPart.day) : endPart.day;
    const endDelta = (endDay - end.getDay() + 7) % 7;
    end.setDate(end.getDate() + endDelta);
    end.setHours(endPart.time.hh, endPart.time.mm, endPart.time.ss, 0);

    if (end.getTime() <= start.getTime()) {
      if (startPart.day === null && endPart.day === null) {
        end.setDate(end.getDate() + 1);
      }
      else if (startPart.day !== null && endPart.day !== null && endPart.day === startPart.day) {
        end.setDate(end.getDate() + 1);
      }
      else if (startPart.day !== null && endPart.day === null) {
        end.setDate(end.getDate() + 1);
      }
    }

    if (start.getTime() < now.getTime() && end.getTime() < now.getTime()) {
      start.setDate(start.getDate() + 7);
      end.setDate(end.getDate() + 7);
    }

    return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
  };

  const rs = time.split(/\s*,\s*/).filter(a => a).map(match);
  return rs.some(a => a) === false;
};

// custom countdown for a tab
api.tabs.countdown = (tabId, period) => api.inject(tabId, {
  func: (tabId, period) => {
    self.tabId = tabId;
    self.period = period;
  },
  args: [tabId, period]
}).then(() => api.inject(tabId, {
  files: ['/data/scripts/vcd.js']
}));

api.alarms.fired(async o => {
  console.log('[Reload] Alarm fired:', o.name, 'at', new Date().toLocaleTimeString());
  const tabId = Number(o.name);
  console.log('[Reload] Tab ID from alarm:', tabId, 'isNaN:', isNaN(tabId));
  if (isNaN(tabId)) {
    console.log('[Reload] Invalid tab ID, returning');
    return;
  }
  const tab = await api.tabs.get(tabId);
  console.log('[Reload] Tab found:', !!tab, tab ? 'URL: ' + tab.url : 'null');
  // only set new alarm if tab still exists
  if (tab) {
    const profile = await api.storage.get('job-' + o.name);
    console.log('[Reload] Profile found:', !!profile, profile);
    if (!profile) {
      console.error('[Reload] ERROR: Profile is null/undefined!');
      return;
    }

    const periodText = profile.period || defaults.profile.period;
    const time = api.convert.str2obj(periodText);
    const period = Math.max(1, api.convert.secods(time));
    console.log('[Reload] Profile period:', profile.period, '=>', period, 'seconds');

    api.alarms.add(o.name, {
      when: Date.now() + period * 1000,
      // only used as backup. The extension sets a new alarm
      periodInMinutes: Math.max(1, period / 60)
    });

    const skip = reason => {
      console.log('[Reload] Skipped:', reason);
      api.button.icon('skipped', tabId);
      api.button.tooltip('Reloading skipped: ' + reason, tabId);
    };

    // reload
    const options = {};

    if (navigator.onLine === false && profile.offline) {
      return skip('browser is offline');
    }

    if (tab.discarded && profile.discarded) {
      return skip('tab is discarded');
    }

    if (tab.active && profile.current) {
      if (profile.nofocus) {
        const w = await api.tabs.window(tab.windowId);
        if (w.focused) {
          return skip('window is focused');
        }
      }
      else {
        return skip('tab is active');
      }
    }

    console.log('[Reload] Checking blocked words...');
    for (const key of profile['blocked-words'].split(/\s*,\s*/)) {
      if (tab.url && api.match(key, tab.url)) {
        return skip('blocked word in URL');
      }
      if (tab.title && api.match(key, tab.title)) {
        return skip('blocked word in title');
      }
    }

    const prefs = await api.storage.get({
      'schedule-offset': 0,
      'policy': {} // reloading policy
    });

    // allowed-period: reload only inside the configured allowed windows
    const allowedPeriod = profile['allowed-period']?.trim() || profile['blocked-period']?.trim() || defaults.profile['allowed-period'];
    if (allowedPeriod && schedule(allowedPeriod, prefs)) {
      return skip('outside allowed period');
    }

    console.log('[Reload] All checks passed, preparing to reload...');

    if (profile.cache) {
      options.bypassCache = true;
    }

    // skip on reloading policy
    for (const [key, o] of Object.entries(prefs.policy)) {
      if (api.match(key, tab.url)) {
        if (o.url) {
          try {
            const r = new RegExp(o.url);
            if (r.test(tab.url) === false) {
              return skip('URL policy violation');
            }
          }
          catch (e) {
            console.warn('URL policy violation', e);
          }
        }
        if (o.date) {
          try {
            const r = new RegExp(o.date);
            if (r.test((new Date()).toLocaleString()) === false) {
              return skip('DATE policy violation');
            }
          }
          catch (e) {
            console.warn('DATE policy violation', e);
          }
        }
      }
    }

    if (profile['pre-code']) {
      const code = profile['pre-code-value'];

      try {
        const [{result}] = await api.inject(tabId, {
          world: 'MAIN',
          func: code => {
            const s = document.createElement('script');
            s.textContent = code;
            document.body.append(s);
            s.remove();

            return s.dataset.continue;
          },
          args: [code]
        });

        if (result !== 'true') {
          return skip(`Policy Code return "${result}"`);
        }
      }
      catch (e) {
        console.warn(e);
        return skip(`Policy Code Failed "${e.message}"`);
      }
    }

    console.log('[Reload] About to perform reload', {
      tabId,
      url: tab.url,
      form: profile.form,
      bypassCache: options.bypassCache,
      profile
    });
    api.tabs.reload(tab, options, profile.form);
  }
  else {
    console.log('[Reload] Tab not found for alarm:', o.name);
    console.warn('cannot find tab with id', o.name);
    // is tab discarded (https://github.com/james-fray/tab-reloader/issues/110)

    const profile = await api.storage.get('job-' + o.name);

    if (profile.discarded !== true) {
      const tabs = await api.tabs.query({
        url: profile.href,
        discarded: true
      });
      messaging({
        reason: tabs.length ? 'alarm-replace' : 'tab-not-found-on-alarm',
        method: 'remove-jobs',
        ids: [tabId]
      });
      if (tabs.length) {
        messaging({
          method: 'add-jobs',
          profile,
          tabs: [tabs[0]],
          now: true
        });
      }
    }
  }
});

// when tab is loaded, restart the timer
api.tabs.loaded(d => {
  api.alarms.get(d.tabId.toString()).then(async o => {
    if (o) {
      const tabId = Number(o.name);
      const profile = await api.storage.get('job-' + o.name);

      const periodText = profile.period || defaults.profile.period;
      let period = Math.max(1, api.convert.secods(api.convert.str2obj(periodText)));
      // variation
      if (profile.variation) {
        const delta = Math.random() * (profile.variation / 100) * period;
        period = period + (Math.random() > 0.5 ? 1 : -1) * delta;
        period = Math.max(period, 5); // make sure time is in valid range
      }

      api.button.icon('active', tabId);

      // if URL is updated, add as a new job so we can restore after a restart
      if (profile.href === d.url) {
        api.alarms.add(o.name, {
          when: Date.now() + period * 1000
        });
      }
      else {
        profile.href = d.url;
        messaging({
          method: 'add-jobs',
          profile,
          tabs: [await api.tabs.get(tabId)]
        });
      }

      const error = e => {
        api.button.icon('error', tabId);
        api.button.badge('E', tabId);
        api.button.tooltip(e.message, tabId);
      };

      if (profile['scroll-to-end']) {
        api.inject(tabId, {
          files: ['/data/scripts/ste.js']
        }).catch(error);
      }
      if (profile['visual-countdown']) {
        api.tabs.countdown(tabId, profile.period).catch(error);
      }
      if (profile.switch) {
        api.inject(tabId, {
          func: () => self.switch = true
        }).catch(error);
      }
      if (profile.sound) {
        api.inject(tabId, {
          func: src => self.src = src,
          args: [chrome.runtime.getURL('/data/sounds/' + profile['sound-value'] + '.mp3')]
        }).catch(error);
      }
      if (profile.switch || profile.sound) {
        api.inject(tabId, {
          files: ['/data/scripts/sha.js']
        }).catch(error);
      }
      if (profile.code && profile['code-value'].trim()) {
        const id = 'scr-' + Math.random();
        api.inject(tabId, {
          func: id => {
            const span = document.createElement('span');
            span.id = id;
            span.addEventListener('post', e => chrome.runtime.sendMessage(e.detail));

            document.documentElement.append(span);
          },
          args: [id]
        }).then(() => api.inject(tabId, {
          world: 'MAIN',
          func: (id, code) => {
            const span = document.getElementById(id);
            span.remove();
            const s = document.createElement('script');
            s.textContent = code;

            const post = detail => span.dispatchEvent(new CustomEvent('post', {
              detail
            }));

            const error = e => post({
              method: 'show-error',
              message: e.message
            });
            window.addEventListener('error', error);

            s.addEventListener('toggle-requested', () => post({method: 'toggle-requested'}));
            s.addEventListener('activate-tab', () => post({method: 'activate-tab'}));
            s.addEventListener('delay-for', e => post({
              method: 'delay-for',
              delay: Number(e.detail)
            }));
            s.addEventListener('play-sound', e => post({
              method: 'play-sound',
              src: e.detail
            }));
            document.body.append(s);
            s.remove();

            window.removeEventListener('error', error);
          },
          args: [id, profile['code-value']]
        })).catch(error);
      }
    }
    // custom jobs and removed jobs are only applied if there is no ongoing job
    else {
      const prefs = await api.storage.get({
        'dynamic.json': false,
        'json': [],

        'removed.jobs': {},
        'removed.jobs.enabled': true
      });
      const tab = {
        url: d.url,
        id: d.tabId
      };

      if (prefs['removed.jobs.enabled']) {
        const href = api.clean.href(d.url);
        const o = prefs['removed.jobs'][href];
        if (o) {
          messaging({
            method: 'add-jobs',
            profile: o.profile,
            tabs: [tab]
          });
          delete prefs['removed.jobs'][href];

          return api.storage.set({
            'removed.jobs': prefs['removed.jobs']
          });
        }
      }
      if (prefs['dynamic.json']) {
        custom(tab, prefs.json);
      }
    }
  });
});

/* startup -> restore a job, find a job for matching tab, run custom jobs */
const restore = async () => {
  const jobs = new Set([
    ...Object.keys(await api.storage.get(null)).filter(n => n.startsWith('job-')).map(s => Number(s.slice(4))),
    ...(await api.alarms.keys()).map(Number)
  ]);
  const profiles = new Set();

  for (const tabId of jobs) {
    // const tab = await api.tabs.get(tabId);
    let tab;
    try {
      tab = await api.tabs.get(tabId);
    } catch (e) {
      return;
    }
    const profile = await api.storage.get('job-' + tabId);

    if (tab && tab.url === profile.href) {
      api.button.icon('active', tabId);
      const o = await api.alarms.get(tabId + '');
      if (!o) {
        messaging({
          method: 'add-jobs',
          profile,
          tabs: [tab]
        });
      }
    }
    else {
      await new Promise(resolve => messaging({
        reason: 'restore-tab-not-found',
        method: 'remove-jobs',
        ids: [tabId]
      }, undefined, resolve));
      if (profile && profile.href) {
        profiles.add(profile);
      }
    }
  }
  // see if we can find an identical tab for the missed profiles
  for (const profile of profiles) {
    const tabs = await api.tabs.query({
      url: api.clean.href(profile.href)
    });
    // find the first tab with no job
    for (const tab of tabs) {
      // make sure this tab does not have an active job
      const o = await api.alarms.get(tab.id.toString());
      if (!o) {
        profiles.delete(profile);
        await new Promise(resolve => messaging({
          method: 'add-jobs',
          profile,
          tabs: [tab]
        }, undefined, resolve));
        break;
      }
    }
  }
  // Try to restore remaining not found jobs by registering "tabs.onUpdated" once for a period of a defined seconds
  // This tracking is only registered once after browser startup and get destroyed either by worker or timeout.
  if (profiles.size) {
    console.info('[Missed Jobs found after Restart]', profiles);
    const track = async (id, info, tab) => {
      for (const profile of profiles) {
        if (tab.url && tab.url.startsWith(api.clean.href(profile.href))) {
          // make sure this tab does not have an active job
          const o = await api.alarms.get(tab.id.toString());
          if (!o) {
            profiles.delete(profile);
            messaging({
              method: 'add-jobs',
              profile,
              tabs: [tab]
            });
            return;
          }
        }
      }
    };
    chrome.tabs.onUpdated.addListener(track);
    setTimeout(() => chrome.tabs.onUpdated.removeListener(track), 20000);
  }

  // check custom jobs
  const prefs = await api.storage.get({
    'json': []
  });
  if (prefs.json.length) {
    const tabs = await api.tabs.query({});
    for (const tab of tabs) {
      // do we have an alarm for this tab
      const o = await api.alarms.get(tab.id.toString());
      if (!o) {
        custom(tab, prefs.json);
      }
    }
  }

  // done
  api.alarms.count().then(c => api.button.badge(c));
};
// restore with delay
api.runtime.started(async () => {
  const prefs = await api.storage.get({
    'startup-restore-delay': 5000
  });
  if (prefs['startup-restore-delay'] > 0) {
    api.alarms.add('startup-restore', {
      when: Date.now() + prefs['startup-restore-delay']
    }, true);

    // register only on startup call
    api.alarms.fired(o => {
      if (o.name === 'startup-restore') {
        restore();
      }
    }, true);
  }
});

/* make sure timers are current */
api.sync = () => {
  const now = Date.now();
  api.alarms.forEach(o => {
    if (o.scheduledTime < now) {
      api.alarms.add(o.name, {
        when: now + Math.round(Math.random() * 1000),
        periodInMinutes: o.periodInMinutes
      });
    }
  });
};
api.idle.fired(state => {
  if (state === 'active') {
    api.sync();
  }
});
