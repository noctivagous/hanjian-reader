// Web Speech API wrapper for Mandarin TTS.

export function speakChinese(text: string): string | null {
  if (!('speechSynthesis' in window)) return 'TTS not supported';
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang.includes('zh')) || voices[0];
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return null;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
