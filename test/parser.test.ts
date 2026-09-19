import assert from 'assert';
import { IaCParser } from '../src/iac_parser.js';

console.log('🧪 IaC parser — JSON (CDK/terraform-show) format...\n');
let passed = 0;
const ok = (l: string, c: boolean) => { assert(c, l); passed++; console.log(`   ✅ ${l}`); };

const json = JSON.stringify({
  resource: {
    aws_s3_bucket: { data: { acl: 'public-read' } },
    aws_instance: { web: { instance_type: 'm5.4xlarge' } },
  },
});
const res = IaCParser.parse(json);
ok('parses 2 resources from JSON', res.length === 2);
ok('normalizes ids as type.name', res.some((r) => r.id === 'aws_s3_bucket.data'));
ok('keeps properties', (res.find((r) => r.type === 'aws_instance')!.properties as any).instance_type === 'm5.4xlarge');
ok('non-string input → empty', IaCParser.parse(42 as any).length === 0);

console.log(`\n🎉 ALL ${passed} IAC PARSER JSON ASSERTIONS PASSED.\n`);
