# Sprint 5.1: Front-End Maps
## Project detail
- Haoyang Li
- hli28
- github link: https://github.com/DarrenLi1127/maps_Software_engineering

## Contribution
### Haoyang Li
Responsible for user story 1, 2, 3 and testing including 1340 supplement.

Estimated time: 16

## Collaborators
- Used AI tools (Claude 3.7 Sonnet) to help with the code structure adjustication and test case adjustication.
- Claude 3.7 Sonnet (Anthropic, 2025). [Large language model]. https://claude.ai/new

## Design Choices

### User Authentication (User Story 3)
- Implemented Clerk authentication for secure user login
- User authentication state managed through Clerk's components and hooks

### Map Implementation (User Story 1 & 2)
- Used react-map-gl wrapper for Mapbox GL JS with standard navigation controls

### Redlining Data Overlay (User Story 2)
- Loaded GeoJSON data directly on frontend with color-coded districts
- Applied semi-transparent fill to maintain map visibility beneath overlay

### Pin Implementation (User Story 3)
- Created pin system using react-map-gl Markers
- Implemented localStorage persistence and "Clear My Pins" functionality

## Tests

### End-to-End Tests
- Comprehensive E2E tests with Playwright across Chromium, Firefox, and WebKit

#### User Story Tests
- Map navigation: verified initialization, panning, zooming
- Redlining overlay: confirmed data loading and rendering
- Pins: tested creation, persistence, clearing, and multi-user visibility
- Mock testing: verified storage/retrieval with localStorage mocks

#### CS1340 Supplement
- Explored Mapbox SVG element testing
- Tested pin rendering and styling

## Errors/Bugs
No known bug or errors

## How to Run
### Run the front end
    `cd client`
    `npm install`
    `npm install @clerk/clerk-react`
    `npm start`
### Run the test
    `cd client`
    `npm test` 
