import { useEffect } from 'react';
import { APP_URL } from '../utils/constants';

const FrameMeta = ({ type, data }) => {
  useEffect(() => {
    // Remove any existing frame meta tag
    const existingMeta = document.querySelector('meta[name="fc:frame"]');
    if (existingMeta) {
      existingMeta.remove();
    }

    if (!data) return;

    let frameData;

    if (type === 'quiz') {
      frameData = {
        version: "next",
        imageUrl: `${APP_URL}/api/og/quiz?title=${encodeURIComponent(data.title)}&emoji=${encodeURIComponent(data.emoji || '🎯')}&category=${encodeURIComponent(data.category?.name || 'Quiz')}&difficulty=${data.difficulty}`,
        button: {
          title: "🧠 Take Quiz",
          action: {
            type: "launch_frame",
            url: `${APP_URL}/quiz/${data.slug}`,
            name: "FarQuiz",
            splashImageUrl: "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/RBv8coHVCER8/farquiz_splash-h61l64V89HzQsrn3v0Ey1RJGCVtPvq.png",
            splashBackgroundColor: "#8B5CF6"
          }
        }
      };
    } else if (type === 'result') {
      frameData = {
        version: "next",
        imageUrl: `${APP_URL}/api/og/result?score=${data.percentage}&title=${encodeURIComponent(data.quizTitle)}&username=${encodeURIComponent(data.username || 'Player')}`,
        button: {
          title: "🏆 Beat My Score",
          action: {
            type: "launch_frame",
            url: `${APP_URL}/quiz/${data.quizSlug}`,
            name: "FarQuiz",
            splashImageUrl: "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/RBv8coHVCER8/farquiz_splash-h61l64V89HzQsrn3v0Ey1RJGCVtPvq.png",
            splashBackgroundColor: "#8B5CF6"
          }
        }
      };
    } else {
      // Default frame for home page
      frameData = {
        version: "next",
        imageUrl: "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/RBv8coHVCER8/farquiz_share_image-gNEfyJSjiSBnqxdOtSD4uWjQbT4mhy.png",
        button: {
          title: "🧠 Start Playing",
          action: {
            type: "launch_frame",
            url: APP_URL,
            name: "FarQuiz",
            splashImageUrl: "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/RBv8coHVCER8/farquiz_splash-h61l64V89HzQsrn3v0Ey1RJGCVtPvq.png",
            splashBackgroundColor: "#8B5CF6"
          }
        }
      };
    }

    // Create and inject the meta tag
    const meta = document.createElement('meta');
    meta.name = 'fc:frame';
    meta.content = JSON.stringify(frameData);
    document.head.appendChild(meta);

    // Cleanup function
    return () => {
      const metaToRemove = document.querySelector('meta[name="fc:frame"]');
      if (metaToRemove) {
        metaToRemove.remove();
      }
    };
  }, [type, data]);

  return null;
};

export default FrameMeta;