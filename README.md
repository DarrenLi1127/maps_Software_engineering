# Sprint 5.1 & 5.2: Front-end Map & Mapping Data
## Project detail
- Haoyang Li
- hli28
- github link: https://github.com/DarrenLi1127/maps_Software_engineering

## Contribution
### Haoyang Li
This is a solo project by Haoyang Li

Estimated time: 20

## Collaborators
- Used AI tools (Claude 3.7 Sonnet) to help with the code structure adjustication and test case adjustication.
- Claude 3.7 Sonnet (Anthropic, 2025). [Large language model]. https://claude.ai/new

## Design Choices

### User Authentication (User Story 3 - Sprint 5.1)
- Implemented Clerk authentication for secure user login
- User authentication state managed through Clerk's components and hooks

### Map Implementation (User Story 1 & 2 - Sprint 5.1)
- Used react-map-gl wrapper for Mapbox GL JS with standard navigation controls

### Redlining Data Overlay (User Story 2 - Sprint 5.1)
- Loaded GeoJSON data directly on frontend with color-coded districts
- Applied semi-transparent fill to maintain map visibility beneath overlay

### Pin Implementation (User Story 3 - Sprint 5.1 & 5.2)
- Created pin system using react-map-gl Markers
- Implemented Firebase persistence and "Clear My Pins" functionality

### Search and Filter (User Story 4 & 5 - Sprint 5.1 & 5.2)
- Implemented keyword search in area descriptions
- Added bounding box filter with coordinate inputs
- Highlighted search results with visual distinction


## Tests

### Frontend E2E Tests (Playwright)
- **Map Navigation**: Verified map initialization, panning, and zooming functionality
- **Redlining Data Overlay**: Confirmed proper loading and rendering of GeoJSON data
- **Filtering by Coordinates**: Tested bounding box filtering with coordinate inputs
- **Search Functionality**: Validated keyword searching in area descriptions
- **Pin Management**:
    - Adding pins to the map
    - Pin persistence after page reload
    - Clear pins functionality
    - Multi-user pin visibility
- **Mock Infrastructure**: Verified test mocking behavior is functioning correctly
- **Styling Verification**: Confirmed proper color coding of redlining grades (A-D)
- **Backend Caching**: Indirectly tested caching behavior for repeated requests

### Backend Unit Tests (JUnit)
- **API Endpoint Testing**:
    - `/get-redlining-data`: Tested with and without bounding box filters
    - `/search-redlining`: Validated keyword search in area descriptions
    - `/add-pin`: Verified pin creation functionality
    - `/get-all-pins`: Tested retrieval of all stored pins
    - `/drop-pins`: Confirmed pin deletion for specific users
- **Error Handling**: Tested proper handling of invalid parameters
- **Caching Functionality**: Verified cache hits and misses for repeated requests
- **End-to-End Workflow**: Tested complete user flow across multiple endpoints
- **Mock Storage**: Used mock implementation of Firebase storage for testing

### Testing Infrastructure
- Frontend: Playwright for cross-browser testing (Chromium, Firefox, WebKit)
- Backend: JUnit with custom test base class for server initialization
- Mock authentication for frontend tests using Clerk testing utilities
- Automated route mocking for API response simulation


## How to Run
### Run the front end
    `cd client`
    `npm install`
    `npm install @clerk/clerk-react`
    `npm start`
### Run the test
```bash
cd client
npm test

cd server
mvn test
