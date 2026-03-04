import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Word, ReviewRating } from '../types';
import { getReviewQueue, updateWord, getStats, calculateFSRS } from '../utils';
import './Review.css';

const Review: React.FC = () => {
  const navigate = useNavigate();
  const [reviewQueue, setReviewQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, completedCount: 0, masteryRate: 0 });

  useEffect(() => {
    loadReviewQueue();
    loadStats();
  }, []);

  const loadReviewQueue = () => {
    const queue = getReviewQueue(20);
    setReviewQueue(queue);
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const loadStats = () => {
    const statsData = getStats();
    setStats(statsData);
  };

  const currentWord = reviewQueue[currentIndex];

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleRateWord = (rating: ReviewRating) => {
    if (!currentWord) return;

    const fsrsResult = calculateFSRS(currentWord, rating);

    const now = new Date();
    const nextReviewDate = new Date(now.getTime() + fsrsResult.interval * 60 * 60 * 1000);

    try {
      updateWord(currentWord.id, {
        stability: fsrsResult.stability,
        difficulty: fsrsResult.difficulty,
        reviewCount: currentWord.reviewCount + 1,
        masteryLevel: fsrsResult.masteryLevel,
        lastReviewDate: now.toISOString(),
        nextReviewDate: nextReviewDate.toISOString(),
      });

      // 显示反馈
      let message = '';
      switch (rating) {
        case 0:
          message = '没关系，下次加油！';
          break;
        case 2:
          message = '有点模糊，继续努力';
          break;
        case 3:
          message = '一般，还需加强';
          break;
        case 4:
          message = '记得不错！';
          break;
        case 5:
          message = '完全记住，太棒了！';
          break;
      }

      alert(message);

      // 延迟后切换到下一个
      setTimeout(() => {
        nextWord();
      }, 500);
    } catch (error) {
      alert('操作失败：' + (error as Error).message);
    }
  };

  const nextWord = () => {
    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      // 队列完成，自动补充
      loadReviewQueue();
      loadStats();

      if (reviewQueue.length === 0) {
        alert('复习完成！');
        navigate('/');
      }
    }
  };

  if (reviewQueue.length === 0) {
    return (
      <div className="review-page">
        <div className="container">
          <button className="btn btn-secondary back-button" onClick={() => navigate('/')}>
            ← 返回
          </button>

          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <h2 className="empty-title">太棒了！</h2>
            <p className="empty-text">所有单词都已复习完成</p>
            <button className="btn btn-primary" onClick={loadReviewQueue}>
              刷新队列
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return null;
  }

  return (
    <div className="review-page">
      <div className="container">
        {/* 统计头部 */}
        <div className="stats-header">
          <div className="stat-item">
            <div className="stat-label">待复习</div>
            <div className="stat-value">{stats.pendingCount}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">今日已完成</div>
            <div className="stat-value">{stats.completedCount}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">掌握率</div>
            <div className="stat-value">{stats.masteryRate}%</div>
          </div>
        </div>

        {/* 复习卡片 */}
        <div className="review-card">
          <div className={`word-card ${showAnswer ? 'flipped' : ''}`}>
            {!showAnswer ? (
              /* 正面 */
              <div className="card-front">
                <div className="word">{currentWord.word}</div>
                {currentWord.pronunciation && (
                  <div className="pronunciation">[{currentWord.pronunciation}]</div>
                )}
              </div>
            ) : (
              /* 背面 */
              <div className="card-back">
                <div className="word">{currentWord.word}</div>
                {currentWord.pronunciation && (
                  <div className="pronunciation">[{currentWord.pronunciation}]</div>
                )}
                <div className="meaning">{currentWord.meaning}</div>

                {/* 例句 */}
                {currentWord.example && (
                  <div className="example-section">
                    <div className="section-label">例句：</div>
                    <div className="example">{currentWord.example}</div>
                  </div>
                )}

                {/* 拆分 */}
                {currentWord.splitParts && (
                  <div className="split-section">
                    <div className="section-label">拆分：</div>
                    <div className="split-parts">
                      {currentWord.splitParts.split(' ').map((part, index) => (
                        <span key={index} className="split-part">
                          {part}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 助记句 */}
                {currentWord.mnemonicSentence && (
                  <div className="mnemonic-section">
                    <div className="section-label">助记句：</div>
                    <div className="mnemonic">{currentWord.mnemonicSentence}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          {!showAnswer ? (
            <div className="action-buttons">
              <button className="btn btn-primary btn-lg" onClick={handleShowAnswer}>
                查看答案
              </button>
            </div>
          ) : (
            /* 评分按钮 */
            <div className="rating-buttons">
              <button className="btn btn-secondary" onClick={() => handleRateWord(0)}>
                不记得
              </button>
              <button className="btn btn-secondary" onClick={() => handleRateWord(2)}>
                模糊
              </button>
              <button className="btn btn-secondary" onClick={() => handleRateWord(3)}>
                一般
              </button>
              <button className="btn btn-secondary" onClick={() => handleRateWord(4)}>
                记得
              </button>
              <button className="btn btn-primary" onClick={() => handleRateWord(5)}>
                完全记住
              </button>
            </div>
          )}

          {/* 进度指示 */}
          <div className="progress-indicator">
            {currentIndex + 1} / {reviewQueue.length}
          </div>
        </div>

        {/* 返回按钮 */}
        <button className="btn btn-secondary back-button" onClick={() => navigate('/')}>
          ← 返回列表
        </button>
      </div>
    </div>
  );
};

export default Review;
