/**
 * IaC Parser - Ingests Terraform HCL / CloudFormation / CDK manifests into normalized resource graphs.
 */

export class IaCParser {
  /**
   * Parse raw Terraform HCL or JSON manifest string into normalized resource nodes
   * @param {string} manifestText 
   * @returns {Array<Object>} Normalized cloud resources
   */
  static parse(manifestText) {
    const resources = [];
    if (!manifestText || typeof manifestText !== 'string') return resources;

    // 1. Check if valid JSON (e.g. terraform show -json or CDK synth output)
    try {
      const parsedJson = JSON.parse(manifestText);
      if (parsedJson.resource) {
        for (const [type, instances] of Object.entries(parsedJson.resource)) {
          for (const [name, config] of Object.entries(instances)) {
            resources.push({
              id: `${type}.${name}`,
              type,
              name,
              properties: config,
              raw: JSON.stringify(config, null, 2)
            });
          }
        }
        return resources;
      }
    } catch {
      // Not JSON, parse HCL format
    }

    // 2. Parse Terraform HCL blocks using block regex parser
    // Matches: resource "type" "name" { ... }
    const blockRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
    let match;

    while ((match = blockRegex.exec(manifestText)) !== null) {
      const type = match[1];
      const name = match[2];
      const body = match[3];

      const properties = this.parseHclProperties(body);

      resources.push({
        id: `${type}.${name}`,
        type,
        name,
        properties,
        rawBody: body.trim()
      });
    }

    return resources;
  }

  /**
   * Simple tokenizer to extract key-value assignments and nested blocks from HCL
   */
  static parseHclProperties(body) {
    const props = {};
    const lines = body.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;

      const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        let val = kvMatch[2].trim().replace(/^["']|["']$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(Number(val))) val = Number(val);
        props[key] = val;
      }
    }

    return props;
  }
}
