🚀 MAXIE: Full-Stack PostgreSQL Application
MAXIE is a robust full-stack web application featuring a Node.js/Express backend (API) and a React frontend (Pesir). The system is powered by PostgreSQL for reliable data management and structured schemas.

📁 Project Architecture
The project is organized into two primary directories to separate concerns between the server and the client.

1. Backend (/api)
Handles server logic, database connectivity, and business rules.

routes/: Manages API endpoints for Authentication, System Logs, and User management.

db.js: Centralized PostgreSQL connection configuration.

seed.js: A utility script to populate the database with initial data.

.env: Stores sensitive environment variables and credentials.

2. Frontend (/pesir)
A dynamic user interface built with React.

src/components/: Houses reusable UI elements like the Navbar, Footer, and FeatureCards.

src/pages/: Contains top-level views including AdminDashboard, LandingPage, and UserManager.

src/App.jsx: The main entry point handling application routing.

🛠 Setup & Installation
1. Environment Configuration
Create a .env file inside the /api directory. Use the following configuration based on your local PostgreSQL setup:

Code snippet
# Server Settings
PORT=5000

# Database Settings
DB_PORT=5000
DB_PASSWORD=hanz1827
DB_URL=postgresql://postgres:hanz1827@localhost:5432/webschema
2. Backend Installation
Open your terminal and run the following:

Bash
cd api
npm install

# (Optional) Run the seed script to initialize data
node seed.js

# Start the server
npm start
3. Frontend Installation
Open a separate terminal window:

Bash
cd pesir
npm install

# Launch the development server
npm run dev
🛣 API Reference
Method	Endpoint	Description	Associated File
POST	/api/auth	User login and registration	auth.js
GET/POST	/api/logs	Activity and system logging	logs.js
GET/PUT/DEL	/api/users	User CRUD operations	users.js
💻 Tech Stack
Frontend: React.js, CSS3, JavaScript (JSX)

Backend: Node.js, Express.js

Database: PostgreSQL

State/Routing: React Router

Environment: Vite / Create React App



📝 License
This project is licensed under the MIT License.



# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
