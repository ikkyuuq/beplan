# BePlan Project Overview

## Overview
This monorepo contains the following projects:
- **Web** (React + Vite) - A landing page.
- **Mobile** (React Native + Expo) - Main application.
- **Backend & AI Service** (FastAPI) - API server for mobile, Named Entity Recognition (NER) service.

---

## Getting Started
### Prerequisites
- [npm](https://www.npmjs.com/) (for package management)
- [Python](https://www.python.org/downloads/) (for FastAPI services)
- [Docker](https://www.docker.com/) (for backend & AI service)
- [Node.js](https://nodejs.org/) (for frontend projects)
- [Expo](https://expo.dev/) (for mobile development)

### Clone the Repository
```sh
git clone <repo-url>
cd your-project
npm install
```

---

## Role-Based Setup

### 1. Web Team (React + Vite)
#### Setup
```sh
cd apps/web
npm install
npm run dev
```
#### Development
- Run `npm run dev` to start the local server.
- Make changes and test in the browser.
- Deployments will be handled manually.

### 2. Mobile Team (React Native + Expo)
#### Setup
```sh
cd apps/mobile
npm install
npm start --clear
```
#### Development
- Run `npm start` to launch Expo.
- Test on a real device using the Expo Go app.

### 3. Backend Team (FastAPI)
#### Setup
```sh
cd apps/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
For a physical device, bind the backend to the network and keep the API port at
`8000`:
```sh
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
#### Development
- Make API changes in `main.py` or create custom services for each route.
- Test endpoints using Postman or a browser.
- The backend connects to **Neon PostgreSQL**.

#### Authentication
All `/api/v1/*` routes (except public shared-template links) require a Clerk
session token: `Authorization: Bearer <token>`. The backend takes the user id
from the token, so any `user_id` a client sends is ignored. Set these in
`docker/.env` (see `docker/.env.example`):
- `CLERK_ISSUER`: the Clerk Frontend API URL, e.g. `https://<name>.clerk.accounts.dev`
- `CLERK_SECRET_KEY`: needed for admin-only endpoints (creating, updating and
  deleting BePlan templates)

To make someone an admin of the web dashboard, open their user in the Clerk Dashboard
and set **Public metadata** to `{ "role": "admin" }`.

---

## Running with Docker
To start backend & AI services using Docker:
```sh
cd docker
docker-compose up --build --watch
```
This will:
- Start **server** on port `8000`
- Expo/Metro may use ports `8081`, `8082`, or `8083`; those serve the
  JavaScript bundle and are not backend API ports.
- Set `apps/mobile/.env` to
  `EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:8000`, then restart Expo with
  `npx expo start --clear` after changing it.

---

## Git Workflow & Versioning
### Branching Strategy
Follow the **Git Flow** strategy:
1. **Main branch (`main`)** - Production-ready code.
2. **Development branch (`develop`)** - Ongoing development.
3. **Feature branches (`[role]/your-feature`)** - New features.
4. **Bugfix branches (`bugfix/your-bugfix`)** - Fixing bugs.
5. **Release branches (`release/x.y.z`)** - Preparing for releases.

### Working with Git
#### Creating a new feature branch
```sh
git checkout -b [role]/new-feature
```

#### Committing changes
```sh
git add .
git commit -m "feat([role]): add new feature"
```

#### Pulling latest changes before pushing
Always pull the latest `develop` branch before pushing changes:
```sh
git checkout develop
git pull origin develop
git checkout -b [role]/new-feature
git rebase develop
```

#### Pushing changes
```sh
git push origin [role]/new-feature
```

#### Creating a Pull Request (PR)
- Open a PR from `[role]/new-feature` → `develop`
- Get at least one approval before merging.

---

## Contribution Guidelines
1. Use feature branches (`git checkout -b feature/your-feature`).
2. Follow commit conventions (`feat: add new API endpoint`).
3. Always pull the latest `develop` branch before pushing changes.
4. Submit pull requests for review before merging.

---
