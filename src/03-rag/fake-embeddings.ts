import { Embeddings } from '@langchain/core/embeddings';

/**
 * 本地"模拟"文本向量化器。
 *
 * 为什么需要它：DeepSeek 目前没有独立的 Embeddings 接口，
 * 而 RAG 需要"把文本变成向量"。为了让你不配额外 Key 就能跑通 RAG 例子，
 * 这里用一个可复现的哈希特征把文本转成固定维度的向量。
 *
 * 注意：这只是用来做"概念学习"的玩具模型，检索效果远不如真实嵌入模型。
 * 真实项目里换掉它即可，示例的其余代码（分块 / 向量库 / 检索 / 生成）完全不用改。
 */
export class FakeEmbeddings extends Embeddings {
  /** 向量维度，固定值 */
  private readonly dim = 256;

  /** 把一段文本编码成一个稠密向量。相同文本 -> 相同向量（确定性）。 */
  private encode(text: string): number[] {
    const vec = new Array<number>(this.dim).fill(0);
    const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    // 用 token 的 tokenizer 特征做"词袋 + 哈希"：
    // 对每个 token 的多字节哈希值取模定位维度，累加贡献。
    for (const token of tokens) {
      let h = 2166136261;
      for (let i = 0; i < token.length; i++) {
        h ^= token.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const idx = Math.abs(h) % this.dim;
      vec[idx] += 1;
    }
    // 归一化（按长度），使短文本和长文本可比
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((t) => this.encode(t)));
  }

  embedQuery(text: string): Promise<number[]> {
    return Promise.resolve(this.encode(text));
  }
}