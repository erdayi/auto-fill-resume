// Chrome/Edge API compatibility
const api = globalThis.browser || globalThis.chrome;

// ============ Tab Switching ============
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ============ Dynamic Entry Templates ============

const EDU_TEMPLATE = (idx) => `
  <div class="entry-card" data-entry-type="education" data-entry-index="${idx}">
    <div class="entry-card-header">
      <span class="entry-card-title"><span class="entry-card-num">${idx + 1}</span> 教育经历</span>
      <button class="btn-remove-entry" title="删除">&times;</button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>学校</label>
        <input type="text" data-efield="school" placeholder="学校全称">
      </div>
      <div class="form-group">
        <label>学历</label>
        <select data-efield="degree">
          <option value="">请选择</option>
          <option value="高中">高中</option><option value="中专">中专</option>
          <option value="大专">大专</option><option value="本科">本科</option>
          <option value="硕士">硕士</option><option value="博士">博士</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>专业</label><input type="text" data-efield="major" placeholder="专业名称"></div>
      <div class="form-group form-sm"><label>GPA</label><input type="text" data-efield="gpa" placeholder="3.8/4.0"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>入学时间</label><input type="month" data-efield="startDate"></div>
      <div class="form-group"><label>毕业时间</label><input type="month" data-efield="endDate"></div>
    </div>
    <div class="form-group"><label>在校经历</label><textarea data-efield="description" rows="2" placeholder="奖学金、社团、项目等"></textarea></div>
  </div>`;

const WORK_TEMPLATE = (idx) => `
  <div class="entry-card" data-entry-type="work" data-entry-index="${idx}">
    <div class="entry-card-header">
      <div class="entry-card-title"><span class="entry-card-num">${idx + 1}</span> 工作/实习经历</div>
      <div style="display:flex;align-items:center;gap:4px">
        <select data-efield="workType" class="entry-card-type" style="border:none;font-size:10px;padding:2px 6px;border-radius:4px;cursor:pointer;font-family:inherit">
          <option value="全职" class="entry-type-fulltime">全职</option>
          <option value="实习" class="entry-type-intern">实习</option>
          <option value="兼职">兼职</option>
        </select>
        <button class="btn-remove-entry" title="删除">&times;</button>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>公司</label><input type="text" data-efield="company" placeholder="公司名称"></div>
      <div class="form-group"><label>职位</label><input type="text" data-efield="jobTitle" placeholder="岗位名称"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>入职时间</label><input type="month" data-efield="startDate"></div>
      <div class="form-group"><label>离职时间</label><input type="month" data-efield="endDate"></div>
    </div>
    <div class="form-group"><label>工作描述</label><textarea data-efield="description" rows="3" placeholder="主要职责与成就"></textarea></div>
  </div>`;

const PROJECT_TEMPLATE = (idx) => `
  <div class="entry-card" data-entry-type="project" data-entry-index="${idx}">
    <div class="entry-card-header">
      <span class="entry-card-title"><span class="entry-card-num">${idx + 1}</span> 项目经历</span>
      <button class="btn-remove-entry" title="删除">&times;</button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>项目名称</label><input type="text" data-efield="projectName" placeholder="项目名称"></div>
      <div class="form-group"><label>担任角色</label><input type="text" data-efield="role" placeholder="如：前端负责人"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>开始时间</label><input type="month" data-efield="startDate"></div>
      <div class="form-group"><label>结束时间</label><input type="month" data-efield="endDate"></div>
    </div>
    <div class="form-group"><label>项目描述</label><textarea data-efield="description" rows="3" placeholder="项目背景、技术栈、成果"></textarea></div>
    <div class="form-group"><label>项目链接</label><input type="url" data-efield="link" placeholder="https://"></div>
  </div>`;

const COMPETITION_TEMPLATE = (idx) => `
  <div class="entry-card" data-entry-type="competition" data-entry-index="${idx}">
    <div class="entry-card-header">
      <span class="entry-card-title"><span class="entry-card-num">${idx + 1}</span> 竞赛/荣誉</span>
      <button class="btn-remove-entry" title="删除">&times;</button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>竞赛/荣誉名称</label><input type="text" data-efield="competitionName" placeholder="如：ACM区域赛金奖"></div>
      <div class="form-group">
        <label>获奖等级</label>
        <select data-efield="awardLevel">
          <option value="">请选择</option>
          <option value="国家级">国家级</option><option value="省级">省级</option>
          <option value="市级">市级</option><option value="校级">校级</option>
          <option value="一等奖">一等奖</option><option value="二等奖">二等奖</option>
          <option value="三等奖">三等奖</option><option value="金奖">金奖</option>
          <option value="银奖">银奖</option><option value="铜奖">铜奖</option>
          <option value="优秀奖">优秀奖</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>获奖时间</label><input type="month" data-efield="awardDate"></div>
      <div class="form-group"><label>颁发机构</label><input type="text" data-efield="issuer" placeholder="如：中国计算机学会"></div>
    </div>
    <div class="form-group"><label>描述</label><textarea data-efield="description" rows="2" placeholder="竞赛内容、个人贡献等"></textarea></div>
  </div>`;

const CERT_TEMPLATE = (idx) => `
  <div class="entry-card" data-entry-type="cert" data-entry-index="${idx}">
    <div class="entry-card-header">
      <span class="entry-card-title"><span class="entry-card-num">${idx + 1}</span> 证书/资质</span>
      <button class="btn-remove-entry" title="删除">&times;</button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>证书名称</label><input type="text" data-efield="certName" placeholder="如：软件设计师、驾照C1"></div>
      <div class="form-group"><label>获取时间</label><input type="month" data-efield="certDate"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>颁发机构</label><input type="text" data-efield="certIssuer" placeholder="如：工信部"></div>
      <div class="form-group"><label>证书编号</label><input type="text" data-efield="certNo" placeholder="选填"></div>
    </div>
  </div>`;

// ============ Entry Management ============
function addEntry(listId, template) {
  const list = document.getElementById(listId);
  const count = list.children.length;
  const div = document.createElement('div');
  div.innerHTML = template(count);
  const card = div.firstElementChild;
  list.appendChild(card);

  card.querySelector('.btn-remove-entry').addEventListener('click', () => {
    card.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => {
      card.remove();
      renumberEntries(listId);
    }, 200);
  });

  // Auto-scroll to new card
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return card;
}

function renumberEntries(listId) {
  const list = document.getElementById(listId);
  Array.from(list.children).forEach((card, i) => {
    card.dataset.entryIndex = i;
    const num = card.querySelector('.entry-card-num');
    if (num) num.textContent = i + 1;
  });
}

document.getElementById('addEdu').addEventListener('click', () => addEntry('eduList', EDU_TEMPLATE));
document.getElementById('addWork').addEventListener('click', () => addEntry('workList', WORK_TEMPLATE));
document.getElementById('addProject').addEventListener('click', () => addEntry('projectList', PROJECT_TEMPLATE));
document.getElementById('addCompetition').addEventListener('click', () => addEntry('competitionList', COMPETITION_TEMPLATE));
document.getElementById('addCert').addEventListener('click', () => addEntry('certList', CERT_TEMPLATE));

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = '@keyframes fadeOut { to { opacity:0; transform:translateY(-8px); } }';
document.head.appendChild(style);

// ============ Data Collection & Loading ============
function collectData() {
  const data = {};

  // Basic fields (data-field)
  document.querySelectorAll('[data-field]').forEach(el => {
    const val = el.value.trim();
    if (val) data[el.dataset.field] = val;
  });

  // Education entries
  data.educations = [];
  document.querySelectorAll('#eduList .entry-card').forEach(card => {
    const entry = {};
    card.querySelectorAll('[data-efield]').forEach(el => {
      const val = el.value.trim();
      if (val) entry[el.dataset.efield] = val;
    });
    if (Object.keys(entry).length > 0) data.educations.push(entry);
  });

  // Work entries
  data.works = [];
  document.querySelectorAll('#workList .entry-card').forEach(card => {
    const entry = {};
    card.querySelectorAll('[data-efield]').forEach(el => {
      const val = el.value.trim();
      if (val) entry[el.dataset.efield] = val;
    });
    if (Object.keys(entry).length > 0) data.works.push(entry);
  });

  // Project entries
  data.projects = [];
  document.querySelectorAll('#projectList .entry-card').forEach(card => {
    const entry = {};
    card.querySelectorAll('[data-efield]').forEach(el => {
      const val = el.value.trim();
      if (val) entry[el.dataset.efield] = val;
    });
    if (Object.keys(entry).length > 0) data.projects.push(entry);
  });

  // Competition entries
  data.competitions = [];
  document.querySelectorAll('#competitionList .entry-card').forEach(card => {
    const entry = {};
    card.querySelectorAll('[data-efield]').forEach(el => {
      const val = el.value.trim();
      if (val) entry[el.dataset.efield] = val;
    });
    if (Object.keys(entry).length > 0) data.competitions.push(entry);
  });

  // Certificate entries
  data.certificates = [];
  document.querySelectorAll('#certList .entry-card').forEach(card => {
    const entry = {};
    card.querySelectorAll('[data-efield]').forEach(el => {
      const val = el.value.trim();
      if (val) entry[el.dataset.efield] = val;
    });
    if (Object.keys(entry).length > 0) data.certificates.push(entry);
  });

  return data;
}

function loadData(data) {
  // Basic fields
  document.querySelectorAll('[data-field]').forEach(el => {
    const val = data[el.dataset.field];
    if (val) {
      el.value = val;
      el.classList.add('has-value');
    } else {
      el.value = '';
      el.classList.remove('has-value');
    }
  });

  // Load education entries
  document.getElementById('eduList').innerHTML = '';
  if (data.educations && data.educations.length > 0) {
    data.educations.forEach((entry, i) => {
      const card = addEntry('eduList', EDU_TEMPLATE);
      card.querySelectorAll('[data-efield]').forEach(el => {
        if (entry[el.dataset.efield]) el.value = entry[el.dataset.efield];
      });
    });
  }

  // Load work entries
  document.getElementById('workList').innerHTML = '';
  if (data.works && data.works.length > 0) {
    data.works.forEach((entry, i) => {
      const card = addEntry('workList', WORK_TEMPLATE);
      card.querySelectorAll('[data-efield]').forEach(el => {
        if (entry[el.dataset.efield]) el.value = entry[el.dataset.efield];
      });
    });
  }

  // Load project entries
  document.getElementById('projectList').innerHTML = '';
  if (data.projects && data.projects.length > 0) {
    data.projects.forEach((entry, i) => {
      const card = addEntry('projectList', PROJECT_TEMPLATE);
      card.querySelectorAll('[data-efield]').forEach(el => {
        if (entry[el.dataset.efield]) el.value = entry[el.dataset.efield];
      });
    });
  }

  // Load competition entries
  document.getElementById('competitionList').innerHTML = '';
  if (data.competitions && data.competitions.length > 0) {
    data.competitions.forEach((entry, i) => {
      const card = addEntry('competitionList', COMPETITION_TEMPLATE);
      card.querySelectorAll('[data-efield]').forEach(el => {
        if (entry[el.dataset.efield]) el.value = entry[el.dataset.efield];
      });
    });
  }

  // Load certificate entries
  document.getElementById('certList').innerHTML = '';
  if (data.certificates && data.certificates.length > 0) {
    data.certificates.forEach((entry, i) => {
      const card = addEntry('certList', CERT_TEMPLATE);
      card.querySelectorAll('[data-efield]').forEach(el => {
        if (entry[el.dataset.efield]) el.value = entry[el.dataset.efield];
      });
    });
  }
}

// Auto-detect filled fields + auto-save with debounce
let autoSaveTimer = null;
document.addEventListener('input', (e) => {
  if (e.target.dataset && (e.target.dataset.field || e.target.dataset.efield)) {
    e.target.classList.toggle('has-value', e.target.value.trim() !== '');
    // Auto-save after 1.5s of no typing
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      api.storage.local.set({ resumeData: collectData() });
    }, 1500);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset && (e.target.dataset.field || e.target.dataset.efield)) {
    e.target.classList.toggle('has-value', e.target.value.trim() !== '');
    api.storage.local.set({ resumeData: collectData() });
  }
});

// Load saved data
api.storage.local.get('resumeData', (result) => {
  if (result.resumeData) loadData(result.resumeData);
});

// ============ Toast ============
let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2200);
}

// ============ Save ============
document.getElementById('btnSave').addEventListener('click', () => {
  const data = collectData();
  api.storage.local.set({ resumeData: data }, () => showToast('信息已保存'));
});

// ============ Scan ============
document.getElementById('btnScan').addEventListener('click', async () => {
  const btn = document.getElementById('btnScan');
  btn.classList.add('loading');
  const done = () => btn.classList.remove('loading');
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab) { done(); showToast('无法获取标签页', 'error'); return; }
    try { await api.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content/content.js'] }); } catch(e) {}
    api.tabs.sendMessage(tab.id, { action: 'scanForm' }, (response) => {
      done();
      if (api.runtime.lastError || !response) { showToast('扫描失败，请刷新页面后重试', 'error'); return; }
      const panel = document.getElementById('scanResult');
      const count = document.getElementById('scanCount');
      const list = document.getElementById('scanList');
      if (response.fields && response.fields.length > 0) {
        count.textContent = response.fields.length;
        list.innerHTML = response.fields.map(f => {
          const safeId = f.identifier.replace(/"/g, '&quot;');
          return `<span class="scan-tag ${f.matched ? '' : 'unmatched'}" title="${safeId}">${f.label}</span>`;
        }).join('');
        panel.classList.remove('hidden');
      } else {
        showToast('未检测到表单字段', 'info');
      }
    });
  } catch (err) { done(); showToast('扫描失败', 'error'); }
});
document.getElementById('closeScan').addEventListener('click', () => {
  document.getElementById('scanResult').classList.add('hidden');
});

// ============ Fill ============
document.getElementById('btnFill').addEventListener('click', async () => {
  const data = collectData();
  const arrayKeys = ['educations','works','projects','competitions','certificates'];
  const hasBasicData = Object.keys(data).some(k => !arrayKeys.includes(k));
  const hasEntries = arrayKeys.some(k => data[k]?.length > 0);
  if (!hasBasicData && !hasEntries) { showToast('请先填写个人信息', 'error'); return; }

  const btn = document.getElementById('btnFill');
  btn.classList.add('loading');
  const done = () => btn.classList.remove('loading');
  api.storage.local.set({ resumeData: data });

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab) { done(); showToast('无法获取标签页', 'error'); return; }
    try { await api.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content/content.js'] }); } catch(e) {}

    api.tabs.sendMessage(tab.id, { action: 'fillForm', data }, (response) => {
      done();
      if (api.runtime.lastError) { showToast('填写失败，请刷新页面后重试', 'error'); return; }
      if (response && response.success) {
        showToast(`已填写 ${response.filledCount} 个字段`, 'success');
        // Auto-highlight record button after fill
        const recordBtn = document.getElementById('btnRecord');
        recordBtn.style.animation = 'pulse 0.5s ease 2';
        setTimeout(() => recordBtn.style.animation = '', 1200);
      } else {
        showToast('未找到匹配字段', 'info');
      }
    });
  } catch (err) { done(); showToast('填写失败', 'error'); }
});

// ============ Clear ============
document.getElementById('btnClear').addEventListener('click', () => {
  if (!confirm('确定清除所有数据？')) return;
  api.storage.local.remove('resumeData', () => {
    document.querySelectorAll('[data-field]').forEach(el => { el.value = ''; el.classList.remove('has-value'); });
    ['eduList', 'workList', 'projectList', 'competitionList', 'certList'].forEach(id => document.getElementById(id).innerHTML = '');
    showToast('数据已清除');
  });
});

// ============ Import / Export ============
document.getElementById('btnExport').addEventListener('click', () => {
  const data = collectData();
  if (Object.keys(data).length === 0) { showToast('暂无数据', 'info'); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resume-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据已导出');
});

// ============ Application History ============
let historyData = [];

function loadHistory() {
  api.storage.local.get('applicationHistory', (result) => {
    historyData = result.applicationHistory || [];
    renderHistory();
  });
}

function saveHistory() {
  api.storage.local.set({ applicationHistory: historyData });
}

function renderHistory(filter = 'all') {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const countEl = document.getElementById('historyCount');

  const filtered = filter === 'all' ? historyData : historyData.filter(h => h.status === filter);
  countEl.textContent = historyData.length;

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = filtered.map((item, i) => {
    const idx = historyData.indexOf(item);
    const date = new Date(item.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const safeCompany = (item.company || '未知公司').replace(/</g, '&lt;');
    const safeJob = (item.job || '').replace(/</g, '&lt;');
    const safeUrl = (item.url || '').replace(/</g, '&lt;');
    return `
      <div class="history-item" data-idx="${idx}">
        <div class="history-info">
          <div class="history-company">${safeCompany}</div>
          ${safeJob ? `<div class="history-job">${safeJob}</div>` : ''}
          <div class="history-url" title="${safeUrl}">${safeUrl}</div>
        </div>
        <div class="history-meta">
          <span class="history-date">${date}</span>
          <button class="history-status" data-status="${item.status}" data-idx="${idx}">${item.status}</button>
          <button class="history-delete" data-idx="${idx}" title="删除">&times;</button>
        </div>
      </div>`;
  }).join('');
}

// Status cycle on click
const STATUS_CYCLE = ['已投递', '已面试', '已录用', '已拒绝', '待投递'];

document.getElementById('historyList').addEventListener('click', (e) => {
  const statusBtn = e.target.closest('.history-status');
  if (statusBtn) {
    const idx = parseInt(statusBtn.dataset.idx);
    const cur = historyData[idx].status;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
    historyData[idx].status = next;
    saveHistory();
    renderHistory(document.getElementById('historyFilter').value);
    return;
  }
  const delBtn = e.target.closest('.history-delete');
  if (delBtn) {
    const idx = parseInt(delBtn.dataset.idx);
    historyData.splice(idx, 1);
    saveHistory();
    renderHistory(document.getElementById('historyFilter').value);
  }
});

document.getElementById('historyFilter').addEventListener('change', (e) => {
  renderHistory(e.target.value);
});

// Record current page
document.getElementById('btnRecord').addEventListener('click', async () => {
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab) { showToast('无法获取页面信息', 'error'); return; }

    const url = tab.url || '';

    // Check for duplicate (same URL within last hour)
    const oneHourAgo = Date.now() - 3600000;
    const dup = historyData.find(h => h.url === url && h.date > oneHourAgo);
    if (dup) {
      showToast('该页面已记录过', 'info');
      return;
    }

    // Inject content script and extract page info
    let company = '', job = '';
    try {
      await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
    } catch(e) {}

    const pageInfo = await new Promise((resolve) => {
      api.tabs.sendMessage(tab.id, { action: 'extractPageInfo' }, (response) => {
        if (api.runtime.lastError || !response || !response.success) {
          resolve(null);
        } else {
          resolve(response.info);
        }
      });
    });

    if (pageInfo) {
      company = pageInfo.company;
      job = pageInfo.job;
    }

    // Fallback: parse from tab title
    if (!company && !job) {
      const title = tab.title || '';
      const parts = title.split(/[-–—|_]/);
      if (parts.length >= 2) {
        job = parts[0].trim().substring(0, 40);
        company = parts[1].trim().substring(0, 40);
      } else {
        company = title.substring(0, 40);
      }
    }

    historyData.unshift({
      company: company || '未知公司',
      job,
      url,
      date: Date.now(),
      status: '已投递'
    });
    saveHistory();
    renderHistory();
    showToast('已记录投递');

    // Switch to history tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="history"]').classList.add('active');
    document.getElementById('tab-history').classList.add('active');
  } catch (err) { showToast('记录失败', 'error'); }
});

// Add history manually
document.getElementById('addHistory').addEventListener('click', async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true }).catch(() => [null]);
  const company = prompt('公司名称：');
  if (!company) return;
  const job = prompt('投递职位（可选）：') || '';

  historyData.unshift({
    company: company.substring(0, 30),
    job: job.substring(0, 30),
    url: tab?.url || '',
    date: Date.now(),
    status: '已投递'
  });
  saveHistory();
  renderHistory();
  showToast('已添加记录');
});

loadHistory();

// ============ Resume Upload & AI Parse ============
let parsedResumeData = null;

// Open modal
document.getElementById('btnUploadResume').addEventListener('click', () => {
  document.getElementById('resumeModal').classList.remove('hidden');
  // Load saved API settings
  api.storage.local.get('llmSettings', (result) => {
    if (result.llmSettings) {
      document.getElementById('llmProvider').value = result.llmSettings.provider || 'claude';
      document.getElementById('llmApiKey').value = result.llmSettings.apiKey || '';
      document.getElementById('llmModel').value = result.llmSettings.model || '';
    }
  });
});

// Close modal
document.getElementById('closeResumeModal').addEventListener('click', () => {
  document.getElementById('resumeModal').classList.add('hidden');
});
document.querySelector('.modal-backdrop').addEventListener('click', () => {
  document.getElementById('resumeModal').classList.add('hidden');
});

// Upload zone interactions
const uploadZone = document.getElementById('uploadZone');
const resumeFileInput = document.getElementById('resumeFile');

uploadZone.addEventListener('click', () => resumeFileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    resumeFileInput.files = e.dataTransfer.files;
    handleResumeFile(e.dataTransfer.files[0]);
  }
});
resumeFileInput.addEventListener('change', () => {
  if (resumeFileInput.files.length > 0) handleResumeFile(resumeFileInput.files[0]);
});

function handleResumeFile(file) {
  uploadZone.classList.add('has-file');
  uploadZone.querySelector('p').textContent = file.name;
  uploadZone.querySelector('.hint').textContent = `${(file.size / 1024).toFixed(1)} KB`;
}

// Parse button
document.getElementById('btnParseResume').addEventListener('click', async () => {
  const apiKey = document.getElementById('llmApiKey').value.trim();
  const provider = document.getElementById('llmProvider').value;
  const model = document.getElementById('llmModel').value.trim();

  if (!apiKey) { showToast('请填写 API Key', 'error'); return; }

  // Save API settings
  api.storage.local.set({ llmSettings: { provider, apiKey, model } });

  // Get text: file or textarea
  let text = '';
  const file = resumeFileInput.files[0];
  const pastedText = document.getElementById('resumeText').value.trim();

  if (file) {
    try {
      document.getElementById('resumeStep1').classList.add('hidden');
      document.getElementById('resumeLoading').classList.remove('hidden');
      text = await extractTextFromFile(file);
    } catch (err) {
      document.getElementById('resumeLoading').classList.add('hidden');
      document.getElementById('resumeStep1').classList.remove('hidden');
      showToast(err.message, 'error');
      return;
    }
  } else if (pastedText) {
    text = pastedText;
  } else {
    showToast('请上传简历文件或粘贴简历文本', 'error');
    return;
  }

  if (text.length < 50) {
    document.getElementById('resumeLoading').classList.add('hidden');
    document.getElementById('resumeStep1').classList.remove('hidden');
    showToast('简历内容太少，请检查文件', 'error');
    return;
  }

  // Show loading
  document.getElementById('resumeStep1').classList.add('hidden');
  document.getElementById('resumeLoading').classList.remove('hidden');

  try {
    parsedResumeData = await parseResumeWithLLM(text, apiKey, provider, model);
    renderParsePreview(parsedResumeData);
    document.getElementById('resumeLoading').classList.add('hidden');
    document.getElementById('resumeStep2').classList.remove('hidden');
  } catch (err) {
    document.getElementById('resumeLoading').classList.add('hidden');
    document.getElementById('resumeStep1').classList.remove('hidden');
    showToast('解析失败: ' + err.message, 'error');
  }
});

// Back button
document.getElementById('btnParseBack').addEventListener('click', () => {
  document.getElementById('resumeStep2').classList.add('hidden');
  document.getElementById('resumeStep1').classList.remove('hidden');
});

// Confirm button - fill data
document.getElementById('btnParseConfirm').addEventListener('click', () => {
  if (!parsedResumeData) return;
  loadData(parsedResumeData);
  api.storage.local.set({ resumeData: collectData() });
  document.getElementById('resumeModal').classList.add('hidden');
  // Reset modal state
  document.getElementById('resumeStep2').classList.add('hidden');
  document.getElementById('resumeStep1').classList.remove('hidden');
  showToast('简历数据已填入', 'success');
});

// Render preview
function renderParsePreview(data) {
  const preview = document.getElementById('parsePreview');
  let html = '';

  // Basic info
  const basicFields = [
    ['姓名', data.name], ['性别', data.gender], ['手机', data.phone], ['邮箱', data.email],
    ['城市', data.city], ['学历', data.educations?.[0]?.degree], ['期望职位', data.expectedJob],
  ];
  const basicHtml = basicFields
    .filter(([,v]) => v)
    .map(([k,v]) => `<div class="parse-field"><span class="parse-field-key">${k}</span><span class="parse-field-val">${v}</span></div>`)
    .join('');
  if (basicHtml) {
    html += `<div class="parse-section"><div class="parse-section-title">基本信息</div>${basicHtml}</div>`;
  }

  // Education
  if (data.educations?.length > 0) {
    html += `<div class="parse-section"><div class="parse-section-title">教育经历 (${data.educations.length})</div>`;
    data.educations.forEach(e => {
      html += `<div class="parse-entry"><div class="parse-entry-title">${e.school || '?'} · ${e.major || ''} · ${e.degree || ''}</div>
        <div style="font-size:10px;color:#999">${e.startDate || ''} ~ ${e.endDate || ''}</div></div>`;
    });
    html += '</div>';
  }

  // Work
  if (data.works?.length > 0) {
    html += `<div class="parse-section"><div class="parse-section-title">工作/实习经历 (${data.works.length})</div>`;
    data.works.forEach(w => {
      const tag = w.workType === '实习' ? '<span style="color:#e65100;font-size:10px;background:#fff3e0;padding:0 4px;border-radius:3px;margin-left:4px">实习</span>' : '';
      html += `<div class="parse-entry"><div class="parse-entry-title">${w.company || '?'} · ${w.jobTitle || ''}${tag}</div>
        <div style="font-size:10px;color:#999">${w.startDate || ''} ~ ${w.endDate || ''}</div>
        ${w.description ? `<div style="font-size:11px;color:#666;margin-top:2px">${w.description.substring(0, 80)}${w.description.length > 80 ? '...' : ''}</div>` : ''}</div>`;
    });
    html += '</div>';
  }

  // Projects
  if (data.projects?.length > 0) {
    html += `<div class="parse-section"><div class="parse-section-title">项目经历 (${data.projects.length})</div>`;
    data.projects.forEach(p => {
      html += `<div class="parse-entry"><div class="parse-entry-title">${p.projectName || '?'} · ${p.role || ''}</div>
        <div style="font-size:10px;color:#999">${p.startDate || ''} ~ ${p.endDate || ''}</div></div>`;
    });
    html += '</div>';
  }

  // Competitions
  if (data.competitions?.length > 0) {
    html += `<div class="parse-section"><div class="parse-section-title">竞赛/荣誉 (${data.competitions.length})</div>`;
    data.competitions.forEach(c => {
      html += `<div class="parse-entry"><div class="parse-entry-title">${c.competitionName || '?'} · ${c.awardLevel || ''}</div></div>`;
    });
    html += '</div>';
  }

  // Certificates
  if (data.certificates?.length > 0) {
    html += `<div class="parse-section"><div class="parse-section-title">证书 (${data.certificates.length})</div>`;
    data.certificates.forEach(c => {
      html += `<div class="parse-entry"><div class="parse-entry-title">${c.certName || '?'}</div></div>`;
    });
    html += '</div>';
  }

  // Skills & Self evaluation
  const extras = [];
  if (data.skills) extras.push(`<div class="parse-field"><span class="parse-field-key">技能</span><span class="parse-field-val">${data.skills}</span></div>`);
  if (data.selfEvaluation) extras.push(`<div class="parse-field"><span class="parse-field-key">自评</span><span class="parse-field-val">${data.selfEvaluation.substring(0, 60)}...</span></div>`);
  if (extras.length > 0) {
    html += `<div class="parse-section"><div class="parse-section-title">其他</div>${extras.join('')}</div>`;
  }

  preview.innerHTML = html || '<p style="text-align:center;color:#ccc">未解析到有效信息</p>';
}

// ============ Import / Export ============
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      loadData(data);
      api.storage.local.set({ resumeData: data });
      showToast('数据已导入');
    } catch { showToast('导入失败：格式不正确', 'error'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});