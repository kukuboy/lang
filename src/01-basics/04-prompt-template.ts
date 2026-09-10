import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { createModel } from '../llm.js';

/**
 * 04 - Prompt 模板
 *
 * 目标：让提示词可以复用、动态填充变量。
 * 三种常用写法：
 * 1. fromMessages + [system, human] 段落式模板（推荐，信息分角色清晰）
 * 2. 纯字符串模板（fromTemplate）
 * 3. .partial() 预填系统角色，再逐次填用户内容
 */
const model = createModel();

// --- 方式 1：段落式模板，定义"system 说什么、human 说什么" ---
const template = ChatPromptTemplate.fromMessages([
  ['system', '你是{role}，回答要专业、简洁，且不超过{maxLength}字。'],
  ['human', '{question}'],
]);

// formatMessages 根据变量渲染出一串带角色的消息
const filled = await template.formatMessages({
  role: '一名资深产品经理',
  maxLength: 80,
  question: '请给"学习 LangChain"设计一个 3 步入门路线。',
});

console.log('>>> 模板补全后的消息结构:');
for (const m of filled) {
  // 1.x 中消息的"角色"用构造器名区分（SystemMessage / HumanMessage...）
  console.log(`  [${m.constructor.name}] ${m.content}`);
}

console.log('\n<<< 模型回答:');
const answer = await model.invoke(filled);
console.log(answer.content);

// --- 方式 2：fromTemplate 纯字符串模板（自动推断变量） ---
console.log('\n\n--- 方式 2: PromptTemplate 纯文本 ---');
const topic = '量子纠缠';
const canned = await PromptTemplate.fromTemplate(
  '用{style}风格，用三句话科普「{topic}」。',
).format({ style: '给小朋友讲', topic });
console.log('格式化后:', canned);

// --- 方式 3：先 partial 固定一部分变量 ---
// 把 role 固定，之后只需填 question，适合"角色固定的助手"
const fixedRole = PromptTemplate.fromTemplate('你是{role}。回答：{question}');
// partial() 返回一份"已预填 role"的新模板，后续只补 question
const translated = await fixedRole.partial({ role: '翻译官' });
const query = await translated.format({ question: '把"Hello World"翻成中文' });
console.log('\n--- 方式 3: partial 之后只填 question ---');
console.log('格式化后:', query);