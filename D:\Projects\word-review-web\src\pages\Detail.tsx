import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Word, ReviewRating } from '../types';
import { getWordById, updateWord, deleteWord } from '../utils';
import { calculateFSRS, formatDate, getMasteryLabel, getMasteryBadgeClass } from '../utils';
import './Detail.css';

const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [word, setWord] = useState<Word | null>(null);
  const [splitParts, setSplitParts] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadWordDetail();
    }
  }, [id]);

  const loadWordDetail = () => {
    if (!id) return;
    const loadedWord = getWordById(Number(id));
    if (loadedWord) {
      setWord(loadedWord);
      if (loadedWord.splitParts) {
        setSplitParts(loadedWord.splitParts.split(' '));
      }
    } else {
      navigate('/');
    }
  };

  const handleSaveSplit = (value: string) => {
    if (!word || !value) return;

    try {
      updateWord(word.id, { splitParts: value });
      setWord({ ...word, splitParts: value });
      setSplitParts(value.split(' '));
      alert('保存成功');
    } catch (error) {
      alert('保存失败：' + (error as Error).message);
    }
  };

  const handleSaveMnemonic = (value: string) => {
    if (!word || !value) return;

    try {
      updateWord(word.id, { mnemonicSentence: value });
      setWord({ ...word, mnemonicSentence: value });
      alert('保存成功');
    } catch (error) {
      alert('保存失败：' + (error as Error).message);
    }
  };

  const handleMarkReviewed = () => {
    if (!word) return;

    const rating: ReviewRating = 3; // 默认为中等掌握
    const fsrsResult = calculateFSRS(word, rating);

    const now = new Date();
    const nextReviewDate = new Date(now.getTime() + fsrsResult.interval * 60 * 60 * 1000);

    try {
      updateWord(word.id, {
        stability: fsrsResult.stability,
        difficulty: fsrsResult.difficulty,
        reviewCount: word.reviewCount + 1,
        masteryLevel: fsrsResult.masteryLevel,
        lastReviewDate: now.toISOString(),
        nextReviewDate: nextReviewDate.toISOString(),
      });

      alert('复习完成');
      navigate('/');
    } catch (error) {
      alert('操作失败：' + (error as Error).message);
    }
  };

  const handleResetProgress = () => {
    if (!word) return;

    if (confirm('确定要重置这个单词的学习进度吗？')) {
      const now = new Date();
      const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      try {
        updateWord(word.id, {
          stability: 0,
          difficulty: 5,
          reviewCount: 0,
          masteryLevel: 'low',
          lastReviewDate: undefined,
          nextReviewDate: nextReviewDate.toISOString(),
        });

        alert('已重置');
        loadWordDetail();
      } catch (error) {
        alert('操作失败：' + (error as Error).message);
      }
    }
  };

  const handleDeleteWord = () => {
    if (!word) return;

    if (confirm('确定要删除这个单词吗？')) {
      try {
        deleteWord(word.id);
        alert('已删除');
        navigate('/');
      } catch (error) {
        alert('删除失败：' + (error as Error).message);
      }
    }
  };

  if (!word) {
    return (
      <div className="detail-page">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="container">
        <button className="btn btn-secondary back-button" onClick={() => navigate('/')}>
          ← 返回
        </button>

        {/* 单词信息卡片 */}
        <div className="word-info-card">
          <div className="word-header">
            <div className="word-text">{word.word}</div>
            <span className={`badge ${getMasteryBadgeClass(word.masteryLevel)}`}>
              {getMasteryLabel(word.masteryLevel)}
            </span>
          </div>
          {word.pronunciation && <div className="pronunciation">[{word.pronunciation}]</div>}
          <div className="meaning">{word.meaning}</div>
        </div>

        {/* 统计信息 */}
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">复习次数</div>
            <div className="stat-value">{word.reviewCount}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">稳定性</div>
            <div className="stat-value">{word.stability.toFixed(2)} 天</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">难度</div>
            <div className="stat-value">{word.difficulty.toFixed(2)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">下次复习</div>
            <div className="stat-value">{formatDate(word.nextReviewDate)}</div>
          </div>
        </div>

        {/* 例句 */}
        {word.example && (
          <div className="section-card">
            <h3 className="section-title">例句</h3>
            <p className="example">{word.example}</p>
          </div>
        )}

        {/* 单词拆分 */}
        <div className="section-card">
          <h3 className="section-title">单词拆分</h3>
          <p className="section-hint">点击字母开始拆分</p>
          {splitParts.length > 0 && (
            <div className="split-parts">
              {splitParts.map((part, index) => (
                <span key={index} className="split-part">
                  {part}
                </span>
              ))}
            </div>
          )}
          <input
            className="input"
            placeholder="输入拆分后的部分，用空格分隔"
            defaultValue={word.splitParts || ''}
            onBlur={(e) => handleSaveSplit(e.target.value)}
          />
        </div>

        {/* 助记句 */}
        <div className="section-card">
          <h3 className="section-title">助记句</h3>
          <p className="section-hint">例：王(w)阿姨(ay)教我方法</p>
          <textarea
            className="textarea"
            placeholder="输入助记句"
            defaultValue={word.mnemonicSentence || ''}
            onBlur={(e) => handleSaveMnemonic(e.target.value)}
          />
        </div>

        {/* 操作按钮 */}
        <div className="action-buttons">
          <button className="btn btn-primary btn-lg" onClick={handleMarkReviewed}>
            标记为已复习
          </button>
          <button className="btn btn-secondary" onClick={handleResetProgress}>
            重置进度
          </button>
          <button className="btn btn-danger" onClick={handleDeleteWord}>
            删除单词
          </button>
        </div>
      </div>
    </div>
  );
};

export default Detail;
