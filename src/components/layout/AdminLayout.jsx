import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, BarChart3, LogOut } from 'lucide-react';
import { useAdminContext } from '../../context/AdminContext';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const { adminUser, logout } = useAdminContext();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h2>FarQuiz Admin</h2>
        </div>
        
        <nav className="admin-nav">
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink 
            to="/admin/quizzes" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <FileText size={20} />
            <span>Quizzes</span>
          </NavLink>
          
          <NavLink 
            to="/admin/analytics" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span>Analytics</span>
          </NavLink>
        </nav>
        
        <div className="admin-user">
          <div className="admin-user-info">
            <p className="admin-username">{adminUser?.username}</p>
            <p className="admin-role">Administrator</p>
          </div>
          <button className="admin-logout" onClick={logout}>
            <LogOut size={20} />
          </button>
        </div>
      </aside>
      
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;