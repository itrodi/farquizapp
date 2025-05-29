import React, { useEffect, useCallback } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatTime } from '../../utils/helpers';
import { QUIZ_TIME_WARNING } from '../../utils/constants';
import './QuizTimer.css';

const QuizTimer = ({ timeRemaining, onTimeUp, onTimeChange }) => {
  const isWarning = timeRemaining <= QUIZ_TIME_WARNING && timeRemaining > 0;
  const isCritical = timeRemaining <= 10 && timeRemaining > 0;

  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      onTimeChange(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp, onTimeChange]);

  const getTimerClass = () => {
    if (isCritical) return 'critical';
    if (isWarning) return 'warning';
    return '';
  };

  return (
    <div className={`quiz-timer ${getTimerClass()}`}>
      {isCritical ? (
        <AlertCircle size={20} className="timer-icon" />
      ) : (
        <Clock size={20} className="timer-icon" />
      )}
      <span className="timer-value">{formatTime(timeRemaining)}</span>
    </div>
  );
};

export default QuizTimer;