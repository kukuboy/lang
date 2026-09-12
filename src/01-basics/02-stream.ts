import { createModel } from '../llm.js';

/**
 * 02 - 流式输出
 *
 * 目标：体验 token 逐字流出的效果。
 * - 对比 01：invoke() 等全部生成完才返回；stream() 边生成边吐。
 * - 适合聊天框"打字机"效果的底层实现思路。
 */
const model = createModel();

const question = '写一段 100 字左右的自我介绍。';

console.log('>>> 流式输出开始（逐 token 打印）:\n');

// stream() 返回一个 ReadableStream，用 for await 消费。
const stream = await model.stream(question);
let full = '';
for await (const chunk of stream) {
  process.stdout.write(chunk.content as string);
  full += chunk.content;
}
console.log('\n\n<<< 流式结束，拼接后的完整内容已打印在上面。');

// 流式的好处之一：可以按需丢弃/截断，不必等完整结果。
console.log('\n--- 也可以按标准输出符号位打印 ---');
const stream2 = await model.stream('从 1 数到 3，用逗号分隔。');
process.stdout.write('> ');
for await (const chunk of stream2) {
  process.stdout.write((chunk.content as string).replaceAll(',', ' ,'));
}
console.log('\n');
void full;