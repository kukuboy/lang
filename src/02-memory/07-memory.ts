import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';
import { createModel } from '../llm.js';

/**
 * 07 - 多轮对话记忆（Memory）
 *
 * 目标：让模型"记得"之前的对话。核心就一件事——
 * 把"系统提示 + 整段历史消息 + 本轮输入"重新拼成消息列表回传。
 *
 * 这里用最简单、最透明的做法：自己维护一个历史数组。
 * 等熟悉后你自然会想封装，LangChain 也提供了现成的记忆组件。
 */
const model = createModel();

// 手动维护的历史记录（先后存 Human / AI 消息）
const history: BaseMessage[] = [];
const SYSTEM_PROMPT = '你是一个记忆力很好的助手。';

async function chat(userInput: string) {
  // 组装完整消息列表：system 在最前，中间是历史，最后是本次输入
  const messages: BaseMessage[] = [
    new SystemMessage(SYSTEM_PROMPT),
    ...history,
    new HumanMessage(userInput),
  ];

  const answer = await model.invoke(messages);

  // 记录本轮，供下一轮使用
  history.push(new HumanMessage(userInput), new AIMessage(answer.content));

  console.log(`你  : ${userInput}`);
  console.log(`助手: ${answer.content}\n`);
}

console.log('>>> 开始多轮对话（助手会记得前面聊过的话题）\n');
await chat('你好，我的名字叫小明。');
await chat('我叫什么名字？');

console.log('--- 历史消息数量（不包含 system，共 4 条对话消息）---');
console.log('history 长度:', history.length);
console.log('角色顺序:', history.map((m) => m.constructor.name).join(' -> '));