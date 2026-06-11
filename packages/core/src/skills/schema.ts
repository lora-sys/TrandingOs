import type { TSchema } from "typebox";

/**
 * Convert a TypeBox TSchema to a JSON Schema object.
 *
 * MCP tool registration requires JSON Schema for input validation.
 * This converter handles the TypeBox types used by Trading Pi skills.
 */
export function typeBoxToJsonSchema(schema: TSchema): Record<string, unknown> {
  const s = schema as Record<string, unknown>;
  const kind = s["~kind"] as string | undefined;

  switch (kind) {
    case "String":
      return { type: "string" };

    case "Number":
      return { type: "number" };

    case "Boolean":
      return { type: "boolean" };

    case "Integer":
      return { type: "integer" };

    case "Null":
      return { type: "null" };

    case "Any":
      return {};

    case "Literal":
      return { type: s.type as string, const: s.const };

    case "Enum":
      return { enum: s.enum as unknown[] };

    case "Array": {
      const items = s.items as TSchema | undefined;
      return { type: "array", items: items ? typeBoxToJsonSchema(items) : {} };
    }

    case "Object": {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      const props = s.properties as Record<string, TSchema> | undefined;
      if (props) {
        for (const [key, value] of Object.entries(props)) {
          properties[key] = typeBoxToJsonSchema(value);
          const prop = value as Record<string, unknown>;
          if (!prop["~optional"]) required.push(key);
        }
      }
      return {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }

    case "Union": {
      const anyOf = s.anyOf as TSchema[] | undefined;
      return { anyOf: anyOf ? anyOf.map((t) => typeBoxToJsonSchema(t)) : [] };
    }

    case "Intersect": {
      const allOf = s.allOf as TSchema[] | undefined;
      return { allOf: allOf ? allOf.map((t) => typeBoxToJsonSchema(t)) : [] };
    }

    default:
      // Record and other complex types fall through to a minimal representation
      return {};
  }
}

/**
 * Manifest describing an MCP-compatible tool.
 *
 * MCP tools use JSON Schema for their inputSchema field.
 * Use typeBoxToJsonSchema to convert a TradingSkill's parameters
 * into the inputSchema format.
 */
export interface ToolManifest {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}