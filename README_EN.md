# Yak Skills

> A composable, agent-ready knowledge base for Yaklang programming and Yak hot patching. One master entry + topic skills, each with runnable, self-testing `.yak` examples, plus CLI validators and end-to-end evidence.

[中文](README.md) | English

Yak Skills follows the directory-style SKILL knowledge-base pattern. Distilled from the Yak official articles (`yak-project-public`) and the [yaklang.github.io](https://yaklang.com) docs, it turns the core mechanics of Yaklang programming and Yak hot patching into skills that an AI agent can load directly and a human can run directly.

## Browse online

Static site: [skills.yaklang.io](https://skills.yaklang.io) (auto-built and deployed by GitHub Pages; defaults to Chinese, switchable to English).
- Filter by category / tier / free text
- Supports query syntax like `category:hotpatch`, `tier:master`
- Each card: one-click copy of the install command, jump to GitHub source

## The three-layer hot patch model (core)

Hot Patch lets you take over HTTP traffic processing stages with Yaklang code **without interrupting the service**. It has three layers, executed top-down: `Global -> Module (MITM / Web Fuzzer)`.

```
Global Hot Patch     ← shared by MITM and all Fuzzers, only 1 active at a time, runs first
        │
        ▼
Module Hot Patch
   ├── MITM       proxy side: hijack / mirror / save-to-db / mock
   └── Web Fuzzer single tab: crypto / signature / retry / fuzztag
        │
        ▼
   outbound / display / persist
```

## Skill catalog

| Skill | Tier | Description |
|---|---|---|
| [`yak`](skills/yak/SKILL.md) | master | three-layer routing, YAK_MAIN debug convention, test method |
| [`mitm-hotpatch`](skills/mitm-hotpatch/SKILL.md) | topic | MITM hooks: hijackHTTPRequest / hijackHTTPResponseEx / mirror* / hijackSaveHTTPFlow / mockHTTPRequest |
| [`webfuzzer-hotpatch`](skills/webfuzzer-hotpatch/SKILL.md) | topic | beforeRequest / afterRequest / retryHandler / customFailureChecker / mirrorHTTPFlow / fuzztag |
| [`global-hotpatch`](skills/global-hotpatch/SKILL.md) | topic | site-wide transparent crypto, dynamic challenge signing, unified auth, site-wide coloring |
| [`yaklang-syntax`](skills/yaklang-syntax/SKILL.md) | topic | variables / control flow / functions / closures / f-string / error handling `~` |
| [`yaklang-database`](skills/yaklang-database/SKILL.md) | topic | SQLite / key-value store / payload dictionaries / project config |
| [`yakit-data-extract-plugin`](skills/yakit-data-extract-plugin/SKILL.md) | topic | collect History by domain, dedup URIs, extract login cookies, dictionary-driven path scan |
| [`yaklang-toolchain`](skills/yaklang-toolchain/SKILL.md) | topic | go run workflow, 4 validator commands, debugging MITM via the repo, how to verify your own plugins |

Each topic directory ships several `example-*.yak` files, all independently runnable and self-testing.

## Install

### Bundle (recommended)

```bash
npx skills add yaklang/yak-skills
```

### Single skill

```bash
npx skills add yaklang/yak-skills/mitm-hotpatch
```

### curl a single SKILL.md

```bash
curl -fsSL https://raw.githubusercontent.com/yaklang/yak-skills/main/skills/yak/SKILL.md
```

## The YAK_MAIN debug convention (important)

Every hot patch script shares one structure: register hook functions + guard the local self-test with `if YAK_MAIN { runSelfTest() }`:

```yak
// 1) register the hook (the only thing yakit does on load)
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    forward(req)
}

// 2) local self-test (runs only from the CLI)
func runSelfTest() {
    // mock data + custom callbacks + assert
}

if YAK_MAIN {
    runSelfTest()
}
```

`YAK_MAIN` is a global boolean injected by the yaklang engine:

- CLI run `yak xxx.yak`: `YAK_MAIN = true` -> runs the self-test.
- yakit hot patch window: `YAK_MAIN = false` -> only registers the hooks.

So a full script including its self-test block can be pasted back into yakit **safely** -- yakit never runs your mock data. This is the "self-test on the CLI -> paste back into yakit" debug loop.

## How to verify your own plugins

Besides `YAK_MAIN` self-tests, the yaklang engine ships four validator commands that run your script on real requests/responses using the **same gRPC execution path as the Yakit UI**, printing the rewrite evidence. See [yaklang-toolchain](skills/yaklang-toolchain/SKILL.md).

| Command | Validates |
|---|---|
| `yak hotpatch-mitm --script x.yak --request req.txt [--response rsp.txt] [--https] [--url URL]` | MITM hot patch |
| `yak hotpatch-global --script x.yak --request req.txt [--response rsp.txt]` | Global hot patch (beforeRequest/afterRequest + hijack + save) |
| `yak hotpatch-webfuzzer --script x.yak --request req.txt [--response rsp.txt] [--fuzztag TAG]` | Web Fuzzer hot patch |
| `yak codec-plugin --script x.yak --input STRING` | Right-click codec plugin (handle) |

Examples:

```bash
printf 'POST /api/order/create HTTP/1.1\r\nHost: shop.example.com\r\nContent-Type: application/json\r\n\r\n{"amount":100}' > /tmp/req.txt
yak hotpatch-mitm --script skills/mitm-hotpatch/example-hijack-request-modify-json.yak --request /tmp/req.txt
# prints origin request / modified request / drop status / save tags as evidence

yak codec-plugin --script skills/yaklang-toolchain/example-codec-rot13.yak --input "Hello, Yak!"
# -> output (len=11): Uryyb, Lnx!
```

The commands live in `yaklang/common/yak/cmd/yakcmds/hotpatch.go` with Go unit tests in `hotpatch_test.go`
(`go test ./common/yak/cmd/yakcmds/ -run 'HotPatch|Codec'`).

## Run and verify locally

```bash
# using the yaklang source engine (recommended, latest capabilities)
cd /path/to/yaklang
go run common/yak/cmd/yak.go /path/to/yak-skills/skills/mitm-hotpatch/example-hijack-request-modify-json.yak

# or the installed engine
yak skills/mitm-hotpatch/example-hijack-request-modify-json.yak
```

Pass criteria: finishes within 10 seconds, all `assert` pass, all `log` output in English, ends with `... self test passed`.

### Batch evidence validation

```bash
# self-test every example-*.yak + run the 4 validator commands, evidence written to scripts/evidence/
cd yak-skills
YAK_BIN=/path/to/yak yak scripts/validate-skills.yak

# real MITM link demo (mitm module proxy + local target), evidence written to scripts/evidence/live/
yak scripts/mitm-live-demo.yak
```

## Build the index

```bash
go run common/yak/cmd/yak.go scripts/build-skills-index.yak \
  --project-root /path/to/yak-skills --strict
```

It scans `skills/*/SKILL.md`, combines with `site/data/categories.yaml` to produce `site/data/skills.json`, and verifies a roundtrip. New skill directories must be registered in `categories.yaml` or `--strict` will fail.

## Sources

- Yak official article collection `yak-project-public` (the most authoritative hands-on guidance)
- [yaklang.github.io](https://yaklang.com) official docs
- yaklang engine source (hook signatures are sourced from code):
  - MITM: `common/yak/hook_mixed_plugin_caller.go`
  - Web Fuzzer: `common/yak/script_engine_for_fuzz.go`
  - YAK_MAIN: `common/yak/script_engine.go`

## Conventions

- Comments may be in Chinese; `log` output, strings, and payloads are all in English.
- Prefer `~` for error handling; verify key results with `assert`.
- Add `// 关键词: ...` comments at key code locations for grep / AI retrieval.
- No emojis.

## License

[MIT](LICENSE)
