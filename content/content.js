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
      '.t-select', '.n-select', '.ant-cascader', '[class*="cascader"]',
      '[class*="custom-select"]', '[class*="dropdown"]',
    ];

    const container = el.closest(customSelectors.join(','));
    if (!container) return false;

    // Click to open dropdown
    const trigger = container.querySelector('input, .el-input__inner, .ant-select-selection-item, .ant-select-selection-search-input, .ant-cascader-input');
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
        const normalize = s => s.replace(/[省市区县自治区自治州特别行政区地区盟旗]/g, '').trim();
        const normValue = normalize(value);
        const optionSelectors = [
          '.el-select-dropdown__item', '.ant-select-item-option',
          '.ivu-select-item', '.arco-select-option',
          '.ant-cascader-menu-item', '[class*="cascader-node"]',
          '[class*="option"]', '[role="option"]', 'li',
        ];

        const dropdown = document.querySelector(
          '.el-select-dropdown, .ant-select-dropdown, .ivu-select-dropdown, ' +
          '.arco-trigger-popup, .ant-cascader-dropdown, .ant-cascader-menus, ' +
          '[class*="dropdown-menu"], [class*="cascader-menu"]'
        );

        if (dropdown) {
          const options = dropdown.querySelectorAll(optionSelectors.join(','));
          for (const opt of options) {
            const optText = opt.textContent.trim();
            const normOpt = normalize(optText);
            if (optText === value || optText.includes(value) || value.includes(optText) ||
                (normOpt && normValue && (normOpt === normValue || normOpt.includes(normValue) || normValue.includes(normOpt)))) {
              opt.click();
              // For cascading: if this opens a sub-menu, try to match next level
              const parts = value.split(/[省市区\/\-]/).filter(Boolean);
              if (parts.length > 1) {
                setTimeout(() => clickCascaderLevel(parts.slice(1), 0), 300);
              }
              return;
            }
          }
        }
      }, 200);

      return true;
    }
    return false;
  }

  // Click through cascader levels (province → city → district)
  function clickCascaderLevel(remainingParts, attempt) {
    if (!remainingParts.length || attempt > 5) return;
    const normalize = s => s.replace(/[省市区县自治区自治州特别行政区地区盟旗]/g, '').trim();
    const target = normalize(remainingParts[0]);
    const menus = document.querySelectorAll(
      '.ant-cascader-menu, .el-cascader-menu, [class*="cascader-menu"]'
    );
    // Find the last (rightmost) menu panel
    const lastMenu = menus[menus.length - 1];
    if (!lastMenu) return;
    const items = lastMenu.querySelectorAll('li, [class*="cascader-node"], [class*="menu-item"]');
    for (const item of items) {
      const t = normalize(item.textContent.trim());
      if (t === target || t.includes(target) || target.includes(t)) {
        item.click();
        if (remainingParts.length > 1) {
          setTimeout(() => clickCascaderLevel(remainingParts.slice(1), 0), 300);
        }
        return;
      }
    }
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
    // Normalize: strip trailing 省/市/区/县/自治区 etc. for flexible matching
    const normalize = s => s.replace(/[省市区县自治区自治州特别行政区地区盟旗]/g, '').trim();
    const normVal = normalize(value);

    const match = opts.find(o => o.value === value) ||
                  opts.find(o => o.textContent.trim() === value) ||
                  opts.find(o => o.value && value.includes(o.value) && o.value !== '') ||
                  opts.find(o => { const t = o.textContent.trim(); return t && (value.includes(t) || t.includes(value)) && t !== ''; }) ||
                  // Fuzzy: strip province/city suffixes for matching (e.g. "湖南省" matches "湖南")
                  opts.find(o => { const t = normalize(o.textContent.trim()); return t && normVal && (t === normVal || normVal.includes(t) || t.includes(normVal)) && t !== ''; });
    if (match) {
      el.value = match.value;
      triggerEvents(el);
      // For cascading selects (province→city→district), trigger change and wait for next level
      handleCascadeNext(el, value);
      return true;
    }
    // Try custom select handler
    return handleCustomSelect(el, value);
  }

  // Handle cascading select chains (province → city → district)
  function handleCascadeNext(el, fullValue) {
    // If the value contains multiple levels separated by common delimiters
    const parts = fullValue.split(/[省市区\/\-]/).filter(Boolean);
    if (parts.length <= 1) return;

    // Wait for cascading selects to populate after change event
    setTimeout(() => {
      const container = el.closest('.form-group, .form-item, .el-form-item, .ant-form-item, tr, .form-row, [class*="cascad"]') ||
                        el.parentElement?.parentElement;
      if (!container) return;
      const selects = container.querySelectorAll('select');
      const customSelects = container.querySelectorAll('.el-select, .ant-select, .ant-cascader, [class*="cascad"]');

      // Find the next sibling select and try to set it
      const allSelects = Array.from(selects);
      const myIdx = allSelects.indexOf(el);
      if (myIdx >= 0 && myIdx + 1 < allSelects.length && parts.length > 1) {
        const nextSelect = allSelects[myIdx + 1];
        setTimeout(() => setSelectValue(nextSelect, parts.slice(1).join('')), 300);
      }
    }, 300);
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

    // Layer 1: JSON-LD structured data (most reliable)
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const ld = JSON.parse(script.textContent);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item['@type'] === 'JobPosting') {
            if (!info.job && item.title) info.job = item.title.substring(0, 40);
            const org = item.hiringOrganization;
            if (!info.company && org) info.company = (typeof org === 'string' ? org : org.name || '').substring(0, 40);
          }
        }
      } catch(e) {}
    });
    if (info.company && info.job) return info;

    // Layer 2: Meta tags (Open Graph / itemprop)
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const metaCompany = document.querySelector('meta[itemprop="hiringOrganization"], meta[name="company"]');
    const metaJob = document.querySelector('meta[itemprop="title"], meta[name="position"]');

    if (metaCompany && !info.company) info.company = (metaCompany.getAttribute('content') || '').substring(0, 40);
    if (metaJob && !info.job) info.job = (metaJob.getAttribute('content') || '').substring(0, 40);

    if (ogTitle && (!info.company || !info.job)) {
      const t = ogTitle.getAttribute('content') || '';
      const parts = t.split(/[-–—|_]/);
      if (parts.length >= 2) {
        if (!info.job) info.job = parts[0].trim().substring(0, 40);
        if (!info.company) info.company = parts[1].trim().substring(0, 40);
      }
    }
    if (ogSiteName && !info.company) {
      info.company = (ogSiteName.getAttribute('content') || '').substring(0, 40);
    }

    // Layer 3: DOM selectors
    const companySelectors = [
      '.company-name', '.company_name', '.employer-name', '.corp-name',
      '[class*="company-name"]', '[class*="companyName"]',
      '.job-company', '.com-name', '.company', '.firm-name',
      'h2.name', '.recruiter-company',
      '.job-sec .cname', '.com_title', '.company-title-text',
      '.company-info .name', '.recruit-company', '.corp-info h2',
    ];
    const jobSelectors = [
      '.job-name', '.job_name', '.position-name', '.job-title',
      '[class*="job-name"]', '[class*="jobName"]', '[class*="position-name"]',
      '.title-info h1', '.job h1', '.position h1',
      '.job-sec .name', '.pos-title', '.position-title',
      '.job-info .title', '.recruit-title', '.post-name',
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

    // Layer 4: h1 fallback
    if (!info.job) {
      const h1 = document.querySelector('h1');
      if (h1) info.job = h1.textContent.trim().substring(0, 40);
    }

    // Layer 5: Page title parsing
    if (!info.company || !info.job) {
      const title = document.title;
      const platformPattern = /[-_|·—]?\s*(招聘|求职|官网|校招|社招|热招|急招|内推|直聘|网招|人才|careers?|jobs?|hiring|recruit).*$/gi;
      const knownPlatforms = /[-_|·—]\s*(BOSS直聘|猎聘|智联招聘|前程无忧|拉勾|牛客|实习僧|51job|zhaopin|liepin|lagou|脉脉|看准|大街|应届生|智联|58同城)\s*$/gi;
      const cleaned = title.replace(knownPlatforms, '').replace(platformPattern, '').trim();
      const parts = cleaned.split(/[-–—|_]/);
      if (parts.length >= 2) {
        if (!info.job) info.job = parts[0].trim().substring(0, 40);
        if (!info.company) info.company = parts[1].trim().substring(0, 40);
      } else if (!info.company) {
        info.company = cleaned.trim().substring(0, 40);
      }
    }

    // Mark if extraction is uncertain (for LLM fallback)
    info._needsLLM = !info.company || !info.job;
    if (info._needsLLM) {
      // Collect page text snippet for LLM to parse
      const snippetParts = [];
      document.querySelectorAll('h1,h2,h3,.breadcrumb,[class*="title"],[class*="info"]').forEach(el => {
        const t = el.textContent.trim();
        if (t.length > 2 && t.length < 100) snippetParts.push(t);
      });
      info._pageSnippet = snippetParts.slice(0, 15).join('\n');
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
  // Derive birthday/gender/province from ID card number
  function deriveFromIdCard(data) {
    const id = data.idCard;
    if (!id || id.length !== 18) return data;
    const enriched = { ...data };
    const y = id.substring(6, 10), m = id.substring(10, 12), d = id.substring(12, 14);
    if (!enriched.birthday && +y >= 1900 && +y <= 2100) {
      enriched.birthday = `${y}-${m}-${d}`;
    }
    const gc = parseInt(id.charAt(16), 10);
    if (!enriched.gender && !isNaN(gc)) enriched.gender = gc % 2 === 1 ? '男' : '女';
    const provMap = {
      '11':'北京','12':'天津','13':'河北','14':'山西','15':'内蒙古',
      '21':'辽宁','22':'吉林','23':'黑龙江','31':'上海','32':'江苏',
      '33':'浙江','34':'安徽','35':'福建','36':'江西','37':'山东',
      '41':'河南','42':'湖北','43':'湖南','44':'广东','45':'广西',
      '46':'海南','50':'重庆','51':'四川','52':'贵州','53':'云南',
      '54':'西藏','61':'陕西','62':'甘肃','63':'青海','64':'宁夏','65':'新疆',
    };
    const prov = provMap[id.substring(0, 2)];
    if (prov && !enriched.hometown) enriched.hometown = prov;
    if (prov && !enriched.hukou) enriched.hukou = prov;
    return enriched;
  }

  async function fillFormAsync(originalData) {
    // Enrich data: derive birthday/gender from ID card if available
    const data = deriveFromIdCard(originalData);
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

  // ================================================================
  // SECTION 14: AUTO-DETECT SUBMISSION
  // ================================================================

  const DEFAULT_SUBMIT_KEYWORDS = [
    '投递', '立即投递', '申请职位', '投简历', '申请', '提交申请', '一键投递',
    '立即申请', '我要投递', '确认投递', '投递简历', '确定投递', '马上投递',
    '投递岗位', '确认申请', '提交简历', '发送简历', '我感兴趣', '立即沟通',
    '打招呼', '极速投递', '投个简历', '简历投递', '快速申请',
    '预览并提交', '提交', '确认提交', '保存并提交', '立即提交',
    '提交申请表', '确认并提交', '投递该职位', '申请该职位',
    'submit', 'apply', 'apply now', 'submit application', 'quick apply',
  ];

  let _submitKeywords = [...DEFAULT_SUBMIT_KEYWORDS];

  // Load user custom keywords
  api.storage.local.get('submitKeywords', (result) => {
    if (result.submitKeywords && result.submitKeywords.length > 0) {
      _submitKeywords = [...DEFAULT_SUBMIT_KEYWORDS, ...result.submitKeywords];
    }
  });

  // Listen for keyword updates from popup
  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'updateSubmitKeywords') {
      _submitKeywords = [...DEFAULT_SUBMIT_KEYWORDS, ...(msg.keywords || [])];
      sendResponse({ success: true });
      return true;
    }
  });

  function isSubmitButton(el) {
    const tag = el.tagName;
    if (tag !== 'BUTTON' && tag !== 'A' && tag !== 'INPUT' && tag !== 'DIV' && tag !== 'SPAN') return false;
    const text = (el.textContent || el.value || '').trim().toLowerCase();
    if (text.length > 20) return false;
    return _submitKeywords.some(kw => text.includes(kw));
  }

  let _lastSubmitTime = 0;
  document.addEventListener('click', (e) => {
    // Check clicked element and its ancestors (up to 3 levels)
    let target = e.target;
    let found = false;
    for (let i = 0; i < 4 && target && target !== document.body; i++) {
      if (isSubmitButton(target)) { found = true; break; }
      target = target.parentElement;
    }
    if (!found) return;

    // Debounce: ignore rapid clicks
    if (Date.now() - _lastSubmitTime < 5000) return;
    _lastSubmitTime = Date.now();

    // Extract page info and send to background/popup
    const info = extractPageInfo();
    if (!info.company && !info.job) return;

    api.runtime.sendMessage({
      action: 'autoRecordSubmit',
      data: {
        company: info.company || '未知公司',
        job: info.job || '',
        url: location.href,
        date: Date.now(),
        status: '已投递',
        note: '',
        _needsLLM: info._needsLLM,
        _pageSnippet: info._pageSnippet || '',
      }
    });
  }, true);

  // ================================================================
  // SECTION 15: AUTO-DETECT EXISTING APPLICATION STATUS
  // ================================================================

  const STATUS_INDICATORS = [
    { keywords: ['已投递', '已申请', '投递成功', '申请成功', '简历已投', '已发送'], status: '已投递' },
    { keywords: ['面试中', '已安排面试', '面试邀请', '待面试', '笔试中', '测评中', '流程中'], status: '已面试' },
    { keywords: ['已录用', '录用通知', 'offer', '恭喜您', '已通过'], status: '已录用' },
    { keywords: ['已拒绝', '不合适', '未通过', '已淘汰', '不匹配'], status: '已拒绝' },
  ];

  function detectExistingStatus() {
    // Scan page for application status indicators
    const textEls = document.querySelectorAll(
      '[class*="status"], [class*="state"], [class*="result"], [class*="tag"], ' +
      '[class*="badge"], [class*="tip"], [class*="notice"], [class*="alert"], ' +
      '.delivery-status, .apply-status, .job-status'
    );

    for (const el of textEls) {
      if (!isVisible(el)) continue;
      const text = el.textContent.trim();
      if (text.length > 30) continue;
      for (const { keywords, status } of STATUS_INDICATORS) {
        if (keywords.some(kw => text.includes(kw))) {
          return status;
        }
      }
    }

    // Also check button states — disabled "已投递" button
    const btns = document.querySelectorAll('button[disabled], a.disabled, [class*="disabled"]');
    for (const btn of btns) {
      const text = (btn.textContent || '').trim();
      if (['已投递', '已申请', '已投', '已沟通'].some(kw => text.includes(kw))) {
        return '已投递';
      }
    }

    return null;
  }

  // On page load, auto-detect and record existing status
  function autoDetectAndRecord() {
    const status = detectExistingStatus();
    if (!status) return;

    const info = extractPageInfo();
    if (!info.company && !info.job) return;

    api.runtime.sendMessage({
      action: 'autoRecordSubmit',
      data: {
        company: info.company || '未知公司',
        job: info.job || '',
        url: location.href,
        date: Date.now(),
        status: status,
        note: '页面自动识别',
        _needsLLM: info._needsLLM,
        _pageSnippet: info._pageSnippet || '',
      }
    });
  }

  // Delay detection to let page finish rendering
  if (document.readyState === 'complete') {
    setTimeout(autoDetectAndRecord, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(autoDetectAndRecord, 1500));
  }

})();