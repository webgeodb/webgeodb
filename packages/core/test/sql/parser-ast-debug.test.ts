/**
 * node-sql-parser AST 调试
 */

import { describe, it, expect } from 'vitest';
import { Parser } from 'node-sql-parser';

const parser = new Parser();

describe('node-sql-parser AST', () => {
  it('should show IN clause AST', () => {
    const ast = parser.astify("SELECT * FROM features WHERE type IN ('point', 'line')", {
      database: 'postgresql'
    });

    console.log('IN clause AST:', JSON.stringify(ast, null, 2));
  });

  it('should show = clause AST', () => {
    const ast = parser.astify("SELECT * FROM features WHERE type = 'point'", {
      database: 'postgresql'
    });

    console.log('= clause AST:', JSON.stringify(ast, null, 2));
  });

  it('should show AND clause AST', () => {
    const ast = parser.astify("SELECT * FROM features WHERE type = 'point' AND value > 50", {
      database: 'postgresql'
    });

    console.log('AND clause AST:', JSON.stringify(ast, null, 2));
  });
});
