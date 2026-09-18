/**
 * IaC Parser - Ingests Terraform HCL / CloudFormation / CDK manifests into normalized resource graphs.
 */

export interface CloudResource {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  raw?: string;
  rawBody?: string;
}

export class IaCParser {
  /** Parse raw Terraform HCL or JSON manifest into normalized resource nodes. */
  static parse(manifestText: unknown): CloudResource[] {
    const resources: CloudResource[] = [];
    if (!manifestText || typeof manifestText !== 'string') return resources;

    // 1. Valid JSON (e.g. terraform show -json or CDK synth output)
    try {
      const parsedJson = JSON.parse(manifestText);
      if (parsedJson.resource) {
        for (const [type, instances] of Object.entries(parsedJson.resource as Record<string, Record<string, unknown>>)) {
          for (const [name, config] of Object.entries(instances)) {
            resources.push({
              id: `${type}.${name}`,
              type,
              name,
              properties: config as Record<string, unknown>,
              raw: JSON.stringify(config, null, 2)
            });
          }
        }
        return resources;
      }
    } catch {
      // Not JSON — parse HCL below.
    }

    // 2. Parse Terraform HCL blocks: resource "type" "name" { ... }
    const blockRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(manifestText)) !== null) {
      const [, type, name, body] = match;
      resources.push({
        id: `${type}.${name}`,
        type,
        name,
        properties: this.parseHclProperties(body),
        rawBody: body.trim()
      });
    }

    return resources;
  }

  /** Tokenize key-value assignments from an HCL block body. */
  static parseHclProperties(body: string): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;
      const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        let val: unknown = kvMatch[2].trim().replace(/^["']|["']$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(Number(val as string))) val = Number(val);
        props[key] = val;
      }
    }
    return props;
  }
}
