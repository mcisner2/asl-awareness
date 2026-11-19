# Changelog

## [Unreleased] - Sprint 1 (Marcos)
### Added
- Sign library (`signLibrary.json`, A-Z) with real photos in `public/signs/` (from Wikimedia Commons, CC BY-SA 3.0, credited in `public/signs/CREDITS.md` and on the quiz pages); J and Z show the starting handshape photo with an animated motion path drawn over it. `AnimatedSign` has a pause control and honors reduced-motion
- Login-only quiz dashboard at `/quiz` listing the starter quiz and the user's saved quizzes; each opens at `/quiz/:quizId`
- `sign-to-letter` and `letter-to-sign` question types, with scoring on submit
- AI quiz builder panel on the dashboard calling the Cloud Code function `generateQuiz` (Gemini); validated quizzes are saved privately to the user's account and added to their list
- Refreshed styling: nav brand, cards, buttons, quiz and chat components
- `cloud/` folder (Back4App Cloud Code) and `cloud/quiz.md`, the quiz spec fed to the LLM
- `scripts/validate-quiz.test.mjs` for the quiz validator

## [0.3.0] - 2026-11-06
### Added
- Parse auth service (`authService.jsx`): `createUser`, `loginUser`, `checkUser`, `logoutUser`, and `getCurrentUser`
- Authentication module: menu page, register page, login page, and a shared auth form
- Protected route component, a `/home` gateway page, and a `/user` protected page with a log out button
- Routes for `/auth`, `/auth/register`, `/auth/login`, `/home`, and `/user`
- Navigation shows "My Account" only when a user is logged in

### Changed
- Moved the Signs, History, and authentication code under `src/Shared/Components`
- Removed the unused user and progress model files; authentication now goes through `authService.jsx`


## [0.2.0] - 2026-10-16
### Added
- React Router with Signs and History routes
- Parse models for Sign and User
- Component tree and data model diagrams
### Changed
- Converted HTM/Preact components to React JSX
- Vite config cleanup
