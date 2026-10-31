import { create } from 'zustand';
const yearFloatRef = { current: null };
export const useTimeline = create(set => ({ year: null, yearFloatRef, playing: false, sound: false, setYear: year => set({year}), setPlaying: playing => set({playing}), setSound: sound => set({sound}) }));
