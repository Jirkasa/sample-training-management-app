import { TrainingState } from "../models/training-state";

export type EmployeeDetailViewModel = {
    id: string;
    name: string;
    department: string | null;
    position: string;
    statusLabelKey: string;
    terminationDate: string | null;
    isActive: boolean;
    renewalDaysBeforeExpiry: number;
    requiredTrainings: RequiredTrainingViewModel[];
    completions: CompletionViewModel[];
}

export type RequiredTrainingViewModel = {
    trainingName: string;
    validUntil: string | null;
    daysLeft: number | null;
    state: TrainingState;
    stateLabelKey: string;
    nearestSession: NearestSessionViewModel | null;
}

export type NearestSessionViewModel = {
    id: string;
    date: string;
    location: string;
    freeSeats: number;
}

export type CompletionViewModel = {
    trainingName: string;
    completionDate: string;
    validUntil: string | null;
    stateLabelKey: string;
}
