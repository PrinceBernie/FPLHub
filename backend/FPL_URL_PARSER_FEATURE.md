# 🔗 FPL URL Parser Feature

## Overview

The FPL URL Parser feature allows users to link their Fantasy Premier League teams using either:
1. **Direct Team ID** (e.g., `417303`)
2. **Full FPL URL** (e.g., `https://fantasy.premierleague.com/entry/417303/event/3`)

This enhancement makes it much easier for users to link their teams without having to manually extract the team ID from the URL.

## Supported URL Formats

The parser supports various FPL URL formats:

### Full URLs with Protocol
- `https://fantasy.premierleague.com/entry/417303/event/3`
- `https://fantasy.premierleague.com/entry/417303/`
- `https://fantasy.premierleague.com/entry/417303`

### URLs without Protocol
- `fantasy.premierleague.com/entry/417303/event/3`
- `fantasy.premierleague.com/entry/417303/`
- `fantasy.premierleague.com/entry/417303`

### Partial Paths
- `/entry/417303/event/3`
- `/entry/417303/`

### Direct Team IDs
- `417303` (string)
- `417303` (number)

## API Changes

### Link FPL Team Endpoint

**Endpoint:** `POST /api/user/link-fpl-team`

**Request Body Options:**

#### Option 1: Using Team ID
```json
{
  "fplTeamId": 417303
}
```

#### Option 2: Using FPL URL
```json
{
  "fplUrl": "https://fantasy.premierleague.com/entry/417303/event/3"
}
```

#### Option 3: Both (Team ID takes priority)
```json
{
  "fplTeamId": 417303,
  "fplUrl": "https://fantasy.premierleague.com/entry/417303/event/3"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FPL team linked successfully",
  "data": {
    "linkedTeam": {
      "id": "uuid",
      "userId": "uuid",
      "fplTeamId": 417303,
      "teamName": "My FPL Team",
      "isActive": true,
      "linkedAt": "2024-01-01T00:00:00.000Z",
      "lastSync": "2024-01-01T00:00:00.000Z",
      "fplUrl": "https://fantasy.premierleague.com/entry/417303"
    },
    "fplTeam": {
      "id": 417303,
      "name": "My FPL Team",
      "player_first_name": "John",
      "player_last_name": "Doe"
    },
    "extractedFrom": "url" // or "id"
  }
}
```

### Get Linked Teams Endpoint

**Endpoint:** `GET /api/user/linked-teams`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "fplTeamId": 417303,
      "teamName": "My FPL Team",
      "isActive": true,
      "linkedAt": "2024-01-01T00:00:00.000Z",
      "lastSync": "2024-01-01T00:00:00.000Z",
      "fplUrl": "https://fantasy.premierleague.com/entry/417303"
    }
  ]
}
```

## Implementation Details

### FPLUrlParser Utility Class

**Location:** `src/utils/fplUrlParser.js`

**Key Methods:**

#### `extractTeamId(input)`
Extracts team ID from various input formats.

```javascript
FPLUrlParser.extractTeamId('https://fantasy.premierleague.com/entry/417303/event/3');
// Returns: 417303

FPLUrlParser.extractTeamId('417303');
// Returns: 417303
```

#### `isValidInput(input)`
Validates if input is a valid team ID or URL.

```javascript
FPLUrlParser.isValidInput('https://fantasy.premierleague.com/entry/417303/event/3');
// Returns: true

FPLUrlParser.isValidInput('invalid-url');
// Returns: false
```

#### `getTeamUrl(teamId, gameweek)`
Generates FPL URL for a team ID.

```javascript
FPLUrlParser.getTeamUrl(417303);
// Returns: "https://fantasy.premierleague.com/entry/417303"

FPLUrlParser.getTeamUrl(417303, 5);
// Returns: "https://fantasy.premierleague.com/entry/417303/event/5"
```

#### `parseInput(input)`
Parses input and returns both team ID and URL.

```javascript
FPLUrlParser.parseInput('https://fantasy.premierleague.com/entry/417303/event/3');
// Returns: {
//   teamId: 417303,
//   url: "https://fantasy.premierleague.com/entry/417303"
// }
```

## Frontend Integration

### API Client Update

**File:** `src/lib/api.ts`

```typescript
// Updated method signature
async linkFplTeam(input: { fplTeamId?: number; fplUrl?: string }) {
  return this.request<{ linkedTeam: LinkedTeam; user: User }>('/user/link-fpl-team', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
```

### LinkedTeam Interface

**Updated interface includes fplUrl:**

```typescript
export interface LinkedTeam {
  id: string
  userId: string
  fplTeamId: number
  teamName: string
  isActive: boolean
  linkedAt: string
  lastSync?: string
  fplUrl?: string  // NEW: Generated FPL URL
}
```

## Error Handling

### Invalid URL Format
```json
{
  "success": false,
  "error": "Invalid FPL team ID or URL format. Please provide a valid team ID or FPL URL (e.g., https://fantasy.premierleague.com/entry/417303/event/3)"
}
```

### Missing Input
```json
{
  "success": false,
  "error": "FPL team ID or FPL URL is required"
}
```

### Team Not Found
```json
{
  "success": false,
  "error": "FPL team not found. Please check the team ID or URL."
}
```

## Testing

### Test File
**Location:** `test-fpl-url-parser.js`

**Test Coverage:**
- ✅ URL Parser utility functions
- ✅ FPL team linking with URL
- ✅ FPL team linking with direct ID
- ✅ Linked teams with FPL URLs
- ✅ Invalid input validation
- ✅ URL generation

### Running Tests
```bash
node test-fpl-url-parser.js
```

## Benefits

1. **User Experience**: Users can simply copy-paste their FPL team URL instead of manually extracting the team ID
2. **Flexibility**: Supports multiple URL formats and direct team IDs
3. **Backward Compatibility**: Existing team ID functionality remains unchanged
4. **Enhanced Data**: Linked teams now include FPL URLs for easy access
5. **Robust Validation**: Comprehensive input validation and error handling

## Security Considerations

- All URL inputs are validated and sanitized
- Only FPL domain URLs are accepted
- Team ID extraction is limited to numeric values
- No external URL processing or fetching

## Future Enhancements

1. **Gameweek-specific URLs**: Support for URLs with specific gameweeks
2. **Team Name Extraction**: Extract team names from FPL API for better UX
3. **Bulk Team Linking**: Support for linking multiple teams at once
4. **URL Shortening**: Support for shortened FPL URLs
