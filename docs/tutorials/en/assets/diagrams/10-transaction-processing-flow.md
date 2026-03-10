# Transaction Processing Flow

```mermaid
flowchart TB
    START([Transaction Request]) --> BEGIN{Transaction Type}

    BEGIN -->|Read-Write| RW_START[Start RW Transaction]
    BEGIN -->|Read-Only| RO_START[Start RO Transaction]

    RW_START --> RW_SCOPE[Define Transaction Scope]
    RW_SCOPE --> RW_EXEC[Execute Transaction Operations]

    RO_START --> RO_SCOPE[Define Transaction Scope]
    RO_SCOPE --> RO_EXEC[Execute Transaction Operations]

    subgraph "Transaction Execution"
        RW_EXEC --> OP_QUEUE[Operation Queue]
        RO_EXEC --> OP_QUEUE

        OP_QUEUE --> OP_TYPE{Operation Type}

        OP_TYPE -->|Insert| INSERT_OP[Insert Operation]
        OP_TYPE -->|Update| UPDATE_OP[Update Operation]
        OP_TYPE -->|Delete| DELETE_OP[Delete Operation]
        OP_TYPE -->|Query| QUERY_OP[Query Operation]

        INSERT_OP --> TRACK[Track Changes]
        UPDATE_OP --> TRACK
        DELETE_OP --> TRACK
        QUERY_OP --> QUERY_EXEC[Execute Query]

        TRACK --> VALIDATE[Validate Data]
        VALIDATE --> CHECK_ERROR{Has Error?}

        CHECK_ERROR -->|Yes| ROLLBACK_1[Rollback]
        CHECK_ERROR -->|No| CONTINUE[Continue Operation]

        QUERY_EXEC --> CONTINUE
        CONTINUE --> MORE_OPS{More Operations?}

        MORE_OPS -->|Yes| OP_TYPE
        MORE_OPS -->|No| PREPARE_COMMIT[Prepare Commit]
    end

    PREPARE_COMMIT --> CHECK_CONFLICT{Check Conflicts}

    CHECK_CONFLICT -->|Has Conflict| ROLLBACK_2[Rollback]
    CHECK_CONFLICT -->|No Conflict| UPDATE_INDEX[Update Indexes]

    UPDATE_INDEX --> UPDATE_CACHE[Update Cache]
    UPDATE_CACHE --> COMMIT[Commit Transaction]

    COMMIT --> PERSIST[Persist Data]

    PERSIST --> COMMIT_SUCCESS([Transaction Success])

    ROLLBACK_1 --> ROLLBACK_ops[Rollback Operations]
    ROLLBACK_2 --> ROLLBACK_ops

    ROLLBACK_ops --> CLEAR_CACHE[Clear Cache]
    CLEAR_CACHE --> RESTORE_INDEX[Restore Indexes]
    RESTORE_INDEX --> ROLLBACK_ERROR([Transaction Failed])

    style START fill:#e1f5ff
    style RW_START fill:#fff4e6
    style RO_START fill:#e8f5e9
    style COMMIT_SUCCESS fill:#c8e6c9
    style ROLLBACK_ERROR fill:#ffcdd2
```

## Description

This diagram shows the complete transaction processing flow in WebGeoDB, including transaction start, execution, commit, and rollback:

#### Transaction Types

1. **Read-Write Transaction**
   - Allows insert, update, delete operations
   - Requires exclusive access to related tables
   - Supports full transaction isolation

2. **Read-Only Transaction**
   - Only allows query operations
   - Can execute concurrently
   - Faster execution speed

#### Transaction Execution Stages

1. **Define Scope**: Specify tables involved in transaction
2. **Operation Queue**: Collect all database operations
3. **Data Validation**: Validate operation validity
4. **Conflict Detection**: Check for conflicting operations
5. **Index Update**: Update all related indexes
6. **Cache Update**: Update or clear cache
7. **Data Persistence**: Commit to IndexedDB

#### Transaction Rollback

When encountering errors or conflicts:
1. **Rollback Operations**: Undo all executed operations
2. **Clear Cache**: Clear related cache data
3. **Restore Indexes**: Restore indexes to previous state
4. **Return Error**: Report failure to caller

## Transaction Usage Examples

### 1. Basic Transaction
```typescript
// Read-write transaction
await db.transaction('rw', db.features, async () => {
  // All operations in same transaction
  await db.features.insert(feature1)
  await db.features.insert(feature2)
  await db.features.update(id3, updates)

  // Any error will cause rollback
})

// Read-only transaction
const results = await db.transaction('r', db.features, async () => {
  return await db.features.where('type', '=', 'poi').toArray()
})
```

### 2. Cross-Table Transaction
```typescript
// Transaction involving multiple tables
await db.transaction(
  'rw',
  [db.features, db.locations, db.metadata],
  async () => {
    await db.features.insert(feature)
    await db.locations.insert(location)
    await db.metadata.update('count', { value: count + 1 })

    // All succeed or all rollback
  }
)
```

### 3. Error Handling
```typescript
try {
  await db.transaction('rw', db.features, async () => {
    await db.features.insert(feature1)
    await db.features.insert(feature2)

    // If error thrown here, both inserts will rollback
    throw new Error('Something went wrong')
  })
} catch (error) {
  console.error('Transaction failed, all changes rolled back:', error)
}
```

### 4. Nested Transactions
```typescript
// Outer transaction
await db.transaction('rw', db.features, async () => {
  await db.features.insert(feature1)

  // Inner transaction (actually same transaction)
  await db.transaction('rw', db.locations, async () => {
    await db.locations.insert(location1)
  })

  // All operations in same transaction
})
```

## Transaction Best Practices

1. **Keep Short**: Transactions should be as short as possible to reduce lock time
2. **Error Handling**: Always use try-catch to handle transaction errors
3. **Avoid Nesting**: Try to avoid deeply nested transactions
4. **Read-Only Optimization**: Use read-only transactions for queries to improve performance
5. **Batch Operations**: Put related operations in the same transaction
