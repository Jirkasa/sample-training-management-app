import { TrainingState } from "../models/training-state";

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
