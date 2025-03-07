import { parseRss } from '../../utils/rssParser';

chrome.runtime.onInstalled.addListener((event) => {
  console.log(event);
  if (
    event.reason === chrome.runtime.OnInstalledReason.INSTALL ||
    event.reason === chrome.runtime.OnInstalledReason.UPDATE
  ) {
    chrome.tabs.create({
      url: chrome.runtime.getURL('panel.html'),
    });
  }
  setupPeriodicChecking();
});

function setupPeriodicChecking() {
  chrome.alarms.create('checkPodcastUpdates', {
    periodInMinutes: 1,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkPodcastUpdates') {
    checkForNewEpisodes();
  }
});

function checkForNewEpisodes() {
  chrome.storage.local.get(['podcasts'], (items) => {
    if (!items.podcasts || !items.podcasts.length) return;

    const urls = items.podcasts.map((item) => item.url || item.text);

    Promise.all(urls.map((url) => fetch(url)))
      .then((responses) => Promise.all(responses.map((r) => r.text())))
      .then((xmlStrings) => {
        const podcasts = xmlStrings.map((xml) => parseRss(xml));

        chrome.storage.local.set({ latestPodcasts: podcasts });
      })
      .catch((error) => console.error('Error fetching podcasts:', error));
  });
}
