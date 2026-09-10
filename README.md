# LangChain.js 入门学习项目

> 使用 **TypeScript** + **LangChain.js**，模型走 **DeepSeek**（OpenAI 兼容接口）。按「由浅入深」编排的一组可运行示例，用于入门练习。

---

## 一、设计目标

- **最小依赖、逐步递进**：从「一句话调用模型」走到「可自主编排的智能体」，每关只引入一个新概念。
- **真实可跑**：除 RAG 的检索环节外，无需额外 Key；DeepSeek 无 Embeddings 接口，用本地模拟向量替代，降低跑通门槛。
- **示例即文档**：每个文件顶部用注释讲清「这一关要学什么 + 关键点」，配合 README 一起看。

---

## 二、目录结构

```
lang/
├── package.json                 # 依赖与运行脚本（npm run xx）
├── tsconfig.json                # TS 严格模式配置
├── .env.example                 # 环境变量模板（复制为 .env）
├── .gitignore
├── README.md                    # 本文件：设计与学习路线
└── src/
    ├── config.ts                # 环境变量集中管理 + 密钥校验
    ├── llm.ts                   # 统一的模型工厂（DeepSeek 客户端）
    ├── 01-basics/               # 模块一：核心概念
    │   ├── 01-hello.ts          # 最小对话
    │   ├── 02-stream.ts         # 流式输出
    │   ├── 03-messages.ts       # 角色化消息（system/human/ai）
    │   ├── 04-prompt-template.ts# Prompt 模板
    │   ├── 05-output-parser.ts  # 结构化输出（zod）
    │   └── 06-chain.ts          # LCEL 链
    ├── 02-memory/
    │   └── 07-memory.ts         # 多轮对话记忆
    ├── 03-rag/
    │   ├── fake-embeddings.ts   # 本地模拟向量化（可替换为真实嵌入）
    │   └── 08-rag.ts            # 检索增强生成
    └── 04-agent/
        ├── 09-tool-calling.ts   # 工具调用
        └── 10-agent.ts          # LangGraph 智能体
```

---

## 三、快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置密钥
cp .env.example .env   # 然后编辑 .env，填入 DEEPSEEK_API_KEY

# 3. 运行某个示例（脚本名见 package.json）
npm run hello         # 模块一：最小对话
npm run agent         # 模块四：智能体
```

> 全部脚本：`hello` / `stream` / `messages` / `prompt` / `parser` / `chain` / `memory` / `rag` / `tool` / `agent`

---

## 四、学习路线（建议顺序）

| 阶段 | 示例 | 核心概念 | 学完之后你能 |
|------|------|---------|-------------|
| 0. 准备 | `config.ts` `llm.ts` | 环境变量、模型客户端 | 用 OpenAI 兼容方式接入任意模型 |
| 1. 核心 | `01–02` | `invoke` / `stream` | 发起调用并流式消费 |
| 2. 消息 | `03` | Message 角色 | 理解对话 = 一串带角色的消息 |
| 3. 提示词 | `04` | PromptTemplate | 复用、动态填充提示词 |
| 4. 输出 | `05` | zod + 结构化输出 | 让模型吐可控的 JSON |
| 5. 链 | `06` | LCEL / Runnable | 自由串联组件 |
| 6. 记忆 | `07` | 历史消息回传 | 做多轮对话 |
| 7. RAG | `08` | 切分→向量→检索→生成 | 基于资料回答、减少幻觉 |
| 8. 工具 | `09` | Tool Calling | 让模型调用你的函数 |
| 9. 智能体 | `10` | LangGraph Agent | 让模型自主编排多步 |

---

## 五、几个贯穿全项目的心法

1. **一切皆 Runnable**：Prompt、Model、Parser、Retriever 都实现同一个 `Runnable` 接口，所以能任性 `.pipe()` 串起来。这是理解 LangChain 的关键。
2. **模型不会执行你的代码**：工具调用里模型只负责「决定」，「执行」永远是你的代码。
3. **RAG ≈ 给资料 + 让模型照读**：先在库里检索，再拼进 Prompt。检索质量决定回答质量。
4. **换模型厂商基本不动业务代码**：只需改 `src/llm.ts` 的客户端配置。

---

## 六、后续可深入方向

- 把 `FakeEmbeddings` 换成真实嵌入模型（如 OpenAI `text-embedding-3` / 通义 `text-embedding-v3`），体验检索质量提升。
- 引入 LangGraph 的持久化 Checkpointer，做有状态的 Agent。
- 接入工具来执行真实操作（查数据库、调接口、写文件）。
- 用 `createAgent` 的 `stream` 观察完整执行链路。