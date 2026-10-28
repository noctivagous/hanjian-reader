import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';

interface StrokeJson {
  strokes: string[];
  medians: number[][][];
}

const DATA_VERSION = '2.0.1';
const WRITER_SIZE = 180;

function dataUrl(char: string, base: string): string {
  return `${base}/${encodeURIComponent(char)}.json`;
}

async function loadStrokeJson(char: string): Promise<StrokeJson> {
  const local = await fetch(dataUrl(char, '/hanzi-data'));
  if (local.ok) return (await local.json()) as StrokeJson;
  const cdn = await fetch(
    dataUrl(char, `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${DATA_VERSION}`),
  );
  if (!cdn.ok) throw new Error(`no stroke data for ${char}`);
  return (await cdn.json()) as StrokeJson;
}

interface Props {
  char: string;
  strokeCount?: number;
}

type Phase = 'loading' | 'ready' | 'unavailable';

export function StrokeOrder({ char, strokeCount }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<StrokeJson | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [looping, setLooping] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [activeStroke, setActiveStroke] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<{
    remaining: number;
    mistakes: number;
    done: boolean;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let alive = true;
    setPhase('loading');
    setData(null);
    setStepIdx(0);
    setLooping(false);
    setActiveStroke(null);
    setQuiz(null);
    mount.innerHTML = '';

    const writer = HanziWriter.create(mount, char, {
      width: WRITER_SIZE,
      height: WRITER_SIZE,
      padding: 12,
      showOutline: true,
      showCharacter: true,
      strokeColor: '#c73e1d',
      outlineColor: '#E5DDD2',
      radicalColor: '#8A3D1A',
      delayBetweenStrokes: 250,
      charDataLoader: (_ch, onComplete) => {
        loadStrokeJson(_ch).then(onComplete);
      },
      onLoadCharDataSuccess: (json) => {
        if (!alive) return;
        setData({ strokes: json.strokes, medians: json.medians });
        setPhase('ready');
      },
      onLoadCharDataError: () => {
        if (!alive) return;
        setPhase('unavailable');
      },
    });
    writerRef.current = writer;

    return () => {
      alive = false;
      writer.cancelQuiz();
      writerRef.current = null;
      mount.innerHTML = '';
    };
  }, [char]);

  /** hanzi-writer has no stop-loop API: swap back to a fresh static writer. */
  function showStatic() {
    const mount = mountRef.current;
    if (!mount) return;
    stopQuiz();
    setLooping(false);
    mount.innerHTML = '';
    writerRef.current = HanziWriter.create(mount, char, {
      width: WRITER_SIZE,
      height: WRITER_SIZE,
      padding: 12,
      showOutline: true,
      showCharacter: true,
      strokeColor: '#c73e1d',
      outlineColor: '#E5DDD2',
      radicalColor: '#8A3D1A',
      delayBetweenStrokes: 250,
      charDataLoader: (_ch, onComplete) => {
        loadStrokeJson(_ch).then(onComplete);
      },
    });
  }

  function playStroke(i: number) {
    if (!data) return;
    if (looping) showStatic();
    const writer = writerRef.current;
    if (!writer) return;
    const clamped = Math.max(0, Math.min(i, data.strokes.length - 1));
    stopQuiz();
    setStepIdx(clamped);
    setActiveStroke(clamped);
    void writer.animateStroke(clamped);
  }

  function handlePlayAll() {
    if (looping) showStatic();
    const writer = writerRef.current;
    if (!writer || phase !== 'ready') return;
    stopQuiz();
    void writer.animateCharacter();
  }

  function handleLoop() {
    const writer = writerRef.current;
    if (!writer || phase !== 'ready') return;
    if (looping) {
      showStatic();
      return;
    }
    stopQuiz();
    setLooping(true);
    void writer.loopCharacterAnimation();
  }

  function startQuiz() {
    if (looping) showStatic();
    const writer = writerRef.current;
    if (!writer || !data) return;
    setQuiz({ remaining: data.strokes.length, mistakes: 0, done: false });
    writer.quiz({
      leniency: 1.2,
      showHintAfterMisses: 2,
      onMistake: (sd) =>
        setQuiz((q) =>
          q ? { ...q, mistakes: sd.totalMistakes, remaining: sd.strokesRemaining } : q,
        ),
      onCorrectStroke: (sd) =>
        setQuiz((q) => (q ? { ...q, remaining: sd.strokesRemaining } : q)),
      onComplete: () =>
        setQuiz((q) => (q ? { ...q, done: true, remaining: 0 } : q)),
    });
  }

  function stopQuiz() {
    if (!quiz) return;
    writerRef.current?.cancelQuiz();
    setQuiz(null);
  }

  const btn =
    'px-2.5 py-1 rounded-full text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-2)] hover:opacity-80 disabled:opacity-40';
  const btnPrimary =
    'px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 disabled:opacity-40';

  return (
    <div>
      <div className="flex justify-center">
        <div ref={mountRef} style={{ width: WRITER_SIZE, height: WRITER_SIZE }} />
      </div>

      {phase === 'loading' && (
        <div className="text-center text-[11px] text-[var(--ink-mute)] py-1">
          Loading strokes…
        </div>
      )}

      {phase === 'unavailable' && (
        <div className="text-center py-2">
          <div className="serif-sc text-[40px] leading-none">{char}</div>
          <div className="text-[11px] text-[var(--ink-mute)] mt-1">
            Stroke data unavailable
            {strokeCount ? ` · ${strokeCount} strokes` : ''}
          </div>
        </div>
      )}

      {phase === 'ready' && data && (
        <>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            <button type="button" className={btnPrimary} onClick={handlePlayAll}>
              ▶ Play
            </button>
            <button type="button" className={btn} onClick={handleLoop}>
              {looping ? '⏸ Stop loop' : '🔁 Loop'}
            </button>
            <button
              type="button"
              className={btn}
              disabled={stepIdx <= 0}
              onClick={() => playStroke(stepIdx - 1)}
            >
              ‹ Prev
            </button>
            <button
              type="button"
              className={btn}
              disabled={stepIdx >= data.strokes.length - 1}
              onClick={() => playStroke(stepIdx + 1)}
            >
              Next ›
            </button>
            {quiz ? (
              <button type="button" className={btn} onClick={stopQuiz}>
                ✕ End quiz
              </button>
            ) : (
              <button type="button" className={btn} onClick={startQuiz}>
                ✍ Quiz
              </button>
            )}
            <button
              type="button"
              className={btn}
              onClick={() => setShowNumbers((v) => !v)}
              aria-pressed={showNumbers}
            >
              {showNumbers ? '① Hide order' : '① Show order'}
            </button>
          </div>

          <div className="text-center text-[11px] text-[var(--ink-mute)] mt-1.5 h-4">
            {quiz ? (
              quiz.done ? (
                <span>
                  Complete · {quiz.mistakes} mistake{quiz.mistakes === 1 ? '' : 's'}
                </span>
              ) : (
                <span>
                  Draw stroke {data.strokes.length - quiz.remaining + 1} of{' '}
                  {data.strokes.length} · {quiz.mistakes} mistake
                  {quiz.mistakes === 1 ? '' : 's'}
                </span>
              )
            ) : (
              <span>
                Stroke {Math.min(stepIdx + 1, data.strokes.length)} of{' '}
                {data.strokes.length} · tap a stroke below to play it
              </span>
            )}
          </div>

          <svg
            viewBox="0 0 1024 1024"
            className="w-full max-w-[220px] mx-auto h-auto rounded bg-white dark:bg-[#1A1916] border border-[var(--line)] mt-1"
            role="group"
            aria-label={`Stroke order diagram for ${char}`}
          >
            <g transform="translate(0, 900) scale(1, -1)">
              {data.strokes.map((d, i) => (
                <g key={i}>
                  <path d={d} fill="none" stroke="#D8CFC2" strokeWidth={28} />
                  <path
                    d={d}
                    fill="none"
                    stroke={activeStroke === i ? '#c73e1d' : '#A89C8C'}
                    strokeWidth={22}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={90}
                    style={{ cursor: 'pointer' }}
                    onClick={() => playStroke(i)}
                  >
                    <title>{`Stroke ${i + 1}`}</title>
                  </path>
                </g>
              ))}
            </g>
            {showNumbers &&
              data.medians.map((median, i) => {
                const start = median[0];
                if (!start) return null;
                const x = start[0];
                const y = 900 - start[1];
                return (
                  <g
                    key={i}
                    style={{ cursor: 'pointer' }}
                    onClick={() => playStroke(i)}
                  >
                    <circle cx={x} cy={y} r={44} fill="#21201C" />
                    <text
                      x={x}
                      y={y + 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={52}
                      fontWeight={600}
                      fill="#FFF8F0"
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}
          </svg>
        </>
      )}

      <div className="text-center text-[10px] text-[var(--ink-mute)] mt-1.5">
        Strokes: Make Me a Hanzi · Arphic license
      </div>
    </div>
  );
}
