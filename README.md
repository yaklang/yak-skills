# Yak Skills

> 面向 AI Agent 的 Yaklang 编程与 Yak 热加载知识库。一个总入口 + 多个专题，每个 skill 都配可一键自测的 `.yak` 示例，并提供命令行验证器与端到端证据。

中文 | [English](README_EN.md)

Yak Skills 模仿目录式 SKILL 知识库范式，围绕 Yak 公众号文章（`yak-project-public`）与 [yaklang.github.io](https://yaklang.com) 官方文档，把 Yaklang 编程与 Yak 热加载的核心机制蒸馏成可被 AI Agent 直接加载、可被人直接运行的技能库。

## 在线浏览

静态站点：[skills.yaklang.io](https://skills.yaklang.io)（由 GitHub Pages 自动构建部署，默认中文，可切换英文）。
- 按分类 / 层级 / 自由文本检索
- 支持 `category:hotpatch`、`tier:master` 等过滤语法
- 每张卡片可一键复制安装命令、跳转 GitHub 源码

## 三层热加载体系（核心）

热加载（Hot Patch）允许在 **不中断服务** 的情况下，用 Yaklang 代码动态接管 HTTP 流量的处理阶段。它分三层，执行顺序自上而下：`全局 -> 模块（MITM / Web Fuzzer）`。

```
全局热加载 (Global Hot Patch)   ← MITM 与所有 Fuzzer 共享, 同时只启用 1 个, 先执行
        │
        ▼
模块热加载
   ├── MITM 热加载        代理侧: 劫持 / 镜像 / 入库 / mock
   └── Web Fuzzer 热加载  单 Tab: 加解密 / 签名 / 重试 / fuzztag
        │
        ▼
   出站 / 回显 / 入库
```

## 技能目录

| Skill | 层级 | 说明 |
|---|---|---|
| [`yak`](skills/yak/SKILL.md) | 总入口 | 三层热加载路由、YAK_MAIN 调试约定、测试方法 |
| [`mitm-hotpatch`](skills/mitm-hotpatch/SKILL.md) | 专题 | MITM 六类 Hook：hijackHTTPRequest / hijackHTTPResponseEx / mirror* / hijackSaveHTTPFlow / mockHTTPRequest |
| [`webfuzzer-hotpatch`](skills/webfuzzer-hotpatch/SKILL.md) | 专题 | beforeRequest / afterRequest / retryHandler / customFailureChecker / mirrorHTTPFlow / fuzztag；前端加密对抗组合配方（AES-CBC / 加密+验签 / RSA+AES-GCM 混合）让用户看到明文 |
| [`global-hotpatch`](skills/global-hotpatch/SKILL.md) | 专题 | 全站透明加解密、动态 challenge 签名、统一认证、全站染色 |
| [`yaklang-syntax`](skills/yaklang-syntax/SKILL.md) | 专题 | 变量 / 控制流 / 函数 / 闭包 / f-string / 错误处理 `~` |
| [`yaklang-database`](skills/yaklang-database/SKILL.md) | 专题 | SQLite / 键值存储 / Payload 字典 / 项目配置 |
| [`yakit-data-extract-plugin`](skills/yakit-data-extract-plugin/SKILL.md) | 专题 | 按 domain 捞 History、URI 去重、提取登录 Cookie、字典驱动发包扫描 |
| [`yaklang-toolchain`](skills/yaklang-toolchain/SKILL.md) | 专题 | go run 工作流、4 个验证命令、用仓库调试 MITM、如何验证你写的插件 |

每个专题目录下都有若干 `example-*.yak`，均可独立运行自测。

## 安装

### 整包安装（推荐）

```bash
npx skills add yaklang/yak-skills
```

### 单个专题

```bash
npx skills add yaklang/yak-skills/mitm-hotpatch
```

### curl 拉取单个 SKILL.md

```bash
curl -fsSL https://raw.githubusercontent.com/yaklang/yak-skills/main/skills/yak/SKILL.md
```

## YAK_MAIN 调试约定（重要）

所有热加载脚本统一结构——注册 hook 函数 + `if YAK_MAIN { runSelfTest() }` 守卫本地自测：

```yak
// 1) 注册 hook (yakit 加载时只做这件事)
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    forward(req)
}

// 2) 本地自测 (命令行运行时才跑)
func runSelfTest() {
    // mock 数据 + 自定义 callback + assert
}

if YAK_MAIN {
    runSelfTest()
}
```

`YAK_MAIN` 是 yaklang 引擎注入的全局布尔：

- 命令行 `yak xxx.yak` 运行：`YAK_MAIN = true` → 跑自测。
- yakit 热加载窗口加载：`YAK_MAIN = false` → 只注册 hook。

所以含自测块的完整脚本可以 **安全地** 粘贴回 yakit——yakit 不会执行你的 mock 数据。这就是"命令行一键自测 → 粘回 yakit 使用"的安全闭环。

## 如何验证你写的插件

除了 `YAK_MAIN` 自测，本库在 yaklang 引擎里提供了四个验证命令，用 **与 Yakit UI 同款的 gRPC 执行路径** 把脚本跑在真实请求/响应上、打印改写证据。详见 [yaklang-toolchain](skills/yaklang-toolchain/SKILL.md)。

| 命令 | 验证对象 |
|---|---|
| `yak hotpatch-mitm --script x.yak --request req.txt [--response rsp.txt] [--https] [--url URL]` | MITM 热加载 |
| `yak hotpatch-global --script x.yak --request req.txt [--response rsp.txt]` | 全局热加载（beforeRequest/afterRequest + 劫持 + 入库） |
| `yak hotpatch-webfuzzer --script x.yak --request req.txt [--response rsp.txt] [--fuzztag TAG]` | Web Fuzzer 热加载 |
| `yak codec-plugin --script x.yak --input STRING` | 右键 codec 插件（handle） |

示例：

```bash
printf 'POST /api/order/create HTTP/1.1\r\nHost: shop.example.com\r\nContent-Type: application/json\r\n\r\n{"amount":100}' > /tmp/req.txt
yak hotpatch-mitm --script skills/mitm-hotpatch/examples/hijack-request.yak --request /tmp/req.txt
# 输出会打印原始请求 / 改写后请求 / drop 状态 / 入库 tag 作为证据

yak codec-plugin --script skills/yaklang-toolchain/examples/codec-rot13.yak --input "Hello, Yak!"
# -> output (len=11): Uryyb, Lnx!
```

命令实现位于 `yaklang/common/yak/cmd/yakcmds/hotpatch.go`，并配有 Go 单元测试 `hotpatch_test.go`
（`go test ./common/yak/cmd/yakcmds/ -run 'HotPatch|Codec'`）。

## 本地运行与验证

```bash
# 用 yaklang 源码引擎 (推荐, 拿到最新能力)
cd /path/to/yaklang
go run common/yak/cmd/yak.go /path/to/yak-skills/skills/mitm-hotpatch/examples/hijack-request.yak

# 或用已安装引擎
yak skills/mitm-hotpatch/examples/hijack-request.yak
```

合格标准：10 秒内完成、所有 `assert` 通过、`log` 全英文、末尾出现 `... self test passed`。

### 批量证据化验证

```bash
# 遍历所有 example-*.yak 自测 + 跑 4 个验证命令, 证据落地 scripts/evidence/
cd yak-skills
YAK_BIN=/path/to/yak yak scripts/validate-skills.yak

# 真实 MITM 链路演示 (mitm 模块起代理 + 本地靶站), 证据落地 scripts/evidence/live/
yak scripts/mitm-live-demo.yak
```

## 构建索引

```bash
go run common/yak/cmd/yak.go scripts/build-skills-index.yak \
  --project-root /path/to/yak-skills --strict
```

会扫描 `skills/*/SKILL.md`，结合 `site/data/categories.yaml` 生成 `site/data/skills.json`，并做回环校验。新增 skill 目录后必须在 `categories.yaml` 登记，否则 `--strict` 会报错。

## 知识来源

- Yak 公众号文章合集 `yak-project-public`（最核心的实战指导）
- [yaklang.github.io](https://yaklang.com) 官方文档
- yaklang 引擎源码（Hook 签名以源码为准）：
  - MITM：`common/yak/hook_mixed_plugin_caller.go`
  - Web Fuzzer：`common/yak/script_engine_for_fuzz.go`
  - YAK_MAIN：`common/yak/script_engine.go`

## 规范

- 注释可用中文；`log` 输出、字符串、payload 全部英文。
- 错误处理优先用 `~`；关键结果用 `assert` 验证。
- 关键代码位置加 `// 关键词: ...` 注释，便于 grep 与 AI 检索。
- 不使用 emoji。

## License

[MIT](LICENSE)
