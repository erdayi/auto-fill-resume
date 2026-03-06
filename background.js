// Background service worker — Edge & Chrome compatible
const api = globalThis.browser || globalThis.chrome;

api.runtime.onInstalled.addListener(() => {
  console.log('Resume Auto Filler v1.3 installed');
});

// Keyboard shortcut: Alt+Shift+F to fill current page
api.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-form') return;

  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const { resumeData } = await api.storage.local.get('resumeData');
  if (!resumeData || Object.keys(resumeData).length === 0) return;

  try {
    await api.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content/content.js']
    });
  } catch (e) {}

  api.tabs.sendMessage(tab.id, { action: 'fillForm', data: resumeData });
});

// ============ Auto-detect submission → record + sync ============

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== 'autoRecordSubmit') return;
  const record = msg.data;

  api.storage.local.get('applicationHistory', (result) => {
    const history = result.applicationHistory || [];
    // Deduplicate: same URL within 1 hour
    const oneHour = 3600000;
    if (history.some(h => h.url === record.url && record.date - h.date < oneHour)) return;

    history.unshift(record);
    api.storage.local.set({ applicationHistory: history });

    // Sync to online docs if configured
    syncToOnline(record);
  });
  return true;
});

// ============ Online Sync (Webhook) ============

async function syncToOnline(record) {
  const { syncSettings } = await api.storage.local.get('syncSettings');
  if (!syncSettings || !syncSettings.enabled || !syncSettings.webhookUrl) return;

  const date = new Date(record.date).toLocaleString('zh-CN');
  const type = syncSettings.type || 'feishu';

  try {
    let body;
    if (type === 'feishu') {
      // 飞书机器人 webhook
      body = JSON.stringify({
        msg_type: 'interactive',
        card: {
          header: { title: { tag: 'plain_text', content: '📋 新投递记录' }, template: 'blue' },
          elements: [{
            tag: 'div', fields: [
              { is_short: true, text: { tag: 'lark_md', content: `**公司**\n${record.company}` } },
              { is_short: true, text: { tag: 'lark_md', content: `**职位**\n${record.job || '-'}` } },
              { is_short: true, text: { tag: 'lark_md', content: `**时间**\n${date}` } },
              { is_short: true, text: { tag: 'lark_md', content: `**状态**\n${record.status}` } },
            ]
          }, {
            tag: 'action', actions: [{
              tag: 'button', text: { tag: 'plain_text', content: '查看职位' },
              url: record.url, type: 'primary'
            }]
          }]
        }
      });
    } else if (type === 'dingtalk') {
      // 钉钉机器人 webhook
      body = JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: '新投递记录',
          text: `### 📋 新投递记录\n- **公司**: ${record.company}\n- **职位**: ${record.job || '-'}\n- **时间**: ${date}\n- **状态**: ${record.status}\n- [查看职位](${record.url})`
        }
      });
    } else if (type === 'wecom') {
      // 企业微信机器人 webhook
      body = JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          content: `### 新投递记录\n> **公司**: ${record.company}\n> **职位**: ${record.job || '-'}\n> **时间**: ${date}\n> **状态**: ${record.status}\n> [查看职位](${record.url})`
        }
      });
    } else {
      // 通用 webhook (JSON POST)
      body = JSON.stringify({
        company: record.company,
        job: record.job,
        url: record.url,
        date: date,
        status: record.status,
        note: record.note || '',
      });
    }

    await fetch(syncSettings.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (e) {
    console.error('[Resume Filler] Sync failed:', e.message);
  }
}