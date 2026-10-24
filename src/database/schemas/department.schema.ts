import { EntitySchema } from "@mikro-orm/core";
import { Department } from "../../models/department";

export const DepartmentSchema = new EntitySchema<Department>({
    class: Department,
    properties: {
        id: { type: "integer", primary: true, autoincrement: true },
        name: { type: "string", unique: true }
    }
});
