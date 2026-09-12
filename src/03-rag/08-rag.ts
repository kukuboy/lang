import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createModel } from '../llm.js';
import { FakeEmbeddings } from './fake-embeddings.js';

/**
 * 08 - RAG 检索增强生成
 *
 * RAG 四步走（Retrieve -> Augment -> Generate）：
 * 1. 切分：把长知识文本按语义切成小块（chunk）。
 * 2. 索引：把每个 chunk 向量化，得到"向量 - 文本"映射。
 * 3. 检索：把用户问题向量化，用余弦相似度找出最相关的几个 chunk。
 * 4. 生成：把检索结果拼进 Prompt，交给模型作答。
 *
 * 因为 DeepSeek 没有 Embeddings API，这里用 FakeEmbeddings 本地模拟向量。
 * 概念完全一致，只是检索效果弱一些——真实项目换成 embedding 模型即可。
 */

/** 模拟的知识库文本（实际项目里通常来自长文档/网页） */
const sourceText = [
  'LangChain 是一个用于开发大模型应用的开源框架，提供提示词、模型、检索、智能体等模块。',
  'LangChain.js 是 LangChain 的 JavaScript/TypeScript 版本，常用于 Node.js 后端。',
  'RAG（Retrieval-Augmented Generation）指先检索相关资料，再让模型基于资料生成回答，能有效减少幻觉。',
  'LCEL（LangChain Expression Language）是 LangChain 的声明式组合语法，用管道把各组件串成可运行链路。',
  '向量数据库把文本转成高维向量，用相似度检索最相关的内容，是 RAG 的底座。',
].join('\n');

const model = createModel({ temperature: 0.2 });
const embeddings = new FakeEmbeddings({}); // 本地模拟向量，无需密钥

// --- 第 1 步：切分文档 ---
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 60,
  chunkOverlap: 10,
});
const chunks = await splitter.splitText(sourceText);
console.log('>>> 切分后的 chunk 数量:', chunks.length);

// --- 第 2 步：离线建立索引（向量化每个 chunk）---
const chunkVectors = await embeddings.embedDocuments(chunks);

// 余弦相似度辅助函数
function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// --- 第 3 步：检索最相关的 top-k 个 chunk ---
const query = 'LangChain.js 是什么？和 LangChain 有什么关系？';
const queryVec = await embeddings.embedQuery(query);

const ranked = chunkVectors
  .map((vec, i) => ({ score: cosine(vec, queryVec), index: i }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 2); // top-k = 2

console.log('\n>>> 检索到的最相关片段（含相似度）:');
for (const { score, index } of ranked) {
  console.log(`  [${score.toFixed(3)}] ${chunks[index]}`);
}

// --- 第 4 步：拼进 Prompt 交给模型生成 ---
const context = ranked.map(({ index }) => chunks[index]).join('\n');

const ragChain = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是知识库助手。只能根据下面提供的资料回答；资料里没有的内容，请如实说不知道。\n\n资料：\n{context}`,
  ],
  ['human', '问题：{question}'],
]);

const answer = await ragChain.pipe(model).invoke({ context, question: query });
console.log('\n<<< RAG 生成的回答:');
console.log(answer.content);