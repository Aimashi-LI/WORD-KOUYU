import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Word, WordFilter, SortBy } from '../types';
import { searchWords, addWord, getStats } from '../utils';
import { formatNextReview, getMasteryLabel, getMasteryBadgeClass } from '../utils';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('next_review');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    word: '',
    meaning: '',
    pronunciation: '',
    example: '',
    splitParts: '',
    mnemonicSentence: '',
  });
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, completedCount: 0, masteryRate: 0 });

  // 加载单词列表
  useEffect(() => {
    loadWords();
    loadStats();
  }, [searchText, sortBy]);

  const loadWords = () => {
    const filter: WordFilter = {
      search: searchText || undefined,
      sortBy,
    };
    const loadedWords = searchWords(filter);
    setWords(loadedWords);
  };

  const loadStats = () => {
    const statsData = getStats();
    setStats(statsData);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleSort = (newSortBy: SortBy) => {
    setSortBy(newSortBy);
  };

  const goToDetail = (id: number) => {
    navigate(`/detail/${id}`);
  };

  const goToReview = () => {
    navigate('/review');
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.word || !formData.meaning) {
      alert('请填写单词和含义');
      return;
    }

    try {
      addWord(formData);
      alert('添加成功');
      setShowAddModal(false);
      setFormData({
        word: '',
        meaning: '',
        pronunciation: '',
        example: '',
        splitParts: '',
        mnemonicSentence: '',
      });
      loadWords();
      loadStats();
    } catch (error) {
      alert('添加失败：' + (error as Error).message);
    }
  };

  return (
    <div className="home-page">
      <div className="container">
        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">总单词</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">待复习</div>
            <div className="stat-value">{stats.pendingCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">掌握率</div>
            <div className="stat-value">{stats.masteryRate}%</div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="search-bar">
          <input
            type="text"
            className="input"
            placeholder="搜索单词..."
            value={searchText}
            onChange={handleSearch}
          />
          <button className="btn btn-primary" onClick={goToReview}>
            开始复习
          </button>
        </div>

        {/* 排序按钮 */}
        <div className="sort-buttons">
          <button
            className={`btn ${sortBy === 'next_review' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSort('next_review')}
          >
            按复习时间
          </button>
          <button
            className={`btn ${sortBy === 'stability' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSort('stability')}
          >
            按掌握程度
          </button>
          <button
            className={`btn ${sortBy === 'review_count' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSort('review_count')}
          >
            按复习次数
          </button>
        </div>

        {/* 单词列表 */}
        <div className="word-list">
          {words.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <div className="empty-text">还没有单词，点击下方按钮添加吧！</div>
            </div>
          ) : (
            words.map((word) => (
              <div key={word.id} className="word-item" onClick={() => goToDetail(word.id)}>
                <div className="word-header">
                  <div className="word-text">{word.word}</div>
                  <span className={`badge ${getMasteryBadgeClass(word.masteryLevel)}`}>
                    {getMasteryLabel(word.masteryLevel)}
                  </span>
                </div>
                <div className="word-meaning">{word.meaning}</div>
                <div className="word-info">
                  {word.pronunciation && <span className="pronunciation">[{word.pronunciation}]</span>}
                  <span className="next-review">下次复习: {formatNextReview(word.nextReviewDate)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 添加按钮 */}
        <button className="btn btn-primary btn-lg add-button" onClick={() => setShowAddModal(true)}>
          + 添加单词
        </button>
      </div>

      {/* 添加单词弹窗 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>添加单词</h2>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddWord} className="modal-body">
              <div className="form-group">
                <label className="form-label">单词 *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入单词"
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">含义 *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入含义"
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">发音</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入发音"
                  value={formData.pronunciation}
                  onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">例句</label>
                <textarea
                  className="textarea"
                  placeholder="请输入例句"
                  value={formData.example}
                  onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">拆分</label>
                <input
                  type="text"
                  className="input"
                  placeholder="点击字母开始拆分"
                  value={formData.splitParts}
                  onChange={(e) => setFormData({ ...formData, splitParts: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">助记句</label>
                <input
                  type="text"
                  className="input"
                  placeholder="例：王(w)阿姨(ay)教我方法"
                  value={formData.mnemonicSentence}
                  onChange={(e) => setFormData({ ...formData, mnemonicSentence: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
