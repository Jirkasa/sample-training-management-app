export type TrainingNeedsViewModel = {
    renewalDaysBeforeExpiry: number;
    trainingsWithShortfallCount: number;
    trainings: TrainingNeedViewModel[];
}

export type TrainingNeedViewModel = {
    trainingName: string;
    requiredCount: number;
    missingCount: number;
    expiredCount: number;
    expiringCount: number;
    plannedCount: number;
    neededCount: number;
    upcomingSessionsCount: number;
    freeSeats: number;
    shortfall: number;
    nearestSession: NearestSessionViewModel | null;
    highlight: "danger" | "warning" | null;
}

export type NearestSessionViewModel = {
    id: string;
    date: string;
    freeSeats: number;
}
