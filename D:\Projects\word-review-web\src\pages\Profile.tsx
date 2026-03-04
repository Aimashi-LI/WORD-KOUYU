import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllWords, clearAllData, exportData, importData, getStats } from '../utils';
import './Profile.css';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, completedCount: 0, masteryRate: 0 });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const statsData = getStats();
    setStats(statsData);
  };

  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `word-review-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('导出成功！');
    } catch (error) {
      alert('导出失败：' + (error as Error).message);
    }
  };

  const handleImport = () => {
    setShowImportModal(true);
    setImportText('');
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!importText.trim()) {
      alert('请输入数据');
      return;
    }

    if (!confirm('导入将覆盖现有数据，确定要继续吗？')) {
      return;
    }

    try {
      const success = importData(importText);
      if (success) {
        alert('导入成功！');
        setShowImportModal(false);
        loadStats();
      } else {
        alert('导入失败：数据格式不正确');
      }
    } catch (error) {
      alert('导入失败：' + (error as Error).message);
    }
  };

  const handleClear = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      try {
        clearAllData();
        alert('已清空所有数据');
        loadStats();
      } catch (error) {
        alert('操作失败：' + (error as Error).message);
      }
    }
  };

  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="page-title">个人中心</h1>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">总单词</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-value">{stats.pendingCount}</div>
            <div className="stat-label">待复习</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.completedCount}</div>
            <div className="stat-label">今日已完成</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.masteryRate}%</div>
            <div className="stat-label">掌握率</div>
          </div>
        </div>

        {/* 功能按钮 */}
        <div className="section-card">
          <h2 className="section-title">数据管理</h2>
          <div className="button-grid">
            <button className="btn btn-primary" onClick={handleExport}>
              📤 导出数据
            </button>
            <button className="btn btn-primary" onClick={handleImport}>
              📥 导入数据
            </button>
          </div>
        </div>

        <div className="section-card">
          <h2 className="section-title">危险操作</h2>
          <button className="btn btn-danger" onClick={handleClear}>
            🗑️ 清空所有数据
          </button>
        </div>

        {/* 关于 */}
        <div className="section-card">
          <h2 className="section-title">关于</h2>
          <div className="about-info">
            <p><strong>应用名称：</strong>单词记忆</p>
            <p><strong>版本：</strong>1.0.0</p>
            <p><strong>技术栈：</strong>React + TypeScript + Vite</p>
            <p><strong>算法：</strong>FSRS (Free Spaced Repetition Scheduler)</p>
          </div>
        </div>
      </div>

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>导入数据</h2>
              <button className="btn-icon" onClick={() => setShowImportModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleImportSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">数据内容</label>
                <textarea
                  className="textarea"
                  placeholder="粘贴导出的 JSON 数据"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  required
                  style={{ minHeight: 200px }}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  导入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
