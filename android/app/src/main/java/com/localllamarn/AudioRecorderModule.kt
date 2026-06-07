package com.localllamarn

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import com.facebook.react.bridge.*
import java.io.*

class AudioRecorderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private var isRecording = false
    private var outputPath: String? = null

    companion object {
        const val SAMPLE_RATE = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    override fun getName() = "AudioRecorder"

    @ReactMethod
    fun startRecording(path: String, promise: Promise) {
        try {
            outputPath = path

            val file = File(path)
            file.parentFile?.mkdirs()

            val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            isRecording = true
            audioRecord?.startRecording()

            recordingThread = Thread {
                writePcmToWav(path, bufferSize)
            }
            recordingThread?.start()

            promise.resolve(path)
        } catch (e: Exception) {
            promise.reject("RECORD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            isRecording = false
            recordingThread?.join()
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            promise.resolve(outputPath)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    private fun writePcmToWav(path: String, bufferSize: Int) {
        val pcmData = mutableListOf<Byte>()
        val buffer = ShortArray(bufferSize)

        while (isRecording) {
            val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
            for (i in 0 until read) {
                val short = buffer[i]
                pcmData.add((short.toInt() and 0xFF).toByte())
                pcmData.add((short.toInt() shr 8).toByte())
            }
        }

        writeWavFile(path, pcmData.toByteArray())
    }

    private fun writeWavFile(path: String, pcmData: ByteArray) {
        val totalDataLen = pcmData.size + 36
        val byteRate = SAMPLE_RATE * 2

        val out = FileOutputStream(path)
        out.write("RIFF".toByteArray())
        out.write(intToBytes(totalDataLen))
        out.write("WAVE".toByteArray())
        out.write("fmt ".toByteArray())
        out.write(intToBytes(16))
        out.write(shortToBytes(1))
        out.write(shortToBytes(1))
        out.write(intToBytes(SAMPLE_RATE))
        out.write(intToBytes(byteRate))
        out.write(shortToBytes(2))
        out.write(shortToBytes(16))
        out.write("data".toByteArray())
        out.write(intToBytes(pcmData.size))
        out.write(pcmData)
        out.close()
    }

    private fun intToBytes(value: Int): ByteArray {
        return byteArrayOf(
            (value and 0xFF).toByte(),
            (value shr 8 and 0xFF).toByte(),
            (value shr 16 and 0xFF).toByte(),
            (value shr 24 and 0xFF).toByte()
        )
    }

    private fun shortToBytes(value: Int): ByteArray {
        return byteArrayOf(
            (value and 0xFF).toByte(),
            (value shr 8 and 0xFF).toByte()
        )
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}