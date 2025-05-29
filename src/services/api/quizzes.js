import { supabase } from '../supabase';

// Fetch all published quizzes with optional filters
export const fetchQuizzes = async ({ 
  category = null, 
  difficulty = null, 
  search = null,
  sort = 'newest',
  limit = 20,
  offset = 0 
}) => {
  try {
    let query = supabase
      .from('quizzes')
      .select(`
        *,
        category:categories(id, name, emoji, slug),
        questions(id),
        quiz_attempts(id)
      `)
      .eq('is_published', true);

    // Apply filters
    if (category) {
      query = query.eq('category.slug', category);
    }
    
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply sorting
    switch (sort) {
      case 'popular':
        query = query.order('total_attempts', { ascending: false });
        break;
      case 'difficulty_asc':
        query = query.order('difficulty', { ascending: true });
        break;
      case 'difficulty_desc':
        query = query.order('difficulty', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return { 
      quizzes: data || [], 
      total: count || 0,
      hasMore: (offset + limit) < count 
    };
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    throw error;
  }
};

// Fetch a single quiz by slug
export const fetchQuizBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        category:categories(id, name, emoji, slug),
        questions(*)
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) throw error;

    // Shuffle questions if needed
    if (data && data.questions) {
      data.questions.sort((a, b) => a.order_index - b.order_index);
    }

    return data;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    throw error;
  }
};

// Fetch user's previous attempts for a quiz
export const fetchUserQuizAttempts = async (quizId, userId) => {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching user attempts:', error);
    throw error;
  }
};

// Submit a quiz attempt
export const submitQuizAttempt = async ({
  userId,
  quizId,
  answers,
  score,
  maxScore,
  timeTaken
}) => {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        answers,
        score,
        max_score: maxScore,
        time_taken: timeTaken,
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    throw error;
  }
};

// Fetch quiz leaderboard
export const fetchQuizLeaderboard = async (quizId, limit = 50, userFid = null) => {
  try {
    // Use the database function to get leaderboard with user position
    const { data, error } = await supabase
      .rpc('get_quiz_leaderboard_with_user', {
        quiz_uuid: quizId,
        user_fid: userFid,
        limit_count: limit
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

// Create a new quiz (admin only)
export const createQuiz = async (quizData) => {
  try {
    const { questions, ...quiz } = quizData;

    // First create the quiz
    const { data: newQuiz, error: quizError } = await supabase
      .from('quizzes')
      .insert(quiz)
      .select()
      .single();

    if (quizError) throw quizError;

    // Then create the questions
    if (questions && questions.length > 0) {
      const questionsWithQuizId = questions.map((q, index) => ({
        ...q,
        quiz_id: newQuiz.id,
        order_index: index + 1
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsWithQuizId);

      if (questionsError) throw questionsError;
    }

    return newQuiz;
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
};

// Update a quiz (admin only)
export const updateQuiz = async (quizId, updates) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating quiz:', error);
    throw error;
  }
};

// Delete a quiz (admin only)
export const deleteQuiz = async (quizId) => {
  try {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
};

// Fetch quiz statistics (admin)
export const fetchQuizStats = async () => {
  try {
    const { data: stats, error } = await supabase
      .from('quizzes')
      .select(`
        id,
        total_attempts,
        average_score,
        category:categories(name)
      `)
      .eq('is_published', true);

    if (error) throw error;

    // Calculate aggregated stats
    const totalAttempts = stats.reduce((sum, quiz) => sum + (quiz.total_attempts || 0), 0);
    const averageScore = stats.reduce((sum, quiz) => sum + (quiz.average_score || 0), 0) / stats.length;
    
    const categoryStats = stats.reduce((acc, quiz) => {
      const category = quiz.category?.name || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { attempts: 0, count: 0 };
      }
      acc[category].attempts += quiz.total_attempts || 0;
      acc[category].count += 1;
      return acc;
    }, {});

    return {
      totalQuizzes: stats.length,
      totalAttempts,
      averageScore: Math.round(averageScore),
      categoryStats
    };
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    throw error;
  }
};