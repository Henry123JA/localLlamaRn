import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import RNFS from 'react-native-fs';
import {initLlama, loadLlamaModelInfo, releaseAllLlama} from 'llama.rn';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ManualToolCall = {
  tool: string;
  args?: Record<string, unknown>;
};

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

const MODEL_DIR = `${RNFS.ExternalDirectoryPath}/models`;
const DEFAULT_MODEL_PATH = `${MODEL_DIR}/qwen2.5-0.5b-instruct-q4_k_m.gguf`;

function toFileUri(path: string) {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

function updateLastAssistant(
  messages: ChatMessage[],
  content: string,
): ChatMessage[] {
  const copy = [...messages];
  for (let i = copy.length - 1; i >= 0; i--) {
    if (copy[i].role === 'assistant') {
      copy[i] = {...copy[i], content};
      return copy;
    }
  }
  return copy;
}

function tryParseToolCall(text: string): ManualToolCall | null {
  try {
    const cleaned = text.trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.tool === 'string'
    ) {
      return parsed as ManualToolCall;
    }

    return null;
  } catch {
    return null;
  }
}

function executeLocalTool(call: ManualToolCall) {
  switch (call.tool) {
    case 'get_current_time': {
      return {
        ok: true,
        result: new Date().toLocaleString(),
      };
    }

    case 'sum_numbers': {
      const a = Number(call.args?.a);
      const b = Number(call.args?.b);

      if (Number.isNaN(a) || Number.isNaN(b)) {
        return {
          ok: false,
          error: 'Los argumentos a y b deben ser números.',
        };
      }

      return {
        ok: true,
        result: a + b,
      };
    }

    default:
      return {
        ok: false,
        error: `Tool no soportada: ${call.tool}`,
      };
  }
}

export default function App() {
  const contextRef = useRef<any>(null);

  const [modelPath, setModelPath] = useState(DEFAULT_MODEL_PATH);
  const [status, setStatus] = useState('Modelo no cargado.');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [input, setInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hola. Carga un modelo GGUF primero y luego escribe una pregunta.',
    },
  ]);

  useEffect(() => {
    prepareFolders();

    return () => {
      releaseModel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function prepareFolders() {
    try {
      const exists = await RNFS.exists(MODEL_DIR);
      if (!exists) {
        await RNFS.mkdir(MODEL_DIR);
      }
      setStatus(`Carpeta de modelos:\n${MODEL_DIR}`);
    } catch (error) {
      console.error(error);
      setStatus('No se pudo crear la carpeta de modelos.');
    }
  }

  async function loadModel() {
    try {
      setStatus('Verificando modelo...');

      const cleanPath = modelPath.trim();
      const exists = await RNFS.exists(cleanPath);

      if (!exists) {
        Alert.alert(
          'Modelo no encontrado',
          `No existe el archivo:\n\n${cleanPath}`,
        );
        setStatus('Modelo no encontrado.');
        return;
      }

      if (contextRef.current) {
        setStatus('Liberando modelo anterior...');
        await contextRef.current.release();
        contextRef.current = null;
        setModelLoaded(false);
      }

      const uri = toFileUri(cleanPath);

      setStatus('Leyendo información del modelo...');
      const info = await loadLlamaModelInfo(uri);
      console.log('Model info:', info);

      setStatus('Cargando modelo en memoria...');

      const context = await initLlama(
        {
          model: uri,
          n_gpu_layers: 0,
          n_ctx: 1024,
          n_threads: 4,
          n_batch: 64,
          use_mlock: false,
        },
        progress => {
          setStatus(`Cargando modelo... ${Math.round(progress * 100)}%`);
        },
      );

      contextRef.current = context;
      setModelLoaded(true);

      setStatus(
        `Modelo cargado correctamente.\nGPU activo: ${
          context.gpu ? 'sí' : 'no'
        }\n${context.reasonNoGPU ? `Motivo sin GPU: ${context.reasonNoGPU}` : ''}`,
      );
    } catch (error: any) {
      console.error(error);
      setStatus(`Error cargando modelo:\n${String(error?.message ?? error)}`);
      setModelLoaded(false);
    }
  }

  async function releaseModel() {
    try {
      if (contextRef.current) {
        await contextRef.current.release();
        contextRef.current = null;
      }

      // Limpieza global por seguridad.
      await releaseAllLlama();

      setModelLoaded(false);
      setIsGenerating(false);
      setStatus('Memoria liberada.');
    } catch (error) {
      console.error(error);
    }
  }

  async function stopGeneration() {
    try {
      if (contextRef.current) {
        await contextRef.current.stopCompletion();
        setStatus('Generación detenida.');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function clearConversationCache() {
    try {
      if (contextRef.current) {
        await contextRef.current.clearCache();
      }

      setMessages([
        {
          role: 'assistant',
          content: 'Conversación reiniciada.',
        },
      ]);

      setStatus('Cache de conversación limpiada.');
    } catch (error) {
      console.error(error);
    }
  }

  async function generateCompletion(chat: ChatMessage[]) {
    let streamedText = '';

    const result = await contextRef.current.completion(
      {
        messages: chat,
        n_predict: 128,
        temperature: 0.5,
        top_p: 0.8,
        stop: STOP_WORDS,
      },
      (data: any) => {
        const token = data?.token ?? '';
        streamedText += token;

        setMessages(prev => updateLastAssistant(prev, streamedText));
      },
    );

    if (!streamedText && result?.text) {
      streamedText = result.text;
      setMessages(prev => updateLastAssistant(prev, streamedText));
    }

    return streamedText;
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text) return;

    if (!modelLoaded || !contextRef.current) {
      Alert.alert('Primero carga el modelo GGUF.');
      return;
    }

    setInput('');
    setIsGenerating(true);

    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `
Eres un asistente útil, claro y breve.

También puedes pedir herramientas locales, pero solo si realmente hacen falta.

Herramientas disponibles:
1. get_current_time
   Args: {}

2. sum_numbers
   Args: {"a": number, "b": number}

Si necesitas una herramienta, responde únicamente JSON válido así:
{"tool":"get_current_time","args":{}}

o:
{"tool":"sum_numbers","args":{"a":2,"b":3}}

Si no necesitas herramienta, responde normal.
`.trim(),
    };

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
    };

    const historyForModel = [
      systemPrompt,
      /*...messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-8),*/
      userMessage,
    ];

    setMessages(prev => [
      ...prev,
      userMessage,
      {
        role: 'assistant',
        content: '',
      },
    ]);

    try {
      setStatus('Generando respuesta...');

      const firstAnswer = await generateCompletion(historyForModel);

      const toolCall = tryParseToolCall(firstAnswer);

      if (toolCall) {
        setStatus(`Ejecutando tool local: ${toolCall.tool}`);

        const toolResult = executeLocalTool(toolCall);

        const followUpMessages: ChatMessage[] = [
          ...historyForModel,
          {
            role: 'assistant',
            content: firstAnswer,
          },
          {
            role: 'user',
            content: `
Resultado de la herramienta local:
${JSON.stringify(toolResult)}

Ahora responde al usuario de forma natural y breve.
`.trim(),
          },
        ];

        setMessages(prev =>
          updateLastAssistant(prev, 'Tool ejecutada. Generando respuesta final...'),
        );

        await generateCompletion(followUpMessages);
      }

      setStatus('Listo.');
    } catch (error: any) {
      console.error(error);
      setStatus(`Error generando:\n${String(error?.message ?? error)}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Local LLM - React Native + llama.rn</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Ruta del modelo GGUF:</Text>

        <TextInput
          style={styles.pathInput}
          value={modelPath}
          onChangeText={setModelPath}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.button} onPress={prepareFolders}>
          <Text style={styles.buttonText}>Crear carpeta / mostrar ruta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.loadButton]}
          onPress={loadModel}
          disabled={isGenerating}>
          <Text style={styles.buttonText}>
            {modelLoaded ? 'Recargar modelo' : 'Cargar modelo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.releaseButton]}
          onPress={releaseModel}
          disabled={isGenerating}>
          <Text style={styles.buttonText}>Liberar memoria</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cacheButton]}
          onPress={clearConversationCache}
          disabled={!modelLoaded || isGenerating}>
          <Text style={styles.buttonText}>Limpiar conversación</Text>
        </TouchableOpacity>

        <Text style={styles.status}>{status}</Text>
      </View>

      <ScrollView style={styles.chat}>
        {messages.map((m, index) => (
          <View
            key={`${m.role}-${index}`}
            style={[
              styles.message,
              m.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}>
            <Text style={styles.messageRole}>
              {m.role === 'user' ? 'Tú' : 'IA'}
            </Text>
            <Text style={styles.messageText}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor="#888"
          editable={!isGenerating}
          multiline
        />

        {isGenerating ? (
          <TouchableOpacity style={styles.stopButton} onPress={stopGeneration}>
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.buttonText}>Enviar</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
    padding: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1b1b22',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  label: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 6,
  },
  pathInput: {
    backgroundColor: '#292933',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  loadButton: {
    backgroundColor: '#2563eb',
  },
  releaseButton: {
    backgroundColor: '#b91c1c',
  },
  cacheButton: {
    backgroundColor: '#6d28d9',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  status: {
    color: '#cfcfcf',
    marginTop: 10,
    fontSize: 12,
  },
  chat: {
    flex: 1,
    marginBottom: 10,
  },
  message: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  userMessage: {
    backgroundColor: '#1e3a8a',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  assistantMessage: {
    backgroundColor: '#262633',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageRole: {
    color: '#aaa',
    fontSize: 11,
    marginBottom: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
  },
  inputArea: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1b1b22',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 10,
  },
  stopButton: {
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 10,
  },
});
//npx react-native start --port 8081 --reset-cache
//para corre la apk npm run android