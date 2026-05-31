import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {styles} from './src/appStyles';
import {buildApiServicesPrompt} from './src/ai/apiServicesPrompt';
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

  async function releaseModel() {
    try {
      await releaseModelContext(contextRef.current);

      contextRef.current = null;
      setModelLoaded(false);
      setIsGenerating(false);
      setStatus('Memoria liberada.');
    } catch (error) {
      console.error(error);
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

  async function clearConversationCache() {
    try {
      await clearModelCache(contextRef.current);

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

    const systemPrompt = buildApiServicesPrompt();

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
    };

    // No mandamos historial viejo al modelo.
    // En pantalla se ve todo, pero el modelo solo recibe prompt + última orden.
    const chatForModel: ChatMessage[] = [systemPrompt, userMessage];

    setMessages(prev => [
      ...prev,
      userMessage,
      {
        role: 'assistant',
        content: '',
      },
    ]);

    try {
      setStatus('Generando JSON...');

      const finalAnswer = await generateCompletion({
        context: contextRef.current,
        chat: chatForModel,
        onToken: (_token, fullText) => {
          setMessages(prev => updateLastAssistant(prev, fullText));
        },
      });

      setMessages(prev => updateLastAssistant(prev, finalAnswer));
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