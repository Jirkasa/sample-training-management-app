import { EntitySchema } from "@mikro-orm/core";
import { Department } from "../../models/department";
import { Position } from "../../models/position";
import { RequirementScope, Training } from "../../models/training";

export const TrainingSchema = new EntitySchema<Training>({
    class: Training,
    properties: {
        code: { type: "string", primary: true },
        name: { type: "string" },
        validityMonths: { type: "integer", nullable: true },
        requirementScope: { enum: true, items: () => RequirementScope },
        requiredForDepartments: { kind: "m:n", entity: () => Department },
        requiredForPositions: { kind: "m:n", entity: () => Position }
    }
});
