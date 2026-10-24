import { Employee } from "./employee";
import { Training } from "./training";

export class TrainingCompletion {
    public declare id: number;
    public declare employee: Employee;
    public declare training: Training;
    public declare validUntil: string;
}