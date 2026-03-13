/**
 * IN 子句解析测试
 */

import { describe, it, expect } from 'vitest';
import { Parser } from '../../src/sql/sql-parser';
import { SQLToQueryBuilderTranslator } from '../../src/sql/query-translator';

describe('IN 子句解析', () => {
  it('should parse IN clause correctly', () => {
    const parser = new Parser();
    const result = parser.parse("SELECT * FROM features WHERE type IN ('point', 'line')");

    console.log('Full statement:', JSON.stringify(result.statement, null, 2));
    console.log('WHERE clause:', JSON.stringify(result.statement.where, null, 2));

    // 尝试转换
    const translator = new SQLToQueryBuilderTranslator();
    console.log('Translator created');
  });
});
