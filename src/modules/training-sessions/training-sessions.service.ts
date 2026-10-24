import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager, FilterQuery } from '@mikro-orm/sqlite';
import { AppConfig } from '../../config/configuration';
import { Employee, EmployeeStatus } from '../../models/employee';
import { RequirementScope, Training } from '../../models/training';
import { TrainingCompletion } from '../../models/training-completion';
import { SessionStatus, TrainingSession } from '../../models/training-session';
import { daysBetween, formatDate, today } from '../../utils/date';
import {
  EmployeeSuggestionViewModel,
  TrainingSessionDetailViewModel,
  TrainingState,
} from '../../view-models/training-session-detail-view.model';
import { TrainingSessionsViewModel } from '../../view-models/training-sessions-view.model';

type EmployeeTrainingStatus = {
  employee: Employee;
  validUntil: string | null;
  daysLeftAtSession: number | null;
  state: TrainingState;
};

@Injectable()
export class TrainingSessionsService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService<AppConfig, true>,
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
    const employees = await this.findEmployeesRequiringTraining(session.training, session.date);
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
      const status = this.evaluateTrainingStatus(employee, completionsByEmployee.get(employee.id) ?? [], session.date);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses.sort(
      (a, b) =>
        compareValidUntil(a.validUntil, b.validUntil) ||
        a.employee.lastName.localeCompare(b.employee.lastName, 'cs') ||
        a.employee.firstName.localeCompare(b.employee.firstName, 'cs'),
    );
  }

  private findEmployeesRequiringTraining(training: Training, sessionDate: string): Promise<Employee[]> {
    const where: FilterQuery<Employee> = {
      status: EmployeeStatus.ACTIVE,
      $or: [{ terminationDate: null }, { terminationDate: { $gt: sessionDate } }],
    };

    switch (training.requirementScope) {
      case RequirementScope.ALL:
        break;
      case RequirementScope.DEPARTMENT:
        where.department = { $in: training.requiredForDepartments.getItems() };
        break;
      case RequirementScope.POSITION:
        where.position = { $in: training.requiredForPositions.getItems() };
        break;
      case RequirementScope.NONE:
        return Promise.resolve([]);
    }

    return this.em.find(Employee, where, { populate: ['department', 'position'] });
  }

  private evaluateTrainingStatus(
    employee: Employee,
    completions: TrainingCompletion[],
    sessionDate: string,
  ): EmployeeTrainingStatus | null {
    const currentDate = today();

    if (completions.some((completion) => completion.completionDate > currentDate)) {
      return null;
    }
    if (completions.some((completion) => completion.validUntil === null)) {
      return null;
    }

    const validUntil = completions
      .map((completion) => completion.validUntil as string)
      .reduce<string | null>((latest, current) => (latest === null || current > latest ? current : latest), null);

    if (validUntil === null) {
      return { employee, validUntil, daysLeftAtSession: null, state: TrainingState.MISSING };
    }

    const daysLeftAtSession = daysBetween(sessionDate, validUntil);
    const renewalDaysBeforeExpiry = this.config.get('renewalDaysBeforeExpiry', { infer: true });
    let state: TrainingState;

    if (validUntil < currentDate) {
      state = TrainingState.EXPIRED;
    } else if (validUntil < sessionDate) {
      state = TrainingState.EXPIRES_BEFORE_SESSION;
    } else if (daysLeftAtSession <= renewalDaysBeforeExpiry) {
      state = TrainingState.EXPIRING;
    } else {
      state = TrainingState.VALID;
    }

    return { employee, validUntil, daysLeftAtSession, state };
  }
}

function getFreeSeats(session: TrainingSession): number {
  return Math.max(0, session.capacity - session.occupied);
}

function compareValidUntil(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return -1;
  }
  if (b === null) {
    return 1;
  }
  return a < b ? -1 : 1;
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
    daysLeftAtSession: status.daysLeftAtSession,
    state: status.state,
    stateLabelKey: `training-sessions.states.${status.state}`,
  };
}
