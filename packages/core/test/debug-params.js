// 简单的参数化查询调试
const { Parser } = require('./src/sql/sql-parser.ts');

const sql = 'SELECT * FROM features WHERE type = $1 AND active = $2';
const params = ['cafe', true];

const parser = new Parser();
const result = parser.parse(sql);

console.log('原始 SQL:', sql);
console.log('参数:', params);
console.log('解析结果:');
console.log('- 参数列表:', result.parameters);
console.log('- 语句:', JSON.stringify(result.statement, null, 2));
