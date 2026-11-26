// Components.jsx
// Main component that renders the router and all the routes for the application.

import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Navigation from "@/Shared/Components/Main/Navigation.jsx";
import { SignPage } from "./Signs/Components/SignPage.jsx";
import { HistoryList } from "./History/Components/HistoryList.jsx";
import { getAllSigns } from "./Signs/Models/signModel.jsx";
import AuthModule from "./Authentication/auth.jsx";
import AuthRegister from "./Authentication/authRegister.jsx";
import AuthLogin from "./Authentication/authLogin.jsx";
import MainHome from "./protectedRoute/MainHome.jsx";
import MainGood from "./protectedRoute/MainGood.jsx";
import ProfilePage from "./Profile/ProfilePage.jsx";
import { checkUser } from "./Authentication/authService.jsx";
import QuizDashboard from "./Quiz/QuizDashboard.jsx";
import QuizPlayer from "./Quiz/QuizPlayer.jsx";
import ForgotPassword from "./Profile/ForgotPassword.jsx";
// NEW: progress analytics page and the meet-ups page (both for logged-in users)
import ProgressDashboard from "./Progress/ProgressDashboard.jsx";
import MeetupsPage from "./Meetups/MeetupsPage.jsx";

// Checked each time the route loads (not once at startup), so it reacts to
// logging in or out. Logged-out visitors are sent to the login page.
function RequireUser({ children }) {
  return checkUser() ? children : <Navigate to="/auth/login" replace />;
}

export default function Components() {
  const [signs, setSigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // load signs asynchronously through the Parse model
  useEffect(() => {
    getAllSigns()
      .then(setSigns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // the signs route shows loading pagebefore the page renders
  const signsElement = loading ? (
    <p role="status">Loading signs...</p>
  ) : error ? (
    <p role="alert">Could not load signs: {error}</p>
  ) : (
    <SignPage signs={signs} />
  );

  // Routing is initialized here with <Router>; each <Route> maps one
  // address to one component.
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={signsElement} />
        <Route path="/quiz" element={<RequireUser><QuizDashboard /></RequireUser>} />
        <Route path="/quiz/:quizId" element={<RequireUser><QuizPlayer signs={signs} /></RequireUser>} />
        {/* NEW: /quiz/practice is handled by the /quiz/:quizId route above */}
        <Route path="/progress" element={<RequireUser><ProgressDashboard /></RequireUser>} />
        <Route path="/meetups" element={<RequireUser><MeetupsPage /></RequireUser>} />
        <Route path="/history" element={<HistoryList />} />
        <Route path="/auth" element={<AuthModule />} />
        <Route path="/auth/register" element={<AuthRegister />} />
        <Route path="/auth/login" element={<AuthLogin />} />
        <Route path="/home" element={<MainHome />} />
        <Route path="/user" element={<MainGood />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/auth/forgot" element={<ForgotPassword />} />
        <Route path="*" element={<p>Page not found</p>} />
      </Routes>
    </Router>
  );
}