# SCADA Power Grid - Modular Architecture

This document describes the new modular architecture of the SCADA Power Grid application.

## Overview

The application has been refactored from a single monolithic file (`main.js`) into a clean, modular architecture that separates concerns and makes the code easier to understand, maintain, and extend.

## Architecture

```
app.js (Main Application)
├── config.js (Configuration & Constants)
├── state.js (State Management)
├── mapManager.js (Map & Visualization)
├── faultManager.js (Fault Logic & Processing)
├── analyticsManager.js (Charts & Analytics)
├── mqttManager.js (MQTT Communication)
└── uiManager.js (User Interface & Controls)
```

## Module Descriptions

### 1. `config.js`
- **Purpose**: Centralized configuration and constants
- **Contains**: Map settings, color schemes, pole data, MQTT configuration, chart settings
- **Benefits**: Easy to modify settings, single source of truth for constants

### 2. `state.js`
- **Purpose**: Application state management
- **Contains**: Pole data, markers, lines, fault icons, analytics data
- **Benefits**: Centralized state, clear data flow, easier debugging

### 3. `mapManager.js`
- **Purpose**: Map initialization and management
- **Contains**: Leaflet map setup, pole markers, line connections, visual updates
- **Benefits**: Isolated map logic, easier to modify map behavior

### 4. `faultManager.js`
- **Purpose**: Fault detection and processing logic
- **Contains**: Fault type handling, visual fault effects, pole status updates, substation status handling
- **Benefits**: Centralized fault logic, easier to add new fault types, handles both pole and substation faults

### 5. `analyticsManager.js`
- **Purpose**: Charts and analytics functionality
- **Contains**: Chart.js setup, data visualization, analytics controls
- **Benefits**: Isolated chart logic, easier to modify analytics

### 6. `mqttManager.js`
- **Purpose**: MQTT communication with dual topic support
- **Contains**: Broker connection, dual topic subscription, message parsing for different formats
- **Benefits**: Isolated network logic, handles both JSON and custom string formats, easier to change communication protocols

### 7. `uiManager.js`
- **Purpose**: User interface and controls
- **Contains**: Button handlers, event listeners, UI state management
- **Benefits**: Centralized UI logic, easier to modify user interactions

### 8. `app.js`
- **Purpose**: Main application coordinator
- **Contains**: Module initialization, dependency management, application lifecycle
- **Benefits**: Clear initialization order, easy to understand dependencies

## MQTT Communication

The application now supports two MQTT topics for comprehensive power grid monitoring:

### Substation Topic: `scada/grid/substation1/status`
- **Format**: JSON messages
- **Content**: Voltage, current, status, and fault code
- **Example**:
  ```json
  {
    "voltage": 220.5,
    "current": 15.2,
    "status": "OK",
    "fault_code": 0
  }
  ```
- **Status Values**: "OK", "WARNING", "FAULT"
- **Update Frequency**: Every 5 seconds

### Poles Topic: `scada/grid/pole`
- **Format**: Custom string format starting with `$$` and ending with `##`
- **Content**: Pole ID, substation ID, voltage, current, error code
- **Example**: `$$P01,S01,220.0,15.0,0##`
- **Error Codes**:
  - `0`: Normal operation
  - `27`: Line fault (short circuit)
  - `10`: Neutral break
- **Update Frequency**: Every 5 seconds

### Message Processing
- **Substation messages**: Parsed as JSON and sent to `updateSubstationStatus()`
- **Pole messages**: Parsed from custom format and sent to `updatePoleStatus()`
- **Automatic parsing**: The system automatically detects message format and routes accordingly
- **Real-time updates**: Visual grid representation updates immediately upon message receipt

## Benefits of Modular Architecture

### 1. **Separation of Concerns**
- Each module has a single, well-defined responsibility
- Logic is organized by functionality rather than mixed together

### 2. **Maintainability**
- Easier to locate and fix bugs
- Changes to one feature don't affect others
- Clear interfaces between modules

### 3. **Testability**
- Each module can be tested independently
- Easier to mock dependencies for unit tests
- Clear input/output contracts

### 4. **Extensibility**
- Easy to add new features by creating new modules
- Existing modules can be enhanced without affecting others
- Clear patterns for adding new functionality

### 5. **Code Reusability**
- Modules can be reused in other projects
- Common utilities are centralized
- Consistent patterns across the application

### 6. **Team Development**
- Multiple developers can work on different modules
- Clear ownership of code sections
- Reduced merge conflicts

## Module Dependencies

```
app.js
├── mapManager.js
├── faultManager.js (depends on mapManager.js)
├── analyticsManager.js
├── mqttManager.js (depends on faultManager.js)
└── uiManager.js (depends on all other managers)

state.js (used by all managers)
config.js (used by all managers)
utils.js (used by multiple managers)
```

## Usage

The application automatically initializes when the page loads. All functionality remains exactly the same from the user's perspective.

### For Developers

To modify specific functionality:

1. **Map behavior**: Edit `mapManager.js`
2. **Fault logic**: Edit `faultManager.js`
3. **Analytics**: Edit `analyticsManager.js`
4. **UI controls**: Edit `uiManager.js`
5. **Configuration**: Edit `config.js`

### Adding New Features

1. Create a new module file
2. Import dependencies from other modules
3. Export the new functionality
4. Import and use in `app.js`

## Migration Notes

- **No functionality changes**: All existing features work exactly the same
- **Same HTML**: No changes to the HTML file except script import
- **Same CSS**: No changes to styling
- **Same user experience**: All buttons, interactions, and displays work identically

## File Structure

```
Power-grid/
├── index.html (updated script import)
├── app.js (main application)
├── config.js (configuration)
├── state.js (state management)
├── mapManager.js (map functionality)
├── faultManager.js (fault handling)
├── analyticsManager.js (charts & analytics)
├── mqttManager.js (MQTT communication)
├── uiManager.js (user interface)
├── utils.js (utility functions)
├── styles.css (unchanged)
├── main.js (original file - can be removed)
└── README_MODULAR.md (this file)
```

## Next Steps

With this modular architecture, future enhancements become much easier:

1. **Add new fault types** by extending `faultManager.js`
2. **Add new chart types** by extending `analyticsManager.js`
3. **Add new UI controls** by extending `uiManager.js`
4. **Change map provider** by modifying `mapManager.js`
5. **Add new communication protocols** by extending `mqttManager.js`

The modular structure makes the codebase professional, maintainable, and ready for future development.
