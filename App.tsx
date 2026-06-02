import React, {useEffect, useRef, useState} from 'react';
import {Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View,} from 'react-native';

import {styles} from './src/appStyles';
import {
  buildPlannerPrompt,
  buildSingleActionPrompt,
  type PlannedAction,
} from './src/ai/apiServicesPrompt';

import {
  plannerResponseFormat,
  buildApiServiceResponseFormatForModule,
} from './src/ai/api/schemas';
import {
  ChatMessage,
  DEFAULT_MODEL_PATH,
  LlamaContext,
  clearModelCache,
  generateCompletion,
  loadModelContext,
  prepareModelFolder,
  releaseModelContext,
  stopModelGeneration,
  updateLastAssistant,
} from './src/ai/llamaService';

export default function App() {
  const contextRef = useRef<LlamaContext | null>(null);

  const [modelPath, setModelPath] = useState(DEFAULT_MODEL_PATH);
  const [status, setStatus] = useState('Modelo no cargado.');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [input, setInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hola. Carga un modelo GGUF y escribe una orden. Ejemplo: crea un usuario.',
    },
  ]);

  useEffect(() => {
    handlePrepareFolders();

    return () => {
      releaseModelContext(contextRef.current).catch(console.error);
    };
  }, []);

  async function handlePrepareFolders() {
    try {
      const folderStatus = await prepareModelFolder();
      setStatus(folderStatus);
    } catch (error) {
      console.error(error);
      setStatus('No se pudo crear la carpeta de modelos.');
    }
  }

  async function loadModel() {
    try {
      setStatus('Verificando modelo...');

      if (contextRef.current) {
        setStatus('Liberando modelo anterior...');
        await releaseModelContext(contextRef.current);
        contextRef.current = null;
        setModelLoaded(false);
      }

      setStatus('Cargando modelo en memoria...');

      const {context, statusText} = await loadModelContext(
        modelPath,
        progress => {
          setStatus(`Cargando modelo... ${Math.round(progress * 100)}%`);
        },
      );

      contextRef.current = context;
      setModelLoaded(true);
      setStatus(statusText);
    } catch (error: any) {
      console.error(error);

      Alert.alert('Error cargando modelo', String(error?.message ?? error));

      setStatus(`Error cargando modelo:\n${String(error?.message ?? error)}`);
      setModelLoaded(false);
    }
  }
  async function stopGeneration() {
    try {
      await stopModelGeneration(contextRef.current);
      setStatus('Generación detenida.');
    } catch (error) {
      console.error(error);
    }
  }

  async function clearConversationView() {
  try {
    await clearModelCache(contextRef.current);

    setMessages([
      {
        role: 'assistant',
        content: 'Pantalla y cache limpiadas.',
      },
    ]);

    setStatus('Pantalla y cache del modelo limpiadas.');
  } catch (error) {
    console.error(error);
    setStatus('Error limpiando pantalla/cache.');
  }
}

  type PlannerItem = {
  step: number;
  status: 'ok' | 'unsupported';
  action_key: string;
  };

function formatJsonResponse(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  try {
    const jsonText = text.slice(start, end + 1);
    const parsed = JSON.parse(jsonText);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}

function parsePlannerItems(text: string): PlannerItem[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('El planner no devolvió JSON válido.');
  }

  const jsonText = text.slice(start, end + 1);
  const parsed = JSON.parse(jsonText);

  if (parsed.type !== 'action_plan') {
    throw new Error('La respuesta no es action_plan.');
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error('items debe ser un array.');
  }

  return parsed.items;
}

function actionKeyToPlannedAction(item: PlannerItem): PlannedAction {
  const [module, operation] = item.action_key.split('.');

  if (!module || !operation) {
    throw new Error(`action_key inválido: ${item.action_key}`);
  }

  return {
    step: item.step,
    module,
    operation,
  };
}

  async function sendMessage() {
    const text = input.trim();

    if (!text) {
      return;
    }

    if (!modelLoaded || !contextRef.current) {
      Alert.alert('Primero carga el modelo GGUF.');
      return;
    }

    setInput('');
    setIsGenerating(true);

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
    };

    setMessages(prev => [
      ...prev,
      userMessage,
      {
        role: 'assistant',
        content: '',
      },
    ]);

    try {
      setStatus('Probando planner con JSON Schema...');


      const plannerPrompt = buildPlannerPrompt();

      const finalAnswer = await generateCompletion({
        context: contextRef.current,
        chat: [plannerPrompt, userMessage],
        responseFormat: plannerResponseFormat,
        generationParams: {
          n_predict: 128,
          temperature: 0.1,
          top_p: 0.8,
        },
        onToken: (_token, fullText) => {
          setMessages(prev => updateLastAssistant(prev, fullText));
        },
      });
      const formatted = formatJsonResponse(finalAnswer);
      setMessages(prev => updateLastAssistant(prev, formatted));
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
      <Text style={styles.title}>Local LLM - API Services JSON</Text>

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

        <TouchableOpacity style={styles.button} onPress={handlePrepareFolders}>
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
          style={[styles.button, styles.cacheButton]}
          onPress={clearConversationView}
          disabled={isGenerating}>
          <Text style={styles.buttonText}>Limpiar pantalla/Cache</Text>
        </TouchableOpacity>

        <Text style={styles.status}>{status}</Text>
      </View>

      <ScrollView style={styles.chat}>
        {messages.map((message, index) => (
          <View
            key={`${message.role}-${index}`}
            style={[
              styles.message,
              message.role === 'user'
                ? styles.userMessage
                : styles.assistantMessage,
            ]}>
            <Text style={styles.messageRole}>
              {message.role === 'user' ? 'Tú' : 'IA'}
            </Text>

            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ej: crea un usuario"
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