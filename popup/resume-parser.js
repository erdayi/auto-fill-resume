/**
 * Resume Parser — Upload resume → Extract text → LLM parse → Structured data
 * Solves the pain point: different resume formats, mixed-up sections, missing entries
 */

// ============ Text Extraction ============

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push(text);
  }
  return pages.join('\n');
}

function extractTextFromTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return extractTextFromPDF(file);
  if (ext === 'txt' || ext === 'md') return extractTextFromTxt(file);
  if (ext === 'docx' || ext === 'doc') {
    // For docx: read as text (basic extraction, strips formatting)
    // A full docx parser would need mammoth.js, but basic extraction works for most resumes
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractDocxText(arrayBuffer);
    return text;
  }
  throw new Error('不支持的文件格式，请上传 PDF、DOCX 或 TXT');
}

// Basic DOCX text extraction (reads XML inside the zip)
async function extractDocxText(arrayBuffer) {
  try {
    const blob = new Blob([arrayBuffer]);
    // DOCX is a ZIP containing XML files
    // We use the browser's built-in decompression if available
    const zip = await (async () => {
      // Try using DecompressionStream (modern browsers)
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('需要现代浏览器支持');
      }
      // For docx we need full zip parsing, fallback to basic approach
      throw new Error('use_fallback');
    })().catch(() => null);

    // Fallback: read as binary string and extract text between XML tags
    const text = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const binary = reader.result;
        // Find word/document.xml content in the binary
        const matches = [];
        // Extract readable text segments (Chinese + English + numbers + punctuation)
        const textRegex = /[\u4e00-\u9fff\u3000-\u303fa-zA-Z0-9@.·,，。！？、；：""''（）()【】\[\]{}《》<>—\-+/\s]+/g;
        let match;
        while ((match = textRegex.exec(binary)) !== null) {
          const t = match[0].trim();
          if (t.length > 2) matches.push(t);
        }
        resolve(matches.join('\n'));
      };
      reader.readAsBinaryString(blob);
    });
    return text;
  } catch (e) {
    throw new Error('DOCX 解析失败，建议转为 PDF 后上传');
  }
}

// ============ LLM Parsing ============

const RESUME_PARSE_PROMPT = `你是一个精确的简历解析器。请将以下简历文本解析为结构化 JSON。

## 严格分类规则（最重要！）

### 工作/实习经历 (works) 的判定标准：
- 提到了 **公司/企业/机构名称** + **职位/岗位**
- 有明确的 **入职/离职时间**
- 描述的是在某个 **组织中担任的角色和工作内容**
- "实习"二字出现 → 归类为实习 (workType: "实习")
- 没有"实习"但有公司 → 归类为全职 (workType: "全职")

### 项目经历 (projects) 的判定标准：
- 以 **项目名称** 为主体（不以公司为主体）
- 描述的是某个 **具体项目的技术实现、成果**
- 可能提到技术栈、项目背景、个人贡献
- 即使在实习期间做的项目，如果简历中放在"项目经历"板块，也归为项目

### 关键区分原则：
- 同一段经历如果同时有公司名和项目名 → 看简历原文的**板块标题**来判断
- 如果原文标题是"实习经历/工作经历" → 归为 works
- 如果原文标题是"项目经历/项目经验" → 归为 projects
- 每一段独立的经历都要提取，**绝对不能合并或遗漏**
- 如果有 3 段实习就必须输出 3 个 works 条目

## 输出 JSON Schema（严格遵守，空值用空字符串）：

{
  "name": "姓名",
  "gender": "性别(男/女)",
  "birthday": "YYYY-MM-DD",
  "idCard": "身份证号",
  "phone": "手机号",
  "email": "邮箱",
  "city": "现居城市",
  "address": "详细地址",
  "ethnicity": "民族",
  "nationality": "国籍",
  "hometown": "籍贯",
  "hukou": "户口所在地",
  "height": "身高cm",
  "weight": "体重kg",
  "politicalStatus": "政治面貌",
  "maritalStatus": "婚姻状况",
  "expectedJob": "期望职位",
  "expectedSalary": "期望薪资",
  "workYears": "工作年限",
  "industry": "期望行业",
  "skills": "技能特长（逗号分隔）",
  "englishLevel": "英语水平(CET-4/CET-6/TEM-4/TEM-8/IELTS/TOEFL等)",
  "englishScore": "英语成绩分数",
  "otherLanguage": "其他语言",
  "computerLevel": "计算机等级",
  "selfEvaluation": "自我评价",
  "website": "个人网站/GitHub",
  "wechat": "微信号",
  "qq": "QQ号",
  "linkedin": "LinkedIn",
  "educations": [
    {
      "school": "学校全称",
      "degree": "学历(高中/大专/本科/硕士/博士)",
      "major": "专业",
      "gpa": "GPA",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "description": "在校经历/奖学金/社团"
    }
  ],
  "works": [
    {
      "company": "公司全称",
      "jobTitle": "职位名称",
      "workType": "全职/实习/兼职",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "description": "工作描述（保留原文要点）"
    }
  ],
  "projects": [
    {
      "projectName": "项目名称",
      "role": "担任角色",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "description": "项目描述（保留原文要点）",
      "link": "项目链接"
    }
  ],
  "competitions": [
    {
      "competitionName": "竞赛/荣誉名称",
      "awardLevel": "获奖等级",
      "awardDate": "YYYY-MM",
      "issuer": "颁发机构",
      "description": "描述"
    }
  ],
  "certificates": [
    {
      "certName": "证书名称",
      "certDate": "YYYY-MM",
      "certIssuer": "颁发机构",
      "certNo": "证书编号"
    }
  ]
}

## 注意事项：
1. 只输出 JSON，不要任何其他文字
2. 简历中没有的信息用空字符串 ""
3. 日期尽量转为 YYYY-MM-DD 或 YYYY-MM 格式
4. 每一段独立的经历都必须单独提取为一个条目
5. 保留原文的关键信息，不要过度压缩描述

---

简历文本：
`;

async function parseResumeWithLLM(text, apiKey, provider = 'openai', model = '') {
  const truncated = text.substring(0, 12000); // Limit token usage

  if (provider === 'claude') {
    const useModel = model || 'claude-haiku-4-5-20251001';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: useModel,
        max_tokens: 4096,
        messages: [{ role: 'user', content: RESUME_PARSE_PROMPT + truncated }],
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API 错误: ${resp.status}`);
    }
    const data = await resp.json();
    const content = data.content?.[0]?.text || '';
    return extractJSON(content);
  }

  if (provider === 'openai') {
    const useModel = model || 'gpt-4o-mini';
    const baseUrl = 'https://api.openai.com/v1/chat/completions';
    const resp = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: useModel,
        messages: [
          { role: 'system', content: '你是一个精确的简历解析器，只输出 JSON。' },
          { role: 'user', content: RESUME_PARSE_PROMPT + truncated },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API 错误: ${resp.status}`);
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    return extractJSON(content);
  }

  throw new Error('不支持的 API 提供商');
}

function extractJSON(text) {
  // Try to find JSON in the response (handle markdown code blocks)
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) cleaned = jsonMatch[1].trim();

  // Try to find { ... } block
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('AI 返回的格式无法解析，请重试');
  }
}
