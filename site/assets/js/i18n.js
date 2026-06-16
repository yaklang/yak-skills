// =============================================================================
// yak-skills 站点国际化 (i18n)
// 默认中文 (zh), 可切换英文 (en), 记忆到 localStorage('yakskills:lang')
// 用法: 在静态文案元素上加 data-i18n="key"; 在输入框上加 data-i18n-ph="key"
// app.js 通过 window.YakI18n.t / onChange 本地化动态文案
// 关键词: i18n, language toggle, data-i18n, localStorage
// =============================================================================
(function () {
  const LANG_KEY = "yakskills:lang";

  const dict = {
    zh: {
      doc_title: "Yak Skills — Yaklang 编程与 Yak 热加载知识库",
      hero_title: 'Yaklang 编程与 Yak 热加载 <span class="hero-title-dim">for AI agents.</span>',
      hero_sub:
        '一个总入口 + 多个专题：MITM / Web Fuzzer / 全局三层热加载、Yaklang 语法、数据库、历史数据提取、工具链。每个 skill 都配可 <code>yak &lt;file&gt;</code> 一键自测的 .yak 示例，并提供命令行验证器。',
      hero_search_ph:
        'Search {n} skills…   试试 "mitm hijack"   "category:hotpatch"   "tier:master"',
      install_lead: "把 Yak Skills 接入你的 Agent：整包安装，或按需拉取单个专题。",
      panel_bundle_lead: "一条命令拉取整套（总入口 + 全部专题 skill）并注册到你的 skills loader。",
      panel_bundle_foot:
        '首次接入推荐。兼容任何遵循 <code>skills</code> CLI 约定的工具。',
      panel_single_lead: "只装一个专题——当你只需要某一类能力、想保持 loader 精简时使用。",
      panel_single_foot:
        '若工具支持按 skill 注册（frontmatter <code>name</code> 标识），只会引入这一个专题。',
      panel_curl_lead:
        '纯 HTTP。拉取任意 skill 的原始 <code>SKILL.md</code>，丢进自定义 prompt、RAG 或自己的 skills 目录。',
      panel_curl_foot: "无需安装器。Markdown 自包含，frontmatter 内含路由提示。",
      panel_agent_lead:
        "把一个 URL 交给你的 AI Agent —— Cursor、Claude Desktop、MCP 风格 loader 或任意读取远端 Markdown 的工具。",
      panel_agent_foot:
        '多数 Agent loader 会把 frontmatter 的 <code>name:</code> 当作稳定标识，即使源 URL 变化。',
      browse_lead:
        '按分类、层级或自由文本过滤。<kbd class="kbd-inline">/</kbd> 在任意位置聚焦搜索框。',
      state_loading: "loading skills.json…",
      state_empty_title: "无匹配结果",
      state_empty_sub:
        '换个关键词，或按 <kbd class="kbd-inline">/</kbd> 重新聚焦。',
      state_error_title: "skills.json 加载失败",
      state_error_sub: "检查网络或刷新页面。",
      matches_one: "个匹配",
      matches_other: "个匹配",
      foot_readme: "中文 README",
      foot_readme_en: "English README",
    },
    en: {
      doc_title: "Yak Skills — Yaklang programming & Yak hot patch knowledge base",
      hero_title:
        'Yaklang programming & Yak hot patching <span class="hero-title-dim">for AI agents.</span>',
      hero_sub:
        'One master entry + topic skills: MITM / Web Fuzzer / Global three-layer hot patch, Yaklang syntax, database, history data extraction, toolchain. Every skill ships <code>yak &lt;file&gt;</code> self-testing .yak examples plus CLI validators.',
      hero_search_ph:
        'Search {n} skills…   try "mitm hijack"   "category:hotpatch"   "tier:master"',
      install_lead:
        "Wire Yak Skills into your agent: install the bundle, or pull a single topic on demand.",
      panel_bundle_lead:
        "One command pulls the whole set (master entry + all topic skills) and registers it with your skills loader.",
      panel_bundle_foot:
        'Recommended for first onboarding. Works with any tool following the <code>skills</code> CLI convention.',
      panel_single_lead:
        "Install just one topic -- when you only need a specific capability and want a lean loader.",
      panel_single_foot:
        'If your tool registers per skill (frontmatter <code>name</code>), only this one topic is pulled in.',
      panel_curl_lead:
        'Pure HTTP. Pull any skill\'s raw <code>SKILL.md</code> into a custom prompt, RAG, or your own skills folder.',
      panel_curl_foot:
        "No installer needed. The Markdown is self-contained with routing hints in the frontmatter.",
      panel_agent_lead:
        "Hand a single URL to your AI agent -- Cursor, Claude Desktop, an MCP-style loader, or any tool that reads remote Markdown.",
      panel_agent_foot:
        'Most agent loaders treat the frontmatter <code>name:</code> as the stable id even when the source URL changes.',
      browse_lead:
        'Filter by category, tier, or free text. <kbd class="kbd-inline">/</kbd> focuses the search box anywhere.',
      state_loading: "loading skills.json…",
      state_empty_title: "No matches",
      state_empty_sub:
        'Try another keyword, or press <kbd class="kbd-inline">/</kbd> to refocus.',
      state_error_title: "Failed to load skills.json",
      state_error_sub: "Check your network or refresh the page.",
      matches_one: "match",
      matches_other: "matches",
      foot_readme: "中文 README",
      foot_readme_en: "English README",
    },
  };

  let lang = "zh";
  try {
    lang = localStorage.getItem(LANG_KEY) || "zh";
  } catch (e) {}
  if (lang !== "zh" && lang !== "en") lang = "zh";

  const listeners = [];

  function t(key) {
    const d = dict[lang] || {};
    if (key in d) return d[key];
    const z = dict.zh || {};
    return key in z ? z[key] : key;
  }

  function apply() {
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      const v = t(k);
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const k = el.getAttribute("data-i18n-ph");
      const v = t(k);
      if (v != null) el.setAttribute("placeholder", v);
    });

    const btn = document.getElementById("lang-toggle");
    if (btn) {
      const lbl = btn.querySelector(".lang-label");
      if (lbl) lbl.textContent = lang === "zh" ? "EN" : "中";
      btn.setAttribute("title", lang === "zh" ? "Switch to English" : "切换为中文");
      btn.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换为中文");
    }

    listeners.forEach((cb) => {
      try {
        cb(lang);
      } catch (e) {}
    });
  }

  function setLang(l) {
    if (l !== "zh" && l !== "en") return;
    lang = l;
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch (e) {}
    apply();
  }

  window.YakI18n = {
    get lang() {
      return lang;
    },
    t: t,
    setLang: setLang,
    toggle: function () {
      setLang(lang === "zh" ? "en" : "zh");
    },
    onChange: function (cb) {
      if (typeof cb === "function") listeners.push(cb);
    },
  };

  function init() {
    const btn = document.getElementById("lang-toggle");
    if (btn) btn.addEventListener("click", () => window.YakI18n.toggle());
    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
