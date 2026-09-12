import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createFunctionCallingModel } from '../llm.js';
import { createAgent } from 'langchain';

/**
 * 14 - Agent 流式执行：观察完整的思考链路
 *
 * 目标：用 stream() 代替 invoke()，观察 Agent 的每一步执行过程。
 *
 * invoke() 只给你最终结果；stream() 让你看到：
 * - 模型决定调用什么工具
 * - 工具执行返回了什么
 * - 模型如何基于工具结果继续推理
 *
 * 流式模式（streamMode）说明：
 * - "values": 每步完成后输出完整的 state 快照
 * - "updates": 每步只输出该节点的更新部分
 * - "messages": 逐 token 流式输出消息内容
 */

// --- 定义工具 ---
const searchTool = tool(
  async (input: { query: string }) => {
    console.log(`   [工具执行] search("${input.query}")`);
    return `关于"${input.query}"的搜索结果：LangChain.js 是一个用于构建 LLM 应用的 TS 框架。`;
  },
  {
    name: 'search',
    description: '搜索互联网上的信息。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  },
);

const calcTool = tool(
  async (input: { expression: string }) => {
    console.log(`   [工具执行] calc("${input.expression}")`);
    // 演示用，只做简单数字提取
    const nums = input.expression.match(/\d+/g)?.map(Number) ?? [];
    const sum = nums.reduce((a, b) => a + b, 0);
    return `计算结果: ${nums.join(' + ')} = ${sum}`;
  },
  {
    name: 'calculator',
    description: '简单加法计算器。',
    schema: z.object({ expression: z.string().describe('算式，如 1+2+3') }),
  },
);

const model = createFunctionCallingModel();
const agent = createAgent({
  model,
  tools: [searchTool, calcTool],
  systemPrompt: '你是一个乐于助人的助手。遇到事实问题用 search 工具，遇到计算用 calculator。',
});

console.log('>>> 用 stream(values) 观察执行链路\n');
console.log('问题: LangChain.js 是什么？另外帮我算 10+20+30\n\n');

// --- 方式 1：streamMode "values" ---
console.log('=== streamMode: "values"（每步完整 state 快照）===\n');
const stream1 = await agent.stream(
  {
    messages: [
      { role: 'human', content: 'LangChain.js 是什么？另外帮我算 10+20+30' },
    ],
  },
  { streamMode: 'values' },
);

let stepCount = 0;
for await (const chunk of stream1) {
  stepCount++;
  const lastMsg = chunk.messages?.[chunk.messages.length - 1];
  if (lastMsg) {
    const role = lastMsg.constructor.name;
    const content = typeof lastMsg.content === 'string'
      ? lastMsg.content.slice(0, 80)
      : JSON.stringify(lastMsg.content).slice(0, 80);
    // tool_calls 只在 AIMessage 上存在，用安全访问
    const toolCallsData = 'tool_calls' in lastMsg
      ? (lastMsg as { tool_calls?: unknown[] }).tool_calls
      : undefined;
    const toolCalls = toolCallsData?.length
      ? ` [调用 ${toolCallsData.length} 个工具]`
      : '';
    console.log(`  步骤${stepCount} [${role}]${toolCalls}: ${content}...`);
  }
}

console.log(`\n（共 ${stepCount} 步）`);

// --- 方式 2：streamMode "updates" ---
console.log('\n=== streamMode: "updates"（每步增量更新）===\n');
const stream2 = await agent.stream(
  {
    messages: [
      { role: 'human', content: '帮我算 5+10+15' },
    ],
  },
  { streamMode: 'updates' },
);

for await (const chunk of stream2) {
  // updates 模式下，chunk 是 { 节点名: 更新内容 }
  for (const [nodeName, update] of Object.entries(chunk)) {
    console.log(`  节点 [${nodeName}]:`);
    const msgs = (update as { messages?: unknown[] })?.messages;
    if (msgs && Array.isArray(msgs)) {
      for (const m of msgs) {
        const role = (m as { constructor?: { name: string } })?.constructor?.name ?? 'unknown';
        const content = typeof (m as { content?: unknown }).content === 'string'
          ? ((m as { content: string }).content).slice(0, 80)
          : '...';
        console.log(`    -> [${role}]: ${content}`);
      }
    }
  }
}

console.log('\n<<< 流式执行观察完毕。');
console.log('可以看到 Agent 经历了：用户消息 -> 模型决策 -> 工具执行 -> 模型总结。');