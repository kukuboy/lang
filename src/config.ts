import 'dotenv/config';

/**
 * 全局配置：统一从 .env 读取，集中管理键名与校验。
 * 示例文件里调用这些常量，避免到处 magic string。
 */
export const config = {
  /** DeepSeek 密钥 */
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  /** API 基地址（默认官方，可切换国内可用的 OpenAI 兼容服务） */
  baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  /** 聊天模型，DeepSeek 官方给的两个名字之一 */
  chatModel: process.env.DEEPSEEK_CHAT_MODEL ?? 'deepseek-chat',
  /** 需要工具/函数调用时可改为 deepseek-reasoner 之外的 thinking 模型 */
  reasonerModel: 'deepseek-reasoner',
  /** 默认生成温度 */
  temperature: Number(process.env.MODEL_TEMPERATURE ?? 0.7),
} as const;

/**
 * 判断密钥是否已配置。示例在真正发起调用前置路由一下，避免报出很看不懂的 401。
 * 注意：RAG 模块用的是本地模拟向量，不依赖本密钥。
 */
export function assertApiKey() {
  if (!config.apiKey || config.apiKey === 'sk-xxxxxxxxxxxxxxxx') {
    throw new Error(
      [
        '缺少 DEEPSEEK_API_KEY。',
        '请先复制 .env.example 为 .env，并填入你的 DeepSeek API 密钥。',
        '申请地址: https://platform.deepseek.com',
        '然后运行: cp .env.example .env',
      ].join('\n'),
    );
  }
}