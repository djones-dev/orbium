import { AudioParams } from '@/types/audio';

export interface AudioEffect {
  readonly input: AudioNode;
  readonly output: AudioNode;
  updateParams(params: Partial<AudioParams>): void;
  dispose(): void;
}
