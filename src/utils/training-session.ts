import { TrainingSession } from '../models/training-session';

export function getFreeSeats(session: TrainingSession): number {
  return Math.max(0, session.capacity - session.occupied);
}
