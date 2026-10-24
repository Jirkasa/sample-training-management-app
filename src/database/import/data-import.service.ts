import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/sqlite';
import path from 'path';
import { AppConfig } from '../../config/configuration';
import { Department } from '../../models/department';
import { Employee, EmployeeStatus } from '../../models/employee';
import { Position } from '../../models/position';
import { RequirementScope, Training } from '../../models/training';
import { TrainingCompletion } from '../../models/training-completion';
import { SessionStatus, TrainingSession } from '../../models/training-session';
import { CsvRow, readCsv } from './csv-reader';
import {
  addMonths,
  normalizeName,
  normalizeTrainingCode,
  parseDate,
  parseInteger,
  parseTimeRange,
  parseValidityMonths,
  toLookupKey,
} from './value-parsers';

// Dates before this limit are placeholders (e.g. 1. 1. 1900), not real dates.
const PLACEHOLDER_DATE_LIMIT = '1901-01-01';

// Keys are lookup keys (see toLookupKey), values are lookup keys of the canonical department.
const DEPARTMENT_ALIASES: Record<string, string> = {
  'studijni': 'studijni oddeleni',
};

const TRAINING_CODE_ALIASES: Record<string, string> = {
  'KYB3R': 'KYBER',
};

const EMPLOYEE_STATUSES: Record<string, EmployeeStatus> = {
  'aktivni': EmployeeStatus.ACTIVE,
  'rodicovska': EmployeeStatus.PARENTAL_LEAVE,
  'ukoncen': EmployeeStatus.TERMINATED,
};

const SESSION_STATUSES: Record<string, SessionStatus> = {
  'planovano': SessionStatus.PLANNED,
  'zruseno': SessionStatus.CANCELLED,
};

type Lookup<T> = Map<string, T>;

/**
 * Imports CSV files from the data directory into the database. Source data contain many inconsistencies,
 * so values are normalized and rows that cannot be used are skipped with a warning.
 */
@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async import(): Promise<void> {
    const em = this.em.fork();

    const employeeRows = await this.read('zamestnanci.csv');
    const departments = this.createDepartments(em, employeeRows);
    const positions = this.createPositions(em, employeeRows);
    const { employees, employeeIdAliases } = this.createEmployees(em, employeeRows, departments, positions);
    const trainings = this.createTrainings(em, await this.read('katalog_skoleni.csv'), departments, positions);
    const sessions = this.createSessions(em, await this.read('terminy_skoleni.csv'), trainings);
    const completions = this.createCompletions(
      em,
      await this.read('absolvovana_skoleni.csv'),
      employees,
      employeeIdAliases,
      trainings,
    );

    await em.flush();

    this.logger.log(
      `Imported ${departments.size} departments, ${positions.size} positions, ${employees.size} employees, ` +
        `${trainings.size} trainings, ${sessions} sessions, ${completions} completions`,
    );
  }

  private read(fileName: string): Promise<CsvRow[]> {
    return readCsv(path.join(this.config.get('dataDir', { infer: true }), fileName));
  }

  private createDepartments(em: EntityManager, employeeRows: CsvRow[]): Lookup<Department> {
    const names = employeeRows.map((row) => row.values.utvar);
    return this.createNamedLookup(names, toDepartmentKey, (name) => em.create(Department, { name }));
  }

  private createPositions(em: EntityManager, employeeRows: CsvRow[]): Lookup<Position> {
    const names = employeeRows.map((row) => row.values.pozice);
    return this.createNamedLookup(names, toLookupKey, (name) => em.create(Position, { name }));
  }

  private createNamedLookup<T>(names: string[], toKey: (name: string) => string, create: (name: string) => T): Lookup<T> {
    const variantCounts = new Map<string, Map<string, number>>();

    for (const name of names.map(normalizeName).filter((name) => name !== '')) {
      const variants = variantCounts.get(toKey(name)) ?? new Map<string, number>();
      variants.set(name, (variants.get(name) ?? 0) + 1);
      variantCounts.set(toKey(name), variants);
    }

    const lookup: Lookup<T> = new Map();
    for (const [key, variants] of variantCounts) {
      const [mostFrequentName] = [...variants].reduce((best, current) => (current[1] > best[1] ? current : best));
      lookup.set(key, create(mostFrequentName));
    }

    return lookup;
  }

  private createEmployees(
    em: EntityManager,
    rows: CsvRow[],
    departments: Lookup<Department>,
    positions: Lookup<Position>,
  ): { employees: Lookup<Employee>; employeeIdAliases: Map<string, string> } {
    const employees: Lookup<Employee> = new Map();
    const employeeIdAliases = new Map<string, string>();
    const employeeIdsByBirthNumber = new Map<string, string>();

    for (const { line, values } of rows) {
      const warn = (message: string) => this.warn('zamestnanci.csv', line, message);
      const id = values.id_zamestnance.trim();
      const birthNumber = values.rodne_cislo.trim();

      if (employees.has(id)) {
        warn(`duplicate employee ID ${id}, skipped`);
        continue;
      }

      // The same person is sometimes listed twice under different IDs; completions may reference either one.
      const originalId = employeeIdsByBirthNumber.get(birthNumber);
      if (originalId) {
        warn(`employee ${id} is a duplicate of ${originalId}, merged`);
        employeeIdAliases.set(id, originalId);
        continue;
      }

      const position = positions.get(toLookupKey(values.pozice));
      if (!position) {
        warn(`employee ${id} has no position, skipped`);
        continue;
      }

      let status = EMPLOYEE_STATUSES[toLookupKey(values.stav)];
      if (!status) {
        warn(`employee ${id} has unknown status "${values.stav}", set to active`);
        status = EmployeeStatus.ACTIVE;
      }

      const terminationDate = parseDate(values.datum_ukonceni);
      if (!terminationDate && values.datum_ukonceni.trim() !== '') {
        warn(`employee ${id} has invalid termination date "${values.datum_ukonceni}", ignored`);
      }

      const department = departments.get(toDepartmentKey(values.utvar)) ?? null;
      if (!department) {
        warn(`employee ${id} has no department`);
      }

      employees.set(
        id,
        em.create(Employee, {
          id,
          firstName: normalizeName(values.jmeno),
          lastName: normalizeName(values.prijmeni),
          department,
          position,
          status,
          terminationDate,
        }),
      );
      if (birthNumber !== '') {
        employeeIdsByBirthNumber.set(birthNumber, id);
      }
    }

    return { employees, employeeIdAliases };
  }

  private createTrainings(
    em: EntityManager,
    rows: CsvRow[],
    departments: Lookup<Department>,
    positions: Lookup<Position>,
  ): Lookup<Training> {
    const trainings: Lookup<Training> = new Map();

    for (const { line, values } of rows) {
      const warn = (message: string) => this.warn('katalog_skoleni.csv', line, message);
      const code = normalizeTrainingCode(values.kod);

      const validityMonths = parseValidityMonths(values.platnost_mesicu);
      if (validityMonths === null && values.platnost_mesicu.trim() !== '' && values.platnost_mesicu.trim() !== '0') {
        warn(`training ${code} has invalid validity "${values.platnost_mesicu}", set to unlimited`);
      }

      const [scopeName, targetList = ''] = values.povinne_pro.split(':');
      const targets = targetList.split(';').map(normalizeName).filter((target) => target !== '');
      let requirementScope: RequirementScope;
      let requiredForDepartments: Department[] = [];
      let requiredForPositions: Position[] = [];

      switch (toLookupKey(scopeName)) {
        case 'vsichni':
          requirementScope = RequirementScope.ALL;
          break;
        case 'utvar':
          requirementScope = RequirementScope.DEPARTMENT;
          requiredForDepartments = this.resolveTargets(targets, departments, toDepartmentKey, (target) =>
            warn(`training ${code} requires unknown department "${target}"`),
          );
          break;
        case 'pozice':
          requirementScope = RequirementScope.POSITION;
          requiredForPositions = this.resolveTargets(targets, positions, toLookupKey, (target) =>
            warn(`training ${code} requires unknown position "${target}"`),
          );
          break;
        case 'nepovinne':
        case '':
          requirementScope = RequirementScope.NONE;
          break;
        default:
          warn(`training ${code} has unknown requirement "${values.povinne_pro}", set to optional`);
          requirementScope = RequirementScope.NONE;
      }

      trainings.set(
        code,
        em.create(Training, {
          code,
          name: normalizeName(values.nazev),
          validityMonths,
          requirementScope,
          requiredForDepartments,
          requiredForPositions,
        }),
      );
    }

    return trainings;
  }

  private resolveTargets<T>(
    targets: string[],
    lookup: Lookup<T>,
    toKey: (name: string) => string,
    onMissing: (target: string) => void,
  ): T[] {
    return targets.flatMap((target) => {
      const entity = lookup.get(toKey(target));
      if (!entity) {
        onMissing(target);
        return [];
      }
      return [entity];
    });
  }

  private createSessions(em: EntityManager, rows: CsvRow[], trainings: Lookup<Training>): number {
    const sessionIds = new Set<string>();
    const sessionKeys = new Set<string>();

    for (const { line, values } of rows) {
      const warn = (message: string) => this.warn('terminy_skoleni.csv', line, message);
      const id = values.id_terminu.trim();
      const training = resolveTraining(trainings, values.kod_skoleni);
      const date = parseDate(values.datum);
      const time = parseTimeRange(values.cas);
      const capacity = parseInteger(values.kapacita);
      const occupied = parseInteger(values.obsazeno);
      const status = SESSION_STATUSES[toLookupKey(values.stav)];

      if (sessionIds.has(id)) {
        warn(`duplicate session ID ${id}, skipped`);
        continue;
      }
      if (!training) {
        warn(`session ${id} has unknown training "${values.kod_skoleni}", skipped`);
        continue;
      }
      if (!date || !time) {
        warn(`session ${id} has invalid date or time "${values.datum} ${values.cas}", skipped`);
        continue;
      }
      if (capacity === null || occupied === null) {
        warn(`session ${id} has invalid capacity or occupancy "${values.kapacita}/${values.obsazeno}", skipped`);
        continue;
      }
      if (!status) {
        warn(`session ${id} has unknown status "${values.stav}", skipped`);
        continue;
      }

      const location = normalizeName(values.misto);
      const sessionKey = [training.code, date, time.start, toLookupKey(location)].join('|');
      if (sessionKeys.has(sessionKey)) {
        warn(`session ${id} is a duplicate of another session at the same time and place, skipped`);
        continue;
      }

      em.create(TrainingSession, {
        id,
        training,
        status,
        date,
        startTime: time.start,
        endTime: time.end,
        location,
        capacity,
        occupied,
      });
      sessionIds.add(id);
      sessionKeys.add(sessionKey);
    }

    return sessionIds.size;
  }

  private createCompletions(
    em: EntityManager,
    rows: CsvRow[],
    employees: Lookup<Employee>,
    employeeIdAliases: Map<string, string>,
    trainings: Lookup<Training>,
  ): number {
    const completionIds = new Set<string>();
    const completionKeys = new Set<string>();

    for (const { line, values } of rows) {
      const warn = (message: string) => this.warn('absolvovana_skoleni.csv', line, message);
      const id = values.id_zaznamu.trim();

      // Export contains repeated header, comments and a summary row.
      if (!/^Z\d+$/.test(id)) {
        warn(`not a data row ("${id.slice(0, 40)}"), skipped`);
        continue;
      }
      if (completionIds.has(id)) {
        warn(`duplicate completion ID ${id}, skipped`);
        continue;
      }

      const employeeId = values.id_zamestnance.trim();
      const employee = employees.get(employeeIdAliases.get(employeeId) ?? employeeId);
      if (!employee) {
        warn(`completion ${id} references unknown employee "${employeeId}", skipped`);
        continue;
      }

      const training = resolveTraining(trainings, values.kod_skoleni);
      if (!training) {
        warn(`completion ${id} references unknown training "${values.kod_skoleni}", skipped`);
        continue;
      }

      const completionDate = parseDate(values.datum_absolvovani);
      if (!completionDate || completionDate < PLACEHOLDER_DATE_LIMIT) {
        warn(`completion ${id} has invalid completion date "${values.datum_absolvovani}", skipped`);
        continue;
      }

      const completionKey = [employee.id, training.code, completionDate].join('|');
      if (completionKeys.has(completionKey)) {
        warn(`completion ${id} is a duplicate of another completion, skipped`);
        continue;
      }

      const recordedValidUntil = parseDate(values.platnost_do);
      if (!recordedValidUntil && values.platnost_do.trim() !== '') {
        warn(`completion ${id} has invalid validity "${values.platnost_do}", ignored`);
      }
      const validUntil = recordedValidUntil ?? getCatalogValidUntil(training, completionDate);

      em.create(TrainingCompletion, { id, employee, training, completionDate, validUntil });
      completionIds.add(id);
      completionKeys.add(completionKey);
    }

    return completionIds.size;
  }

  private warn(fileName: string, line: number, message: string): void {
    this.logger.warn(`${fileName}:${line} ${message}`);
  }
}

function toDepartmentKey(name: string): string {
  const key = toLookupKey(name);
  return DEPARTMENT_ALIASES[key] ?? key;
}

function resolveTraining(trainings: Lookup<Training>, code: string): Training | undefined {
  const normalizedCode = normalizeTrainingCode(code);
  return trainings.get(TRAINING_CODE_ALIASES[normalizedCode] ?? normalizedCode);
}

/** Fallback for completions without recorded validity. */
function getCatalogValidUntil(training: Training, completionDate: string): string | null {
  return training.validityMonths === null ? null : addMonths(completionDate, training.validityMonths);
}
