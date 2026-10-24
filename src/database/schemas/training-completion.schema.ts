import { EntitySchema } from "@mikro-orm/core";
import { Employee } from "../../models/employee";
import { Training } from "../../models/training";
import { TrainingCompletion } from "../../models/training-completion";

export const TrainingCompletionSchema = new EntitySchema<TrainingCompletion>({
    class: TrainingCompletion,
    indexes: [{ properties: ["employee", "training", "completionDate"] }],
    properties: {
        id: { type: "string", primary: true },
        employee: { kind: "m:1", entity: () => Employee },
        training: { kind: "m:1", entity: () => Training },
        completionDate: { type: "date" },
        validUntil: { type: "date", nullable: true }
    }
});
