import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager, FilterQuery } from '@mikro-orm/sqlite';
import { AppConfig } from '../../config/configuration';
import { Employee, EmployeeStatus } from '../../models/employee';
import { RequirementScope, Training } from '../../models/training';
import { TrainingCompletion } from '../../models/training-completion';
import { TrainingState } from '../../models/training-state';
import { daysBetween, today } from '../../utils/date';

export type TrainingStatus = {
  validUntil: string | null;
  daysLeft: number | null;
  state: TrainingState;
};

@Injectable()
export class TrainingRequirementsService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  findEmployeesRequiringTraining(training: Training, date: string): Promise<Employee[]> {
    const where: FilterQuery<Employee> = {
      status: EmployeeStatus.ACTIVE,
      $or: [{ terminationDate: null }, { terminationDate: { $gt: date } }],
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

  findRequiredTrainings(): Promise<Training[]> {
    return this.em.find(
      Training,
      { requirementScope: { $ne: RequirementScope.NONE } },
      { populate: ['requiredForDepartments', 'requiredForPositions'], orderBy: { name: 'asc' } },
    );
  }

  async findTrainingsRequiredFor(employee: Employee): Promise<Training[]> {
    const trainings = await this.findRequiredTrainings();
    return trainings.filter((training) => isTrainingRequiredFor(training, employee));
  }

  evaluateTrainingStatus(completions: TrainingCompletion[], referenceDate: string): TrainingStatus {
    const currentDate = today();

    if (completions.some((completion) => completion.completionDate > currentDate)) {
      return { validUntil: null, daysLeft: null, state: TrainingState.PLANNED };
    }
    if (completions.some((completion) => completion.validUntil === null)) {
      return { validUntil: null, daysLeft: null, state: TrainingState.VALID };
    }

    const validUntil = completions
      .map((completion) => completion.validUntil as string)
      .reduce<string | null>((latest, current) => (latest === null || current > latest ? current : latest), null);

    if (validUntil === null) {
      return { validUntil, daysLeft: null, state: TrainingState.MISSING };
    }

    const daysLeft = daysBetween(referenceDate, validUntil);
    const renewalDaysBeforeExpiry = this.config.get('renewalDaysBeforeExpiry', { infer: true });
    let state: TrainingState;

    if (validUntil < currentDate) {
      state = TrainingState.EXPIRED;
    } else if (validUntil < referenceDate) {
      state = TrainingState.EXPIRES_BEFORE_SESSION;
    } else if (daysLeft <= renewalDaysBeforeExpiry) {
      state = TrainingState.EXPIRING;
    } else {
      state = TrainingState.VALID;
    }

    return { validUntil, daysLeft, state };
  }
}

export function isTrainingRequiredFor(training: Training, employee: Employee): boolean {
  switch (training.requirementScope) {
    case RequirementScope.ALL:
      return true;
    case RequirementScope.DEPARTMENT:
      return employee.department !== null && training.requiredForDepartments.contains(employee.department);
    case RequirementScope.POSITION:
      return training.requiredForPositions.contains(employee.position);
    case RequirementScope.NONE:
      return false;
  }
}

export function compareValidUntil(a: string | null, b: string | null): number {
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
