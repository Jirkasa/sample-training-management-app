export type TrainingSessionDetailViewModel = {
    id: string;
    trainingCode: string;
    trainingName: string;
    validityMonths: number | null;
    date: string;
    time: string;
    location: string;
    capacity: number;
    occupied: number;
    freeSeats: number;
    isCancelled: boolean;
    isPast: boolean;
    renewalDaysBeforeExpiry: number;
    suggestedEmployees: EmployeeSuggestionViewModel[];
    optionalEmployees: EmployeeSuggestionViewModel[];
    showOptionalEmployees: boolean;
}

export enum TrainingState {
    MISSING = "missing",
    EXPIRED = "expired",
    EXPIRES_BEFORE_SESSION = "expires-before-session",
    EXPIRING = "expiring",
    VALID = "valid"
}

export type EmployeeSuggestionViewModel = {
    order: number;
    employeeId: string;
    name: string;
    department: string | null;
    position: string;
    validUntil: string | null;
    daysLeftAtSession: number | null;
    state: TrainingState;
    stateLabelKey: string;
}
