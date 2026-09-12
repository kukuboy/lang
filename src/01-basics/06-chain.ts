import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Runnable, RunnableSequence } from '@langchain/core/runnables';
import { createModel } from '../llm.js';

/**
 * 06 - 链（LCEL Runnable）
 *
 * 目标：把"模板 -> 模型 -> 解析"用 |=|/pipe 串起来，形成一条可复用、可追踪的链路。
 * - LCEL = LangChain Expression Language，是贯穿全框架的声明式编程模型。
 * - 只要实现了 Runnable 接口的对象（Prompt、Model、Parser、Retriever...）都能随意串联。
 */
const model = createModel();

// --- 方式 A：用 |=|（pipe）拼一个 RunnableSequence ---
const translationChain = 
  ChatPromptTemplate.fromMessages([
    ['system', '你是专业翻译，把用户文本翻译成{target}，只输出译文。'],
    ['human', '{text}'],
  ]).pipe(model).pipe(new StringOutputParser());

console.log('>>> 用 |=| 串起来: 中文 -> 英文\n');
console.log(
  await translationChain.invoke({ target: 'English', text: '今天天气很好，适合出去走走。' }),
);

// --- 方式 B：显式 RunnableSequence.from，语义等价 ---
const summarizer = RunnableSequence.from([
  ChatPromptTemplate.fromMessages([
    ['system', '用不超过 30 字概括下面内容。'],
    ['human', '{content}'],
  ]),
  model,
  new StringOutputParser(),
]);

console.log('\n>>> RunnableSequence.from: 长文本摘要\n');
console.log(
  await summarizer.invoke({
    content:
      'LangChain 是一个用于开发大模型应用的框架，提供了模型、提示词、检索、智能体等模块，' +
      '并把它们统一成 Runnable 接口方便任意串联，极大简化了从原型到上线的流程。',
  }),
);

// 链本身也是一个 Runnable，可以继续嵌套或复用
console.log('\n--- 补充：链的类型提示（它就是 Runnable，可继续 pipe） ---');
const meta: Runnable<Record<string, string>, string> = translationChain;
void meta;