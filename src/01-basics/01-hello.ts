import { createModel } from '../llm.js';

/**
 * 01 - 最简单的一次对话
 *
 * 目标：跑通 LangChain 的最小闭环。
 * - 只调用大模型，不做任何编排。
 * - 对比：直接"连一个函数"，体验它跟调 SDK 差不多的感觉。
 */
const model = createModel();

const question = '用一句话解释：什么是 Large Language Model（大模型）？';

console.log(`>>> 问题: ${question}\n`);

// invoke() 是 LangChain Runnable 的统一入口，接收输入、返回完整结果。
// 这里没有 Prompt 模板，直接把字符串喂给模型。
const answer = await model.invoke(question);

// answer 是一个 AIMessage 对象，.content 才是文本内容。
console.log('<<< 回答:');
console.log(answer.content);

// --- 补充：看看返回对象里有哪些字段 ---
console.log('\n--- AIMessage 元信息 ---');
console.log('类型        :', answer.constructor?.name ?? typeof answer);
console.log('usage_metadata:', JSON.stringify(answer.usage_metadata ?? {}));