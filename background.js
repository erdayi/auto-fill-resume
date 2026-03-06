// Background service worker — Edge & Chrome compatible
const api = globalThis.browser || globalThis.chrome;

api.runtime.onInstalled.addListener(() => {
  console.log('Resume Auto Filler v1.2 installed');
});

// Keyboard shortcut: Alt+Shift+F to fill current page
api.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-form') return;

  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Load saved data
  const { resumeData } = await api.storage.local.get('resumeData');
  if (!resumeData || Object.keys(resumeData).length === 0) return;

  // Inject & fill
  try {
    await api.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content/content.js']
    });
  } catch (e) {}

  api.tabs.sendMessage(tab.id, { action: 'fillForm', data: resumeData });
});