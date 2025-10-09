# PresenSync

PresenSync is a smart attendance system designed to streamline the attendance process using modern technology. It leverages QR codes, facial recognition, and GPS location to ensure a secure and efficient way of marking attendance.

## About The Project

This project is a full-stack application built with a React frontend and a Python (FastAPI) backend. It utilizes Firebase for real-time database and authentication services.

## Features

  * **QR Code Attendance:** Generate and scan QR codes for quick and easy attendance marking.
  * **Facial Recognition:** Verifies student identity using facial recognition for added security.
  * **GPS Verification:** Ensures students are within the classroom's vicinity by checking their GPS location.
  * **Real-time Updates:** Attendance data is updated in real-time for teachers and administrators.
  * **Role-Based Access:** Different roles (student, teacher, admin) with specific permissions.
  * **Admin Dashboard:** A comprehensive dashboard for administrators to manage users, classes, and view attendance records.
  * **Global Notifications:** Admins can send notifications to all users.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

  * **Node.js and npm:** Make sure you have Node.js and npm installed. You can download them from [nodejs.org](https://nodejs.org/).
    ```sh
    npm install npm@latest -g
    ```
  * **Python:** Ensure you have Python installed. You can download it from [python.org](https://www.python.org/).

### Installation

1.  **Clone the repo:**
    ```sh
    git clone https://github.com/your_username/PresenSync.git
    ```
2.  **Install Frontend NPM packages:**
    ```sh
    cd PresenSync
    npm install
    ```
3.  **Install Backend Python packages:**
    ```sh
    cd src/backend
    pip install -r requirements.txt
    ```

### Running the Application

1.  **Start the Frontend Development Server:**
    ```sh
    npm run dev
    ```
2.  **Start the Backend Server:**
    ```sh
    cd src/backend
    uvicorn main:app --reload
    ```

## Frontend Dependencies

  * `@lottiefiles/react-lottie-player`
  * `@tailwindcss/vite`
  * `face-api.js`
  * `firebase`
  * `framer-motion`
  * `html5-qrcode`
  * `lottie-react`
  * `lucide-react`
  * `qrcode.react`
  * `react`
  * `react-dom`
  * `react-lottie-player`
  * `react-router-dom`
  * `tailwind-scrollbar`
  * `jspdf`
  * `jspdf-autotable`
  * `xlsx`

## Backend API Endpoints

Here is a list of the main API endpoints:

  * `GET /`: Root endpoint that returns the API status.
  * `GET /health`: Health check endpoint to verify service and Firebase connection.
  * `POST /attendance/mark`: Marks student attendance after performing validations.
  * `GET /admin/users`: (Admin only) Retrieves all user profiles.
  * `PUT /admin/users/{uid}/role`: (Admin only) Updates the role of a specific user.
  * `DELETE /admin/users/{uid}`: (Admin only) Deletes a user account and their associated data.
  * `POST /admin/notifications/send_global`: (Admin only) Sends a global notification to all users.
