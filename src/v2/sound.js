// Original synthesized instruments and melodies. No samples or network resources.
export const clampVolume = (value, fallback) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
export function soundSettings(settings = {}) {
  return {
    masterMute:
      typeof settings.masterMute === "boolean"
        ? settings.masterMute
        : settings.sound === false,
    musicVolume: clampVolume(settings.musicVolume, 0.6),
    sfxVolume: clampVolume(settings.sfxVolume, 0.8),
  };
}
export function selectTrack(screen, floor = 1, boss = false) {
  if (screen === "credits" || screen === "victory") return "victory";
  if (screen === "game" || screen === "pause")
    return boss
      ? "boss"
      : `world${Math.max(1, Math.min(3, Math.ceil(floor / 3)))}`;
  return "title";
}
// Each theme: root MIDI note, step length (s), 16-step lead (semitones from root, null = rest),
// bass steps, 4-chord progression (one chord per 4 steps), drum pattern and lead waveform.
// All melodies are original.
const themes = {
  title: {
    root: 57, beat: 0.3, wave: "triangle",
    lead: [12, null, 15, 14, 12, null, 10, null, 7, null, 10, 12, 14, null, 12, null],
    bass: [0, 8], chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-5, -1, 2]],
    kick: [], hat: [],
  },
  world1: {
    root: 52, beat: 0.24, wave: "triangle",
    lead: [7, null, 10, 12, null, 10, 7, null, 5, 7, null, 3, 5, null, 2, null],
    bass: [0, 6, 8, 14], chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]],
    kick: [0, 8], hat: [4, 12],
  },
  world2: {
    root: 50, beat: 0.27, wave: "sine",
    lead: [0, null, 1, null, 7, null, 8, 7, null, 5, 1, null, 0, null, null, null],
    bass: [0, 4, 8, 12], chords: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [-5, -1, 2]],
    kick: [0], hat: [2, 6, 10, 14],
  },
  world3: {
    root: 45, beat: 0.2, wave: "sawtooth",
    lead: [0, 1, null, 6, 7, null, 6, 3, 1, null, 0, null, 6, 7, 10, null],
    bass: [0, 2, 6, 8, 10, 14], chords: [[0, 3, 6], [1, 4, 8], [-2, 1, 5], [-1, 3, 6]],
    kick: [0, 6, 8, 14], hat: [2, 4, 10, 12],
  },
  boss: {
    root: 43, beat: 0.16, wave: "square",
    lead: [12, 12, 13, null, 12, 10, 7, null, 12, 12, 13, null, 15, 13, 12, 10],
    bass: [0, 2, 4, 6, 8, 10, 12, 14], chords: [[0, 3, 6], [1, 4, 7], [0, 3, 6], [-2, 1, 5]],
    kick: [0, 4, 8, 10, 12], hat: [2, 6, 14],
  },
  victory: {
    root: 60, beat: 0.26, wave: "triangle",
    lead: [0, 4, 7, 12, null, 11, 12, 14, 16, null, 14, 12, 11, 7, 12, null],
    bass: [0, 8], chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]],
    kick: [0, 8], hat: [4, 12],
  },
};
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// Frequency, duration, noise blend; each cue has its own envelope and register.
const cues = {
  swordSwing: [160, 0.13, 0.8],
  swordHit: [240, 0.14, 0.5],
  bowDraw: [110, 0.19, 0.35],
  arrowRelease: [650, 0.1, 0.5],
  arrowHit: [340, 0.12, 0.6],
  arrowWall: [150, 0.12, 0.5],
  footstep: [100, 0.06, 1],
  armorClank: [2200, 0.08, 0],
  playerHurt: [95, 0.23, 0.4],
  enemyHit: [180, 0.08, 0.35],
  enemyDeath: [130, 0.25, 0.5],
  dash: [300, 0.15, 0.8],
  pickupGold: [1100, 0.12, 0],
  pickupHeal: [660, 0.27, 0],
  chestOpen: [440, 0.32, 0.2],
  doorOpen: [90, 0.3, 0.65],
  doorClose: [70, 0.25, 0.7],
  uiTap: [620, 0.055, 0],
  uiBack: [330, 0.08, 0],
  reward: [880, 0.36, 0],
  levelUp: [740, 0.4, 0],
  bossRoar: [45, 0.65, 0.5],
  bossSlam: [55, 0.4, 0.75],
  victory: [1046, 0.7, 0],
  defeat: [110, 0.7, 0.2],
};
export function createSound(env = globalThis, initial = {}) {
  let context,
    master,
    music,
    sfx,
    timer,
    noise,
    suspended = false,
    settings = soundSettings(initial),
    track = "title",
    paused = false,
    voices = [],
    last = new Map();
  const safe = (fn) => {
    try {
      return fn();
    } catch {
      return undefined;
    }
  };
  // A voice is one complete cue, including its delayed layers and modulators.
  const activeSfx = new Set();
  let buildingVoice;
  function ended(source, nodes, voice = buildingVoice) {
    if (voice) voice.add(source);
    source.onended = () => {
      for (const node of [source, ...nodes]) safe(() => node.disconnect());
      if (voice) {
        voice.delete(source);
        if (!voice.size) activeSfx.delete(voice);
      }
    };
  }
  function volumes() {
    if (!context) return;
    master.gain.setTargetAtTime(
      settings.masterMute ? 0 : 0.65,
      context.currentTime,
      0.025,
    );
    music.gain.setTargetAtTime(
      settings.musicVolume * (paused ? 0.25 : 1),
      context.currentTime,
      0.1,
    );
    sfx.gain.setTargetAtTime(settings.sfxVolume, context.currentTime, 0.025);
  }
  function tone(
    bus,
    time,
    frequency,
    duration,
    amplitude = 0.12,
    type = "triangle",
    blend = 0,
  ) {
    const gain = context.createGain(),
      oscillator = context.createOscillator();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(amplitude, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    gain.connect(bus);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.72,
      time + duration,
    );
    oscillator.connect(gain);
    oscillator.start(time);
    oscillator.stop(time + duration);
    ended(oscillator, [gain], bus === sfx ? buildingVoice : undefined);
    if (blend && noise) {
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        ng = context.createGain();
      source.buffer = noise;
      filter.type = "lowpass";
      filter.frequency.value = frequency * 5;
      ng.gain.setValueAtTime(amplitude * blend, time);
      ng.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      source.connect(filter);
      filter.connect(ng);
      ng.connect(bus);
      source.start(time);
      source.stop(time + duration);
      ended(source, [filter, ng], bus === sfx ? buildingVoice : undefined);
    }
  }
  function pad(bus, time, frequency, duration, amplitude) {
    const gain = context.createGain(),
      oscillator = context.createOscillator();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(amplitude, time + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.detune.setValueAtTime(Math.random() * 10 - 5, time);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  function drum(bus, time, kind) {
    if (kind === "kick") {
      const gain = context.createGain(),
        oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(130, time);
      oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
      oscillator.connect(gain);
      gain.connect(bus);
      oscillator.start(time);
      oscillator.stop(time + 0.24);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      return;
    }
    if (!noise) return;
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noise;
    filter.type = "highpass";
    filter.frequency.value = 6500;
    gain.gain.setValueAtTime(0.035, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(time, Math.random() * 0.5);
    source.stop(time + 0.06);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  // Barrido de ruido filtrado: espadazos, esquives y rugidos tienen "aire", no sólo tono.
  function sweep(time, from, to, duration, amplitude, q = 1.4) {
    if (!noise) return;
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noise;
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, time);
    filter.frequency.exponentialRampToValueAtTime(to, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(amplitude, time + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfx);
    source.start(time, Math.random() * 0.4);
    source.stop(time + duration);
    ended(source, [filter, gain]);
  }
  // Each layer owns its complete graph; modulation nodes end with their carrier.
  function layer(time, { frequency = 100, to = frequency, duration = 0.1,
    amplitude = 0.05, wave = "sine", noise: isNoise = false,
    filter: filterType, cutoff = 1000, cutoffTo = cutoff, q = 1,
    modulation = 0, vibrato = false, attack = 0.003, pitchDuration = duration } = {}) {
    const source = isNoise ? context.createBufferSource() : context.createOscillator();
    const gain = context.createGain(), nodes = [gain];
    if (isNoise) source.buffer = noise;
    else {
      source.type = wave;
      source.frequency.setValueAtTime(frequency, time);
      source.frequency.exponentialRampToValueAtTime(to, time + pitchDuration);
    }
    let tail = source;
    if (filterType) {
      const filter = context.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(cutoffTo, time + duration);
      if (filter.Q) filter.Q.setValueAtTime(q, time);
      tail.connect(filter);
      tail = filter;
      nodes.push(filter);
    }
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(amplitude, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    tail.connect(gain);
    gain.connect(sfx);
    if (modulation) {
      const lfo = context.createOscillator(), depth = context.createGain();
      lfo.frequency.setValueAtTime(vibrato ? 29 : 17, time);
      lfo.frequency.linearRampToValueAtTime(vibrato ? 22 : 31, time + duration);
      depth.gain.setValueAtTime(modulation, time);
      depth.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      lfo.connect(depth);
      depth.connect(vibrato ? source.frequency : gain.gain);
      ended(lfo, [depth]);
      lfo.start(time);
      lfo.stop(time + duration);
    }
    ended(source, nodes);
    source.start(time);
    source.stop(time + duration);
  }
  function instrument(name, time, opts) {
    const jitter = 0.98 + Math.random() * 0.04;
    const noiseLayer = (options) => layer(time, { noise: true, ...options });
    switch (name) {
      case "swordSwing": {
        const [from, to, duration, pitch] = [
          [650, 3200, 0.14, 820], [2900, 550, 0.18, 620], [950, 260, 0.28, 310],
        ][[0, 1, 2].includes(opts.variant) ? opts.variant : 0];
        sweep(time, from * jitter, to * jitter, duration, 0.19, 1.1);
        layer(time, { frequency: pitch * jitter, to: pitch * jitter * 0.8,
          duration, amplitude: 0.012, wave: "sine" });
        return true;
      }
      case "swordHit": {
        const base = (opts.heavy ? 530 : 660) * jitter;
        noiseLayer({ duration: 0.018, amplitude: opts.heavy ? 0.15 : 0.1,
          filter: "highpass", cutoff: 1800 });
        [1, 2.76, 5.4, 8.9].forEach((ratio, i) => layer(time, {
          frequency: base * ratio, duration: [0.35, 0.22, 0.13, 0.07][i],
          amplitude: (opts.heavy ? 0.12 : 0.085) / (i + 1),
          wave: i === 1 ? "triangle" : "sine",
        }));
        layer(time, { frequency: opts.heavy ? 100 : 145, to: 55,
          duration: 0.13, amplitude: opts.heavy ? 0.15 : 0.09 });
        return true;
      }
      case "bowDraw":
        layer(time, { frequency: 86 * jitter, to: 108 * jitter, wave: "sawtooth",
          duration: 0.3, amplitude: 0.025, filter: "bandpass", cutoff: 380,
          cutoffTo: 650, q: 2, modulation: 0.009, attack: 0.025 });
        for (const offset of [0.04, 0.117, 0.231]) layer(time + offset, {
          noise: true, duration: 0.009, amplitude: 0.008,
          filter: "bandpass", cutoff: 1100 * jitter,
        });
        return true;
      case "arrowRelease":
        layer(time, { frequency: 210 * jitter, to: 177 * jitter, wave: "triangle",
          duration: 0.25, amplitude: 0.11, filter: "lowpass", cutoff: 2400,
          cutoffTo: 600, modulation: 5, vibrato: true, pitchDuration: 0.035 });
        sweep(time, 5400 * jitter, 1800 * jitter, 0.12, 0.12, 2);
        return true;
      case "arrowWall":
        layer(time, { frequency: 150, to: 60, duration: 0.12, amplitude: 0.13 });
        noiseLayer({ duration: 0.01, amplitude: 0.1, filter: "highpass", cutoff: 2200 });
        noiseLayer({ duration: 0.14, amplitude: 0.12, filter: "bandpass", cutoff: 400, q: 5 });
        return true;
      case "arrowHit":
        noiseLayer({ duration: 0.09, amplitude: 0.13, filter: "lowpass", cutoff: 650 });
        layer(time, { frequency: 115 * jitter, to: 58, duration: 0.1, amplitude: 0.1 });
        return true;
      case "footstep":
        noiseLayer({ duration: 0.06, amplitude: 0.04, filter: "lowpass",
          cutoff: opts.foot === 1 ? 480 : 350 });
        return true;
      case "armorClank":
        [2200, 3670].forEach((frequency) => layer(time, { frequency: frequency * jitter,
          duration: 0.08, amplitude: 0.009, wave: "sine" }));
        return true;
      default: return false;
    }
  }

  function changeTrack(id) {
    if (!context) return;
    const now = context.currentTime;
    for (const v of voices) {
      v.bus.gain.cancelScheduledValues(now);
      v.bus.gain.setValueAtTime(v.bus.gain.value, now);
      v.bus.gain.linearRampToValueAtTime(0, now + 1.2);
      v.until = now + 1.3;
    }
    while (voices.length >= 4) voices.shift().bus.disconnect();
    const bus = context.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + 1.2);
    bus.connect(music);
    voices.push({ bus, id, step: 0, next: now + 0.03, until: Infinity });
  }
  function tick() {
    safe(() => {
      if (!context || suspended || context.state !== "running") return;
      const now = context.currentTime;
      voices = voices.filter((v) => {
        if (v.until < now) {
          v.bus.disconnect();
          return false;
        }
        return true;
      });
      for (const v of voices) {
        const t = themes[v.id];
        if (v.next < now) v.next = now;
        while (v.next < now + 0.2 && v.next < v.until) {
          const i = v.step % 16,
            bar = Math.floor(v.step / 16),
            chord = t.chords[Math.floor(i / 4)];
          const note = t.lead[i];
          // Cada dos compases la melodía sube una octava en notas alternas: variación sin repetir igual.
          if (note !== null)
            tone(
              v.bus,
              v.next,
              midi(t.root + note + (bar % 2 && i % 4 === 2 ? 12 : 0)),
              t.beat * 1.6,
              t.wave === "sawtooth" || t.wave === "square" ? 0.026 : 0.05,
              t.wave,
            );
          if (t.bass.includes(i))
            tone(v.bus, v.next, midi(t.root - 12 + chord[0]), t.beat * 1.8, 0.07, "sine");
          if (i % 4 === 0)
            for (const n of chord)
              pad(v.bus, v.next, midi(t.root + n), t.beat * 4.2, 0.018);
          if (t.kick.includes(i)) drum(v.bus, v.next, "kick");
          if (t.hat.includes(i)) drum(v.bus, v.next, "hat");
          v.step++;
          v.next += t.beat;
        }
      }
    });
  }
  return {
    unlock() {
      return safe(() => {
        if (!context) {
          const Audio = env.AudioContext || env.webkitAudioContext;
          if (!Audio) return;
          context = new Audio();
          master = context.createGain();
          music = context.createGain();
          sfx = context.createGain();
          music.connect(master);
          sfx.connect(master);
          master.connect(context.destination);
          noise = context.createBuffer(
            1,
            context.sampleRate,
            context.sampleRate,
          );
          const data = noise.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          volumes();
          changeTrack(track);
          timer = env.setInterval?.(tick, 50);
        }
        suspended = false;
        context.resume()?.catch?.(() => {});
        tick();
      });
    },
    configure(value) {
      safe(() => {
        settings = soundSettings(value);
        volumes();
      });
    },
    scene(screen, floor, boss) {
      safe(() => {
        paused = screen === "pause";
        const id = selectTrack(screen, floor, boss);
        if (track !== id) {
          track = id;
          changeTrack(id);
        }
        volumes();
      });
    },
    play(name, opts = {}) {
      safe(() => {
        if (!context || suspended || context.state !== "running") return;
        const now = context.currentTime,
          cue = cues[name];
        const interval = name === "footstep" || name === "armorClank" ? 0.12 : 0.065;
        // Red de seguridad: si algún navegador no dispara onended (contexto suspendido en iOS),
        // las voces viejas no deben bloquear el tope para siempre.
        for (const v of activeSfx) if (v.expires < now) activeSfx.delete(v);
        if (!cue || now - (last.get(name) ?? -10) < interval || activeSfx.size >= 24) return;
        last.set(name, now);
        const voice = new Set();
        voice.expires = now + 4; // el cue más largo dura < 1 s
        activeSfx.add(voice);
        buildingVoice = voice;
        try {
          if (instrument(name, now, opts ?? {})) return;
          tone(
            sfx,
            now,
            cue[0] * (0.96 + Math.random() * 0.08),
            cue[1],
            0.18,
            "triangle",
            cue[2],
          );
          if (name === "dash") sweep(now, 1800, 500, 0.18, 0.16, 0.9);
          if (name === "bossRoar") sweep(now, 220, 90, 0.7, 0.3, 0.7);
          if (name === "defeat")
            for (let i = 1; i <= 2; i++)
              tone(sfx, now + i * 0.18, cue[0] * [1, 0.84, 0.7][i], 0.4, 0.09);
          if (name === "victory" || name === "reward" || name === "levelUp")
            for (let i = 1; i <= 3; i++)
              tone(sfx, now + i * 0.09, cue[0] * [1, 1.25, 1.5, 2][i], 0.3, 0.1);
        } finally {
          buildingVoice = undefined;
          if (!voice.size) activeSfx.delete(voice);
        }
      });
    },
    suspend() {
      safe(() => {
        suspended = true;
        context?.suspend()?.catch?.(() => {});
      });
    },
    resume() {
      safe(() => {
        suspended = false;
        context?.resume()?.catch?.(() => {});
        tick();
      });
    },
    tick,
    dispose() {
      safe(() => {
        env.clearInterval?.(timer);
        for (const voice of activeSfx) for (const source of [...voice]) {
          safe(() => source.stop());
          source.onended?.();
        }
        activeSfx.clear();
        last.clear();
        context?.close()?.catch?.(() => {});
        voices = [];
        context = null;
      });
    },
  };
}
