import { tool } from '@langchain/core/tools';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { createFunctionCallingModel } from '../llm.js';

/**
 * 09 - 工具调用（Tool Calling）
 *
 * 目标：让模型"决定"去调用你自己写的函数。
 * 流程：定义工具 -> bind_tools 告知模型 -> 模型返回 tool_calls ->
 *       我们执行工具 -> 把结果作为 ToolMessage 回传 -> 模型给出最终答复。
 *
 * 关键认知：模型**不会**真的执行你的代码。它只"指明调用哪个工具、传什么参数"，
 * 真正执行的是我们的代码。这正是"工具调用"的本质。
 */
const model = createFunctionCallingModel();

// --- 第 1 步：工具的真实实现（接收 schema 解析出的对象） ---
async function addNumbers(pair: { a: number; b: number }): Promise<string> {
  const sum = pair.a + pair.b;
  console.log(`   [工具实际执行] add(${pair.a}, ${pair.b}) = ${sum}`);
  return String(sum);
}

// 用 tool() 把它包装成模型能理解的工具（含 description 和 schema）
const addTool = tool(addNumbers, {
  name: 'add',
  description: '把两个整数 a 和 b 相加，返回它们的和。',
  schema: z.object({
    a: z.number().describe('第一个加数'),
    b: z.number().describe('第二个加数'),
  }),
});

// --- 第 2 步：把工具绑定给模型 ---
const modelWithTools = model.bindTools([addTool]);
const userQuestion = '请帮我计算 123 加 456 等于多少？';

console.log('>>> 用户:', userQuestion, '\n');

// --- 第 3 步：让模型决定要不要调用工具 ---
const aiMessage = await modelWithTools.invoke(userQuestion);
const call = aiMessage.tool_calls?.[0];
console.log('<<< 模型第一轮输出:');
console.log('  工具调用意向数:', aiMessage.tool_calls?.length ?? 0);
console.log('  文本部分:', aiMessage.content || '(无)\n');

if (!call) {
  console.log('（模型没有要求调用工具，直接给出了文本回答）');
} else {
  // 第 4 步：执行工具（这里才真正运行 addNumbers）
  const result = await addNumbers(call.args as { a: number; b: number });

  // 第 5 步：把 "模型意图 + 工具结果" 封装成消息回传
  const withHistory = [
    new HumanMessage(userQuestion),
    aiMessage,
    new ToolMessage({
      content: result,
      tool_call_id: call.id as string,
    }),
  ];

  // 第 6 步：模型基于工具结果给出最终回答
  const final = await modelWithTools.invoke(withHistory);
  console.log('<<< 模型最终回答:', final.content);
}