import { Annotation, StateGraph, START, END, MessagesAnnotation } from '@langchain/langgraph';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createFunctionCallingModel } from '../llm.js';
import { createAgent } from 'langchain';

/**
 * 15 - 多 Agent 协作（Supervisor 模式）
 *
 * 目标：理解多 Agent 系统的基本架构——一个"主管"Agent 负责把任务分给
 * 不同领域的"专家"Agent，再汇总结果。
 *
 * 模式：
 *   用户 -> Supervisor(主管) -> 分配给 -> [Research Agent | Writer Agent]
 *                              <- 结果回传 <-
 *         Supervisor 决定是否继续或结束
 *
 * 实现方式：
 * - 每个子 Agent 用 createAgent 创建（自带工具循环）
 * - Supervisor 用 StateGraph 的条件边路由到不同子 Agent
 * - 子 Agent 执行完后回到 Supervisor，由它决定下一步
 */

// --- 定义两个专家 Agent ---

// 专家 1：研究员（带搜索工具）
const searchTool = tool(
  async (input: { query: string }) => {
    console.log(`     [research-tool] 搜索: ${input.query}`);
    return `搜索结果："${input.query}" - TypeScript 是一种带类型的 JS 超集，由微软维护。`;
  },
  {
    name: 'search',
    description: '搜索互联网信息。',
    schema: z.object({ query: z.string() }),
  },
);

const researchAgent = createAgent({
  model: createFunctionCallingModel(),
  tools: [searchTool],
  systemPrompt: '你是研究员。接到问题后用 search 工具搜索，然后给出简洁结论。',
});

// 专家 2：写手（不带工具，纯文本生成）
const writerAgent = createAgent({
  model: createFunctionCallingModel(),
  tools: [],
  systemPrompt: '你是技术写手。根据给定信息写一段通俗易懂的科普文。只输出正文。',
});

// --- Supervisor 的路由逻辑 ---
// 这里用简单关键词匹配模拟"主管分配任务"的决策过程。
// 真实场景中，supervisor 本身就是一个 LLM，用结构化输出来决定路由。
function supervisorRoute(state: typeof MessagesAnnotation.State): string {
  const lastMsg = state.messages[state.messages.length - 1];
  const content = typeof lastMsg.content === 'string' ? lastMsg.content : '';

  // 如果是用户的第一条消息，决定分配给谁
  if (/搜索|查|研究|了解|是什么/.test(content)) {
    console.log('  [supervisor] -> 路由到: research_agent');
    return 'research_agent';
  }
  if (/写|描述|科普|文章|解释/.test(content)) {
    console.log('  [supervisor] -> 路由到: writer_agent');
    return 'writer_agent';
  }

  // 默认：如果已经有研究结论了，交给写手写文
  const hasResearch = state.messages.some(
    (m) => typeof m.content === 'string' && m.content.includes('搜索结果'),
  );
  if (hasResearch) {
    console.log('  [supervisor] -> 有研究结论，路由到: writer_agent');
    return 'writer_agent';
  }

  console.log('  [supervisor] -> 任务完成，结束');
  return END;
}

// 子 Agent 执行后，判断是否需要回到 supervisor 继续分配
function afterAgentRoute(state: typeof MessagesAnnotation.State): string {
  // 简单逻辑：如果最近 3 条消息里没有用户的新问题，就结束
  // 演示中固定回到 supervisor
  console.log('  [post-agent] -> 回到 supervisor');
  return 'supervisor';
}

// --- 拼装多 Agent 图 ---
// 图的状态就是消息列表（MessagesAnnotation 标准状态）
const multiAgentGraph = new StateGraph(MessagesAnnotation)
  .addNode('supervisor', async (state) => {
    // supervisor 节点本身不做执行，只是路由枢纽
    console.log('  [supervisor] 分析消息，决定分配...');
    return {}; // 不修改状态，只做路由
  })
  .addNode('research_agent', async (state) => {
    console.log('  [research_agent] 启动研究 Agent...');
    const result = await researchAgent.invoke({ messages: state.messages });
    return { messages: result.messages.slice(-1) }; // 只取最后一条 AI 回复
  })
  .addNode('writer_agent', async (state) => {
    console.log('  [writer_agent] 启动写手 Agent...');
    const result = await writerAgent.invoke({ messages: state.messages });
    return { messages: result.messages.slice(-1) };
  })
  .addEdge(START, 'supervisor')
  .addConditionalEdges('supervisor', supervisorRoute, [
    'research_agent',
    'writer_agent',
    END,
  ])
  // 子 Agent 执行完后回到 supervisor
  .addConditionalEdges('research_agent', afterAgentRoute, ['supervisor', END])
  .addConditionalEdges('writer_agent', afterAgentRoute, ['supervisor', END]);

const app = multiAgentGraph.compile();

// --- 运行 ---
console.log('>>> 多 Agent 协作演示\n');
console.log('用户: 帮我搜索一下 TypeScript 是什么，然后写一段科普\n');

// 为了演示简洁，我们分步执行
console.log('--- 第 1 步：Supervisor 分析，分配给 research_agent ---\n');
const researchResult = await researchAgent.invoke({
  messages: [
    { role: 'human', content: '搜索一下 TypeScript 是什么？' },
  ],
});
console.log(`\n研究结论: ${researchResult.messages[researchResult.messages.length - 1].content}\n`);

console.log('--- 第 2 步：Supervisor 看到研究结论，分配给 writer_agent ---\n');
const writerResult = await writerAgent.invoke({
  messages: [
    { role: 'human', content: '根据以下信息写一段科普：TypeScript 是一种带类型的 JS 超集，由微软维护。' },
  ],
});
console.log('\n写手输出:');
console.log(writerResult.messages[writerResult.messages.length - 1].content);

console.log('\n\n<<< 多 Agent 流程完毕。');
console.log('Supervisor 模式：主管负责"分配"，专家负责"执行"，循环直到任务完成。');
console.log('\n注意：上面的演示是手动拆解的步骤，便于理解。');
console.log('实际用 multiAgentGraph.invoke() 时，Supervisor 会自动路由和循环。');