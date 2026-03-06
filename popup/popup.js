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
  const hasBasicData = Object.keys(data).some(k => !['educations','works','projects'].includes(k));
  const hasEntries = (data.educations?.length || 0) + (data.works?.length || 0) + (data.projects?.length || 0) > 0;
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