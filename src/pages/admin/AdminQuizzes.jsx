import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Upload } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { formatTimeDisplay } from '../../utils/helpers';
import QuizEditor from '../../components/admin/QuizEditor';
import ImportQuiz from '../../components/admin/ImportQuiz';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import './AdminQuizzes.css';

const AdminQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      setCategories(categoriesData || []);

      // Load quizzes
      await loadQuizzes();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuizzes = async () => {
    try {
      let query = supabase
        .from('quizzes')
        .select(`
          *,
          category:categories(name, emoji),
          questions(id)
        `)
        .order('created_at', { ascending: false });

      const { data } = await query;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setShowEditor(true);
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
    setShowEditor(true);
  };

  const handleDeleteQuiz = async (quizId) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      setQuizzes(quizzes.filter(q => q.id !== quizId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Failed to delete quiz');
    }
  };

  const handleTogglePublish = async (quiz) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: !quiz.is_published })
        .eq('id', quiz.id);

      if (error) throw error;

      setQuizzes(quizzes.map(q => 
        q.id === quiz.id 
          ? { ...q, is_published: !q.is_published }
          : q
      ));
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  };

  const handleSaveQuiz = async () => {
    await loadQuizzes();
    setShowEditor(false);
  };

  const handleImportSuccess = async () => {
    await loadQuizzes();
    setShowImport(false);
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || quiz.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return <LoadingSpinner fullPage text="Loading quizzes..." />;
  }

  return (
    <div className="admin-quizzes">
      <div className="page-header">
        <h1>Manage Quizzes</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={20} />
            Import Quiz
          </button>
          <button className="btn btn-primary" onClick={handleCreateQuiz}>
            <Plus size={20} />
            Create Quiz
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-filter"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>
              {cat.emoji} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quizzes Table */}
      <div className="quizzes-table">
        <div className="table-header">
          <span>Quiz</span>
          <span>Category</span>
          <span>Difficulty</span>
          <span>Questions</span>
          <span>Time</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filteredQuizzes.length === 0 ? (
          <div className="empty-state">
            <p>No quizzes found</p>
            <button className="btn btn-primary" onClick={handleCreateQuiz}>
              Create Your First Quiz
            </button>
          </div>
        ) : (
          filteredQuizzes.map(quiz => (
            <div key={quiz.id} className="table-row">
              <div className="quiz-info">
                <span className="quiz-emoji">{quiz.emoji || '🎯'}</span>
                <div>
                  <h3>{quiz.title}</h3>
                  <p>{quiz.description}</p>
                </div>
              </div>

              <div className="category-cell">
                {quiz.category ? (
                  <>
                    <span>{quiz.category.emoji}</span>
                    <span>{quiz.category.name}</span>
                  </>
                ) : (
                  <span className="muted">-</span>
                )}
              </div>

              <div className={`difficulty-badge ${quiz.difficulty}`}>
                {quiz.difficulty}
              </div>

              <div className="questions-count">
                {quiz.questions?.length || 0}
              </div>

              <div className="time-limit">
                {formatTimeDisplay(quiz.time_limit)}
              </div>

              <div className="status-cell">
                <button
                  className={`status-toggle ${quiz.is_published ? 'published' : 'draft'}`}
                  onClick={() => handleTogglePublish(quiz)}
                >
                  {quiz.is_published ? 'Published' : 'Draft'}
                </button>
              </div>

              <div className="actions-cell">
                <button
                  className="action-btn"
                  onClick={() => window.open(`/quiz/${quiz.slug}`, '_blank')}
                  title="Preview"
                >
                  <Eye size={18} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => handleEditQuiz(quiz)}
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => setDeleteConfirm(quiz)}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quiz Editor Modal */}
      {showEditor && (
        <Modal
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          title={editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
          size="large"
        >
          <QuizEditor
            quiz={editingQuiz}
            categories={categories}
            onSave={handleSaveQuiz}
            onCancel={() => setShowEditor(false)}
          />
        </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
        <Modal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          title="Import Quiz from JSON"
          size="medium"
        >
          <ImportQuiz
            categories={categories}
            onSuccess={handleImportSuccess}
            onCancel={() => setShowImport(false)}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Quiz"
          size="small"
        >
          <div className="delete-confirm">
            <p>Are you sure you want to delete "{deleteConfirm.title}"?</p>
            <p className="warning">This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={() => handleDeleteQuiz(deleteConfirm.id)}
              >
                Delete Quiz
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminQuizzes;