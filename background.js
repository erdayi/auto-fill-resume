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
  if (msg.action === 'autoRecordSubmit') {
    handleAutoRecord(msg.data);
    return true;
  }
  if (msg.action === 'llmExtractPageInfo') {
    llmExtractPageInfo(msg.snippet).then(info => sendResponse(info)).catch(() => sendResponse(null));
    return true;
  }
});

async function handleAutoRecord(record) {
  // If company missing and page snippet available, try LLM
  if (record._needsLLM && record._pageSnippet && (!record.company || record.company === '未知公司')) {
    const llmInfo = await llmExtractPageInfo(record._pageSnippet).catch(() => null);
    if (llmInfo) {
      if (llmInfo.company) record.company = llmInfo.company;
      if (llmInfo.job && !record.job) record.job = llmInfo.job;
    }
  }
  delete record._needsLLM;
  delete record._pageSnippet;

  const result = await api.storage.local.get('applicationHistory');
  const history = result.applicationHistory || [];
  const oneHour = 3600000;
  if (history.some(h => h.url === record.url && record.date - h.date < oneHour)) return;

  history.unshift(record);
  api.storage.local.set({ applicationHistory: history });
  syncToOnline(record);
}

// LLM fallback for page info extraction
async function llmExtractPageInfo(snippet) {
  const { llmSettings } = await api.storage.local.get('llmSettings');
  if (!llmSettings || !llmSettings.apiKey) return null;

  const provider = llmSettings.provider || 'deepseek';
  const LLM_URLS = {
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    kimi: 'https://api.moonshot.cn/v1/chat/completions',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    siliconflow: 'https://api.siliconflow.cn/v1/chat/completions',
    doubao: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
  };
  const LLM_MODELS = {
    deepseek: 'deepseek-chat', kimi: 'moonshot-v1-8k', qwen: 'qwen-turbo',
    glm: 'glm-4-flash', siliconflow: 'Qwen/Qwen2.5-7B-Instruct',
    doubao: 'doubao-lite-32k', openai: 'gpt-4o-mini',
  };

  const url = LLM_URLS[provider] || llmSettings.customUrl;
  if (!url) return null;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmSettings.apiKey}` },
    body: JSON.stringify({
      model: llmSettings.model || LLM_MODELS[provider] || 'deepseek-chat',
      messages: [{
        role: 'user',
        content: `从以下网页文本中提取招聘公司名称和职位名称，只返回JSON：{"company":"公司名","job":"职位名"}\n\n${snippet.substring(0, 500)}`
      }],
      temperature: 0, max_tokens: 100,
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  try {
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
  } catch(e) {}
  return null;
}

// ============ Online Sync (Webhook) ============

async function syncToOnline(record) {
  const { syncSettings } = await api.storage.local.get('syncSettings');
  if (!syncSettings || !syncSettings.enabled) return;

  const type = syncSettings.type || 'feishu_bitable';

  // Feishu Bitable — write row to spreadsheet
  if (type === 'feishu_bitable') {
    return syncToBitable(record, syncSettings);
  }

  // WeCom Sheet — write row to 企微文档
  if (type === 'wecom_sheet') {
    return syncToWecomSheet(record, syncSettings);
  }

  // Webhook-based sync
  if (!syncSettings.webhookUrl) return;

  const date = new Date(record.date).toLocaleString('zh-CN');
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

// ============ Feishu Bitable Sync ============

let _feishuTokenCache = { token: '', expiresAt: 0 };

async function getFeishuToken(appId, appSecret) {
  if (_feishuTokenCache.token && Date.now() < _feishuTokenCache.expiresAt) {
    return _feishuTokenCache.token;
  }
  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = await resp.json();
  if (data.code !== 0) throw new Error('飞书认证失败: ' + data.msg);
  _feishuTokenCache = { token: data.tenant_access_token, expiresAt: Date.now() + (data.expire - 60) * 1000 };
  return data.tenant_access_token;
}

async function syncToBitable(record, settings) {
  if (!settings.feishuAppId || !settings.feishuAppSecret || !settings.bitableAppToken || !settings.bitableTableId) return;

  try {
    const token = await getFeishuToken(settings.feishuAppId, settings.feishuAppSecret);
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${settings.bitableAppToken}/tables/${settings.bitableTableId}/records`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          '公司': record.company || '',
          '职位': record.job || '',
          '投递时间': record.date,
          '状态': record.status || '已投递',
          '备注': record.note || '',
          '链接': record.url ? { link: record.url, text: '查看职位' } : '',
        },
      }),
    });
  } catch (e) {
    console.error('[Resume Filler] Bitable sync failed:', e.message);
  }
}

// ============ WeCom Sheet Sync ============

let _wecomTokenCache = { token: '', expiresAt: 0 };

async function getWecomToken(corpId, corpSecret) {
  if (_wecomTokenCache.token && Date.now() < _wecomTokenCache.expiresAt) {
    return _wecomTokenCache.token;
  }
  const resp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(corpSecret)}`);
  const data = await resp.json();
  if (data.errcode !== 0) throw new Error('企微认证失败: ' + data.errmsg);
  _wecomTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function syncToWecomSheet(record, settings) {
  if (!settings.wecomCorpId || !settings.wecomCorpSecret || !settings.wecomDocId || !settings.wecomSheetId) return;

  try {
    const token = await getWecomToken(settings.wecomCorpId, settings.wecomCorpSecret);
    const date = new Date(record.date).toLocaleString('zh-CN');

    // 企微智能表格 API — 追加行
    const url = `https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/add_sheet_records?access_token=${token}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docid: settings.wecomDocId,
        sheet_id: settings.wecomSheetId,
        records: [{
          values: {
            '公司': [{ type: 'text', text: record.company || '' }],
            '职位': [{ type: 'text', text: record.job || '' }],
            '日期': [{ type: 'text', text: date }],
            '状态': [{ type: 'text', text: record.status || '已投递' }],
            '备注': [{ type: 'text', text: record.note || '' }],
            '链接': [{ type: 'url', text: '查看', link: record.url || '' }],
          },
        }],
      }),
    });
  } catch (e) {
    console.error('[Resume Filler] WeCom sheet sync failed:', e.message);
  }
}