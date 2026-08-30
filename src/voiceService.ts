import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { initWhisper, WhisperContext } from 'whisper.rn';
import AudioRecord from 'react-native-audio-record';

export const WHISPER_MODEL_PATH =
  `${RNFS.ExternalDirectoryPath}/models/ggml-tiny.bin`;

const WHISPER_PROMPT = `
Comandos para un sistema ERP:
crear cliente, listar clientes, editar cliente, eliminar cliente,
crear compra, listar compras,
crear venta, listar ventas,
crear producto, listar inventario, ajustar stock,
inventario ID, cliente ID, cantidad, costo unitario y precio de venta.
`;


let whisperContext: WhisperContext | null = null;
let whisperLoadingPromise: Promise<WhisperContext> | null = null;
let isRecording = false;
let isTranscribing = false;

// ── Permisos ───────────────────────────────────────────────
export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// ── Cargar modelo una sola vez ─────────────────────────────
export async function loadWhisperModel(): Promise<WhisperContext> {
  if (whisperContext) {
    return whisperContext;
  }

  if (whisperLoadingPromise) {
    return whisperLoadingPromise;
  }

  whisperLoadingPromise = (async () => {
    const exists = await RNFS.exists(WHISPER_MODEL_PATH);

    if (!exists) {
      throw new Error(`Modelo no encontrado en: ${WHISPER_MODEL_PATH}`);
    }

    const context = await initWhisper({
      filePath: WHISPER_MODEL_PATH,
    });

    whisperContext = context;
    return context;
  })();

  try {
    return await whisperLoadingPromise;
  } finally {
    whisperLoadingPromise = null;
  }
}

// ── Precalentar modelo ─────────────────────────────────────
export async function preloadWhisperModel(): Promise<void> {
  await loadWhisperModel();
}

// ── Iniciar grabación ──────────────────────────────────────
export async function startVoiceRecording(): Promise<void> {
  if (isRecording) return;

  const hasPermission = await requestMicPermission();

  if (!hasPermission) {
    throw new Error('Permiso de micrófono denegado');
  }

  AudioRecord.init({
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    //wavFile: AUDIO_PATH,
    wavFile: 'recording.wav', 
  });

  AudioRecord.start();
  isRecording = true;
}

// ── Detener grabación y transcribir con la misma instancia ──
export async function stopVoiceRecording(): Promise<string> {
  if (!isRecording) {
    console.log('No estaba grabando');
    return '';
  }
  if (isTranscribing) {
    throw new Error('Ya está transcribiendo, espera...');
  }

  //await AudioRecord.stop();
  const audioPath2 = await AudioRecord.stop();
  isRecording = false;

  // Esperar que el archivo se cierre correctamente
  await new Promise<void>(resolve => setTimeout(resolve, 500));

  // Verificar que el archivo existe
  //const exists = await RNFS.exists(AUDIO_PATH);
  const exists = await RNFS.exists(audioPath2);
  console.log('Archivo WAV existe:', exists);
  
  if (!exists) {
    console.log('No se generó el archivo de audio');
    return '';
  }

  //const stat = await RNFS.stat(AUDIO_PATH);
  //console.log('Tamaño del archivo:', stat.size, 'bytes');

  const context = await loadWhisperModel();
  isTranscribing = true;//isTranscribing
  try {
    const { promise } = context.transcribe(audioPath2, {
      language: 'es',
      //maxLen: 1,
      prompt: WHISPER_PROMPT,
      maxThreads: 4,
      temperature: 0.1,
      tokenTimestamps: false,
    });
    const result = await promise;
    const trimmed = String(result?.result ?? '').trim();
    return trimmed || '__VACIO__';
  } finally {
    isTranscribing = false;
  }
}