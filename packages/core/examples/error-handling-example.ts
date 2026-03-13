/**
 * 错误处理示例
 * 演示如何使用 WebGeoDB 的错误处理体系
 */

import { WebGeoDB } from '../src';
import {
  ErrorFactory,
  ErrorHandler,
  ErrorCode,
  DatabaseError,
  TableError,
  QueryError,
  ValidationError
} from '../src/errors';

// 示例 1: 基本错误处理
async function basicErrorHandling() {
  const db = new WebGeoDB({ name: 'error-example', version: 1 });

  try {
    await db.open();
    // ... 数据库操作
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`数据库错误 [${error.code}]: ${error.message}`);
      console.error('详细信息:', error.getDetails());
    } else if (error instanceof Error) {
      console.error('未知错误:', error.message);
    }
  }
}

// 示例 2: 使用 ErrorHandler 工具
async function usingErrorHandler() {
  const result = await ErrorHandler.handleAsync(async () => {
    const db = new WebGeoDB({ name: 'error-example', version: 1 });
    await db.open();
    return db;
  });

  return result;
}

// 示例 3: 创建自定义错误
function customError() {
  // 使用工厂函数创建错误
  const error = ErrorFactory.tableNotFound('users');
  console.log(error.getDetails());

  // 创建带上下文的错误
  const errorWithContext = ErrorFactory.queryParseFailed(
    'SELECT * FROM',
    new Error('Syntax error')
  );
  console.log(errorWithContext.getDetails());
}

// 示例 4: 错误类型判断
function errorTypeCheck(error: unknown) {
  if (ErrorHandler.isWebGeoDBError(error)) {
    console.log('这是 WebGeoDB 错误');
    console.log('错误代码:', error.code);
    console.log('严重级别:', error.severity);
  }

  if (error instanceof ValidationError) {
    console.log('这是验证错误');
  }
}

// 示例 5: 全局错误处理
async function globalErrorHandling() {
  // 注册全局错误处理器
  GlobalErrorHandler.on_error((error) => {
    console.error('全局错误捕获:', error.getDetails());

    // 发送到日志服务
    sendToLoggingService(error.toJSON());
  });
}

function sendToLoggingService(errorData: Record<string, any>) {
  // 模拟发送到日志服务
  console.log('发送到日志服务:', errorData);
}

// 示例 6: 在实际场景中使用
async function realWorldExample() {
  const db = new WebGeoDB({ name: 'real-world', version: 1 });

  await db.open();

  // 定义表结构
  db.schema({
    users: {
      id: 'string',
      name: 'string',
      email: 'string',
      age: 'number'
    }
  });

  try {
    // 插入数据
    await db.users.insert({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    });

    // 查询数据
    const users = await db.users.where('age', '>=', 18).toArray();

    // SQL 查询
    const results = await db.query('SELECT * FROM users WHERE age >= $1', [18]);

  } catch (error) {
    if (error instanceof TableError) {
      console.error('表操作失败:', error.message);
    } else if (error instanceof QueryError) {
      console.error('查询失败:', error.message);
    } else {
      console.error('未知错误:', error);
    }
  } finally {
    await db.close();
  }
}

// 示例 7: 错误恢复策略
async function errorRecovery() {
  const db = new WebGeoDB({ name: 'recovery', version: 1 });

  try {
    await db.open();
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.code === ErrorCode.DATABASE_VERSION_MISMATCH) {
        console.log('数据库版本不匹配，尝试升级...');
        // 执行升级逻辑
      } else if (error.code === ErrorCode.DATABASE_CLOSED) {
        console.log('数据库已关闭，尝试重新打开...');
        await db.open();
      }
    }
  }
}

// 导出示例
export {
  basicErrorHandling,
  usingErrorHandler,
  customError,
  errorTypeCheck,
  globalErrorHandling,
  realWorldExample,
  errorRecovery
};
