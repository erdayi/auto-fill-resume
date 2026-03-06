/**
 * Local Resume Parser — 纯本地规则解析，无需 API
 * 策略：先识别板块标题，再在各板块内用正则提取字段
 */

// ============ Section Detection ============

const SECTION_PATTERNS = {
  basic:       /^[#\s]*(个人信息|基本信息|基本资料|个人简介|个人资料|personal\s*info)/i,
  education:   /^[#\s]*(教育经历|教育背景|学历|学习经历|education)/i,
  work:        /^[#\s]*(工作经历|工作经验|职业经历|employment|work\s*experience)/i,
  intern:      /^[#\s]*(实习经历|实习经验|实习|internship)/i,
  project:     /^[#\s]*(项目经历|项目经验|项目|project)/i,
  competition: /^[#\s]*(获奖|荣誉|奖项|竞赛|获奖情况|获奖经历|awards|honors)/i,
  certificate: /^[#\s]*(证书|资格|资质|certif)/i,
  skill:       /^[#\s]*(专业技能|技能|技术栈|技能特长|skills)/i,
  evaluation:  /^[#\s]*(自我评价|自我介绍|个人总结|自评|summary|about)/i,
  intention:   /^[#\s]*(求职意向|职业意向|求职目标|job\s*objective|career\s*objective)/i,
};

function splitIntoSections(text) {
  const lines = text.split(/\n/);
  const sections = [];
  let current = { type: 'basic', lines: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matched = false;
    for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(trimmed)) {
        if (current.lines.length > 0) sections.push(current);
        current = { type, lines: [] };
        matched = true;
        break;
      }
    }
    if (!matched) current.lines.push(trimmed);
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

// ============ Field Extraction Patterns ============

const RE = {
  phone:    /1[3-9]\d{9}/,
  email:    /[\w.+-]+@[\w-]+\.[\w.]+/,
  idCard:   /\d{17}[\dXx]/,
  date:     /(\d{4})[.\-/年](\d{1,2})[.\-/月]?/g,
  dateRange:/(\d{4})[.\-/年](\d{1,2})[.\-/月]?\s*[-–—~至到]\s*(\d{4})?[.\-/年]?(\d{1,2})?[.\-/月]?/,
  gpa:      /(?:GPA|绩点|成绩)[：:\s]*(\d+\.?\d*\s*[/／]\s*\d+\.?\d*|\d+\.\d+)/i,
};

const DEGREE_KEYWORDS = [
  ['博士', '博士'], ['硕士', '硕士'], ['研究生', '硕士'],
  ['本科', '本科'], ['学士', '本科'], ['大专', '大专'], ['专科', '大专'],
  ['高中', '高中'], ['中专', '中专'],
];

const GENDER_KEYWORDS = { '男': '男', '女': '女', 'male': '男', 'female': '女' };

const POLITICAL_KEYWORDS = ['中共党员', '中共预备党员', '共青团员', '群众', '民主党派'];

const ETHNICITY_LIST = ['汉族','回族','藏族','维吾尔族','苗族','彝族','壮族','布依族','满族','侗族','土家族','蒙古族','朝鲜族'];

// ============ Main Parse Function ============

function parseResumeLocal(text) {
  const data = {
    name: '', gender: '', birthday: '', idCard: '', phone: '', email: '',
    city: '', address: '', ethnicity: '', nationality: '', hometown: '',
    hukou: '', height: '', weight: '', politicalStatus: '', maritalStatus: '',
    expectedJob: '', expectedSalary: '', workYears: '', industry: '',
    skills: '', englishLevel: '', englishScore: '', otherLanguage: '',
    computerLevel: '', selfEvaluation: '', website: '', wechat: '', qq: '', linkedin: '',
    educations: [], works: [], projects: [], competitions: [], certificates: [],
  };

  // Phase 1: Extract globally detectable fields from full text
  extractGlobalFields(text, data);

  // Phase 2: Split into sections and parse each
  const sections = splitIntoSections(text);
  for (const section of sections) {
    const content = section.lines.join('\n');
    switch (section.type) {
      case 'basic':     parseBasicSection(content, data); break;
      case 'education': parseEducationSection(content, data); break;
      case 'work':      parseWorkSection(content, data, '全职'); break;
      case 'intern':    parseWorkSection(content, data, '实习'); break;
      case 'project':   parseProjectSection(content, data); break;
      case 'competition': parseCompetitionSection(content, data); break;
      case 'certificate': parseCertificateSection(content, data); break;
      case 'skill':     data.skills = data.skills || content.replace(/\n/g, '，'); break;
      case 'evaluation': data.selfEvaluation = data.selfEvaluation || content; break;
      case 'intention': parseIntentionSection(content, data); break;
    }
  }

  // Phase 3: Name heuristic (first line of resume if short)
  if (!data.name) {
    const firstLine = text.trim().split('\n')[0].trim();
    if (firstLine.length >= 2 && firstLine.length <= 5 && /^[\u4e00-\u9fff]+$/.test(firstLine)) {
      data.name = firstLine;
    }
  }

  return data;
}

function extractGlobalFields(text, data) {
  // Phone
  const phoneMatch = text.match(RE.phone);
  if (phoneMatch) data.phone = phoneMatch[0];

  // Email
  const emailMatch = text.match(RE.email);
  if (emailMatch) data.email = emailMatch[0];

  // ID Card
  const idMatch = text.match(RE.idCard);
  if (idMatch) data.idCard = idMatch[0];

  // GitHub/Website
  const urlMatch = text.match(/https?:\/\/github\.com\/[\w-]+|https?:\/\/[\w.-]+\.[\w]+\/[\w-]*/i);
  if (urlMatch) data.website = urlMatch[0];

  // English level
  if (/CET-?6|六级|CET6/i.test(text)) data.englishLevel = 'CET-6';
  else if (/CET-?4|四级|CET4/i.test(text)) data.englishLevel = 'CET-4';
  else if (/TEM-?8|专八/i.test(text)) data.englishLevel = 'TEM-8';
  else if (/TEM-?4|专四/i.test(text)) data.englishLevel = 'TEM-4';
  else if (/雅思|IELTS/i.test(text)) data.englishLevel = 'IELTS';
  else if (/托福|TOEFL/i.test(text)) data.englishLevel = 'TOEFL';

  // English score
  const scoreMatch = text.match(/(?:CET-?[46]|四级|六级|雅思|IELTS|托福|TOEFL)[：:\s]*(\d+\.?\d*)/i);
  if (scoreMatch) data.englishScore = scoreMatch[1];

  // Computer level
  const compMatch = text.match(/计算机[^\n]*?(一级|二级|三级|四级|[一二三四]级)/);
  if (compMatch) data.computerLevel = compMatch[0].substring(0, 20);
}

function parseBasicSection(content, data) {
  const lines = content.split('\n');

  for (const line of lines) {
    // Name: "姓名：张三" or key-value patterns
    const nameMatch = line.match(/姓名[：:\s]+(.{2,5})/);
    if (nameMatch && !data.name) data.name = nameMatch[1].trim();

    // Gender
    for (const [kw, val] of Object.entries(GENDER_KEYWORDS)) {
      if (line.includes(kw)) { data.gender = data.gender || val; break; }
    }

    // Birthday
    const bdMatch = line.match(/(?:出生|生日|出生日期|生于)[：:\s]*(\d{4})[.\-/年](\d{1,2})[.\-/月](\d{1,2})?/);
    if (bdMatch) data.birthday = `${bdMatch[1]}-${bdMatch[2].padStart(2,'0')}${bdMatch[3] ? '-'+bdMatch[3].padStart(2,'0') : ''}`;

    // City
    const cityMatch = line.match(/(?:现居|所在城市|居住地|城市)[：:\s]+([\u4e00-\u9fff]{2,10})/);
    if (cityMatch) data.city = data.city || cityMatch[1];

    // Hometown
    const htMatch = line.match(/(?:籍贯|家乡)[：:\s]+([\u4e00-\u9fff]{2,15})/);
    if (htMatch) data.hometown = data.hometown || htMatch[1];

    // Hukou
    const hkMatch = line.match(/(?:户口|户籍)[：:\s]+([\u4e00-\u9fff]{2,15})/);
    if (hkMatch) data.hukou = data.hukou || hkMatch[1];

    // Political
    for (const p of POLITICAL_KEYWORDS) {
      if (line.includes(p)) { data.politicalStatus = data.politicalStatus || p; break; }
    }

    // Ethnicity
    for (const e of ETHNICITY_LIST) {
      if (line.includes(e)) { data.ethnicity = data.ethnicity || e; break; }
    }

    // Height/Weight
    const heightMatch = line.match(/身高[：:\s]*(\d{2,3})\s*(?:cm|厘米)?/i);
    if (heightMatch) data.height = heightMatch[1];
    const weightMatch = line.match(/体重[：:\s]*(\d{2,3})\s*(?:kg|公斤)?/i);
    if (weightMatch) data.weight = weightMatch[1];

    // WeChat
    const wxMatch = line.match(/微信[：:\s]*([\w\-]+)/);
    if (wxMatch) data.wechat = data.wechat || wxMatch[1];

    // QQ
    const qqMatch = line.match(/QQ[：:\s]*(\d{5,12})/i);
    if (qqMatch) data.qq = data.qq || qqMatch[1];
  }
}

// ============ Entry Splitting ============

// Split section content into individual entries by date ranges or blank-line-like separators
function splitEntries(content) {
  const lines = content.split('\n');
  const entries = [];
  let current = [];

  for (const line of lines) {
    // New entry starts with a date range or a company/school name pattern
    const isNewEntry = RE.dateRange.test(line) || /^\d{4}[.\-/年]/.test(line);
    const isHeader = /^[A-Z\u4e00-\u9fff]/.test(line) && line.length < 60 && (
      /\d{4}/.test(line) || // Has a year
      /[·|｜\-–—]/.test(line) // Has separator
    );

    if ((isNewEntry || isHeader) && current.length > 0) {
      entries.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) entries.push(current.join('\n'));
  return entries;
}

function extractDateRange(text) {
  // Explicit "至今/present/目前" detection
  const presentMatch = text.match(/(\d{4})[.\-/年](\d{1,2})[.\-/月]?\s*[-–—~至到]\s*(至今|present|目前|现在|now|在职)/i);
  if (presentMatch) {
    const start = `${presentMatch[1]}-${presentMatch[2].padStart(2,'0')}`;
    return { startDate: start, endDate: '至今' };
  }
  const m = text.match(/(\d{4})[.\-/年](\d{1,2})[.\-/月]?\s*[-–—~至到]\s*(?:(\d{4})[.\-/年])?(\d{1,2})?[.\-/月]?|(\d{4})[.\-/年](\d{1,2})/);
  if (!m) return { startDate: '', endDate: '' };
  if (m[1]) {
    const start = `${m[1]}-${m[2].padStart(2,'0')}`;
    const end = m[3] ? `${m[3]}-${(m[4]||'01').padStart(2,'0')}` : (m[4] ? `${m[1]}-${m[4].padStart(2,'0')}` : '');
    return { startDate: start, endDate: end || '至今' };
  }
  if (m[5]) return { startDate: `${m[5]}-${m[6].padStart(2,'0')}`, endDate: '' };
  return { startDate: '', endDate: '' };
}

// ============ Section Parsers ============

function parseEducationSection(content, data) {
  const entries = splitEntries(content);
  for (const entry of entries) {
    const edu = { school: '', degree: '', major: '', gpa: '', startDate: '', endDate: '', description: '' };

    const dates = extractDateRange(entry);
    edu.startDate = dates.startDate;
    edu.endDate = dates.endDate;

    // Degree
    for (const [kw, val] of DEGREE_KEYWORDS) {
      if (entry.includes(kw)) { edu.degree = val; break; }
    }

    // GPA
    const gpaMatch = entry.match(RE.gpa);
    if (gpaMatch) edu.gpa = gpaMatch[1];

    const lines = entry.split('\n');
    for (const line of lines) {
      // School: usually the first recognizable entity or contains "大学/学院/学校"
      if (!edu.school && /大学|学院|学校|University|College|Institute/i.test(line)) {
        // Extract school name: remove dates and degree info
        edu.school = line.replace(/\d{4}[.\-/年]\d{1,2}[.\-/月]?/g, '').replace(/[-–—~至到]/g, '')
          .replace(/(本科|硕士|博士|学士|大专|研究生)/g, '').replace(/[·|｜]/g, ' ').trim().substring(0, 30);
      }
      // Major
      if (!edu.major) {
        const majorMatch = line.match(/(?:专业[：:\s]*|major[：:\s]*)([\u4e00-\u9fffa-zA-Z\s]+)/i);
        if (majorMatch) edu.major = majorMatch[1].trim().substring(0, 20);
      }
    }

    // If no school found from keywords, use first line (cleaned)
    if (!edu.school && lines.length > 0) {
      edu.school = lines[0].replace(/\d{4}[.\-/年].*/g, '').replace(/[·|｜\-–—]/g, ' ').trim().substring(0, 30);
    }

    // Major fallback: look for text after school name separated by ·/|/-
    if (!edu.major) {
      const parts = lines[0]?.split(/[·|｜\-–—]/) || [];
      if (parts.length >= 2) {
        const candidate = parts.find(p => !RE.dateRange.test(p) && !/大学|学院|本科|硕士|博士/.test(p) && p.trim().length > 1);
        if (candidate) edu.major = candidate.trim().substring(0, 20);
      }
    }

    // Description: remaining lines
    const descLines = lines.slice(1).filter(l => !RE.dateRange.test(l) && l.length > 5);
    if (descLines.length > 0) edu.description = descLines.join('；').substring(0, 200);

    if (edu.school || edu.degree) data.educations.push(edu);
  }
}

function parseWorkSection(content, data, defaultType) {
  const entries = splitEntries(content);
  for (const entry of entries) {
    const work = { company: '', jobTitle: '', workType: defaultType, startDate: '', endDate: '', description: '' };

    const dates = extractDateRange(entry);
    work.startDate = dates.startDate;
    work.endDate = dates.endDate;

    if (/实习/.test(entry)) work.workType = '实习';
    if (/兼职/.test(entry)) work.workType = '兼职';

    const lines = entry.split('\n');
    // First line usually: "公司名 · 职位 · 日期" or similar
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/\d{4}[.\-/年].*/g, '').trim();
      const parts = firstLine.split(/[·|｜\-–—]/);
      if (parts.length >= 2) {
        work.company = parts[0].trim().substring(0, 30);
        work.jobTitle = parts[1].trim().replace(/(实习|兼职|全职)/g, '').trim().substring(0, 20);
      } else if (parts.length === 1) {
        work.company = parts[0].trim().substring(0, 30);
      }
    }

    // Job title fallback
    if (!work.jobTitle) {
      for (const line of lines) {
        const jtMatch = line.match(/(?:职位|岗位|职务|title)[：:\s]*([\u4e00-\u9fffa-zA-Z\s]+)/i);
        if (jtMatch) { work.jobTitle = jtMatch[1].trim().substring(0, 20); break; }
      }
    }

    // Description
    const descLines = lines.slice(1).filter(l => !RE.dateRange.test(l) && l.length > 3);
    if (descLines.length > 0) work.description = descLines.join('\n').substring(0, 500);

    if (work.company || work.jobTitle) data.works.push(work);
  }
}

function parseProjectSection(content, data) {
  const entries = splitEntries(content);
  for (const entry of entries) {
    const proj = { projectName: '', role: '', startDate: '', endDate: '', description: '', link: '' };

    const dates = extractDateRange(entry);
    proj.startDate = dates.startDate;
    proj.endDate = dates.endDate;

    // URL
    const urlMatch = entry.match(/https?:\/\/[\w.\-/]+/);
    if (urlMatch) proj.link = urlMatch[0];

    const lines = entry.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/\d{4}[.\-/年].*/g, '').trim();
      const parts = firstLine.split(/[·|｜\-–—]/);
      proj.projectName = parts[0].trim().substring(0, 30);
      if (parts.length >= 2) proj.role = parts[1].trim().substring(0, 20);
    }

    // Role fallback
    if (!proj.role) {
      for (const line of lines) {
        const roleMatch = line.match(/(?:角色|担任|role)[：:\s]*([\u4e00-\u9fffa-zA-Z\s]+)/i);
        if (roleMatch) { proj.role = roleMatch[1].trim().substring(0, 20); break; }
      }
    }

    const descLines = lines.slice(1).filter(l => !RE.dateRange.test(l) && !l.startsWith('http') && l.length > 3);
    if (descLines.length > 0) proj.description = descLines.join('\n').substring(0, 500);

    if (proj.projectName) data.projects.push(proj);
  }
}

function parseCompetitionSection(content, data) {
  const entries = splitEntries(content);
  for (const entry of entries) {
    const comp = { competitionName: '', awardLevel: '', awardDate: '', issuer: '', description: '' };

    const dates = extractDateRange(entry);
    comp.awardDate = dates.startDate;

    const levels = ['国家级','省级','市级','校级','一等奖','二等奖','三等奖','金奖','银奖','铜奖','特等奖','优秀奖','金牌','银牌','铜牌'];
    for (const lv of levels) {
      if (entry.includes(lv)) { comp.awardLevel = lv; break; }
    }

    const lines = entry.split('\n');
    comp.competitionName = lines[0].replace(/\d{4}[.\-/年].*/g, '').replace(/[·|｜\-–—]/g, ' ').trim().substring(0, 40);

    const descLines = lines.slice(1).filter(l => l.length > 3);
    if (descLines.length > 0) comp.description = descLines.join('；').substring(0, 200);

    if (comp.competitionName) data.competitions.push(comp);
  }
}

function parseCertificateSection(content, data) {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim().length < 3) continue;
    const cert = { certName: '', certDate: '', certIssuer: '', certNo: '' };
    const dates = extractDateRange(line);
    cert.certDate = dates.startDate;
    cert.certName = line.replace(/\d{4}[.\-/年]\d{1,2}[.\-/月]?/g, '').replace(/[-–—~至到]/g, '').trim().substring(0, 30);
    if (cert.certName) data.certificates.push(cert);
  }
}

function parseIntentionSection(content, data) {
  const lines = content.split('\n');
  for (const line of lines) {
    const jobMatch = line.match(/(?:期望职位|意向职位|目标岗位|职位)[：:\s]*([\u4e00-\u9fffa-zA-Z/\s]+)/);
    if (jobMatch) data.expectedJob = data.expectedJob || jobMatch[1].trim();

    const salaryMatch = line.match(/(?:期望薪资|薪资|薪酬)[：:\s]*(.+)/);
    if (salaryMatch) data.expectedSalary = data.expectedSalary || salaryMatch[1].trim();

    const industryMatch = line.match(/(?:行业|期望行业)[：:\s]*([\u4e00-\u9fffa-zA-Z/\s]+)/);
    if (industryMatch) data.industry = data.industry || industryMatch[1].trim();
  }
}
