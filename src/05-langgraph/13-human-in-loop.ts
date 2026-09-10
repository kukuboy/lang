import { Annotation, StateGraph, START, END, MemorySaver, interrupt } from '@langchain/langgraph';

/**
 * 13 - 人工介入（Human-in-the-Loop）
 *
 * 目标：在图执行到某个节点时暂停，等"人"确认后再继续。
 *
 * LangGraph 的做法：
 * 1. compile() 时传入 checkpointer（MemorySaver），让图拥有"断点恢复"能力。
 * 2. 用 interrupt(value) 在节点内部发起中断，图会暂停并返回 value 给调用方。
 * 3. 调用方拿到中断信息后，可以人工决策，再调用 Command({ resume }) 恢复执行。
 *
 * 本示例模拟"草拟邮件 -> 人工审核 -> 发送"的流程：
 *   START -> draft -> [interrupt: 等人工确认] -> send -> END
 */

// --- 状态 ---
const GraphState = Annotation.Root({
  topic: Annotation<string>,        // 邮件主题
  draft: Annotation<string>,        // 草拟的邮件内容
  approved: Annotation<boolean>,     // 是否人工审核通过
  result: Annotation<string>,        // 最终结果
});

// --- 节点 1：草拟邮件 ---
// 注意：节点名不能和状态字段名重复，这里用 writeDraft
async function writeDraftNode(state: typeof GraphState.State) {
  console.log(`  [writeDraft] 为主题"${state.topic}"草拟邮件...`);
  const draft = `关于"${state.topic}"的邮件草稿：感谢您的关注，关于该事项我们已经讨论并有了初步方案...`;
  console.log(`  [writeDraft] 草稿已生成（${draft.length}字）`);
  return { draft }; // 写入 state.draft 字段
}

// --- 节点 2：人工审核（用 interrupt 暂停）---
async function reviewNode(state: typeof GraphState.State) {
  console.log('  [review] 等待人工审核...');

  // interrupt() 会暂停整张图的执行，把传入的值返回给调用方。
  // 当调用方用 Command({ resume: true/false }) 恢复时，interrupt() 会返回 resume 的值。
  // interrupt<I, R>：I = 中断时传递给调用方的信息类型，R = resume 时返回的类型
  const approved = interrupt<{ question: string; draft: string }, boolean>({
    question: '请审核以下邮件草稿，是否同意发送？',
    draft: state.draft,
  });

  console.log(`  [review] 审核结果: ${approved ? '通过' : '驳回'}`);
  return { approved };
}

// --- 节点 3：根据审核结果决定 ---
async function sendNode(state: typeof GraphState.State) {
  if (state.approved) {
    console.log('  [send] 邮件已发送!');
    return { result: '邮件已成功发送。' };
  }
  console.log('  [send] 邮件被驳回，未发送。');
  return { result: '邮件被人工驳回。' };
}

// --- 路由：审核后根据 approved 走不同出口 ---
function routeAfterReview(state: typeof GraphState.State): string {
  return 'send'; // 都走到 send 节点（send 内部判断）
}

// --- 拼装图，关键：compile 时传 checkpointer ---
const graph = new StateGraph(GraphState)
  .addNode('writeDraft', writeDraftNode)
  .addNode('review', reviewNode)
  .addNode('send', sendNode)
  .addEdge(START, 'writeDraft')
  .addEdge('writeDraft', 'review')
  .addConditionalEdges('review', routeAfterReview)
  .addEdge('send', END);

// MemorySaver 是内存里的断点保存器；真实项目可换 Redis/Postgres
const checkpointer = new MemorySaver();
const app = graph.compile({ checkpointer });

// --- 运行：第一阶段（会被中断）---
console.log('>>> 阶段 1：草拟邮件 + 等人工审核\n');

// 配置一个 thread_id，让 checkpointer 能区分不同对话/执行流
const config = { configurable: { thread_id: 'email-1' } };

// 第一次 invoke：图会跑到 review 节点的 interrupt 处暂停
const firstRun = await app.invoke({ topic: 'Q3 季度汇报' }, config);
console.log('\n<<< 第一阶段中断，当前状态:');
console.log(JSON.stringify(firstRun, null, 2));

// --- 模拟人工决策：查看中断信息 ---
const stateSnapshot = await app.getState(config);
console.log('\n--- 当前中断信息 ---');
console.log('下一步节点:', stateSnapshot.next);
console.log('中断任务:', JSON.stringify(stateSnapshot.tasks, null, 2));

// --- 运行：第二阶段（人工审核通过，恢复执行）---
console.log('\n>>> 阶段 2：人工审核通过，恢复执行\n');

// 用 Command 恢复执行，resume 的值会作为 interrupt() 的返回值
const { Command } = await import('@langchain/langgraph');
const finalResult = await app.invoke(
  new Command({ resume: true }),
  config,
);

console.log('\n<<< 最终结果:');
console.log(JSON.stringify(finalResult, null, 2));