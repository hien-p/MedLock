# Sui Move Conventions & Rules

## 1. Organization Principles

### Package Structure
- **sources/**: Move code.
- **tests/**: Unit tests (`[test_only]` modules).
- **examples/**: Example usage code.
- **Move.toml**: Manifest (always include `Move.lock`).

### Module Structure
Organize modules with section markers:
```move
module my_package::my_module {
    // === Imports ===
    // === Errors ===
    // === Constants ===
    // === Structs ===
    // === Events ===
    // === Public Functions ===
    // === View Functions ===
    // === Admin Functions ===
    // === Private Functions ===
    // === Test Functions ===
}
```

## 2. Naming Conventions

### Constants
- **Format**: `UPPER_CASE_SNAKE_CASE`
- **Errors**: `PascalCase` starting with `E` (e.g., `EInvalidName`).

### Structs
- **Abilities Order**: `key`, `copy`, `drop`, `store`.
- **Events**: Suffix with `Event` (optional but recommended for clarity).
- **No "Potato"**: Do not use "Potato" in names; use descriptive names for structs without abilities (e.g., `Request`).

### Functions
- **CRUD Standard**:
    - `new`: Create empty object.
    - `create`: Create initialized object.
    - `add` / `remove`: Collection modification.
    - `borrow` / `borrow_mut`: Accessors.
    - `drop`: Drop struct.

## 3. Design Patterns

### Capabilities (Caps)
- Use `AdminCap` for privileged actions.
- Store `Cap` in the creator's account or a shared object if intended for distributed governance.

### Witness Pattern
- Use `One Time Witness (OTW)` for initializing coins and registries.

### Data Flow
- Prefer passing objects by value or mutable reference for state changes.
- Use `Option` for nullable fields.
- Use `Table` or `Bag` for large dynamic collections.

## 4. Testing
- Place tests in `tests/` directory.
- Use `#[test_only]` for helper functions in main modules (like `init_for_testing`).
- Mock time with `sui::clock::Clock`.
