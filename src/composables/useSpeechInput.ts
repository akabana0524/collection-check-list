import { ref } from 'vue'

// Web Speech API は型定義が標準にないため最小限だけ用意する
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((event: any) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/**
 * 音声入力の補助。対応ブラウザでのみ supported = true。
 * onResult に認識結果（文字列）を渡す。
 */
export function useSpeechInput(onResult: (text: string) => void, lang = 'ja-JP') {
  const Ctor = getRecognitionCtor()
  const supported = !!Ctor
  const listening = ref(false)
  let recognition: SpeechRecognitionLike | null = null

  function start() {
    if (!Ctor || listening.value) return
    recognition = new Ctor()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript ?? ''
      if (text) onResult(text)
    }
    recognition.onend = () => {
      listening.value = false
    }
    recognition.onerror = () => {
      listening.value = false
    }
    listening.value = true
    recognition.start()
  }

  function stop() {
    recognition?.stop()
    listening.value = false
  }

  function toggle() {
    listening.value ? stop() : start()
  }

  return { supported, listening, start, stop, toggle }
}
