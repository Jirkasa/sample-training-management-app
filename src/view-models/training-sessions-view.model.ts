export type TrainingSessionsViewModel = {
    sessions: TrainingSessionRowViewModel[];
}

export type TrainingSessionRowViewModel = {
    id: string;
    trainingName: string;
    date: string;
    time: string;
    location: string;
    capacity: number;
    occupied: number;
    freeSeats: number;
}
