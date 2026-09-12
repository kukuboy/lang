# LangChain.js 入门学习项目

> 使用 **TypeScript** + **LangChain.js**，模型走 **DeepSeek**（OpenAI 兼容接口）。按「由浅入深」编排的一组可运行示例，用于入门练习。

---

## 一、设计目标

- **最小依赖、逐步递进**：从「一句话调用模型」走到「可自主编排的智能体 + 多 Agent 协作」，每关只引入一个新概念。
- **真实可跑**：除 RAG 的检索环节外，无需额外 Key；DeepSeek 无 Embeddings 接口，用本地模拟向量替代，降低跑通门槛。
- **示例即文档**：每个文件顶部用注释讲清「这一关要学什么 + 关键点」，配合 README 一起看。
- **LangGraph 全覆盖**：从 StateGraph 基础到条件路由、人工介入、流式观察、多 Agent 协作，系统掌握 LangGraph。

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
    ├── 04-agent/
    │   ├── 09-tool-calling.ts   # 工具调用（手动版）
    │   └── 10-agent.ts          # createAgent 智能体（自动版）
    └── 05-langgraph/            # 模块五：LangGraph 进阶
        ├── 11-state-graph.ts    # StateGraph 基础（State/Node/Edge）
        ├── 12-conditional-edges.ts # 条件边（分支路由）
        ├── 13-human-in-loop.ts  # 人工介入（interrupt + checkpointer）
        ├── 14-stream-agent.ts   # Agent 流式执行观察
        └── 15-multi-agent.ts    # 多 Agent 协作（Supervisor 模式）
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
npm run state-graph    # 模块五：StateGraph 基础
npm run agent          # 模块四：智能体
```

> 全部脚本：`hello` / `stream` / `messages` / `prompt` / `parser` / `chain` / `memory` / `rag` / `tool` / `agent` / `state-graph` / `conditional` / `human-loop` / `stream-agent` / `multi-agent`

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
| 9. 智能体 | `10` | createAgent | 让模型自主编排多步 |
| **10. 图基础** | **`11`** | **StateGraph / Annotation** | **定义状态、节点、边，构建有向图** |
| **11. 路由** | **`12`** | **Conditional Edges** | **按条件分支路由到不同节点** |
| **12. 人工介入** | **`13`** | **interrupt + Checkpointer** | **在关键节点暂停等人工确认** |
| **13. 流式观察** | **`14`** | **stream(values/updates)** | **观察 Agent 每步思考和执行链路** |
| **14. 多 Agent** | **`15`** | **Supervisor 模式** | **让多个专家 Agent 协作完成任务** |

---

## 五、LangGraph 与 Agent 知识体系

### 5.1 从 LCEL 到 LangGraph

| 维度 | LCEL 链（06） | LangGraph 图（11–15） |
|------|--------------|----------------------|
| 拓扑 | 线性管道 (A→B→C) | 有向图（含分支、循环） |
| 状态 | 无状态（每次 invoke 独立） | 有状态（State 在节点间传递） |
| 控制流 | 只能顺序执行 | 条件路由 + 循环 + 中断 |
| 适用 | 单步编排 | 多步推理、工具循环、人工审核 |

### 5.2 LangGraph 核心概念

- **State（状态）**：用 `Annotation.Root({...})` 定义，是节点间传递的"共享内存"。
- **Node（节点）**：一个 `async (state) => Partial<State>` 函数，读 state、返回更新。
- **Edge（边）**：`addEdge(A, B)` 定义顺序；`addConditionalEdges(A, routerFn)` 定义条件分支。
- **START / END**：图的入口和出口常量。
- **Checkpointer**：`MemorySaver`（内存）或外部存储，让图拥有"断点恢复"能力。
- **interrupt()**：在节点内暂停图执行，等待外部 `Command({ resume })` 恢复。

### 5.3 Agent 的三个层次

| 层次 | 示例 | 做法 |
|------|------|------|
| 手动工具调用 | `09` | 自己写 if/else 处理 tool_calls → 执行 → 回传 |
| 框架封装 Agent | `10` | `createAgent()` 自动处理工具循环 |
| 图编排 Agent | `11–15` | 用 StateGraph 自定义节点、路由、中断、多 Agent |

### 5.4 多 Agent 模式

| 模式 | 做法 | 适用场景 |
|------|------|---------|
| Supervisor | 主管 Agent 路由到专家 | 任务可分解为不同领域 |
| Hierarchical | 主管 → 子主管 → 专家 | 复杂的多层分工 |
| Swarm | Agent 间直接传递控制权 | 灵活、无中心节点 |

本项目的 `15-multi-agent.ts` 演示了 **Supervisor 模式**的基础形态。

---

## 六、几个贯穿全项目的心法

1. **一切皆 Runnable**：Prompt、Model、Parser、Retriever 都实现同一个 `Runnable` 接口，所以能随意 `.pipe()` 串起来。
2. **模型不会执行你的代码**：工具调用里模型只负责「决定」，「执行」永远是你的代码。
3. **RAG ≈ 给资料 + 让模型照读**：先在库里检索，再拼进 Prompt。检索质量决定回答质量。
4. **LangGraph = 状态机 + LLM**：把"模型调用"和"工具执行"封装成图的节点，用边控制流转。
5. **换模型厂商基本不动业务代码**：只需改 `src/llm.ts` 的客户端配置。

---

## 七、后续可深入方向

- 把 `FakeEmbeddings` 换成真实嵌入模型（如 OpenAI `text-embedding-3` / 通义 `text-embedding-v3`），体验检索质量提升。
- 用 LangGraph 的持久化 Checkpointer 接 Redis/Postgres，做跨会话的有状态 Agent。
- 接入工具来执行真实操作（查数据库、调接口、写文件）。
- 用 `createAgent` 的 `stream` 观察完整执行链路。
- 尝试 LangGraph 的 **Subgraph**（子图嵌套），做更复杂的多 Agent 层级编排。
- 探索 **LangGraph Studio**（可视化调试图执行流程）。