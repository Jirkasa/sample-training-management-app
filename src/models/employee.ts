import { Department } from "./department";
import { Position } from "./position";

export enum EmployeeStatus {
    ACTIVE = "active",
    PARENTAL_LEAVE = "parental_leave",
    TERMINATED = "terminated"
}

export class Employee {
    public declare id: string;
    public declare firstName: string;
    public declare lastName: string;
    public declare department: Department | null;
    public declare position: Position;
    public declare status: EmployeeStatus;
    public declare terminationDate: string | null;
}
