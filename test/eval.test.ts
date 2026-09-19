import assert from 'assert';
import { evaluate, scoreDetection, LABELED_TF_EXPECTED } from '../src/eval.js';

console.log('🧪 CloudPulse detection-quality eval...\n');
let passed = 0;
const ok = (label: string, cond: boolean) => { assert(cond, label); passed++; console.log(`   ✅ ${label}`); };

const { labeled, clean } = evaluate();
console.log('   labeled:', labeled, '\n   clean:', clean);

ok('finds every planted violation (recall 1.0)', labeled.recall === 1.0);
ok('no false positives on the labeled fixture (precision 1.0)', labeled.precision === 1.0);
ok('F1 = 1.0 on the labeled fixture', labeled.f1 === 1.0);
ok('clean manifest raises nothing (0 findings)', clean.found.length === 0);
ok('expected set is the 6 planted rules', LABELED_TF_EXPECTED.length === 6);

console.log(`\n🎉 ALL ${passed} CLOUDPULSE EVAL ASSERTIONS PASSED.\n`);
