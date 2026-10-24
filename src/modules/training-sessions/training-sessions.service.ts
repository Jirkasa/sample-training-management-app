import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/sqlite';
import { SessionStatus, TrainingSession } from '../../models/training-session';
import { TrainingSessionsViewModel } from '../../view-models/training-sessions-view.model';

@Injectable()
export class TrainingSessionsService {
  constructor(private readonly em: EntityManager) {}

  async getUpcomingSessions(): Promise<TrainingSessionsViewModel> {
    const sessions = await this.em.find(
      TrainingSession,
      { status: SessionStatus.PLANNED, date: { $gte: toIsoDate(new Date()) } },
      { populate: ['training'], orderBy: { date: 'asc', startTime: 'asc' } },
    );

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        trainingName: session.training.name,
        date: formatDate(session.date),
        time: `${session.startTime}–${session.endTime}`,
        location: session.location,
        capacity: session.capacity,
        occupied: session.occupied,
        freeSeats: Math.max(0, session.capacity - session.occupied),
      })),
    };
  }
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day}. ${month}. ${year}`;
}
