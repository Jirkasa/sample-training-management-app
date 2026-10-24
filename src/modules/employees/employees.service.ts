import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/sqlite';
import { AppConfig } from '../../config/configuration';
import { Employee, EmployeeStatus } from '../../models/employee';
import { TrainingCompletion } from '../../models/training-completion';
import { SessionStatus, TrainingSession } from '../../models/training-session';
import { TrainingState } from '../../models/training-state';
import { formatDate, today } from '../../utils/date';
import { getFreeSeats } from '../../utils/training-session';
import {
  CompletionViewModel,
  EmployeeDetailViewModel,
  RequiredTrainingViewModel,
} from '../../view-models/employee-detail-view.model';
import { EmployeeRowViewModel, EmployeesViewModel } from '../../view-models/employees-view.model';
import {
  compareValidUntil,
  CompletionsIndex,
  isTrainingRequiredFor,
  TrainingRequirementsService,
} from '../training-requirements/training-requirements.service';

const STATES_TO_SOLVE = [TrainingState.MISSING, TrainingState.EXPIRED, TrainingState.EXPIRING];

@Injectable()
export class EmployeesService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly trainingRequirements: TrainingRequirementsService,
  ) {}

  async getEmployees(): Promise<EmployeesViewModel> {
    const currentDate = today();
    const employees = await this.em.find(Employee, {}, { populate: ['department', 'position'] });
    const trainings = await this.trainingRequirements.findRequiredTrainings();
    const completions = new CompletionsIndex(await this.em.find(TrainingCompletion, {}));

    const rows = employees
      .sort(
        (a, b) => a.lastName.localeCompare(b.lastName, 'cs') || a.firstName.localeCompare(b.firstName, 'cs'),
      )
      .map((employee): EmployeeRowViewModel => {
        const isActive = employee.status === EmployeeStatus.ACTIVE;
        const states = isActive
          ? trainings
              .filter((training) => isTrainingRequiredFor(training, employee))
              .map(
                (training) =>
                  this.trainingRequirements.evaluateTrainingStatus(completions.get(employee, training), currentDate)
                    .state,
              )
          : [];
        const missingCount = states.filter((state) => state === TrainingState.MISSING).length;
        const expiredCount = states.filter((state) => state === TrainingState.EXPIRED).length;
        const expiringCount = states.filter((state) => state === TrainingState.EXPIRING).length;

        return {
          id: employee.id,
          name: `${employee.lastName} ${employee.firstName}`,
          department: employee.department?.name ?? null,
          position: employee.position.name,
          statusLabelKey: `employees.statuses.${employee.status}`,
          isActive,
          missingCount,
          expiredCount,
          expiringCount,
          highlight: missingCount + expiredCount > 0 ? 'danger' : expiringCount > 0 ? 'warning' : null,
        };
      });

    return {
      renewalDaysBeforeExpiry: this.config.get('renewalDaysBeforeExpiry', { infer: true }),
      totalCount: rows.length,
      withProblemsCount: rows.filter((row) => row.highlight === 'danger').length,
      employees: rows,
    };
  }

  async getEmployeeDetail(id: string): Promise<EmployeeDetailViewModel> {
    const employee = await this.em.findOne(Employee, { id }, { populate: ['department', 'position'] });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    const completions = await this.em.find(
      TrainingCompletion,
      { employee },
      { populate: ['training'], orderBy: { completionDate: 'desc' } },
    );
    const isActive = employee.status === EmployeeStatus.ACTIVE;

    return {
      id: employee.id,
      name: `${employee.lastName} ${employee.firstName}`,
      department: employee.department?.name ?? null,
      position: employee.position.name,
      statusLabelKey: `employees.statuses.${employee.status}`,
      terminationDate: employee.terminationDate ? formatDate(employee.terminationDate) : null,
      isActive,
      renewalDaysBeforeExpiry: this.config.get('renewalDaysBeforeExpiry', { infer: true }),
      requiredTrainings: isActive ? await this.getTrainingsToSolve(employee, completions) : [],
      completions: toCompletionViewModels(completions),
    };
  }

  private async getTrainingsToSolve(
    employee: Employee,
    completions: TrainingCompletion[],
  ): Promise<RequiredTrainingViewModel[]> {
    const currentDate = today();
    const trainings = await this.trainingRequirements.findTrainingsRequiredFor(employee);

    const trainingsToSolve = trainings
      .map((training) => ({
        training,
        status: this.trainingRequirements.evaluateTrainingStatus(
          completions.filter((completion) => completion.training === training),
          currentDate,
        ),
      }))
      .filter(({ status }) => STATES_TO_SOLVE.includes(status.state))
      .sort((a, b) => compareValidUntil(a.status.validUntil, b.status.validUntil));

    const upcomingSessions = await this.em.find(
      TrainingSession,
      {
        training: { $in: trainingsToSolve.map(({ training }) => training) },
        status: SessionStatus.PLANNED,
        date: { $gte: currentDate },
      },
      { orderBy: { date: 'asc', startTime: 'asc' } },
    );

    return trainingsToSolve.map(({ training, status }) => {
      const nearestSession = upcomingSessions.find(
        (session) => session.training === training && getFreeSeats(session) > 0,
      );

      return {
        trainingName: training.name,
        validUntil: status.validUntil ? formatDate(status.validUntil) : null,
        daysLeft: status.daysLeft,
        state: status.state,
        stateLabelKey: `employees.requiredStates.${status.state}`,
        nearestSession: nearestSession
          ? {
              id: nearestSession.id,
              date: formatDate(nearestSession.date),
              location: nearestSession.location,
              freeSeats: getFreeSeats(nearestSession),
            }
          : null,
      };
    });
  }
}

function toCompletionViewModels(completions: TrainingCompletion[]): CompletionViewModel[] {
  const currentDate = today();
  const evaluatedTrainings = new Set<string>();

  return completions.map((completion) => {
    let state: string;

    if (completion.completionDate > currentDate) {
      state = 'planned';
    } else if (evaluatedTrainings.has(completion.training.code)) {
      state = 'superseded';
    } else if (completion.validUntil === null) {
      state = 'unlimited';
    } else if (completion.validUntil < currentDate) {
      state = 'expired';
    } else {
      state = 'valid';
    }

    if (state !== 'planned') {
      evaluatedTrainings.add(completion.training.code);
    }

    return {
      trainingName: completion.training.name,
      completionDate: formatDate(completion.completionDate),
      validUntil: completion.validUntil ? formatDate(completion.validUntil) : null,
      stateLabelKey: `employees.completionStates.${state}`,
    };
  });
}
