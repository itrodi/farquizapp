import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { fetchQuizzes } from '../services/api/quizzes';
import { supabase } from '../services/supabase';
import { debounce } from '../utils/helpers';
import QuizCard from '../components/quiz/QuizCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './Explore.css';

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.get('difficulty') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadQuizzes(true);
  }, [searchParams]);

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadQuizzes = async (reset = false) => {
    try {
      setIsLoading(true);
      
      const page = reset ? 0 : currentPage;
      const { quizzes: data, hasMore: more } = await fetchQuizzes({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        search: searchQuery,
        sort: sortBy,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE
      });

      if (reset) {
        setQuizzes(data);
        setCurrentPage(0);
      } else {
        setQuizzes(prev => [...prev, ...data]);
      }
      
      setHasMore(more);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query) => {
      updateUrlParams({ q: query || undefined });
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const updateUrlParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    setSearchParams(newParams);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    updateUrlParams({ category: category || undefined });
  };

  const handleDifficultyChange = (difficulty) => {
    setSelectedDifficulty(difficulty);
    updateUrlParams({ difficulty: difficulty || undefined });
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    updateUrlParams({ sort });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedDifficulty('');
    setSortBy('newest');
    setSearchParams({});
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
    loadQuizzes(false);
  };

  const activeFilterCount = [selectedCategory, selectedDifficulty].filter(Boolean).length + 
    (sortBy !== 'newest' ? 1 : 0);

  return (
    <div className="explore-page">
      {/* Search Header */}
      <div className="search-header">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => handleSearchChange({ target: { value: '' } })}
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <button 
          className={`filter-button ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-section">
            <h3>Category</h3>
            <div className="filter-options">
              <button 
                className={`filter-option ${!selectedCategory ? 'active' : ''}`}
                onClick={() => handleCategoryChange('')}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`filter-option ${selectedCategory === category.slug ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category.slug)}
                >
                  {category.emoji} {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Difficulty</h3>
            <div className="filter-options">
              <button 
                className={`filter-option ${!selectedDifficulty ? 'active' : ''}`}
                onClick={() => handleDifficultyChange('')}
              >
                All Levels
              </button>
              {['easy', 'medium', 'hard'].map(level => (
                <button
                  key={level}
                  className={`filter-option ${selectedDifficulty === level ? 'active' : ''}`}
                  onClick={() => handleDifficultyChange(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Sort By</h3>
            <div className="filter-options">
              {[
                { value: 'newest', label: 'Newest First' },
                { value: 'popular', label: 'Most Popular' },
                { value: 'difficulty_asc', label: 'Easiest First' },
                { value: 'difficulty_desc', label: 'Hardest First' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`filter-option ${sortBy === option.value ? 'active' : ''}`}
                  onClick={() => handleSortChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="results-section">
        {isLoading && currentPage === 0 ? (
          <LoadingSpinner text="Finding quizzes..." />
        ) : quizzes.length === 0 ? (
          <div className="no-results">
            <h3>No quizzes found</h3>
            <p>Try adjusting your filters or search query</p>
            {activeFilterCount > 0 && (
              <button className="btn btn-primary" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="quiz-grid">
              {quizzes.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>

            {hasMore && (
              <div className="load-more-container">
                {isLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <button className="btn btn-secondary" onClick={loadMore}>
                    Load More
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Explore;