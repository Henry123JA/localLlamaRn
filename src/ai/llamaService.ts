import RNFS from 'react-native-fs';
import {initLlama, loadLlamaModelInfo, releaseAllLlama} from 'llama.rn';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LlamaContext = any;

export const MODEL_DIR = `${RNFS.ExternalDirectoryPath}/models`;

// Cambia el nombre si tu modelo tiene otro nombre.
export const DEFAULT_MODEL_PATH = `${MODEL_DIR}/qwen15.gguf`;
const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|endoftext|>',
];

const DEFAULT_GENERATION_PARAMS = {
  n_predict: 256,
  temperature: 0.2,
  top_p: 1,
  stop: STOP_WORDS,
};
const LLAMA_PARAMS = {
  n_gpu_layers: 0,
  n_ctx: 1024,//antes 1024
  n_threads: 4,
  n_batch: 128,//antes 64
  use_mlock: false,
};

function toFileUri(path: string) {
  if (path.startsWith('file://')) {
    return path;
  }

  return `file://${path}`;
}

export function updateLastAssistant(
  messages: ChatMessage[],
  content: string,
): ChatMessage[] {
  const copy = [...messages];

  for (let i = copy.length - 1; i >= 0; i--) {
    if (copy[i].role === 'assistant') {
      copy[i] = {
        ...copy[i],
        content,
      };

      return copy;
    }
  }

  return copy;
}

export async function prepareModelFolder() {
  const exists = await RNFS.exists(MODEL_DIR);

  if (!exists) {
    await RNFS.mkdir(MODEL_DIR);
  }

  return `Carpeta de modelos:\n${MODEL_DIR}`;
}

export async function loadModelContext(
  modelPath: string,
  onProgress?: (progress: number) => void,
) {
  const cleanPath = modelPath.trim();

  const exists = await RNFS.exists(cleanPath);

  if (!exists) {
    throw new Error(`No existe el archivo:\n${cleanPath}`);
  }

  const uri = toFileUri(cleanPath);

  const info = await loadLlamaModelInfo(uri);
  console.log('Model info:', info);

  const context = await initLlama(
    {
      model: uri,
      ...LLAMA_PARAMS,
    },
    progress => {
      onProgress?.(progress);
    },
  );

  const statusText = `Modelo cargado correctamente.
GPU activo: ${context.gpu ? 'sí' : 'no'}
${context.reasonNoGPU ? `Motivo sin GPU: ${context.reasonNoGPU}` : ''}`;

  return {
    context,
    info,
    statusText,
  };
}

export async function releaseModelContext(context: LlamaContext | null) {
  if (context) {
    await context.release();
  }

  await releaseAllLlama();
}

export async function stopModelGeneration(context: LlamaContext | null) {
  if (!context) {
    return;
  }

  await context.stopCompletion();
}

export async function clearModelCache(context: LlamaContext | null) {
  if (!context) {
    return;
  }

  await context.clearCache();
}

type GenerateCompletionParams = {
  context: LlamaContext;
  chat: ChatMessage[];
  responseFormat?: any;
  generationParams?: Partial<typeof DEFAULT_GENERATION_PARAMS>;
  onToken?: (token: string, fullText: string) => void;
};

export async function generateCompletion({
  context,
  chat,
  responseFormat,
  generationParams,
  onToken,
}: GenerateCompletionParams) {
  let streamedText = '';

  const completionParams: any = {
    messages: chat,
    ...DEFAULT_GENERATION_PARAMS,
    ...generationParams,
  };

  /**
   * Esto activa JSON Schema / grammar si lo mandamos desde App.tsx.
   * Para planner usamos plannerResponseFormat.
   * Para generator usamos buildApiServiceResponseFormatForModule(...).
   */
  if (responseFormat) {
    completionParams.response_format = responseFormat;
  }

  const result = await context.completion(
    completionParams,
    (data: any) => {
      const token = data?.token ?? '';

      streamedText += token;

      onToken?.(token, streamedText);
    },
  );

  if (!streamedText && result?.text) {
    streamedText = result.text;
  }

  return streamedText;
}