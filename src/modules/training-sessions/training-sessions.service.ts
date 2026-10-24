import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/sqlite';
import { AppConfig } from '../../config/configuration';
import { Employee } from '../../models/employee';
import { TrainingCompletion } from '../../models/training-completion';
import { SessionStatus, TrainingSession } from '../../models/training-session';
import { TrainingState } from '../../models/training-state';
import { formatDate, today } from '../../utils/date';
import { getFreeSeats } from '../../utils/training-session';
import {
  EmployeeSuggestionViewModel,
  TrainingSessionDetailViewModel,
} from '../../view-models/training-session-detail-view.model';
import { TrainingSessionsViewModel } from '../../view-models/training-sessions-view.model';
import {
  compareValidUntil,
  TrainingRequirementsService,
  TrainingStatus,
} from '../training-requirements/training-requirements.service';

type EmployeeTrainingStatus = TrainingStatus & {
  employee: Employee;
};

@Injectable()
export class TrainingSessionsService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly trainingRequirements: TrainingRequirementsService,
  ) {}

  async getUpcomingSessions(): Promise<TrainingSessionsViewModel> {
    const sessions = await this.em.find(
      TrainingSession,
      { status: SessionStatus.PLANNED, date: { $gte: today() } },
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
        freeSeats: getFreeSeats(session),
      })),
    };
  }

  async getSessionDetail(id: string): Promise<TrainingSessionDetailViewModel> {
    const session = await this.em.findOne(
      TrainingSession,
      { id },
      { populate: ['training.requiredForDepartments', 'training.requiredForPositions'] },
    );
    if (!session) {
      throw new NotFoundException(`Training session ${id} not found`);
    }

    const renewalDaysBeforeExpiry = this.config.get('renewalDaysBeforeExpiry', { infer: true });
    const isCancelled = session.status === SessionStatus.CANCELLED;
    const isPast = session.date < today();
    const freeSeats = getFreeSeats(session);

    const statuses = isCancelled || isPast ? [] : await this.getEmployeeTrainingStatuses(session);
    const suggested = statuses.filter((status) => status.state !== TrainingState.VALID);
    const optional = statuses.filter((status) => status.state === TrainingState.VALID);

    return {
      id: session.id,
      trainingCode: session.training.code,
      trainingName: session.training.name,
      validityMonths: session.training.validityMonths,
      date: formatDate(session.date),
      time: `${session.startTime}–${session.endTime}`,
      location: session.location,
      capacity: session.capacity,
      occupied: session.occupied,
      freeSeats,
      isCancelled,
      isPast,
      renewalDaysBeforeExpiry,
      suggestedEmployees: suggested.map(toSuggestionViewModel),
      optionalEmployees: optional.map(toSuggestionViewModel),
      showOptionalEmployees: freeSeats > suggested.length && optional.length > 0,
    };
  }

  private async getEmployeeTrainingStatuses(session: TrainingSession): Promise<EmployeeTrainingStatus[]> {
    const employees = await this.trainingRequirements.findEmployeesRequiringTraining(session.training, session.date);
    const completions = await this.em.find(TrainingCompletion, {
      training: session.training,
      employee: { $in: employees },
    });

    const completionsByEmployee = new Map<string, TrainingCompletion[]>();
    for (const completion of completions) {
      const employeeCompletions = completionsByEmployee.get(completion.employee.id) ?? [];
      employeeCompletions.push(completion);
      completionsByEmployee.set(completion.employee.id, employeeCompletions);
    }

    const statuses: EmployeeTrainingStatus[] = [];
    for (const employee of employees) {
      const status = this.trainingRequirements.evaluateTrainingStatus(
        completionsByEmployee.get(employee.id) ?? [],
        session.date,
      );

      const isPlanned = status.state === TrainingState.PLANNED;
      const isValidForever = status.state === TrainingState.VALID && status.validUntil === null;
      if (!isPlanned && !isValidForever) {
        statuses.push({ ...status, employee });
      }
    }

    return statuses.sort(
      (a, b) =>
        compareValidUntil(a.validUntil, b.validUntil) ||
        a.employee.lastName.localeCompare(b.employee.lastName, 'cs') ||
        a.employee.firstName.localeCompare(b.employee.firstName, 'cs'),
    );
  }
}

function toSuggestionViewModel(status: EmployeeTrainingStatus, index: number): EmployeeSuggestionViewModel {
  const { employee } = status;

  return {
    order: index + 1,
    employeeId: employee.id,
    name: `${employee.lastName} ${employee.firstName}`,
    department: employee.department?.name ?? null,
    position: employee.position.name,
    validUntil: status.validUntil ? formatDate(status.validUntil) : null,
    daysLeftAtSession: status.daysLeft,
    state: status.state,
    stateLabelKey: `training-sessions.states.${status.state}`,
  };
}
