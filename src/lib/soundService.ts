/**
 * Sound Service per Oleificio Pro
 * Genera un chime acustico pulito e piacevole usando la Web Audio API standard.
 * Non richiede file audio esterni, garantendo compatibilità immediata su tutti i browser e dispositivi.
 */
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Se l'audio context è sospeso per policy browser, proviamo a riattivarlo
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Primo tono (dolce e caldo a 587.33 Hz - Re5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Secondo tono armonico (più alto a 880 Hz - La5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.14, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    // Chiude il contesto audio al termine
    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch {}
    }, 800);
  } catch (err) {
    // Gestione silenziosa in caso di policy autoplay del browser
    console.warn("Impossibile riprodurre chime notifica:", err);
  }
};
