import { Training } from "./training";

export enum SessionStatus {
    PLANNED = "planned",
    CANCELLED = "cancelled"
}

export class TrainingSession {
    public declare id: string;
    public declare training: Training;
    public declare status: SessionStatus;
    public declare date: string;
    public declare startTime: string;
    public declare endTime: string;
    public declare location: string;
    public declare capacity: number;
    public declare occupied: number;
}
