import { Router } from 'express';
import { SearchClient, Config } from 'coze-coding-dev-sdk';
const router = Router();
/**
 * 服务端文件：server/src/routes/search.ts
 * 接口：POST /api/v1/search/github
 * Body 参数：query: string, count?: number
 */
router.post('/github', async (req, res) => {
    try {
        const { query, count = 10 } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        const config = new Config();
        const client = new SearchClient(config);
        // 搜索 GitHub 相关的问题和解决方案
        const response = await client.advancedSearch(query, {
            searchType: 'web',
            count,
            sites: 'github.com,stackoverflow.com',
            timeRange: '1m',
            needSummary: true,
        });
        res.json({
            summary: response.summary,
            results: response.web_items?.map(item => ({
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                siteName: item.site_name,
                publishTime: item.publish_time,
            })) || [],
        });
    }
    catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' });
    }
});
export default router;
