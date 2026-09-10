import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createModel } from '../llm.js';

/**
 * 03 - 角色化的消息（Message）
 *
 * 目标：理解对话的本质是"一串带角色的消息"。
 * - SystemMessage: 系统提示，设定身份/规则，通常放最前面。
 * - HumanMessage: 用户的输入。
 * - AIMessage: 模型上一次的回答（多轮对话时需要回传，模型才知道"你说过什么"）。
 *
 * 注意：简单字符串 invoke() 只是快捷方式，背后就是把它包成一条 HumanMessage。
 */
const model = createModel();

const messages = [
  new SystemMessage(
    '你是一名耐心的初中数学老师。只给提示和步骤，不直接给出最终答案。',
  ),
  new HumanMessage('请帮我想想怎么解这个方程：2x + 3 = 11'),
];

console.log('>>> 发送的消息角色:\n');
console.log('  [system] 你是一名耐心的初中数学老师...');
console.log('  [human ] 请帮我想想怎么解这个方程：2x + 3 = 11\n');

const answer = await model.invoke(messages);
console.log('<<< 回答:');
console.log(answer.content);
console.log('\nanswer 的类型是:', answer.constructor?.name ?? typeof answer);

// --- 多轮对话：把上一轮回答追加进历史，模拟"接着聊" ---
console.log('\n\n--- 第二轮回合（带上上下文继续追问）---\n');
const secondTurn = [
  ...messages,
  answer, // 关键：把上一轮模型回答作为上下文回传
  new HumanMessage('谢谢你，那我再问你一个：5y - 2 = 3y + 8'),
];

const second = await model.invoke([
  ...secondTurn.slice(0, 2), // system + 原问题
  new AIMessage(answer.content),
  new HumanMessage('谢谢你，那我再问你一个：5y - 2 = 3y + 8'),
]);
console.log('<<< 第二轮回合回答:');
console.log(second.content);

// 上面的 secondTurn 只在演示"思路"，实际双轮对话请用下面这种干净的写法（见 07-memory）。