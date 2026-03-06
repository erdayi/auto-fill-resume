/**
 * Resume Auto Filler — Content Script v2
 *
 * Architecture:
 * 1. SITE ADAPTERS — site-specific rules for major job platforms
 * 2. WIDGET HANDLERS — interact with custom date pickers, dropdowns, etc.
 * 3. SMART MATCHER — multi-signal weighted scoring for unknown forms
 * 4. SECTION DETECTOR — understand form context (edu/work/project sections)
 * 5. MULTI-ENTRY FILLER — handle "add experience" buttons and fill multiple entries
 */
(function() {
  'use strict';
  if (window.__resumeFillerV2) return;
  window.__resumeFillerV2 = true;

  const api = globalThis.browser || globalThis.chrome;

  // ================================================================
  // SECTION 1: FIELD MATCHERS — keyword/exact/negative rules
  // ================================================================

  const AUTOCOMPLETE_MAP = {
    'name': 'name', 'given-name': 'name', 'family-name': 'name',
    'email': 'email', 'tel': 'phone', 'tel-national': 'phone',
    'street-address': 'address', 'address-line1': 'address',
    'address-level2': 'city', 'bday': 'birthday',
    'sex': 'gender', 'organization': 'company',
    'organization-title': 'jobTitle', 'url': 'website',
  };

  const FIELD_MATCHERS = {
    name: {
      kw: ['姓名','真实姓名','名字','your name','full name','real name'],
      ex: ['name','realname','fullname','truename','applicantname','candidatename','xm','userName'],
      neg: ['company','school','university','emergency','project','父','母','紧急','公司','学校','项目'],
      w: 10
    },
    gender: {
      kw: ['性别','gender','sex'],
      ex: ['gender','sex','xb'],
      neg: [], w: 5
    },
    birthday: {
      kw: ['出生日期','生日','出生年月','出生','birthday','birth date','date of birth'],
      ex: ['birthday','birthdate','dob','dateofbirth','birth','csrq'],
      neg: [], w: 5
    },
    idCard: {
      kw: ['身份证','证件号','身份证号码','身份证号','证件号码','id card','id number','identity'],
      ex: ['idcard','idnumber','identitynumber','certificateno','sfzh','idNo','cardNo','zjhm'],
      neg: [], w: 8
    },
    phone: {
      kw: ['手机','电话','联系电话','手机号','联系方式','移动电话','phone','mobile','telephone','cell'],
      ex: ['phone','mobile','tel','telephone','cellphone','mobilephone','phonenum','phoneNo','sjhm','lxdh'],
      neg: ['emergency','紧急','fax','传真'], w: 8
    },
    email: {
      kw: ['邮箱','电子邮箱','电子邮件','email','e-mail'],
      ex: ['email','mail','emailaddress','userEmail','contactEmail','dzyx'],
      neg: [], w: 8
    },
    city: {
      kw: ['城市','所在城市','现居城市','工作城市','工作地点','所在地','city','location','current city'],
      ex: ['city','location','currentcity','workcity','livecity'],
      neg: ['birth','籍贯','hometown'], w: 4
    },
    address: {
      kw: ['地址','详细地址','居住地址','通讯地址','家庭地址','住址','address','street'],
      ex: ['address','addr','detailaddress','homeaddress','streetaddress'],
      neg: ['email','ip','mac','url'], w: 4
    },
    ethnicity: {
      kw: ['民族','ethnicity','ethnic'],
      ex: ['ethnicity','ethnic','minzu','mz'],
      neg: ['nationality','国籍'], w: 3
    },
    nationality: {
      kw: ['国籍','nationality','citizenship'],
      ex: ['nationality','citizenship','guoji'],
      neg: ['民族','ethnicity'], w: 3
    },
    politicalStatus: {
      kw: ['政治面貌','political'],
      ex: ['political','politicalstatus','zzmm'],
      neg: [], w: 3
    },
    maritalStatus: {
      kw: ['婚姻','婚姻状况','marital','marriage'],
      ex: ['marital','maritalstatus','hyzk'],
      neg: [], w: 3
    },
    degree: {
      kw: ['学历','最高学历','学位','教育程度','degree','education level','qualification'],
      ex: ['degree','education','qualification','xueli','educationlevel','highestdegree'],
      neg: [], w: 5
    },
    school: {
      kw: ['学校','院校','毕业院校','毕业学校','就读学校','school','university','college','institution'],
      ex: ['school','university','college','institution','schoolname','collegename'],
      neg: [], w: 5
    },
    major: {
      kw: ['专业','所学专业','major','specialty','field of study'],
      ex: ['major','specialty','subject','profession','discipline','majorname'],
      neg: [], w: 5
    },
    eduStartDate: {
      kw: ['入学时间','入学日期','教育开始','education start'],
      ex: ['edustartdate','enrolldate','educationstartdate','rxsj'],
      neg: [], w: 3
    },
    eduEndDate: {
      kw: ['毕业时间','毕业日期','教育结束','graduation date'],
      ex: ['eduenddate','graduatedate','graduationdate','bysj'],
      neg: [], w: 3
    },
    gpa: {
      kw: ['gpa','绩点','成绩','平均分','grade point'],
      ex: ['gpa','grade','score','gradepoint'],
      neg: [], w: 3
    },
    company: {
      kw: ['公司','单位','公司名称','工作单位','企业','雇主','company','employer','organization'],
      ex: ['company','employer','organization','companyname','corp','orgname','enterprise','gzdw'],
      neg: [], w: 5
    },
    jobTitle: {
      kw: ['职位','岗位','职务','头衔','position','job title','role','designation'],
      ex: ['jobtitle','position','title','role','positionname','designation','zw','gwmc'],
      neg: ['expected','期望','target','意向'], w: 5
    },
    workStartDate: {
      kw: ['入职时间','开始工作','work start','employment start','开始时间'],
      ex: ['workstartdate','jobstartdate','hiredate','employmentstart','startdate'],
      neg: [], w: 3
    },
    workEndDate: {
      kw: ['离职时间','结束工作','work end','employment end','结束时间'],
      ex: ['workenddate','jobenddate','leavedate','employmentend','enddate'],
      neg: [], w: 3
    },
    jobDescription: {
      kw: ['工作描述','工作内容','职责','工作职责','岗位描述','job description','responsibility','duties'],
      ex: ['jobdescription','description','responsibility','workdesc','duties','jobdesc'],
      neg: ['self','自我','项目描述','projectdesc'], w: 4
    },
    expectedSalary: {
      kw: ['期望薪资','薪资','期望薪酬','期望工资','薪资要求','salary','compensation','expected salary'],
      ex: ['salary','expectedsalary','compensation','wage','xzqw'],
      neg: [], w: 4
    },
    expectedJob: {
      kw: ['期望职位','意向职位','求职意向','期望岗位','目标职位'],
      ex: ['expectedjob','expectedposition','targetjob','intention','desiredposition','qzyx'],
      neg: [], w: 4
    },
    workYears: {
      kw: ['工作年限','工作经验','经验年限','work years','years of experience'],
      ex: ['workyears','experience','yearsofexperience','expyears','gznx'],
      neg: [], w: 4
    },
    industry: {
      kw: ['行业','所在行业','industry','sector'],
      ex: ['industry','sector','trade','hangye'],
      neg: [], w: 3
    },
    skills: {
      kw: ['技能','特长','技能特长','专业技能','技术栈','skills','expertise','proficiency'],
      ex: ['skills','skill','expertise','speciality','proficiency','techstack','jntc'],
      neg: [], w: 4
    },
    selfEvaluation: {
      kw: ['自我评价','自我介绍','个人简介','个人描述','self evaluation','introduction','summary','about me'],
      ex: ['selfevaluation','introduction','summary','aboutme','selfdescription','bio','profile','selfintro','zwpj'],
      neg: [], w: 4
    },
    website: {
      kw: ['个人网站','网站','github','主页','website','homepage','blog','portfolio'],
      ex: ['website','homepage','blog','portfolio','github','personalsite','personalurl'],
      neg: [], w: 3
    },
    wechat: {
      kw: ['微信','微信号','wechat','weixin'],
      ex: ['wechat','weixin','wechatid','wxid','wxh'],
      neg: [], w: 3
    },
    qq: {
      kw: ['qq','qq号'],
      ex: ['qq','qqnumber','qqno'],
      neg: [], w: 3
    },
    linkedin: {
      kw: ['linkedin','领英'],
      ex: ['linkedin','linkedinurl'],
      neg: [], w: 3
    },
    emergencyContact: {
      kw: ['紧急联系人','紧急联系','emergency contact'],
      ex: ['emergencycontact','emergencyname'],
      neg: [], w: 3
    },
    emergencyPhone: {
      kw: ['紧急联系人电话','紧急电话','emergency phone'],
      ex: ['emergencyphone','emergencytel'],
      neg: [], w: 3
    },
    eduDescription: {
      kw: ['在校经历','教育描述','在校活动','校内经历','education description'],
      ex: ['edudescription','educationdesc','schoolexperience','campusexperience'],
      neg: [], w: 3
    },
    // Multi-entry fields (used for section detection)
    projectName: {
      kw: ['项目名称','项目名','project name','project title'],
      ex: ['projectname','projecttitle','xmmc'],
      neg: [], w: 5
    },
    projectRole: {
      kw: ['担任角色','项目角色','your role','role in project'],
      ex: ['projectrole','role','myrole'],
      neg: [], w: 3
    },
    projectDescription: {
      kw: ['项目描述','项目内容','project description','project detail'],
      ex: ['projectdescription','projectdesc','projectdetail','xmms'],
      neg: [], w: 4
    },
    projectLink: {
      kw: ['项目链接','项目地址','project link','project url','demo'],
      ex: ['projectlink','projecturl','demolink','repolink'],
      neg: [], w: 3
    },
    // Hometown / Hukou / Physical
    hometown: {
      kw: ['籍贯','家乡','出生地','hometown','birthplace','native place'],
      ex: ['hometown','birthplace','nativeplace','jiguan','jg'],
      neg: ['户口'], w: 3
    },
    hukou: {
      kw: ['户口','户口所在地','户籍','户籍所在地','hukou','registered residence'],
      ex: ['hukou','registeredresidence','hkszd','huji'],
      neg: ['籍贯'], w: 3
    },
    height: {
      kw: ['身高','height','stature'],
      ex: ['height','stature','shengao','sg'],
      neg: ['体重','weight'], w: 3
    },
    weight: {
      kw: ['体重','weight'],
      ex: ['weight','tizhong','tz'],
      neg: ['身高','height'], w: 3
    },
    // Language & Computer
    englishLevel: {
      kw: ['英语水平','英语等级','英语能力','english level','english proficiency','cet'],
      ex: ['englishlevel','englishproficiency','cetlevel','yyshuiping'],
      neg: [], w: 3
    },
    englishScore: {
      kw: ['英语成绩','英语分数','cet成绩','cet分数','english score','toefl','ielts'],
      ex: ['englishscore','cetscore','toefl','ielts','yychengji'],
      neg: [], w: 3
    },
    otherLanguage: {
      kw: ['其他语言','第二语言','小语种','other language','second language'],
      ex: ['otherlanguage','secondlanguage','qtyuyan'],
      neg: [], w: 3
    },
    computerLevel: {
      kw: ['计算机等级','计算机水平','计算机能力','computer level','ncre','计算机证书'],
      ex: ['computerlevel','ncre','jsjdj','computergrade'],
      neg: [], w: 3
    },
    // Competition / Award
    competitionName: {
      kw: ['竞赛名称','比赛名称','奖项名称','获奖名称','获奖项','获奖情况','奖项','competition','award name','contest','award'],
      ex: ['competitionname','awardname','contestname','jsmc','awarditem','hjx'],
      neg: [], w: 5
    },
    awardLevel: {
      kw: ['获奖等级','奖项级别','获奖级别','award level','prize level'],
      ex: ['awardlevel','prizelevel','hjdj'],
      neg: [], w: 3
    },
    awardDate: {
      kw: ['获奖时间','获奖日期','award date'],
      ex: ['awarddate','prizedate','hjsj'],
      neg: [], w: 3
    },
    awardIssuer: {
      kw: ['颁发机构','颁奖机构','授奖单位','issuing organization','awarded by'],
      ex: ['awardissuer','issuer','bfjg'],
      neg: [], w: 3
    },
    awardDescription: {
      kw: ['获奖描述','竞赛描述','奖项描述','award description'],
      ex: ['awarddescription','competitiondesc','jsdescription'],
      neg: [], w: 3
    },
    // Certificate
    certName: {
      kw: ['证书名称','资格证书','资质名称','certificate name','certification','license'],
      ex: ['certname','certificatename','certification','licensename','zsmc'],
      neg: [], w: 5
    },
    certDate: {
      kw: ['取证时间','发证日期','获证时间','certificate date','issue date'],
      ex: ['certdate','certificatedate','issuedate','fzrq'],
      neg: [], w: 3
    },
    certIssuer: {
      kw: ['发证机关','颁发单位','发证单位','certificate issuer','issuing authority'],
      ex: ['certissuer','issuingauthority','fzjg'],
      neg: [], w: 3
    },
    certNo: {
      kw: ['证书编号','证书号','certificate number','license number'],
      ex: ['certno','certificatenumber','licensenumber','zsbh'],
      neg: [], w: 3
    },
  };

  const FIELD_LABELS = {};
  const labelMap = {
    name:'姓名',gender:'性别',birthday:'出生日期',idCard:'身份证号',phone:'手机号',email:'邮箱',
    city:'城市',address:'地址',ethnicity:'民族',nationality:'国籍',politicalStatus:'政治面貌',
    maritalStatus:'婚姻状况',degree:'学历',school:'学校',major:'专业',eduStartDate:'入学时间',
    eduEndDate:'毕业时间',eduDescription:'在校经历',gpa:'GPA',company:'公司',jobTitle:'职位',workStartDate:'入职时间',
    workEndDate:'离职时间',jobDescription:'工作描述',expectedSalary:'期望薪资',expectedJob:'期望职位',
    workYears:'工作年限',industry:'行业',skills:'技能',selfEvaluation:'自我评价',website:'网站',
    wechat:'微信',qq:'QQ',linkedin:'LinkedIn',emergencyContact:'紧急联系人',emergencyPhone:'紧急联系电话',
    projectName:'项目名称',projectRole:'项目角色',projectDescription:'项目描述',projectLink:'项目链接',
    hometown:'籍贯',hukou:'户口所在地',height:'身高',weight:'体重',
    englishLevel:'英语水平',englishScore:'英语成绩',otherLanguage:'其他语言',computerLevel:'计算机等级',
    competitionName:'竞赛名称',awardLevel:'获奖等级',awardDate:'获奖时间',awardIssuer:'颁发机构',awardDescription:'获奖描述',
    certName:'证书名称',certDate:'取证时间',certIssuer:'发证机关',certNo:'证书编号',
  };
  Object.assign(FIELD_LABELS, labelMap);

  // ================================================================
  // SECTION 2: IDENTIFIER EXTRACTION
  // ================================================================

  function getIdentifiers(el) {
    const ids = [];
    const add = (text, source, weight) => {
      if (text && text.length > 0 && text.length < 100)
        ids.push({ t: text.toLowerCase().trim(), s: source, w: weight });
    };

    // Direct attributes
    ['name','id','placeholder','aria-label','autocomplete',
     'data-field','data-name','data-key','data-type','data-label',
     'ng-model','v-model','formcontrolname','data-testid','data-cy'
    ].forEach(attr => {
      const v = el.getAttribute(attr);
      if (v) add(v, 'attr', (attr === 'name' || attr === 'id') ? 3 : 2);
    });

    // CSS classes
    if (el.className && typeof el.className === 'string') {
      el.className.split(/\s+/).forEach(cls => {
        if (cls.length > 2 && cls.length < 40) add(cls, 'class', 0.8);
      });
    }

    // label[for]
    if (el.id) {
      try {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) add(lbl.textContent.trim(), 'label', 3);
      } catch(e) {}
    }

    // Wrapping <label>
    const wrapLabel = el.closest('label');
    if (wrapLabel) {
      const clone = wrapLabel.cloneNode(true);
      clone.querySelectorAll('input,select,textarea,button').forEach(c => c.remove());
      add(clone.textContent.trim(), 'label', 3);
    }

    // Siblings
    const sibTags = new Set(['LABEL','SPAN','DIV','TD','TH','DT','P','STRONG','EM','B','H4','H5','H6']);
    let prev = el.previousElementSibling;
    for (let i = 0; i < 3 && prev; i++, prev = prev.previousElementSibling) {
      if (sibTags.has(prev.tagName) && !prev.querySelector('input,select,textarea')) {
        add(prev.textContent.trim(), 'sibling', 2 - i * 0.3);
      }
    }

    // Parent label-like elements
    const formGroupSelectors = [
      'label', '.label', '.form-label', '.field-label',
      '.el-form-item__label', '.ant-form-item-label label',
      '.ant-form-item-label', '.ivu-form-item-label',
      '.layui-form-label', '.control-label', '.col-form-label',
      '.arco-form-item-label', '.t-form__label', '.n-form-item-label',
      // Common Chinese job site selectors
      '.item-label', '.form-title', '.label-text', '.field-name',
    ].join(',');

    for (let p = el.parentElement, depth = 0; p && depth < 4; p = p.parentElement, depth++) {
      const lbls = p.querySelectorAll(formGroupSelectors);
      lbls.forEach(lbl => {
        if (!lbl.contains(el) && !lbl.querySelector('input,select,textarea')) {
          add(lbl.textContent.trim(), 'parent-label', 2.5 - depth * 0.3);
        }
      });
      // Also check direct text of table cells
      if (p.tagName === 'TD' || p.tagName === 'TH') {
        const prevTd = p.previousElementSibling;
        if (prevTd && (prevTd.tagName === 'TD' || prevTd.tagName === 'TH')) {
          add(prevTd.textContent.trim(), 'table-label', 2.5);
        }
      }
    }

    // Title/tooltip
    if (el.title) add(el.title, 'title', 1.5);

    return ids;
  }

  // ================================================================
  // SECTION 3: SCORING ENGINE
  // ================================================================

  function scoreField(el, identifiers, key, m) {
    let score = 0;

    for (const id of identifiers) {
      const text = id.t;
      const clean = text.replace(/[-_.\s]/g, '');

      // Negative check
      if (m.neg.length > 0 && m.neg.some(n => text.includes(n.toLowerCase()) || clean.includes(n.toLowerCase().replace(/[-_.\s]/g, '')))) {
        return -1;
      }

      // Exact match
      for (const e of m.ex) {
        if (clean === e.toLowerCase()) { score += 20 * id.w; break; }
        else if (clean.includes(e.toLowerCase()) && clean.length < e.length + 12) { score += 12 * id.w; }
      }

      // Keyword match
      for (const kw of m.kw) {
        const kwl = kw.toLowerCase();
        if (text.includes(kwl) || clean.includes(kwl.replace(/[-_.\s]/g, ''))) {
          score += 10 * id.w;
          break; // Only count best keyword match per identifier
        }
      }
    }

    // Autocomplete bonus
    const ac = el.getAttribute('autocomplete');
    if (ac && AUTOCOMPLETE_MAP[ac] === key) score += 30;

    // Input type bonus
    const typeMap = { email: 'email', tel: 'phone', url: 'website' };
    if (typeMap[el.type] === key) score += 5;

    return score;
  }

  function matchField(el) {
    const ids = getIdentifiers(el);
    if (ids.length === 0) return null;

    let bestKey = null, bestScore = 0;
    for (const [key, m] of Object.entries(FIELD_MATCHERS)) {
      const s = scoreField(el, ids, key, m);
      if (s > bestScore) { bestScore = s; bestKey = key; }
    }
    return bestScore >= 8 ? bestKey : null;
  }

  // ================================================================
  // SECTION 4: SECTION/CONTEXT DETECTOR
  // ================================================================

  const SECTION_KEYWORDS = {
    education: ['教育','学历','学校','院校','education','academic','school','学习经历'],
    work: ['工作','职业','公司','雇主','work','employment','career','job experience','工作经历','工作经验'],
    intern: ['实习','intern','internship','实习经历','实习经验'],
    project: ['项目','project','项目经历','项目经验'],
    competition: ['竞赛','获奖','荣誉','比赛','competition','award','honor','contest','prize'],
    certificate: ['证书','资质','资格','certification','certificate','license','qualification'],
    basic: ['基本','个人','基本信息','basic','personal','profile','个人信息'],
    skill: ['技能','skills','专业技能','技术能力'],
    other: ['其他','other','附加','additional'],
  };

  function detectSection(el) {
    let node = el;
    for (let i = 0; i < 12 && node; i++) {
      node = node.parentElement;
      if (!node) break;

      const sig = [node.className, node.id, node.getAttribute('data-section'),
                   node.getAttribute('aria-label'), node.getAttribute('data-v-')].filter(Boolean).join(' ').toLowerCase();

      // Check headings inside this container
      const heading = node.querySelector('h1,h2,h3,h4,h5,h6,.section-title,.title,.panel-title,.card-title,.block-title');
      const headingText = heading ? heading.textContent.trim().toLowerCase() : '';

      for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
        if (keywords.some(kw => sig.includes(kw) || headingText.includes(kw))) return section;
      }
    }
    return 'unknown';
  }

  // ================================================================
  // SECTION 5: CUSTOM WIDGET HANDLERS
  // ================================================================

  // Handle custom date pickers (Ant Design, Element UI, etc.)
  function handleCustomDatePicker(el, value) {
    // Try direct value setting first
    el.focus();
    el.click();

    // For readonly inputs that trigger a date picker popup
    if (el.readOnly) {
      el.click();
      // Wait for picker popup
      setTimeout(() => {
        // Try to find and interact with the popup
        const popups = document.querySelectorAll(
          '.ant-picker-dropdown, .el-date-picker, .el-picker-panel, ' +
          '.ivu-date-picker-dropdown, .arco-trigger-popup, .laydate-main, ' +
          '.vant-popup, .picker-popup, [class*="datepicker"], [class*="date-picker"]'
        );
        // If popup found, try to close it and set value via attribute
        if (popups.length > 0) {
          // Try to set via input event
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
          if (nativeSetter && nativeSetter.set) {
            nativeSetter.set.call(el, value);
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));

          // Try to close picker
          document.body.click();
          const mask = document.querySelector('.ant-picker-dropdown, .el-picker-panel');
          if (mask) mask.style.display = 'none';
        }
      }, 100);
      return true;
    }

    return false;
  }

  // Handle custom select dropdowns (non-native)
  function handleCustomSelect(el, value) {
    // Detect custom select containers
    const customSelectors = [
      '.el-select', '.ant-select', '.ivu-select', '.arco-select',
      '.t-select', '.n-select', '[class*="custom-select"]', '[class*="dropdown"]',
    ];

    const container = el.closest(customSelectors.join(','));
    if (!container) return false;

    // Click to open dropdown
    const trigger = container.querySelector('input, .el-input__inner, .ant-select-selection-item, .ant-select-selection-search-input');
    if (trigger) {
      trigger.click();
      trigger.focus();

      // Type the value to filter
      if (trigger.tagName === 'INPUT') {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (nativeSetter && nativeSetter.set) nativeSetter.set.call(trigger, value);
        trigger.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Wait for dropdown options to appear
      setTimeout(() => {
        const optionSelectors = [
          '.el-select-dropdown__item', '.ant-select-item-option',
          '.ivu-select-item', '.arco-select-option',
          '[class*="option"]', '[role="option"]', 'li',
        ];

        const dropdown = document.querySelector(
          '.el-select-dropdown, .ant-select-dropdown, .ivu-select-dropdown, ' +
          '.arco-trigger-popup, [class*="dropdown-menu"]'
        );

        if (dropdown) {
          const options = dropdown.querySelectorAll(optionSelectors.join(','));
          for (const opt of options) {
            const optText = opt.textContent.trim();
            if (optText === value || optText.includes(value) || value.includes(optText)) {
              opt.click();
              return;
            }
          }
        }
      }, 200);

      return true;
    }
    return false;
  }

  // ================================================================
  // SECTION 6: VALUE SETTING (framework-compatible)
  // ================================================================

  function triggerEvents(el) {
    const tag = el.tagName.toLowerCase();
    const setters = {
      input: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'),
      textarea: Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value'),
      select: Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value'),
    };
    const setter = setters[tag];
    if (setter && setter.set) setter.set.call(el, el.value);

    ['focus', 'input', 'change', 'blur'].forEach(evt => {
      el.dispatchEvent(new Event(evt, { bubbles: true }));
    });

    // Additional React/Vue compatibility
    try {
      const inputEvent = new InputEvent('input', { bubbles: true, inputType: 'insertText', data: el.value });
      el.dispatchEvent(inputEvent);
    } catch(e) {}
  }

  function setSelectValue(el, value) {
    const opts = Array.from(el.options);
    const match = opts.find(o => o.value === value) ||
                  opts.find(o => o.textContent.trim() === value) ||
                  opts.find(o => o.value && value.includes(o.value) && o.value !== '') ||
                  opts.find(o => { const t = o.textContent.trim(); return t && (value.includes(t) || t.includes(value)) && t !== ''; });
    if (match) { el.value = match.value; triggerEvents(el); return true; }
    // Try custom select handler
    return handleCustomSelect(el, value);
  }

  function setRadioValue(radios, value) {
    for (const r of radios) {
      const label = r.parentElement ? r.parentElement.textContent.trim() : '';
      if (r.value === value || label.includes(value) || value.includes(label) || value.includes(r.value)) {
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
        r.dispatchEvent(new Event('click', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  function setFieldValue(el, value) {
    if (!value) return false;
    const tag = el.tagName.toLowerCase();

    if (el.isContentEditable) {
      el.focus();
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    if (tag === 'select') return setSelectValue(el, value);
    if (tag === 'input' && el.type === 'radio') return false; // handled separately
    if (tag === 'input' && ['file','submit','button','reset','image','hidden'].includes(el.type)) return false;

    if (tag === 'input' && el.type === 'checkbox') {
      const shouldCheck = ['是','有','yes','true','1'].includes(value.toLowerCase());
      if (el.checked !== shouldCheck) { el.checked = shouldCheck; triggerEvents(el); }
      return true;
    }

    // Date inputs
    if (tag === 'input' && (el.type === 'date' || el.type === 'month' || el.type === 'datetime-local')) {
      const val = el.type === 'month' ? value.substring(0, 7) : value;
      el.value = val;
      triggerEvents(el);
      return true;
    }

    // Readonly inputs might be custom pickers
    if (el.readOnly) {
      return handleCustomDatePicker(el, value);
    }

    // Standard text/textarea
    el.value = value;
    el.setAttribute('value', value);
    triggerEvents(el);
    return true;
  }

  // ================================================================
  // SECTION 7: "ADD MORE" BUTTON DETECTION
  // ================================================================

  function findAddButton(sectionEl, sectionType) {
    const keywords = {
      education: ['添加教育','新增教育','添加学历','add education','新增'],
      work: ['添加工作','新增工作','添加实习','add work','add experience','add internship','新增','添加经历'],
      intern: ['添加实习','新增实习','add intern','add internship','新增'],
      project: ['添加项目','新增项目','add project','新增'],
      competition: ['添加竞赛','新增竞赛','添加获奖','添加荣誉','获奖情况','add competition','add award','新增'],
      certificate: ['添加证书','新增证书','添加资质','add certificate','add certification','新增'],
    };

    const kws = keywords[sectionType] || ['添加', '新增', 'add', '+ '];

    // Search for add buttons within the section or nearby
    const searchRoot = sectionEl || document.body;
    const buttons = searchRoot.querySelectorAll('button, a, .btn, [role="button"], [class*="add"], [class*="new"]');

    for (const btn of buttons) {
      if (!isVisible(btn)) continue;
      const text = btn.textContent.trim().toLowerCase();
      const title = (btn.getAttribute('title') || '').toLowerCase();
      const cls = (btn.className || '').toLowerCase();

      if (kws.some(kw => text.includes(kw) || title.includes(kw) || cls.includes(kw))) {
        return btn;
      }
    }
    return null;
  }

  // ================================================================
  // SECTION 8: VISUAL FEEDBACK
  // ================================================================

  function highlightField(el) {
    const orig = { boxShadow: el.style.boxShadow, borderColor: el.style.borderColor, transition: el.style.transition };
    el.style.transition = 'all 0.3s ease';
    el.style.boxShadow = '0 0 0 3px rgba(52, 168, 83, 0.25)';
    el.style.borderColor = '#34a853';
    setTimeout(() => {
      el.style.transition = 'all 0.5s ease';
      el.style.boxShadow = orig.boxShadow;
      el.style.borderColor = orig.borderColor;
    }, 2000);
  }

  function showBadge(count, label) {
    const existing = document.getElementById('__rf-badge');
    if (existing) existing.remove();

    if (!document.getElementById('__rf-style')) {
      const s = document.createElement('style');
      s.id = '__rf-style';
      s.textContent = `
        @keyframes __rfIn { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:none } }
        @keyframes __rfOut { from { opacity:1 } to { opacity:0; transform:translateY(-10px) } }
      `;
      document.head.appendChild(s);
    }

    const badge = document.createElement('div');
    badge.id = '__rf-badge';
    badge.innerHTML = `<span style="font-size:20px;margin-right:6px">&#10003;</span> ${label || '已填写'} ${count} 个字段`;
    badge.style.cssText = `
      position:fixed;top:20px;right:20px;z-index:2147483647;
      background:linear-gradient(135deg,#34a853,#2d8f47);color:#fff;
      padding:12px 24px;border-radius:12px;font:600 14px/-apple-system,sans-serif;
      box-shadow:0 4px 20px rgba(52,168,83,0.3);animation:__rfIn .3s ease;
      display:flex;align-items:center;pointer-events:none;
    `;
    document.body.appendChild(badge);
    setTimeout(() => {
      badge.style.animation = '__rfOut .3s ease forwards';
      setTimeout(() => badge.remove(), 300);
    }, 2500);
  }

  // ================================================================
  // SECTION 9: ELEMENT COLLECTION
  // ================================================================

  function isVisible(el) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed' && getComputedStyle(el).position !== 'sticky') return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  }

  function getAllFormElements() {
    const els = [];
    document.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type !== 'hidden' && !el.disabled && isVisible(el)) els.push(el);
    });
    // contenteditable in form context
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      if (isVisible(el) && el.closest('form, [class*="form"], [class*="edit"]')) els.push(el);
    });
    return els;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Group form elements by their nearest common container
  function groupByContainer(elements) {
    const containerMap = new Map();

    for (const el of elements) {
      // Find the nearest "card" or "block" container
      const container = el.closest(
        '.entry-card, .card, .block, .panel, .item, .section-item, ' +
        '.el-card, .ant-card, .experience-item, .edu-item, .work-item, ' +
        '[class*="experience"], [class*="entry"], [class*="record"], ' +
        '[class*="item-content"], [class*="form-block"], [class*="resume-block"]'
      ) || el.closest('form, .form-group, .form-item')?.parentElement;

      const key = container || 'root';
      if (!containerMap.has(key)) containerMap.set(key, []);
      containerMap.get(key).push(el);
    }

    return Array.from(containerMap.values());
  }

  // ================================================================
  // SECTION 11: SCAN
  // ================================================================

  function scanForm() {
    const elements = getAllFormElements();
    const fields = [];
    const seen = new Set();

    for (const el of elements) {
      if (el.type === 'radio') continue;
      const key = matchField(el);
      const ids = getIdentifiers(el);
      const mainId = ids.length > 0 ? ids[0].t : '(unknown)';

      if (key && !seen.has(key)) {
        seen.add(key);
        fields.push({ label: FIELD_LABELS[key] || key, matched: true, key, identifier: mainId });
      } else if (!key && ids.length > 0) {
        const lbl = ids.find(i => i.s === 'label' || i.s === 'parent-label');
        if (lbl) fields.push({ label: lbl.t.substring(0, 15), matched: false, key: null, identifier: mainId });
      }
    }
    return fields;
  }

  // ================================================================
  // SECTION 12: PAGE INFO EXTRACTION (for application history)
  // ================================================================

  function extractPageInfo() {
    const info = { company: '', job: '' };

    // 1. Try Open Graph / meta tags
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const t = ogTitle.getAttribute('content') || '';
      // Pattern: "岗位-公司" or "公司-岗位"
      const parts = t.split(/[-–—|_]/);
      if (parts.length >= 2) {
        info.job = parts[0].trim().substring(0, 40);
        info.company = parts[1].trim().substring(0, 40);
      }
    }
    if (ogSiteName && !info.company) {
      info.company = (ogSiteName.getAttribute('content') || '').substring(0, 40);
    }

    // 2. Try common job site selectors
    const companySelectors = [
      '.company-name', '.company_name', '.employer-name', '.corp-name',
      '[class*="company-name"]', '[class*="companyName"]',
      '.job-company', '.com-name', '.company', '.firm-name',
      'h2.name', '.recruiter-company',
      // Major Chinese job sites
      '.job-sec .cname', '.com_title', '.company-title-text',
    ];
    const jobSelectors = [
      '.job-name', '.job_name', '.position-name', '.job-title',
      '[class*="job-name"]', '[class*="jobName"]', '[class*="position-name"]',
      '.title-info h1', '.job h1', '.position h1',
      // Major Chinese job sites
      '.job-sec .name', '.pos-title', '.position-title',
    ];

    if (!info.company) {
      for (const sel of companySelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          info.company = el.textContent.trim().substring(0, 40);
          break;
        }
      }
    }

    if (!info.job) {
      for (const sel of jobSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          info.job = el.textContent.trim().substring(0, 40);
          break;
        }
      }
    }

    // 3. Try h1 as job title fallback
    if (!info.job) {
      const h1 = document.querySelector('h1');
      if (h1) info.job = h1.textContent.trim().substring(0, 40);
    }

    // 4. Fallback to page title parsing
    if (!info.company || !info.job) {
      const title = document.title;
      // Common patterns: "岗位名称_公司名称-招聘平台" or "公司-岗位"
      const cleaned = title.replace(/[-_|]?(招聘|求职|BOSS直聘|猎聘|智联|前程无忧|拉勾|牛客|实习僧|官网|校招|社招).*$/g, '');
      const parts = cleaned.split(/[-–—|_]/);
      if (parts.length >= 2) {
        if (!info.job) info.job = parts[0].trim().substring(0, 40);
        if (!info.company) info.company = parts[1].trim().substring(0, 40);
      } else if (!info.company) {
        info.company = cleaned.trim().substring(0, 40);
      }
    }

    return info;
  }

  // ================================================================
  // MESSAGE LISTENER
  // ================================================================

  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'fillForm') {
      (async () => {
        try {
          const count = await fillFormAsync(msg.data);
          // Start auto-fill for subsequent steps
          startAutoFill(msg.data);
          // Save snapshot after fill
          saveFormSnapshot();
          sendResponse({ success: count > 0, filledCount: count });
        } catch (err) {
          console.error('[Resume Filler]', err);
          sendResponse({ success: false, filledCount: 0, error: err.message });
        }
      })();
      return true;
    }
    if (msg.action === 'scanForm') {
      try {
        sendResponse({ success: true, fields: scanForm() });
      } catch (err) {
        sendResponse({ success: false, fields: [] });
      }
      return true;
    }
    if (msg.action === 'extractPageInfo') {
      try {
        sendResponse({ success: true, info: extractPageInfo() });
      } catch (err) {
        sendResponse({ success: false, info: {} });
      }
      return true;
    }
    if (msg.action === 'stopAutoFill') {
      stopAutoFill();
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'clearSiteData') {
      api.storage.local.remove(getSiteKey());
      sendResponse({ success: true });
      return true;
    }
    return true;
  });

  // Async wrapper for fill (needed for "add button" clicks with delays)
  async function fillFormAsync(data) {
    const elements = getAllFormElements();
    let filledCount = 0;
    const usedKeys = new Set();
    const filledEls = new Set();

    // Radio groups
    const radioGroups = {};
    elements.forEach(el => {
      if (el.tagName === 'INPUT' && el.type === 'radio' && el.name) {
        if (!radioGroups[el.name]) radioGroups[el.name] = [];
        radioGroups[el.name].push(el);
      }
    });
    for (const [, radios] of Object.entries(radioGroups)) {
      const key = matchField(radios[0]);
      if (key && data[key] && !usedKeys.has(key)) {
        if (setRadioValue(radios, data[key])) {
          radios.forEach(r => { if (r.checked) highlightField(r); filledEls.add(r); });
          usedKeys.add(key); filledCount++;
        }
      }
    }

    // Sort by position
    const sortedEls = elements
      .filter(el => !filledEls.has(el) && !(el.tagName === 'INPUT' && el.type === 'radio'))
      .sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
      });

    // Fill basic flat fields
    for (const el of sortedEls) {
      if (el.readOnly && el.type !== 'text') continue;
      const key = matchField(el);
      if (!key || usedKeys.has(key)) continue;

      // Skip multi-entry fields if we have array data
      if (['school','major','degree','gpa','eduStartDate','eduEndDate','eduDescription'].includes(key) && data.educations?.length > 0) continue;
      if (['company','jobTitle','workStartDate','workEndDate','jobDescription'].includes(key) && data.works?.length > 0) continue;
      if (['projectName','projectRole','projectDescription','projectLink'].includes(key) && data.projects?.length > 0) continue;
      if (['competitionName','awardLevel','awardDate','awardIssuer','awardDescription'].includes(key) && data.competitions?.length > 0) continue;
      if (['certName','certDate','certIssuer','certNo'].includes(key) && data.certificates?.length > 0) continue;

      const value = data[key];
      if (!value) continue;
      if (setFieldValue(el, value)) { highlightField(el); usedKeys.add(key); filledCount++; }
    }

    // Fill multi-entry sections
    filledCount += await fillMultiEntriesAsync(data);

    if (filledCount > 0) showBadge(filledCount);
    return filledCount;
  }

  async function fillMultiEntriesAsync(data) {
    let count = 0;
    const sections = {
      education: data.educations || [],
      work: data.works || [],
      project: data.projects || [],
      competition: data.competitions || [],
      certificate: data.certificates || [],
    };
    const fieldMaps = {
      education: { school:'school', degree:'degree', major:'major', gpa:'gpa', startDate:'eduStartDate', endDate:'eduEndDate', description:'eduDescription' },
      work: { company:'company', jobTitle:'jobTitle', startDate:'workStartDate', endDate:'workEndDate', description:'jobDescription' },
      project: { projectName:'projectName', role:'projectRole', startDate:'workStartDate', endDate:'workEndDate', description:'projectDescription', link:'projectLink' },
      competition: { competitionName:'competitionName', awardLevel:'awardLevel', awardDate:'awardDate', issuer:'awardIssuer', description:'awardDescription' },
      certificate: { certName:'certName', certDate:'certDate', certIssuer:'certIssuer', certNo:'certNo' },
    };

    for (const [sectionType, entries] of Object.entries(sections)) {
      if (entries.length === 0) continue;
      const fmap = fieldMaps[sectionType];

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // Re-scan elements each time (DOM may have changed)
        const allEls = getAllFormElements();
        const sectionEls = allEls.filter(el => {
          const sec = detectSection(el);
          return sec === sectionType || (sectionType === 'work' && sec === 'intern');
        });

        let containers = groupByContainer(sectionEls);
        let container = containers[i];

        // Need to click "add" if no container for this entry
        if (!container && i > 0) {
          const sectionRoot = sectionEls[0]?.closest('[class*="section"], [class*="block"], [class*="panel"], form') || document.body;
          const addBtn = findAddButton(sectionRoot, sectionType);
          if (addBtn) {
            addBtn.click();
            await sleep(500);
            // Re-scan
            const newEls = getAllFormElements().filter(el => {
              const sec = detectSection(el);
              return sec === sectionType || (sectionType === 'work' && sec === 'intern');
            });
            containers = groupByContainer(newEls);
            container = containers[i];
          }
        }

        // If still no section-specific container, fill as flat
        if (!container && sectionEls.length === 0 && i === 0) {
          for (const [entryField, matcherKey] of Object.entries(fmap)) {
            if (!matcherKey || !entry[entryField]) continue;
            for (const el of allEls) {
              const key = matchField(el);
              if (key === matcherKey) {
                if (setFieldValue(el, entry[entryField])) { highlightField(el); count++; }
                break;
              }
            }
          }
          continue;
        }

        if (!container) continue;

        for (const [entryField, matcherKey] of Object.entries(fmap)) {
          if (!matcherKey || !entry[entryField]) continue;
          for (const el of container) {
            const key = matchField(el);
            if (key === matcherKey) {
              if (setFieldValue(el, entry[entryField])) { highlightField(el); count++; }
              break;
            }
          }
        }
      }
    }

    return count;
  }

  // ================================================================
  // SECTION 12: AUTO-FILL ON STEP CHANGE (MutationObserver)
  // ================================================================

  let _autoFillData = null;
  let _autoFillTimer = null;
  let _lastFilledSnapshot = '';

  function startAutoFill(data) {
    _autoFillData = data;
    _lastFilledSnapshot = getFormSnapshot();

    if (_autoFillObserver) _autoFillObserver.disconnect();
    _autoFillObserver = new MutationObserver(() => {
      if (!_autoFillData) return;
      // Debounce: wait for DOM to stabilize
      clearTimeout(_autoFillTimer);
      _autoFillTimer = setTimeout(async () => {
        const snap = getFormSnapshot();
        if (snap === _lastFilledSnapshot || snap === '') return;
        _lastFilledSnapshot = snap;
        const count = await fillFormAsync(_autoFillData);
        if (count > 0) {
          showBadge(count, '自动填写');
          saveFormSnapshot();
        }
      }, 800);
    });
    _autoFillObserver.observe(document.body, {
      childList: true, subtree: true, attributes: false,
    });
  }

  function stopAutoFill() {
    _autoFillData = null;
    if (_autoFillObserver) { _autoFillObserver.disconnect(); _autoFillObserver = null; }
    clearTimeout(_autoFillTimer);
  }

  let _autoFillObserver = null;

  // Snapshot: a fingerprint of current form fields to detect step changes
  function getFormSnapshot() {
    const els = getAllFormElements();
    return els.map(el => {
      const r = el.getBoundingClientRect();
      return `${el.tagName}:${el.type||''}:${(el.name||el.id||'').substring(0,20)}:${Math.round(r.top)}`;
    }).join('|');
  }

  // ================================================================
  // SECTION 13: FORM DATA PERSISTENCE PER SITE
  // ================================================================

  function getSiteKey() {
    // Use origin + pathname (without query/hash) as key
    return `formData_${location.origin}${location.pathname}`;
  }

  function saveFormSnapshot() {
    try {
      const els = getAllFormElements();
      const snapshot = {};
      els.forEach((el, i) => {
        const id = el.id || el.name || `__idx_${i}_${el.type || el.tagName}`;
        if (el.tagName === 'SELECT') {
          snapshot[id] = el.value;
        } else if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) snapshot[id] = el.value || 'on';
        } else if (el.contentEditable === 'true') {
          snapshot[id] = el.innerHTML;
        } else {
          snapshot[id] = el.value;
        }
      });
      const key = getSiteKey();
      api.storage.local.set({ [key]: { data: snapshot, time: Date.now() } });
    } catch (e) { /* ignore */ }
  }

  function restoreFormSnapshot() {
    const key = getSiteKey();
    api.storage.local.get(key, (result) => {
      const saved = result[key];
      if (!saved || !saved.data) return;
      // Expire after 7 days
      if (Date.now() - saved.time > 7 * 24 * 3600 * 1000) {
        api.storage.local.remove(key);
        return;
      }
      const els = getAllFormElements();
      let restored = 0;
      els.forEach((el, i) => {
        const id = el.id || el.name || `__idx_${i}_${el.type || el.tagName}`;
        const val = saved.data[id];
        if (val === undefined || val === '') return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.value === val || val === 'on') { el.checked = true; restored++; }
        } else if (el.contentEditable === 'true') {
          if (!el.innerHTML.trim()) { el.innerHTML = val; restored++; }
        } else if (el.tagName === 'SELECT') {
          el.value = val; restored++;
        } else {
          if (!el.value.trim()) {
            setFieldValue(el, val);
            restored++;
          }
        }
      });
      if (restored > 0) showBadge(restored, '已恢复');
    });
  }

  // Save form data periodically when user is interacting
  let _saveDebounce = null;
  document.addEventListener('input', () => {
    clearTimeout(_saveDebounce);
    _saveDebounce = setTimeout(saveFormSnapshot, 2000);
  }, true);

  // On page load, try to restore saved form data
  if (document.readyState === 'complete') {
    setTimeout(restoreFormSnapshot, 500);
  } else {
    window.addEventListener('load', () => setTimeout(restoreFormSnapshot, 500));
  }

})();