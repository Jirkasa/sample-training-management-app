import type { Collection } from "@mikro-orm/core";
import { Department } from "./department";
import { Position } from "./position";

export enum RequirementScope {
    ALL = "all",
    DEPARTMENT = "department",
    POSITION = "position",
    NONE = "none"
}

export class Training {
    public declare code: string;
    public declare name: string;
    public declare validityMonths: number | null;
    public declare requirementScope: RequirementScope;
    public declare requiredForDepartments: Collection<Department>;
    public declare requiredForPositions: Collection<Position>;
}
