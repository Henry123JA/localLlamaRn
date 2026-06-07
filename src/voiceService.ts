import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { initWhisper, WhisperContext } from 'whisper.rn';

const { AudioRecorder } = NativeModules;

export const WHISPER_MODEL_PATH = `${RNFS.ExternalDirectoryPath}/models/ggml-small.bin`;
const AUDIO_PATH = `${RNFS.DocumentDirectoryPath}/recording.wav`;
/*
console.log('DocumentDirectoryPath:', RNFS.DocumentDirectoryPath);
console.log('Modelo existe:', await RNFS.exists(WHISPER_MODEL_PATH));*/
let whisperContext: WhisperContext | null = null;

// ── Permisos ───────────────────────────────────────────────
export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Permiso de micrófono',
      message: 'La app necesita el micrófono para grabar voz',
      buttonPositive: 'Permitir',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// ── Cargar modelo Whisper ──────────────────────────────────
export async function loadWhisperModel(): Promise<WhisperContext> {
  if (whisperContext) return whisperContext;

  const exists = await RNFS.exists(WHISPER_MODEL_PATH);
  if (!exists) throw new Error(`Modelo no encontrado en: ${WHISPER_MODEL_PATH}`);

  whisperContext = await initWhisper({ filePath: WHISPER_MODEL_PATH });
  return whisperContext;
}

// ── Iniciar grabación ──────────────────────────────────────
export async function startVoiceRecording(): Promise<void> {
  const hasPermission = await requestMicPermission();
  if (!hasPermission) throw new Error('Permiso de micrófono denegado');

  await AudioRecorder.startRecording(AUDIO_PATH);
}

// ── Detener grabación y transcribir ───────────────────────
export async function stopVoiceRecording(): Promise<string> {
  const path = await AudioRecorder.stopRecording();

  const context = await loadWhisperModel();

  const { promise } = context.transcribe(path, {
    language: 'es',
    maxLen: 1,
    tokenTimestamps: false,
  });

  const result = await promise;
  return result.result.trim();
}