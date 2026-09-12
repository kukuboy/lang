import { ChatOpenAI } from '@langchain/openai';
import { config, assertApiKey } from './config.js';

/**
 * 统一的模型工厂。
 *
 * DeepSeek 走的是 OpenAI 兼容接口，所以用 @langchain/openai 里的 ChatOpenAI，
 * 只需要把 baseURL 指到 DeepSeek、把 model 换成 deepseek-chat 即可。
 * 这样"换上任意 OpenAI 兼容服务"都只改这里的配置，业务代码不用动。
 */
export function createModel(overrides?: {
  model?: string;
  temperature?: number;
  maxRetries?: number;
}) {
  assertApiKey();
  return new ChatOpenAI({
    apiKey: config.apiKey,
    configuration: { baseURL: config.baseUrl },
    model: overrides?.model ?? config.chatModel,
    temperature: overrides?.temperature ?? config.temperature,
    maxRetries: overrides?.maxRetries ?? 2,
  });
}

/** 带工具调用/结构化输出能力时，返回支持重试的模型 */
export function createFunctionCallingModel() {
  return createModel({ temperature: 0 });
}