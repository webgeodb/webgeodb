# Database Initialization Sequence Diagram

```mermaid
sequenceDiagram
    participant App as Application Code
    participant WDB as WebGeoDB Instance
    participant Schema as Schema Manager
    participant Storage as Storage Layer
    participant Index as Index Manager
    participant Cache as Cache System
    participant IDB as IndexedDB

    App->>WDB: new WebGeoDB(options)
    activate WDB
    WDB->>WDB: Initialize configuration
    WDB->>Schema: Create schema manager
    activate Schema
    Schema-->>WDB: Schema manager ready
    deactivate Schema
    WDB-->>App: Instance created
    deactivate WDB

    App->>WDB: db.schema(tableDefinitions)
    activate WDB
    WDB->>Schema: Register table schemas
    activate Schema
    Schema->>Schema: Validate table definitions
    Schema->>Schema: Generate storage schema
    Schema-->>WDB: Schema registered
    deactivate Schema
    WDB-->>App: Schema defined
    deactivate WDB

    App->>WDB: await db.open()
    activate WDB
    WDB->>Storage: Open database connection
    activate Storage
    Storage->>IDB: indexedDB.open(name, version)
    activate IDB

    alt First open or version upgrade
        IDB-->>Storage: onupgradeneeded event
        Storage->>Storage: Create object stores
        Storage->>Storage: Create indexes
        Storage->>Storage: Migrate data if needed
    end

    IDB-->>Storage: Connection success
    deactivate IDB
    Storage-->>WDB: Storage ready
    deactivate Storage

    WDB->>Index: Initialize index system
    activate Index
    Index->>Index: Load index configuration
    Index->>Index: Create spatial indexes
    Index->>Index: Register index managers
    Index-->>WDB: Index system ready
    deactivate Index

    WDB->>Cache: Initialize cache system
    activate Cache
    Cache->>Cache: Create LRU cache
    Cache->>Cache: Set cache policy
    Cache->>Cache: Start cache cleanup task
    Cache-->>WDB: Cache system ready
    deactivate Cache

    WDB->>WDB: Mark database as opened
    WDB-->>App: Database opened successfully
    deactivate WDB

    Note over App,IDB: Database initialized, ready for queries
```

## Description

This sequence diagram shows the complete initialization flow of WebGeoDB database:

#### Initialization Stages

1. **Instance Creation (new WebGeoDB)**
   - Create database instance
   - Initialize internal configuration
   - Create schema manager

2. **Schema Definition (schema)**
   - Register table structure definitions
   - Validate table definitions
   - Generate IndexedDB storage schema

3. **Database Open (open)**
   - Open IndexedDB connection
   - Handle version upgrade (if needed)
   - Create object stores and indexes
   - Initialize index system
   - Initialize cache system

#### Key Components

- **Schema Manager**: Manages table structures and field definitions
- **Storage Layer**: Encapsulates IndexedDB operations
- **Index Manager**: Manages creation and maintenance of spatial indexes
- **Cache System**: Provides LRU cache functionality

## Initialization Code Example

### Complete Initialization Flow
```typescript
// 1. Create instance
const db = new WebGeoDB({
  name: 'my-geo-database',
  version: 1
})

// 2. Define schema
db.schema({
  features: {
    id: 'string',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    properties: 'json'
  },
  locations: {
    id: 'string',
    timestamp: 'number',
    coordinates: 'geometry'
  }
})

// 3. Open database
try {
  await db.open()
  console.log('Database initialized successfully')
} catch (error) {
  console.error('Failed to initialize database:', error)
}
```

### Version Upgrade Handling
```typescript
// Data automatically migrated on version upgrade
db.schema({
  features: {
    id: 'string',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    properties: 'json',
    // New fields
    createdAt: 'number',
    updatedAt: 'number'
  }
})

// Increment version
const db = new WebGeoDB({
  name: 'my-geo-database',
  version: 2  // Version upgrade
})
```

## Best Practices

1. **Error Handling**: Always wrap initialization code with try-catch
2. **Version Management**: Increment version number when upgrading schema
3. **Lazy Loading**: Only open database when needed
4. **Resource Cleanup**: Close database connection after use
