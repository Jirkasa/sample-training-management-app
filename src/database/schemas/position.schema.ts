import { EntitySchema } from "@mikro-orm/core";
import { Position } from "../../models/position";

export const PositionSchema = new EntitySchema<Position>({
    class: Position,
    properties: {
        id: { type: "integer", primary: true, autoincrement: true },
        name: { type: "string", unique: true }
    }
});
