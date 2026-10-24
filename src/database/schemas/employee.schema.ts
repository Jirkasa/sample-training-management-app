import { EntitySchema } from "@mikro-orm/core";
import { Department } from "../../models/department";
import { Employee, EmployeeStatus } from "../../models/employee";
import { Position } from "../../models/position";

export const EmployeeSchema = new EntitySchema<Employee>({
    class: Employee,
    properties: {
        id: { type: "string", primary: true },
        firstName: { type: "string" },
        lastName: { type: "string" },
        department: { kind: "m:1", entity: () => Department, nullable: true },
        position: { kind: "m:1", entity: () => Position },
        status: { enum: true, items: () => EmployeeStatus },
        terminationDate: { type: "date", nullable: true }
    }
});
