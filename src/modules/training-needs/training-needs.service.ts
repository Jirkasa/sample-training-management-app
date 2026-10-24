import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/sqlite';
import { AppConfig } from '../../config/configuration';
import { Employee, EmployeeStatus } from '../../models/employee';
import { TrainingCompletion } from '../../models/training-completion';
import { SessionStatus, TrainingSession } from '../../models/training-session';
import { TrainingState } from '../../models/training-state';
import { formatDate, today } from '../../utils/date';
import { getFreeSeats } from '../../utils/training-session';
import { TrainingNeedsViewModel, TrainingNeedViewModel } from '../../view-models/training-needs-view.model';
import {
  CompletionsIndex,
  isTrainingRequiredFor,
  TrainingRequirementsService,
} from '../training-requirements/training-requirements.service';

@Injectable()
export class TrainingNeedsService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly trainingRequirements: TrainingRequirementsService,
  ) {}

  async getTrainingNeeds(): Promise<TrainingNeedsViewModel> {
    const currentDate = today();
    const trainings = await this.trainingRequirements.findRequiredTrainings();
    const employees = await this.em.find(Employee, {
      status: EmployeeStatus.ACTIVE,
      $or: [{ terminationDate: null }, { terminationDate: { $gt: currentDate } }],
    });
    const completions = new CompletionsIndex(await this.em.find(TrainingCompletion, {}));
    const upcomingSessions = await this.em.find(
      TrainingSession,
      { status: SessionStatus.PLANNED, date: { $gte: currentDate } },
      { orderBy: { date: 'asc', startTime: 'asc' } },
    );

    const rows = trainings.map((training): TrainingNeedViewModel => {
      const states = employees
        .filter((employee) => isTrainingRequiredFor(training, employee))
        .map(
          (employee) =>
            this.trainingRequirements.evaluateTrainingStatus(completions.get(employee, training), currentDate).state,
        );
      const missingCount = states.filter((state) => state === TrainingState.MISSING).length;
      const expiredCount = states.filter((state) => state === TrainingState.EXPIRED).length;
      const expiringCount = states.filter((state) => state === TrainingState.EXPIRING).length;
      const neededCount = missingCount + expiredCount + expiringCount;

      const sessions = upcomingSessions.filter((session) => session.training === training);
      const freeSeats = sessions.reduce((sum, session) => sum + getFreeSeats(session), 0);
      const nearestSession = sessions.find((session) => getFreeSeats(session) > 0);
      const shortfall = Math.max(0, neededCount - freeSeats);

      return {
        trainingName: training.name,
        requiredCount: states.length,
        missingCount,
        expiredCount,
        expiringCount,
        plannedCount: states.filter((state) => state === TrainingState.PLANNED).length,
        neededCount,
        upcomingSessionsCount: sessions.length,
        freeSeats,
        shortfall,
        nearestSession: nearestSession
          ? { id: nearestSession.id, date: formatDate(nearestSession.date), freeSeats: getFreeSeats(nearestSession) }
          : null,
        highlight: shortfall > 0 ? 'danger' : neededCount > 0 ? 'warning' : null,
      };
    });

    return {
      renewalDaysBeforeExpiry: this.config.get('renewalDaysBeforeExpiry', { infer: true }),
      trainingsWithShortfallCount: rows.filter((row) => row.shortfall > 0).length,
      trainings: rows.sort((a, b) => b.shortfall - a.shortfall || b.neededCount - a.neededCount),
    };
  }
}
