import { Annotation, StateGraph, START, END } from '@langchain/langgraph';

/**
 * 11 - LangGraph StateGraph 基础
 *
 * 目标：理解 LangGraph 的核心三件套——State（状态）、Node（节点）、Edge（边）。
 *
 * - State：一个在节点间传递的"共享对象"。每个节点能读它、改它。
 * - Node：一个函数，接收 state，返回对 state 的更新（局部修改）。
 * - Edge：定义节点之间的执行顺序。START 是入口，END 是出口。
 *
 * 这个示例做一个最简单的线性图：
 *   START -> classify -> respond -> END
 * 先对输入做"分类"（模拟），再据此生成"回复"。
 */

// --- 第 1 步：定义图的状态 ---
// 用 Annotation.Root 定义。每个字段的类型 + 可选 reducer/default。
const GraphState = Annotation.Root({
  // 用户输入的原始文本
  input: Annotation<string>,
  // 分类结果（由 classify 节点写入）
  category: Annotation<string>,
  // 最终回复（由 respond 节点写入）
  response: Annotation<string>,
});

// --- 第 2 步：定义节点（每个节点 = 一个函数，接收 state，返回更新） ---

// 节点 1：把输入"分类"成 positive / negative / neutral
async function classifyNode(
  state: typeof GraphState.State,
): Promise<Partial<typeof GraphState.State>> {
  const text = state.input.toLowerCase();
  let category = 'neutral';
  if (/好|棒|赞|nice|great|love/.test(text)) category = 'positive';
  else if (/差|糟|坏|bad|hate|terrible/.test(text)) category = 'negative';

  console.log(`  [classify] 输入="${state.input}" -> 分类=${category}`);
  return { category }; // 只返回要更新的字段
}

// 节点 2：根据分类结果生成不同的回复
async function respondNode(
  state: typeof GraphState.State,
): Promise<Partial<typeof GraphState.State>> {
  const responses: Record<string, string> = {
    positive: '感谢你的正面反馈！我们很高兴你满意。',
    negative: '很抱歉给你带来了不好的体验，我们会尽快改进。',
    neutral: '已收到你的反馈，感谢留言。',
  };
  const response = responses[state.category] ?? responses.neutral;
  console.log(`  [respond] 分类=${state.category} -> 生成回复`);
  return { response };
}

// --- 第 3 步：拼装图并编译 ---
const graph = new StateGraph(GraphState)
  .addNode('classify', classifyNode)
  .addNode('respond', respondNode)
  // 用 addSequence 串联：classify -> respond
  .addEdge(START, 'classify')
  .addEdge('classify', 'respond')
  .addEdge('respond', END);

const app = graph.compile();

// --- 第 4 步：运行 ---
console.log('>>> 运行 StateGraph（线性：classify -> respond）\n');
const result = await app.invoke({ input: '这个产品太棒了，我很喜欢！' });

console.log('\n<<< 最终状态:');
console.log(JSON.stringify(result, null, 2));

console.log('\n--- 换一个负面输入再跑一遍 ---\n');
const result2 = await app.invoke({ input: '体验太差了，很糟糕' });
console.log('\n<<< 最终状态:');
console.log(JSON.stringify(result2, null, 2));