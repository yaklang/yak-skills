---
name: yakit-rightclick-plugin
description: >-
  Yakit 右键插件 (codec 插件) 的使用与编程技巧。讲清 codec 插件只需要一个 handle(input) 函数,
  配合插件类型 codec + 开关"用于数据包右键" (tag: allow-custom-context-menu-execute) 即可出现在
  任意 HTTP 编辑器的右键菜单里; 还讲 Web Fuzzer 编辑器的两层右键 (Monaco 原生菜单 + 选区浮动菜单)
  如何选中文本一键编码/解码/调用插件, 以及如何用 yak codec-plugin 命令验证。当用户问"怎么写右键
  插件 / codec 插件怎么用 / Web Fuzzer 右键怎么操作"时使用。右键插件是编写小工具最快的方式。
---

# SKILL: Yakit 右键插件 (codec) 使用与编程

> AI LOAD INSTRUCTION: codec 插件是 Yakit 里写"小工具"成本最低的方式——**只需要一个 `handle(input)`
> 函数**。把插件类型设为 `codec` 并打开"用于数据包右键"开关, 它就会出现在 MITM/History/Web Fuzzer
> 等所有 HTTP 编辑器的右键菜单里, 把当前选中文本作为 `input` 传进来, 展示 `handle` 的返回值。本页讲
> 启用方式、编程契约、Web Fuzzer 右键的两层菜单, 以及命令行验证闭环。

## 0. 相关路由

- 总入口: [yak](../yak/SKILL.md)
- 验证工具链: [yaklang-toolchain](../yaklang-toolchain/SKILL.md)（`yak codec-plugin` 命令）
- 三类热加载: [mitm-hotpatch](../mitm-hotpatch/SKILL.md) / [webfuzzer-hotpatch](../webfuzzer-hotpatch/SKILL.md) / [global-hotpatch](../global-hotpatch/SKILL.md)

## 1. codec 插件的唯一契约: handle(input)

```yak
// 一个最小可用的 codec 插件: 把选中文本 Base64 编码
handle = func(input /* string: 当前选中的文本 */) {
    return codec.EncodeBase64(input)   // 返回值即右键执行后的结果
}
```

- 入口函数固定叫 `handle`, 入参是选中文本 (string), 返回字符串。
- 没有选区时, 传入的是整个编辑器内容。
- `handle` 内可以用任意 yaklang 库 (`codec` / `str` / `json` / `re` / `poc` ...)。
- 后端执行就是 `handle(input)` 这一句 (`SafeCallYakFunction(ctx, "handle", [input])`),
  CLI 与 Yakit UI 走的是**完全相同**的执行路径。

## 2. 怎么让它出现在右键菜单 (关键: 一个 tag)

在 Yakit 插件编辑器里:

1. 插件类型选 **codec**。
2. 打开开关 **"用于数据包右键"**。

这个开关本质是给 `YakScript.Tags` 加一个 tag:

| 开关文案 | tag 值 | 效果 |
| --- | --- | --- |
| 用于数据包右键 | `allow-custom-context-menu-execute` | 出现在右键 → **插件扩展** 子菜单 (codec 插件) |
| HTTP 数据包变形 | `allow-custom-http-packet-mutate` | 出现在右键 → **HTTP数据包变形** (对整包变形) |
| 单条历史记录处理 | `allow-custom-single-history-mutate` | 在 History 单条记录右键可用 |
| 多条历史记录处理 | `allow-custom-multiple-history-mutate` | 在 History 多选记录右键可用 |

> 编辑器右键时, Yakit 用 `QueryYakScript({Type:'codec', Tag:['allow-custom-context-menu-execute']})`
> 把所有带该 tag 的 codec 插件拉出来, 注入到 **插件扩展 / AI工具** 菜单。保存插件后会触发
> `onRefPluginCodecMenu` 重新加载菜单。

## 3. 点击后发生了什么 (执行链)

```
选中文本 → 右键 → 插件扩展 → 你的插件
   → onOpenFuzzerModal { text(选中文本), scriptName }
   → DebugPlugin { Input: text, PluginName, PluginType: 'codec' }
   → 引擎执行脚本并调用 handle(input)
   → 结果流式回显在 "Codec结果" 面板
```

重要行为差异:

- **codec 右键插件的结果展示在面板里 (Codec结果), 不会自动写回编辑器**——需要手动复制。
- **内置"编码/解码"** (右键 → 编码/解码, 无需插件) 以及 **HTTP数据包变形插件**
  (`allow-custom-http-packet-mutate`) 才会直接替换编辑器内容/整包。
- 想要"选中即替换", 在 Web Fuzzer 里用**选区浮动菜单的编解码**最顺手 (见第 5 节)。

## 4. 编程技巧 (写出好用的右键插件)

- **保持纯函数**: `handle` 只依赖 `input`, 不读外部状态, 结果可预测、好验证。
- **容错不抛错**: 解码失败时返回友好提示字符串, 而不是 panic, 右键体验更好。
  ```yak
  handle = func(input) {
      raw, err = codec.DecodeBase64Url(input)
      if err != nil { return "decode failed: " + input }
      return string(raw)
  }
  ```
- **善用 codec 库**: `EncodeBase64/DecodeBase64/EncodeBase64Url/DecodeBase64Url`、`UnicodeDecode`、
  各种 hash/对称加密都在 `codec` 里, 多数小工具一行搞定。
- **可逆优先**: 编/解码类尽量保证 `handle(handle(x))` 或编解码成对, 方便来回切。
- **先自测再上架**: 写 `if YAK_MAIN { runSelfTest() }`, 用 `yak file.yak` 跑断言;
  注意 `handle` 不要被 `YAK_MAIN` 包住 (它要常驻注册), 只把自测放进守卫块。

## 5. Web Fuzzer 编辑器的右键 (两层菜单)

Web Fuzzer 请求编辑器有两套交互, 都能调用编解码/插件:

### A. Monaco 原生右键菜单

右键弹出, 分组包含:

- **编码 / 解码**: 内置编解码 (base64/url/hex/...), 选中后可"替换内容"写回编辑器。
- **HTTP数据包变形**: 调用带 `allow-custom-http-packet-mutate` 的插件, 对整包变形。
- **插件扩展 / AI工具**: 调用带 `allow-custom-context-menu-execute` 的 codec 插件 (结果进面板)。
- **插入标签/字典**: 插入空字节、临时/Fuzz 字典、`{{yak:dyn(...)}}` 热加载标签、文件标签等。

### B. 选区浮动操作条 (最常用)

选中一段文本时, 旁边浮出操作条:

- **编码**: 把选中文字包成 fuzztag 并**替换选区**, 例如选中 `admin` → `{{base64enc(admin)}}`,
  发包时由 Fuzzer 引擎渲染。
- **解码 / 智能解码**: 走 `AutoDecode` 自动识别编码并解出明文, 点"替换"写回。
- **插件 / AI**: 同样把选区文本喂给 codec 插件 (结果进面板)。

> 经验法则: 想"选中即替换成 fuzztag"用**浮动条编码**; 想"看一眼解码结果"用**浮动条解码/智能解码**;
> 想"跑自己写的复杂转换"用**右键插件扩展 → codec 插件**。

## 6. 命令行验证 (与 UI 同款 handle 执行)

```bash
# 用 yaklang 源码引擎构建一次
cd /Users/v1ll4n/Projects/yaklang && go build -o /tmp/yak ./common/yak/cmd/yak.go

# 验证 codec 插件: 把 input 喂给 handle, 打印返回值
/tmp/yak codec-plugin --script skills/yakit-rightclick-plugin/examples/codec-base64-wrap.yak --input "admin:123456"
# -> output: YWRtaW46MTIzNDU2

# 也支持从文件读取 input
/tmp/yak codec-plugin --script x.yak --input-file /tmp/payload.bin
```

`yak codec-plugin` 与 Yakit 右键执行同样调用 `handle(input)`, 所以"命令跑通 == 右键也能跑通"。

## 7. 示例 (examples/)

| 文件 | handle 作用 | 验证 |
| --- | --- | --- |
| [codec-base64-wrap.yak](examples/codec-base64-wrap.yak) | 选中文本 Base64 编码 | `--input "admin:123456"` |
| [codec-jwt-decode.yak](examples/codec-jwt-decode.yak) | JWT 一键解码 header+payload | `--input "eyJ...header.eyJ...payload.sig"` |
| [codec-unicode-unescape.yak](examples/codec-unicode-unescape.yak) | `\uXXXX` 还原中文 | `--input '\u4e2d\u6587abc'` |
| [codec-timestamp-to-date.yak](examples/codec-timestamp-to-date.yak) | Unix 时间戳转 UTC 日期 | `--input "1700000000"` |

每个示例都带 `YAK_MAIN` 自测块, `yak <file>.yak` 即可自证; 全部能被
`yak codec-plugin` 命令复现证据 (见 `scripts/validate-skills.yak`)。
