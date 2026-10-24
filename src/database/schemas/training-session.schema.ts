import { EntitySchema } from "@mikro-orm/core";
import { Training } from "../../models/training";
import { SessionStatus, TrainingSession } from "../../models/training-session";

export const TrainingSessionSchema = new EntitySchema<TrainingSession>({
    class: TrainingSession,
    properties: {
        id: { type: "string", primary: true },
        training: { kind: "m:1", entity: () => Training },
        status: { enum: true, items: () => SessionStatus },
        date: { type: "date" },
        startTime: { type: "time" },
        endTime: { type: "time" },
        location: { type: "string" },
        capacity: { type: "integer" },
        occupied: { type: "integer" }
    }
});
