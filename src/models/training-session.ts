import { Training } from "./training";

export enum SessionStatus {
    PLANNED = 'PLANNED',
    CANCELLED = 'CANCELLED'
}

export class TrainingSession {
    public declare id: number;
    public declare training: Training;
    public declare status: SessionStatus;
    public declare date: string;
    public declare startTime: string;
    public declare endTime: string;
    public declare location: string;
    public declare capacity: number;
    public declare occupied: number;
    public declare pricePerPerson: number;
}