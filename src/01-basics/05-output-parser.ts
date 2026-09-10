import { z } from 'zod';
import { createModel } from '../llm.js';

/**
 * 05 - 结构化输出（Output Parsing）
 *
 * 目标：让模型"吐"出符合 schema 的 JSON，而不是一段自由文本。
 * - 借助 zod 定义 schema。
 * - withStructuredOutput() 让模型以 JSON 模式返回并自动校验。
 * - 返回的对象可直接 TS 类型使用，方便后续接进业务逻辑。
 */
const model = createModel({ temperature: 0 });

// 用 zod 声明期望的返回结构
const schema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  score: z.number().int().min(0).max(10),
  topics: z.array(z.string()).describe('评论里提到的主题，最多 3 个'),
  summary: z.string().describe('一句话总结'),
});

// withStructuredOutput 会把它包成一个"强制 JSON 输出"的 Runnable
const structuredModel = model.withStructuredOutput(schema);
const answer = await structuredModel.invoke(
  '分析这条用户评论: "屏幕很大，续航也顶，但价格确实有点贵，我还是推荐给重度使用者。"',
);

console.log('<<< 结构化输出（已通过 zod 校验）:');
console.log(JSON.stringify(answer, null, 2));

// 直接访问类型安全的字段
console.log('\n--- 已可直接消费的字段 ---');
console.log('情感:', answer.sentiment, '| 评分:', answer.score, '/10');
console.log('主题:', answer.topics.map((t: string) => '#'.concat(t)).join(' '));
console.log('摘要:', answer.summary);