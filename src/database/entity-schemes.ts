import { DepartmentSchema } from "./schemas/department.schema";
import { EmployeeSchema } from "./schemas/employee.schema";
import { PositionSchema } from "./schemas/position.schema";
import { TrainingCompletionSchema } from "./schemas/training-completion.schema";
import { TrainingSessionSchema } from "./schemas/training-session.schema";
import { TrainingSchema } from "./schemas/training.schema";

export const entitySchemes = [
    DepartmentSchema,
    PositionSchema,
    EmployeeSchema,
    TrainingSchema,
    TrainingSessionSchema,
    TrainingCompletionSchema
];
