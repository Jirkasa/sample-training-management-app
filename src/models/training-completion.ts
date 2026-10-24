import { Employee } from "./employee";
import { Training } from "./training";

export class TrainingCompletion {
    public declare id: string;
    public declare employee: Employee;
    public declare training: Training;
    public declare completionDate: string;
    public declare validUntil: string | null;
}
