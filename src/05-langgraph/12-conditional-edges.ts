import { Annotation, StateGraph, START, END, type LangGraphRunnableConfig } from '@langchain/langgraph';
import { createModel } from '../llm.js';

/**
 * 12 - 条件边（Conditional Edges）：让图根据状态"路由"
 *
 * 目标：掌握 LangGraph 的分支路由——addConditionalEdges。
 *
 * 之前 11 是线性流（classify -> respond -> END），
 * 现在让分类节点之后根据结果走不同的后续节点：
 *
 *   START -> classify -> (positive? -> praise)
 *                       (negative? -> comfort)
 *                       (neutral?  -> acknowledge)
 *          -> END
 *
 * addConditionalEdges(source, routerFn, pathMap)
 * - routerFn 返回一个字符串（目标节点名）
 * - pathMap 可选，用来做声明式路由映射
 */

const model = createModel({ temperature: 0.3 });

// --- 定义状态 ---
const GraphState = Annotation.Root({
  input: Annotation<string>,
  category: Annotation<string>,
  response: Annotation<string>,
});

// --- 节点定义 ---

async function classifyNode(state: typeof GraphState.State) {
  console.log(`  [classify] 分析输入: "${state.input}"`);
  // 这里用简单规则模拟分类；真实场景可换成 LLM 分类
  const text = state.input.toLowerCase();
  let category = 'neutral';
  if (/好|棒|赞|nice|great|love|喜欢/.test(text)) category = 'positive';
  else if (/差|糟|坏|bad|hate|糟糕|差评/.test(text)) category = 'negative';
  console.log(`  [classify] -> ${category}`);
  return { category };
}

// 三个不同的后续节点
async function praiseNode(state: typeof GraphState.State) {
  console.log('  [praise] 正面反馈处理中...');
  const answer = await model.invoke(
    `用户说："${state.input}"。这是一条正面反馈。用热情的语气回复，30字以内。`,
  );
  return { response: answer.content as string };
}

async function comfortNode(state: typeof GraphState.State) {
  console.log('  [comfort] 负面反馈处理中...');
  const answer = await model.invoke(
    `用户说："${state.input}"。这是一条负面反馈。用安慰和改进的语气回复，30字以内。`,
  );
  return { response: answer.content as string };
}

async function acknowledgeNode(state: typeof GraphState.State) {
  console.log('  [acknowledge] 中性反馈处理中...');
  const answer = await model.invoke(
    `用户说："${state.input}"。这是一条中性反馈。用平和的语气回复，30字以内。`,
  );
  return { response: answer.content as string };
}

// --- 路由函数：根据 category 返回目标节点名 ---
function routeByCategory(
  state: typeof GraphState.State,
  _config: LangGraphRunnableConfig,
): string {
  const map: Record<string, string> = {
    positive: 'praise',
    negative: 'comfort',
    neutral: 'acknowledge',
  };
  return map[state.category] ?? 'acknowledge';
}

// --- 拼装图 ---
const graph = new StateGraph(GraphState)
  .addNode('classify', classifyNode)
  .addNode('praise', praiseNode)
  .addNode('comfort', comfortNode)
  .addNode('acknowledge', acknowledgeNode)
  .addEdge(START, 'classify')
  // 条件边：classify 之后，按 routeByCategory 的返回值决定走哪条边
  .addConditionalEdges('classify', routeByCategory)
  // 三条分支最终都汇聚到 END
  .addEdge('praise', END)
  .addEdge('comfort', END)
  .addEdge('acknowledge', END);

const app = graph.compile();

// --- 运行三种不同输入 ---
console.log('>>> 测试条件路由（三种输入走不同分支）\n');

console.log('=== 输入 1：正面 ===');
const r1 = await app.invoke({ input: '这个产品太棒了，我很喜欢！' });
console.log(`<<< 回复: ${r1.response}\n`);

console.log('=== 输入 2：负面 ===');
const r2 = await app.invoke({ input: '体验太差了，很糟糕' });
console.log(`<<< 回复: ${r2.response}\n`);

console.log('=== 输入 3：中性 ===');
const r3 = await app.invoke({ input: '我已经用了一周了。' });
console.log(`<<< 回复: ${r3.response}\n`);