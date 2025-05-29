import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FarcasterProvider } from './context/FarcasterContext';
import { AdminProvider } from './context/AdminContext';

// Pages
import Home from './pages/Home';
import QuizPreview from './pages/QuizPreview';
import QuizTaking from './pages/QuizTaking';
import QuizResults from './pages/QuizResults';
import Leaderboard from './pages/Leaderboard';
import Explore from './pages/Explore';
import Profile from './pages/Profile';

// Admin Pages
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuizzes from './pages/admin/AdminQuizzes';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Layout
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';

// Styles
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main App Routes */}
          <Route
            path="/*"
            element={
              <FarcasterProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/quiz/:quizSlug" element={<QuizPreview />} />
                    <Route path="/quiz/:quizSlug/play" element={<QuizTaking />} />
                    <Route path="/quiz/:quizSlug/results/:attemptId" element={<QuizResults />} />
                    <Route path="/quiz/:quizSlug/leaderboard" element={<Leaderboard />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/profile" element={<Profile />} />
                  </Routes>
                </Layout>
              </FarcasterProvider>
            }
          />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/*"
            element={
              <AdminProvider>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/quizzes" element={<AdminQuizzes />} />
                    <Route path="/analytics" element={<AdminAnalytics />} />
                  </Routes>
                </AdminLayout>
              </AdminProvider>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;