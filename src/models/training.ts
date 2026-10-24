export enum RequirementScope {
    ALL = "all",
    DEPARTMENT = "department",
    POSITION = "position",
    NONE = "none"
}

export class Training {
    public declare code: string;
    public declare name: string;
    public declare description: string;
    public declare validityMonths: number;
    public declare requirementScope: RequirementScope;
}