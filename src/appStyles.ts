import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
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
  voiceButton: {
    backgroundColor: '#e84c4c',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
});