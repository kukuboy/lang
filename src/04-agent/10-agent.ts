import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createFunctionCallingModel } from '../llm.js';
import { createAgent } from 'langchain';

/**
 * 10 - 用 LangGraph 构建一个可自主编排的 Agent
 *
 * 和 09 的"手动工具调用"相比，LangGraph 的 Agent 会自动：
 *  模型决定调用工具 -> 执行 -> 回传 -> 再决定是否继续（循环），直到任务完成。
 * 我们把"多轮工具调用 + 状态管理"交给框架，只需给出工具和系统提示词。
 */

// --- 定义两个"伪工具"（假装在算/在查数据） ---
const getWeather = tool(
  async (input: { city: string }) => {
    console.log(`   [工具] 查询天气: ${input.city}`);
    return `${input.city}今天晴转多云，气温 20~28°C。`;
  },
  {
    name: 'get_weather',
    description: '查询指定城市的天气。',
    schema: z.object({ city: z.string().describe('城市名') }),
  },
);

const convertUnits = tool(
  async (input: { value: number; unit: string }) => {
    console.log(`   [工具] 单位换算: ${input.value}${input.unit}`);
    return `${input.value}${input.unit} = ${input.value * 1000}${input.unit === 'km' ? 'm' : '（演示简化结果）'}`;
  },
  {
    name: 'convert_units',
    description: '把公里(km)换算成米(m)。',
    schema: z.object({
      value: z.number().describe('数值'),
      unit: z.enum(['km']).describe('单位'),
    }),
  },
);

const model = createFunctionCallingModel();
const agent = createAgent({
  model, // 需要支持工具调用的 LLM
  tools: [getWeather, convertUnits],
  systemPrompt: '你是一个乐于助人的助手。需要实况信息时，优先调用工具获取。',
});

console.log('>>> 提问（需要连续调用工具才能完整回答）:\n');
const result = await agent.invoke({
  messages: [
    {
      role: 'human',
      content: '北京今天天气怎么样？顺便把 3.5 公里换算成米。',
    },
  ],
});

console.log('\n<<< Agent 最终回答:');
const last = result.messages[result.messages.length - 1];
console.log(last.content as string);